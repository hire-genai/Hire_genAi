import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const stageMap: Record<string, string> = {
  interview: 'ai_interview',
  hiringManager: 'hiring_manager',
  offer: 'offer',
  hired: 'hired',
  rejected: 'rejected',
  talentPool: 'withdrawn', // using withdrawn to park to pool
}

export async function POST(req: NextRequest) {
  try {
    if (!DatabaseService.isDatabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const body = await req.json()
    const { applicationId, moveToStage, remarks = '', changedBy, changedByEmail, companyId } = body || {}

    if (!applicationId) {
      return NextResponse.json({ error: 'applicationId is required' }, { status: 400 })
    }
    if (!moveToStage) {
      return NextResponse.json({ error: 'moveToStage is required' }, { status: 400 })
    }

    const targetStage = stageMap[moveToStage]
    if (!targetStage) {
      return NextResponse.json({ error: 'Invalid target stage' }, { status: 400 })
    }

    // Resolve changed_by from email if provided
    let changedById: string | null = null
    if (changedByEmail) {
      try {
        const userRows = await DatabaseService.query(
          `SELECT id FROM users WHERE lower(email) = lower($1) LIMIT 1`,
          [changedByEmail]
        )
        if (userRows && userRows.length > 0) {
          changedById = userRows[0].id
        }
      } catch (e) {
        console.warn('Failed to resolve changedByEmail:', e)
      }
    }

    // Get current stage and verify company ownership
    const currentRows = await DatabaseService.query(
      companyId
        ? `SELECT current_stage, company_id FROM applications WHERE id = $1::uuid AND company_id = $2::uuid LIMIT 1`
        : `SELECT current_stage, company_id FROM applications WHERE id = $1::uuid LIMIT 1`,
      companyId ? [applicationId, companyId] : [applicationId]
    )
    const currentStage = currentRows?.[0]?.current_stage

    // Update stage
    const updated = await DatabaseService.query(
      `UPDATE applications
       SET current_stage = $1::application_stage
       WHERE id = $2::uuid
       RETURNING current_stage`,
      [targetStage, applicationId]
    )

    if (!updated || updated.length === 0) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Record history
    await DatabaseService.query(
      `INSERT INTO application_stage_history (application_id, from_stage, to_stage, changed_by, remarks)
       VALUES ($1::uuid, $2::application_stage, $3::application_stage, $4::uuid, $5)`,
      [applicationId, currentStage || null, targetStage, changedById || changedBy || null, remarks || (changedByEmail ? `Moved by ${changedByEmail}` : '')]
    )

    return NextResponse.json({ ok: true, currentStage: targetStage })
  } catch (err: any) {
    console.error('❌ Move application error:', err)
    return NextResponse.json({ error: err?.message || 'Failed to move application' }, { status: 500 })
  }
}
