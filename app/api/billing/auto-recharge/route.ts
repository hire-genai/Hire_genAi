import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/billing/auto-recharge?companyId=xxx
 * Get auto-recharge settings for a company
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 })
    }

    const settings = await DatabaseService.query(
      `SELECT auto_recharge_enabled, auto_recharge_amount, auto_recharge_threshold 
       FROM auto_recharge_settings 
       WHERE company_id = $1::uuid`,
      [companyId]
    )

    if (settings.length === 0) {
      // Return default settings if none exist
      return NextResponse.json({
        auto_recharge_enabled: false,
        auto_recharge_amount: 2000,
        auto_recharge_threshold: 100
      })
    }

    return NextResponse.json(settings[0])
  } catch (error: any) {
    console.error('[Auto-Recharge GET] Error:', error)
    return NextResponse.json({ error: 'Failed to get auto-recharge settings' }, { status: 500 })
  }
}

/**
 * POST /api/billing/auto-recharge
 * Update auto-recharge settings for a company
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyId, auto_recharge_enabled, auto_recharge_amount, auto_recharge_threshold } = body

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 })
    }

    // Upsert auto-recharge settings
    await DatabaseService.query(
      `INSERT INTO auto_recharge_settings (company_id, auto_recharge_enabled, auto_recharge_amount, auto_recharge_threshold, updated_at)
       VALUES ($1::uuid, $2, $3, $4, NOW())
       ON CONFLICT (company_id) 
       DO UPDATE SET 
         auto_recharge_enabled = $2,
         auto_recharge_amount = $3,
         auto_recharge_threshold = $4,
         updated_at = NOW()`,
      [companyId, auto_recharge_enabled, auto_recharge_amount, auto_recharge_threshold]
    )

    console.log(`[Auto-Recharge] Settings updated for company ${companyId}:`, {
      auto_recharge_enabled,
      auto_recharge_amount,
      auto_recharge_threshold
    })

    return NextResponse.json({ 
      success: true,
      message: 'Auto-recharge settings updated successfully'
    })
  } catch (error: any) {
    console.error('[Auto-Recharge POST] Error:', error)
    return NextResponse.json({ error: 'Failed to update auto-recharge settings' }, { status: 500 })
  }
}
