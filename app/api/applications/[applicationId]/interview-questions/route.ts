import { NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ applicationId: string }> } | { params: { applicationId: string } }
) {
  try {
    const p = "then" in (ctx as any).params ? await (ctx as any).params : (ctx as any).params
    const applicationId = p.applicationId

    if (!applicationId) {
      return NextResponse.json({ ok: false, error: "Missing applicationId" }, { status: 400 })
    }

    if (!DatabaseService.isDatabaseConfigured()) {
      return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 500 })
    }

    // Get application details including job and company info
    const applicationQuery = `
      SELECT a.job_id, j.title as job_title, c.name as company_name,
             c.id as company_id, cand.first_name, cand.last_name
      FROM applications a
      JOIN job_postings j ON a.job_id = j.id
      JOIN companies c ON j.company_id = c.id
      LEFT JOIN candidates cand ON a.candidate_id = cand.id
      WHERE a.id = $1::uuid
    `
    const applicationRows = (await DatabaseService.query(applicationQuery, [applicationId])) as any[]

    if (applicationRows.length === 0) {
      return NextResponse.json({ ok: false, error: "Application not found" }, { status: 404 })
    }

    const application = applicationRows[0]
    const jobId = application.job_id

    // Get interview questions from job_interview_questions table
    const questionsQuery = `
      SELECT jiq.selected_criteria, jiq.questions
      FROM job_interview_questions jiq
      WHERE jiq.job_id = $1::uuid
      LIMIT 1
    `
    const questionsRows = (await DatabaseService.query(questionsQuery, [jobId])) as any[]

    let questions: any[] = []
    let criteria: string[] = []

    if (questionsRows.length > 0) {
      const row = questionsRows[0]
      try {
        const rawCriteria = typeof row.selected_criteria === "string"
          ? JSON.parse(row.selected_criteria)
          : row.selected_criteria
        criteria = Array.isArray(rawCriteria) ? rawCriteria : []
      } catch {
        criteria = []
      }

      try {
        const rawQuestions = typeof row.questions === "string"
          ? JSON.parse(row.questions)
          : row.questions
        questions = Array.isArray(rawQuestions) ? rawQuestions : []
      } catch {
        questions = []
      }
    }

    // Build rounds-compatible response for the interview page
    // Send complete question objects with text, criterion, difficulty, marks
    const rounds = [
      {
        id: "default-round",
        name: "AI Interview",
        duration_minutes: 30,
        questions: questions.map((q: any, idx: number) => {
          if (typeof q === "string") {
            return {
              text: q,
              criterion: criteria[0] || "General",
              difficulty: "Medium",
              marks: 10,
              sequence: idx + 1,
            }
          }
          return {
            text: q.question || q.text || "",
            criterion: q.criterion || criteria[0] || "General",
            difficulty: q.difficulty || "Medium",
            marks: q.marks !== undefined ? q.marks : 10,
            sequence: idx + 1,
          }
        }),
        criteria,
      },
    ]

    return NextResponse.json({
      ok: true,
      application: {
        id: applicationId,
        jobId: jobId,
        jobTitle: application.job_title,
        companyName: application.company_name,
        companyId: application.company_id,
        candidateName:
          `${application.first_name || ""} ${application.last_name || ""}`.trim() || "Candidate",
      },
      rounds,
    })
  } catch (err: any) {
    console.error("Error fetching interview questions:", err)
    return NextResponse.json({ ok: false, error: err?.message || "unknown" }, { status: 500 })
  }
}
