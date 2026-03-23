import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { getBillingPrices } from '@/lib/config'

// Billing status enum - 5 values only
export type BillingStatus = 'active' | 'trial' | 'trial_over' | 'low_balance' | 'recharge_over'

// Thresholds for low balance detection
const LOW_BALANCE_THRESHOLD_INR = 200  // ₹200 for India
const LOW_BALANCE_THRESHOLD_USD = 50   // $50 for other countries

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const countryCode = searchParams.get('country') || 'US' // Default to US if not provided

    if (!companyId) {
      return NextResponse.json({ ok: false, error: 'companyId is required' }, { status: 400 })
    }

    // Determine threshold based on country
    const isIndia = countryCode === 'IN'
    const lowBalanceThreshold = isIndia ? LOW_BALANCE_THRESHOLD_INR : LOW_BALANCE_THRESHOLD_USD
    const currency = isIndia ? 'INR' : 'USD'

    // Get company billing info with company created_at for trial calculation
    const billingQuery = `
      SELECT 
        cb.wallet_balance,
        cb.current_month_spent,
        cb.total_spent,
        cb.auto_recharge_enabled,
        cb.auto_recharge_amount,
        cb.auto_recharge_threshold,
        cb.status as billing_status,
        cb.created_at,
        cb.updated_at,
        c.created_at as company_created_at,
        c.primary_country
      FROM company_billing cb
      JOIN companies c ON c.id = cb.company_id
      WHERE cb.company_id = $1::uuid
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
    
    // Check if user has ever made a payment (to determine if they purchased a plan)
    const paymentCheckQuery = `
      SELECT COUNT(*) as count FROM payment_transactions 
      WHERE company_id = $1::uuid AND status = 'completed'
    `

    const [cvResult, questionResult, videoResult, paymentResult] = await Promise.all([
      DatabaseService.query(cvCountQuery, [companyId]),
      DatabaseService.query(questionCountQuery, [companyId]),
      DatabaseService.query(videoCountQuery, [companyId]),
      DatabaseService.query(paymentCheckQuery, [companyId])
    ])

    const billing = billingResult[0] || {
      wallet_balance: 0,
      current_month_spent: 0,
      total_spent: 0,
      auto_recharge_enabled: false,
      billing_status: 'trial',
      company_created_at: new Date(),
      primary_country: null
    }

    const walletBalance = parseFloat(billing.wallet_balance) || 0
    const hasPurchasedPlan = parseInt(paymentResult[0]?.count) > 0
    
    // Use company's primary_country if available, otherwise use provided countryCode
    const effectiveCountry = billing.primary_country || countryCode
    const effectiveIsIndia = effectiveCountry === 'IN'
    const effectiveThreshold = effectiveIsIndia ? LOW_BALANCE_THRESHOLD_INR : LOW_BALANCE_THRESHOLD_USD

    // Calculate trial days remaining (7-day trial from company creation)
    const TRIAL_DAYS = 7
    const companyCreatedAt = new Date(billing.company_created_at || Date.now())
    const now = new Date()
    const daysSinceCreation = Math.floor((now.getTime() - companyCreatedAt.getTime()) / (1000 * 60 * 60 * 24))
    const trialDaysRemaining = Math.max(0, TRIAL_DAYS - daysSinceCreation)
    const isTrialActive = daysSinceCreation < TRIAL_DAYS

    // ============================================
    // DYNAMIC STATUS CALCULATION (Priority Order)
    // ============================================
    // Priority: recharge_over > low_balance > active > trial > trial_over
    
    let billingStatus: BillingStatus = 'trial'

    // 1. RECHARGE_OVER (highest priority) - wallet balance is 0
    if (walletBalance <= 0 && hasPurchasedPlan) {
      billingStatus = 'recharge_over'
    }
    // 2. LOW_BALANCE - wallet > 0 but below threshold
    else if (walletBalance > 0 && walletBalance < effectiveThreshold) {
      billingStatus = 'low_balance'
    }
    // 3. ACTIVE - has active subscription and wallet > threshold
    else if (walletBalance >= effectiveThreshold && hasPurchasedPlan) {
      billingStatus = 'active'
    }
    // 4. TRIAL - within trial period and hasn't purchased
    else if (isTrialActive && !hasPurchasedPlan) {
      billingStatus = 'trial'
    }
    // 5. TRIAL_OVER - trial expired and hasn't purchased
    else if (!isTrialActive && !hasPurchasedPlan) {
      billingStatus = 'trial_over'
    }
    // Edge case: has purchased but wallet is 0 (already covered by recharge_over)
    // Edge case: trial active but wallet is 0 and no purchase - show trial
    else if (isTrialActive && walletBalance <= 0 && !hasPurchasedPlan) {
      billingStatus = 'trial'
    }
    // Default fallback
    else {
      billingStatus = 'trial_over'
    }

    // Calculate next billing date (30 days from last payment or subscription start)
    const nextBillingDate = billingStatus === 'active' 
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      : null

    return NextResponse.json({
      ok: true,
      billing: {
        walletBalance,
        currentMonthSpent: parseFloat(billing.current_month_spent) || 0,
        totalSpent: parseFloat(billing.total_spent) || 0,
        autoRechargeEnabled: billing.auto_recharge_enabled || false,
        autoRechargeAmount: parseFloat(billing.auto_recharge_amount) || 0,
        autoRechargeThreshold: parseFloat(billing.auto_recharge_threshold) || 0,
        status: billingStatus,
        billingStatus,
        trialDaysRemaining,
        trialTotalDays: TRIAL_DAYS,
        nextBillingDate,
        hasPurchasedPlan,
        lowBalanceThreshold: effectiveThreshold,
        currency: effectiveIsIndia ? 'INR' : 'USD',
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
