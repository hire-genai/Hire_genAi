import { NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// GET: Check if interview has been completed for this application
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ applicationId: string }> } | { params: { applicationId: string } }
) {
  try {
    const p = "then" in (ctx as any).params ? await (ctx as any).params : (ctx as any).params
    const applicationId = p.applicationId

    if (!applicationId) {
      return NextResponse.json({ error: "Missing applicationId" }, { status: 400 })
    }

    // Check interview_status on the interviews table
    const query = `
      SELECT 
        a.id,
        i.interview_status,
        i.interview_completed_at,
        i.interview_sent_at
      FROM applications a
      LEFT JOIN interviews i ON i.application_id = a.id
      WHERE a.id = $1::uuid
      LIMIT 1
    `
    const rows = (await DatabaseService.query(query, [applicationId])) as any[]

    if (!rows || rows.length === 0) {
      return NextResponse.json({ ok: false, error: "Application not found" }, { status: 404 })
    }

    const app = rows[0]
    const isCompleted = app.interview_status === "Completed"

    return NextResponse.json({
      ok: true,
      canInterview: !isCompleted,
      status: app.interview_status || "Not Scheduled",
      completedAt: app.interview_completed_at,
      sentAt: app.interview_sent_at,
    })
  } catch (err: any) {
    console.error("Error checking interview status:", err)
    return NextResponse.json({ error: err?.message || "Failed to check interview status" }, { status: 500 })
  }
}

// ========== TRANSCRIPT VALIDATION HELPERS ==========

function parseTranscript(transcript: string): {
  interviewerLines: string[]
  candidateLines: string[]
  questionsAsked: string[]
  candidateResponses: string[]
} {
  const lines = transcript.split("\n\n").filter((l) => l.trim().length > 0)
  const interviewerLines: string[] = []
  const candidateLines: string[] = []
  const questionsAsked: string[] = []
  const candidateResponses: string[] = []

  for (const line of lines) {
    if (line.startsWith("Interviewer:")) {
      const text = line.replace("Interviewer:", "").trim()
      interviewerLines.push(text)
      // Count lines that contain a question mark as questions asked
      if (text.includes("?")) {
        questionsAsked.push(text)
      }
    } else if (line.startsWith("Candidate:")) {
      const text = line.replace("Candidate:", "").trim()
      candidateLines.push(text)
      if (text.length > 0 && text !== "[inaudible]") {
        candidateResponses.push(text)
      }
    }
  }

  return { interviewerLines, candidateLines, questionsAsked, candidateResponses }
}

async function fetchTotalQuestionsForJob(applicationId: string): Promise<{ totalQuestions: number; jobId: string | null }> {
  try {
    const appRows = (await DatabaseService.query(
      `SELECT a.job_id FROM applications a WHERE a.id = $1::uuid LIMIT 1`,
      [applicationId]
    )) as any[]

    if (!appRows || appRows.length === 0) return { totalQuestions: 0, jobId: null }

    const jobId = appRows[0].job_id
    const qRows = (await DatabaseService.query(
      `SELECT jiq.questions FROM job_interview_questions jiq WHERE jiq.job_id = $1::uuid LIMIT 1`,
      [jobId]
    )) as any[]

    if (!qRows || qRows.length === 0) return { totalQuestions: 0, jobId }

    const raw = typeof qRows[0].questions === "string" ? JSON.parse(qRows[0].questions) : qRows[0].questions
    const totalQuestions = Array.isArray(raw) ? raw.length : 0
    return { totalQuestions, jobId }
  } catch {
    return { totalQuestions: 0, jobId: null }
  }
}

const MIN_CANDIDATE_RESPONSES = 5
const MIN_DURATION_MINUTES = 5

// POST: Mark interview as completed, store transcript
export async function POST(
  req: Request,
  ctx: { params: Promise<{ applicationId: string }> } | { params: { applicationId: string } }
) {
  try {
    const p = "then" in (ctx as any).params ? await (ctx as any).params : (ctx as any).params
    const applicationId = p.applicationId
    const body = await req.json().catch(() => ({}))
    const { transcript, startedAt } = body

    console.log("📝 Marking interview as completed:", applicationId)
    console.log("📝 Transcript length:", transcript?.length || 0)

    if (!applicationId) {
      return NextResponse.json({ error: "Missing applicationId" }, { status: 400 })
    }

    // Calculate duration
    let durationMinutes = 0
    if (startedAt) {
      durationMinutes = Math.max(0, Math.round((Date.now() - startedAt) / 60000))
    }

    // ========== TRANSCRIPT VALIDATION ==========
    const { totalQuestions } = await fetchTotalQuestionsForJob(applicationId)
    const parsed = parseTranscript(transcript || "")

    const validationErrors: string[] = []

    // Rule 1: Questions asked must match total questions in DB
    if (totalQuestions > 0 && parsed.questionsAsked.length < totalQuestions) {
      validationErrors.push(
        `Only ${parsed.questionsAsked.length}/${totalQuestions} questions were asked`
      )
    }

    // Rule 2: Candidate must have responded to at least MIN_CANDIDATE_RESPONSES questions
    if (parsed.candidateResponses.length < MIN_CANDIDATE_RESPONSES) {
      validationErrors.push(
        `Only ${parsed.candidateResponses.length} candidate responses (minimum ${MIN_CANDIDATE_RESPONSES} required)`
      )
    }

    // Rule 3: Interview duration must be at least MIN_DURATION_MINUTES
    if (durationMinutes < MIN_DURATION_MINUTES) {
      validationErrors.push(
        `Interview lasted ${durationMinutes} minute(s) (minimum ${MIN_DURATION_MINUTES} minutes required)`
      )
    }

    const isIncomplete = validationErrors.length > 0

    console.log("📊 [VALIDATION] Total DB questions:", totalQuestions)
    console.log("📊 [VALIDATION] Questions asked in transcript:", parsed.questionsAsked.length)
    console.log("📊 [VALIDATION] Candidate responses:", parsed.candidateResponses.length)
    console.log("📊 [VALIDATION] Duration:", durationMinutes, "minutes")
    console.log("📊 [VALIDATION] Result:", isIncomplete ? `INCOMPLETE - ${validationErrors.join("; ")}` : "COMPLETE")

    if (isIncomplete) {
      // Mark as Incomplete - frontend will still trigger evaluation with available answers
      // Ensure interview record exists, then update it
      await DatabaseService.ensureInterviewRecord(applicationId)
      const updateInterviewQuery = `
        UPDATE interviews
        SET 
          interview_status = 'Incomplete',
          interview_completed_at = NOW(),
          interview_feedback = $2
        WHERE application_id = $1::uuid
        RETURNING id
      `
      await DatabaseService.query(updateInterviewQuery, [
        applicationId,
        transcript || null,
      ])

      // Update application stage separately
      const updateAppQuery = `
        UPDATE applications SET current_stage = 'ai_interview' WHERE id = $1::uuid RETURNING id
      `
      const result = (await DatabaseService.query(updateAppQuery, [applicationId])) as any[]

      if (!result || result.length === 0) {
        return NextResponse.json({ error: "Application not found" }, { status: 404 })
      }

      console.log(`⚠️ Interview marked as INCOMPLETE for application ${applicationId}`)
      console.log(`⚠️ Reasons: ${validationErrors.join("; ")}`)

      return NextResponse.json({
        ok: true,
        applicationId,
        durationMinutes,
        incomplete: true,
        message: "Interview marked as incomplete - evaluation will NOT be triggered",
        validationErrors,
        stats: {
          totalQuestions,
          questionsAsked: parsed.questionsAsked.length,
          candidateResponses: parsed.candidateResponses.length,
          durationMinutes,
        },
      })
    }

    // ========== COMPLETE INTERVIEW - Save normally ==========
    await DatabaseService.ensureInterviewRecord(applicationId)
    const updateInterviewQuery2 = `
      UPDATE interviews
      SET 
        interview_status = 'Completed',
        interview_completed_at = NOW(),
        interview_feedback = $2
      WHERE application_id = $1::uuid
      RETURNING id
    `
    await DatabaseService.query(updateInterviewQuery2, [
      applicationId,
      transcript || null,
    ])

    // Update application stage separately
    const updateAppQuery2 = `
      UPDATE applications SET current_stage = 'ai_interview' WHERE id = $1::uuid RETURNING id
    `
    const result = (await DatabaseService.query(updateAppQuery2, [applicationId])) as any[]

    if (!result || result.length === 0) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 })
    }

    console.log(`✅ Interview marked as completed for application ${applicationId}`)
    console.log(`⏱️  Duration: ${durationMinutes} minutes`)

    return NextResponse.json({
      ok: true,
      applicationId,
      durationMinutes,
      incomplete: false,
      message: "Interview marked as completed",
      stats: {
        totalQuestions,
        questionsAsked: parsed.questionsAsked.length,
        candidateResponses: parsed.candidateResponses.length,
        durationMinutes,
      },
    })
  } catch (err: any) {
    console.error("Error marking interview as completed:", err)
    return NextResponse.json({ error: err?.message || "Failed to mark interview as completed" }, { status: 500 })
  }
}
