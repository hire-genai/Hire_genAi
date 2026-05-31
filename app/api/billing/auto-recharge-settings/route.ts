import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/billing/auto-recharge-settings
 * 
 * Fetches current auto-recharge settings for the authenticated company.
 * Returns auto_recharge_enabled, auto_recharge_amount, auto_recharge_threshold.
 */
export async function GET(request: NextRequest) {
  try {
    // ─── 1. Authenticate user from session cookie ───
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    let companyId: string | null = null

    if (sessionCookie?.value) {
      try {
        let cookieValue = sessionCookie.value
        try {
          cookieValue = decodeURIComponent(cookieValue)
        } catch { /* use raw value if decode fails */ }
        
        const session = JSON.parse(cookieValue)
        companyId = session.companyId || session.company?.id
      } catch (e) {
        console.log('[Auto-Recharge Settings] Failed to parse session cookie:', e)
      }
    }
    
    if (!companyId) {
      return NextResponse.json(
        { error: 'Unauthorized - Company ID not found in session' },
        { status: 401 }
      )
    }

    // ─── 2. Fetch auto-recharge settings from company_billing + active subscription plan info ───
    const query = `
      SELECT
        cb.auto_recharge_enabled,
        cb.auto_recharge_amount,
        cb.auto_recharge_threshold,
        cs.plan_amount,
        cs.plan_name
      FROM company_billing cb
      LEFT JOIN company_subscriptions cs ON cb.company_id = cs.company_id AND cs.status IN ('active', 'past_due')
      WHERE cb.company_id = $1::uuid
      LIMIT 1
    `

    const result = await DatabaseService.query(query, [companyId])

    if (result.length === 0) {
      // Return default values if no billing record exists
      return NextResponse.json({
        ok: true,
        settings: {
          auto_recharge_enabled: false,
          auto_recharge_amount: 2.00,
          auto_recharge_threshold: 50.00,
          planAmount: null,
          planName: null
        }
      })
    }

    const settings = result[0]
    const planAmount = settings.plan_amount ? parseFloat(settings.plan_amount) : null
    const planName = settings.plan_name || null

    return NextResponse.json({
      ok: true,
      settings: {
        auto_recharge_enabled: settings.auto_recharge_enabled || false,
        auto_recharge_amount: parseFloat(settings.auto_recharge_amount) || (planAmount || 2.00),
        auto_recharge_threshold: parseFloat(settings.auto_recharge_threshold) || 50.00,
        planAmount,
        planName
      }
    })

  } catch (error: any) {
    console.error('[Auto-Recharge Settings] GET Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch auto-recharge settings' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/billing/auto-recharge-settings
 * 
 * Updates auto-recharge settings for the authenticated company.
 * Validates that auto_recharge_amount minimum is 2.
 */
export async function POST(request: NextRequest) {
  try {
    // ─── 1. Authenticate user from session cookie ───
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    let companyId: string | null = null

    if (sessionCookie?.value) {
      try {
        let cookieValue = sessionCookie.value
        try {
          cookieValue = decodeURIComponent(cookieValue)
        } catch { /* use raw value if decode fails */ }
        
        const session = JSON.parse(cookieValue)
        companyId = session.companyId || session.company?.id
      } catch (e) {
        console.log('[Auto-Recharge Settings] Failed to parse session cookie:', e)
      }
    }
    
    if (!companyId) {
      return NextResponse.json(
        { error: 'Unauthorized - Company ID not found in session' },
        { status: 401 }
      )
    }

    // ─── 2. Parse and validate request body ───
    const body = await request.json()
    const { auto_recharge_enabled } = body

    if (typeof auto_recharge_enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'auto_recharge_enabled must be a boolean' },
        { status: 400 }
      )
    }

    // ─── 3. Save only the enabled flag; threshold is fixed at $10 ───
    const upsertQuery = `
      INSERT INTO company_billing (company_id, auto_recharge_enabled, auto_recharge_threshold, updated_at)
      VALUES ($1::uuid, $2, 10, NOW())
      ON CONFLICT (company_id)
      DO UPDATE SET
        auto_recharge_enabled = $2,
        auto_recharge_threshold = 10,
        updated_at = NOW()
      RETURNING auto_recharge_enabled
    `
    await DatabaseService.query(upsertQuery, [companyId, auto_recharge_enabled])

    return NextResponse.json({ ok: true, settings: { auto_recharge_enabled } })

  } catch (error: any) {
    console.error('[Auto-Recharge Settings] POST Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update auto-recharge settings' },
      { status: 500 }
    )
  }
}
