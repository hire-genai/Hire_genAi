import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { getBillingPrices } from '@/lib/config'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json({ ok: false, error: 'companyId is required' }, { status: 400 })
    }

    // Get company billing info
    const billingQuery = `
      SELECT 
        wallet_balance,
        current_month_spent,
        total_spent,
        auto_recharge_enabled,
        auto_recharge_amount,
        auto_recharge_threshold,
        created_at,
        updated_at
      FROM company_billing
      WHERE company_id = $1::uuid
    `
    const billingResult = await DatabaseService.query(billingQuery, [companyId])
    
    // Get usage counts
    const cvCountQuery = `
      SELECT COUNT(*) as count FROM cv_parsing_usage WHERE company_id = $1::uuid
    `
    const questionCountQuery = `
      SELECT COALESCE(SUM(question_count), 0) as count FROM question_generation_usage WHERE company_id = $1::uuid
    `
    const videoCountQuery = `
      SELECT COUNT(*) as count FROM video_interview_usage WHERE company_id = $1::uuid
    `

    const [cvResult, questionResult, videoResult] = await Promise.all([
      DatabaseService.query(cvCountQuery, [companyId]),
      DatabaseService.query(questionCountQuery, [companyId]),
      DatabaseService.query(videoCountQuery, [companyId])
    ])

    const billing = billingResult[0] || {
      wallet_balance: 0,
      current_month_spent: 0,
      total_spent: 0,
      auto_recharge_enabled: false
    }

    // Determine billing status based on wallet state
    let status = 'trial'
    if (parseFloat(billing.wallet_balance) > 0) {
      status = 'active'
    } else if (parseFloat(billing.total_spent) > 0) {
      status = 'past_due'
    }

    return NextResponse.json({
      ok: true,
      billing: {
        walletBalance: parseFloat(billing.wallet_balance) || 0,
        currentMonthSpent: parseFloat(billing.current_month_spent) || 0,
        totalSpent: parseFloat(billing.total_spent) || 0,
        autoRechargeEnabled: billing.auto_recharge_enabled || false,
        autoRechargeAmount: parseFloat(billing.auto_recharge_amount) || 0,
        autoRechargeThreshold: parseFloat(billing.auto_recharge_threshold) || 0,
        status,
        usageCounts: {
          cvParsed: parseInt(cvResult[0]?.count) || 0,
          questionsGenerated: parseInt(questionResult[0]?.count) || 0,
          videoInterviews: parseInt(videoResult[0]?.count) || 0
        }
      }
    })
  } catch (error: any) {
    console.error('[Billing Status] Error:', error)
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to fetch billing status' },
      { status: 500 }
    )
  }
}
