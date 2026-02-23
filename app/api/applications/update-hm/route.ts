import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    if (!DatabaseService.isDatabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const body = await req.json()
    const {
      applicationId,
      hmStatus,
      hmRating,
      hmFeedback,
      hmInterviewDate,
      hmFeedbackDate,
    } = body || {}

    if (!applicationId) {
      return NextResponse.json({ error: 'applicationId is required' }, { status: 400 })
    }

    const updated = await DatabaseService.query(
      `UPDATE applications
       SET
         hm_status         = COALESCE($1, hm_status),
         hm_rating         = COALESCE($2, hm_rating),
         hm_feedback       = COALESCE($3, hm_feedback),
         hm_interview_date = COALESCE($4::date, hm_interview_date),
         hm_feedback_date  = COALESCE($5::date, hm_feedback_date),
         updated_at        = NOW()
       WHERE id = $6::uuid
       RETURNING id, hm_status, hm_rating, hm_feedback, hm_interview_date, hm_feedback_date`,
      [
        hmStatus || null,
        hmRating ? parseInt(hmRating) : null,
        hmFeedback || null,
        hmInterviewDate || null,
        hmFeedbackDate || null,
        applicationId,
      ]
    ) as any[]

    if (!updated || updated.length === 0) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    console.log('✅ HM data saved for application:', applicationId)
    return NextResponse.json({ ok: true, application: updated[0] })
  } catch (err: any) {
    console.error('❌ Update HM error:', err)
    return NextResponse.json({ error: err?.message || 'Failed to update HM data' }, { status: 500 })
  }
}
