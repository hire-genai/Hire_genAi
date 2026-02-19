import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyId, autoRechargeEnabled, monthlySpendCap } = body

    if (!companyId) {
      return NextResponse.json({ ok: false, error: 'companyId is required' }, { status: 400 })
    }

    // Update or insert billing settings
    const upsertQuery = `
      INSERT INTO company_billing (company_id, auto_recharge_enabled, updated_at)
      VALUES ($1::uuid, $2, NOW())
      ON CONFLICT (company_id) 
      DO UPDATE SET 
        auto_recharge_enabled = $2,
        updated_at = NOW()
      RETURNING *
    `

    const result = await DatabaseService.query(upsertQuery, [companyId, autoRechargeEnabled || false])

    return NextResponse.json({
      ok: true,
      billing: result[0]
    })
  } catch (error: any) {
    console.error('[Billing Settings] Error:', error)
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to update billing settings' },
      { status: 500 }
    )
  }
}
