import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { getBillingPrices } from '@/lib/config'

// Billing status enum - 5 values only
export type BillingStatus = 'active' | 'trial' | 'trial_over' | 'low_balance' | 'recharge_over'

// Thresholds for low balance detection
const LOW_BALANCE_THRESHOLD_INR = 200  // ₹200 for India
const LOW_BALANCE_THRESHOLD_USD = 50   // $50 for other countries
const TRIAL_DAYS = 7 // 7-day free trial

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
    // Also fetch trial_ends_at if available for cleaner logic
    const billingQuery = `
      SELECT 
        cb.wallet_balance,
        cb.current_month_spent,
        cb.total_spent,
        cb.auto_recharge_enabled,
        cb.auto_recharge_amount,
        cb.auto_recharge_threshold,
        cb.status as billing_status,
        cb.trial_ends_at,
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
    
    // CRITICAL FIX: Only count SUCCESSFUL payments (status = 'completed')
    // Payment attempts or failures should NOT affect trial status
    const successfulPaymentQuery = `
      SELECT COUNT(*) as count, MAX(completed_at) as last_payment_at
      FROM payment_transactions 
      WHERE company_id = $1::uuid AND status = 'completed'
    `

    const [cvResult, questionResult, videoResult, paymentResult] = await Promise.all([
      DatabaseService.query(cvCountQuery, [companyId]),
      DatabaseService.query(questionCountQuery, [companyId]),
      DatabaseService.query(videoCountQuery, [companyId]),
      DatabaseService.query(successfulPaymentQuery, [companyId])
    ])

    // If no billing record exists, get company created_at directly
    let billing = billingResult[0]
    if (!billing) {
      const companyQuery = `SELECT created_at, primary_country FROM companies WHERE id = $1::uuid`
      const companyResult = await DatabaseService.query(companyQuery, [companyId])
      billing = {
        wallet_balance: 0,
        current_month_spent: 0,
        total_spent: 0,
        auto_recharge_enabled: false,
        billing_status: 'trial',
        company_created_at: companyResult[0]?.created_at || new Date(),
        primary_country: companyResult[0]?.primary_country || null
      }
    }

    const walletBalance = parseFloat(billing.wallet_balance) || 0
    
    // CRITICAL: Only successful payments count - payment attempts don't break trial
    const successfulPaymentCount = parseInt(paymentResult[0]?.count) || 0
    const hasSuccessfulRecharge = successfulPaymentCount > 0
    
    // Use company's primary_country if available, otherwise use provided countryCode
    const effectiveCountry = billing.primary_country || countryCode
    const effectiveIsIndia = effectiveCountry === 'IN'
    const effectiveThreshold = effectiveIsIndia ? LOW_BALANCE_THRESHOLD_INR : LOW_BALANCE_THRESHOLD_USD

    // ============================================
    // TRIAL CALCULATION (from company.created_at or trial_ends_at)
    // ============================================
    // Trial is 7 days from company creation
    // Trial ONLY ends when:
    //   1. 7 days have passed (trial_ends_at < now), OR
    //   2. A SUCCESSFUL payment has been made
    // Payment attempts or failures do NOT affect trial
    
    const now = new Date()
    let trialDaysRemaining = 0
    let isWithinTrialPeriod = false
    
    // Use trial_ends_at if available (cleaner logic), otherwise calculate from company.created_at
    if (billing.trial_ends_at) {
      const trialEndsAt = new Date(billing.trial_ends_at)
      const msUntilTrialEnds = trialEndsAt.getTime() - now.getTime()
      trialDaysRemaining = Math.max(0, Math.ceil(msUntilTrialEnds / (1000 * 60 * 60 * 24)))
      isWithinTrialPeriod = msUntilTrialEnds > 0
    } else {
      // Fallback: calculate from company.created_at
      const companyCreatedAt = new Date(billing.company_created_at || Date.now())
      const msSinceCreation = now.getTime() - companyCreatedAt.getTime()
      const daysSinceCreation = Math.floor(msSinceCreation / (1000 * 60 * 60 * 24))
      
      // Calculate remaining days: 7 - days_passed
      // Day 1 → 6 days left, Day 2 → 5 days left, etc.
      trialDaysRemaining = Math.max(0, TRIAL_DAYS - daysSinceCreation)
      isWithinTrialPeriod = daysSinceCreation < TRIAL_DAYS
    }
    
    // Trial is active if:
    // - Within trial period AND
    // - No successful recharge has been made
    const isTrialActive = isWithinTrialPeriod && !hasSuccessfulRecharge

    // ============================================
    // DYNAMIC STATUS CALCULATION (Priority Order)
    // ============================================
    // UI Conditions:
    // - If wallet_balance > 0 → show wallet UI (active or low_balance)
    // - If wallet_balance = 0 AND within trial AND no successful recharge → show trial UI
    // - If wallet_balance = 0 AND trial expired → show recharge UI
    
    let billingStatus: BillingStatus = 'trial'

    // 1. WALLET HAS BALANCE - show wallet-based status
    if (walletBalance > 0) {
      if (walletBalance >= effectiveThreshold) {
        billingStatus = 'active'
      } else {
        billingStatus = 'low_balance'
      }
    }
    // 2. WALLET IS EMPTY
    else {
      // 2a. Has made successful recharge before but wallet is now 0
      if (hasSuccessfulRecharge) {
        billingStatus = 'recharge_over'
      }
      // 2b. Within trial period and no successful recharge - show trial
      else if (isTrialActive) {
        billingStatus = 'trial'
      }
      // 2c. Trial expired and no successful recharge - show trial_over
      else {
        billingStatus = 'trial_over'
      }
    }

    // Calculate next billing date (30 days from last payment or subscription start)
    const nextBillingDate = billingStatus === 'active' 
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      : null

    // Calculate is_trial_expired: current_date > trial_end_date AND wallet_balance <= 0
    const isTrialExpired = !isWithinTrialPeriod && walletBalance <= 0

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
        isTrialActive,
        isTrialExpired,
        nextBillingDate,
        hasSuccessfulRecharge,
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
