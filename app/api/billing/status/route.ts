import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

// Billing status enum - 3 values only (subscription-based)
export type BillingStatus = 'active' | 'trial' | 'trial_over'

const TRIAL_DAYS = parseInt(process.env.TRIAL_DAYS || '7') // Configurable trial period (default: 7 days)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json({ ok: false, error: 'companyId is required' }, { status: 400 })
    }

    // Get company info for trial calculation
    const companyQuery = `
      SELECT 
        c.created_at as company_created_at,
        c.primary_country
      FROM companies c
      WHERE c.id = $1::uuid
    `
    const companyResult = await DatabaseService.query(companyQuery, [companyId])
    
    if (companyResult.length === 0) {
      return NextResponse.json({ ok: false, error: 'Company not found' }, { status: 404 })
    }

    const company = companyResult[0]
    const effectiveCountry = company.primary_country || 'US'
    const effectiveIsIndia = effectiveCountry === 'IN'
    
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

    // ============================================
    // TRIAL CALCULATION (from company.created_at)
    // ============================================
    const now = new Date()
    const companyCreatedAt = new Date(company.company_created_at || Date.now())
    const msSinceCreation = now.getTime() - companyCreatedAt.getTime()
    const daysSinceCreation = Math.floor(msSinceCreation / (1000 * 60 * 60 * 24))
    
    const trialDaysRemaining = Math.max(0, TRIAL_DAYS - daysSinceCreation)
    const isWithinTrialPeriod = daysSinceCreation < TRIAL_DAYS

    // ============================================
    // SUBSCRIPTION CHECK
    // ============================================
    let subscription = null
    let hasActiveSubscription = false
    
    try {
      const subscriptionQuery = `
        SELECT 
          subscription_id,
          provider,
          plan_id,
          status,
          subscriber_email,
          start_time,
          next_billing_time,
          created_at,
          updated_at
        FROM company_subscriptions
        WHERE company_id = $1::uuid
        ORDER BY updated_at DESC
        LIMIT 1
      `
      const subscriptionResult = await DatabaseService.query(subscriptionQuery, [companyId])
      
      if (subscriptionResult.length > 0) {
        const sub = subscriptionResult[0]
        subscription = {
          id: sub.subscription_id,
          provider: sub.provider,
          planId: sub.plan_id,
          status: sub.status,
          subscriberEmail: sub.subscriber_email,
          startTime: sub.start_time,
          nextBillingDate: sub.next_billing_time,
          createdAt: sub.created_at,
          updatedAt: sub.updated_at
        }
        
        // Check if subscription is active
        hasActiveSubscription = ['active', 'authenticated'].includes(sub.status)
      }
    } catch (subError) {
      // company_subscriptions table may not exist yet, continue without subscription
      console.log('[Billing Status] Subscription check skipped:', subError)
    }

    // ============================================
    // STATUS CALCULATION - 3 statuses only
    // ============================================
    // - 'active': has active subscription
    // - 'trial': within trial period and no active subscription
    // - 'trial_over': trial expired and no active subscription
    
    let billingStatus: BillingStatus = 'trial'

    if (hasActiveSubscription) {
      billingStatus = 'active'
    } else if (isWithinTrialPeriod) {
      billingStatus = 'trial'
    } else {
      billingStatus = 'trial_over'
    }

    // Calculate next billing date from subscription
    let nextBillingDate = null
    if (subscription?.nextBillingDate) {
      nextBillingDate = new Date(subscription.nextBillingDate).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    }

    const isTrialExpired = !isWithinTrialPeriod && !hasActiveSubscription

    // ============================================
    // COMPANY BILLING DATA (wallet, spending, auto-recharge)
    // ============================================
    let walletBalance = 0
    let currentMonthSpent = 0
    let totalSpent = 0
    let autoRechargeEnabled = false
    let monthlySpendCap = null

    try {
      const billingInfo = await DatabaseService.getCompanyBilling(companyId)
      if (billingInfo) {
        walletBalance = parseFloat(billingInfo.wallet_balance) || 0
        currentMonthSpent = billingInfo.current_month_spent || 0
        totalSpent = billingInfo.total_spent || 0
        autoRechargeEnabled = billingInfo.auto_recharge_enabled || false
        monthlySpendCap = billingInfo.monthly_spend_cap ? parseFloat(billingInfo.monthly_spend_cap) : null
      }
    } catch (billingError) {
      console.log('[Billing Status] Company billing fetch skipped:', billingError)
    }

    return NextResponse.json({
      ok: true,
      billing: {
        status: billingStatus,
        billingStatus,
        trialDaysRemaining,
        trialTotalDays: TRIAL_DAYS,
        isTrialActive: isWithinTrialPeriod && !hasActiveSubscription,
        isTrialExpired,
        nextBillingDate,
        hasActiveSubscription,
        currency: effectiveIsIndia ? 'INR' : 'USD',
        walletBalance,
        currentMonthSpent,
        totalSpent,
        autoRechargeEnabled,
        monthlySpendCap,
        usageCounts: {
          cvParsed: parseInt(cvResult[0]?.count) || 0,
          questionsGenerated: parseInt(questionResult[0]?.count) || 0,
          videoInterviews: parseInt(videoResult[0]?.count) || 0
        }
      },
      subscription
    })
  } catch (error: any) {
    console.error('[Billing Status] Error:', error)
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to fetch billing status' },
      { status: 500 }
    )
  }
}
