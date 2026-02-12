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

    // Check interview_status on the applications table
    const query = `
      SELECT 
        a.id,
        a.interview_status,
        a.interview_completed_at,
        a.interview_sent_at
      FROM applications a
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
    let durationMinutes = 1
    if (startedAt) {
      durationMinutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000))
    }

    // Update the application record with interview completion data
    const updateQuery = `
      UPDATE applications
      SET 
        interview_status = 'Completed',
        interview_completed_at = NOW(),
        interview_feedback = $2,
        current_stage = 'ai_interview'
      WHERE id = $1::uuid
      RETURNING id
    `
    const result = (await DatabaseService.query(updateQuery, [
      applicationId,
      transcript || null,
    ])) as any[]

    if (!result || result.length === 0) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 })
    }

    console.log(`✅ Interview marked as completed for application ${applicationId}`)
    console.log(`⏱️  Duration: ${durationMinutes} minutes`)

    return NextResponse.json({
      ok: true,
      applicationId,
      durationMinutes,
      message: "Interview marked as completed",
    })
  } catch (err: any) {
    console.error("Error marking interview as completed:", err)
    return NextResponse.json({ error: err?.message || "Failed to mark interview as completed" }, { status: 500 })
  }
}
