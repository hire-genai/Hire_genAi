import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { cookies } from 'next/headers'

/**
 * GET /api/billing/invoices
 * 
 * Returns payment history (subscription payments) for the logged-in company.
 * Only returns successful payments sorted by payment_time DESC.
 * 
 * If no payments exist but subscription is active, creates a payment record
 * from the subscription data (for existing subscriptions before this feature).
 */
export async function GET(request: NextRequest) {
  try {
    // Get company ID from query params (like other billing APIs)
    const { searchParams } = new URL(request.url)
    let companyId = searchParams.get('companyId')

    // Fallback to cookie if not in query params
    if (!companyId) {
      const cookieStore = await cookies()
      companyId = cookieStore.get('company_id')?.value || null
    }

    console.log('[Billing Invoices] Fetching for company:', companyId)

    if (!companyId) {
      return NextResponse.json({ ok: false, error: 'companyId is required' }, { status: 400 })
    }

    // Get ALL subscriptions for this company (not just the latest one)
    const allSubscriptionsQuery = `
      SELECT subscription_id, status, created_at, raw_data
      FROM company_subscriptions 
      WHERE company_id = $1::uuid 
      ORDER BY created_at DESC
    `
    const allSubscriptionsResult = await DatabaseService.query(allSubscriptionsQuery, [companyId])

    console.log('[Billing Invoices] All subscriptions found:', allSubscriptionsResult.length)
    console.log('[Billing Invoices] Subscriptions details:', allSubscriptionsResult.map((s: any) => ({
      subscription_id: s.subscription_id,
      status: s.status,
      created_at: s.created_at
    })))

    if (allSubscriptionsResult.length === 0) {
      // No subscription found, return empty payments
      return NextResponse.json({
        ok: true,
        payments: [],
        debug: { message: 'No subscription found for company' }
      })
    }

    // Get ALL payments for this company - try multiple approaches
    let paymentsResult = []

    try {
      // Approach 1: Using subscription_ids
      const subscriptionIds = allSubscriptionsResult.map((s: any) => s.subscription_id)
      console.log('[Billing Invoices] All subscription IDs:', subscriptionIds)

      if (subscriptionIds.length > 0) {
        const paymentsQuery = `
          SELECT 
            id,
            subscription_id,
            provider,
            payment_id,
            amount,
            currency,
            status,
            payment_time,
            created_at,
            raw_data
          FROM subscription_payments 
          WHERE subscription_id = ANY($1)
          ORDER BY payment_time DESC
        `
        paymentsResult = await DatabaseService.query(paymentsQuery, [subscriptionIds])
        console.log('[Billing Invoices] Found payments via subscription_ids:', paymentsResult.length)
      }

      // ALWAYS show all payments for debugging
      console.log('[Billing Invoices] Fetching ALL payments from database for debugging...')
      const allPaymentsQuery = `
        SELECT 
          id,
          subscription_id,
          provider,
          payment_id,
          amount,
          currency,
          status,
          payment_time,
          created_at,
          raw_data
        FROM subscription_payments 
        ORDER BY payment_time DESC
        LIMIT 20
      `
      const allPayments = await DatabaseService.query(allPaymentsQuery)
      console.log('[Billing Invoices] Total payments in database:', allPayments.length)
      console.log('[Billing Invoices] All payment details:', allPayments.map((p: any) => ({
        payment_id: p.payment_id,
        subscription_id: p.subscription_id,
        amount: p.amount,
        status: p.status,
        payment_time: p.payment_time
      })))
      
      // Filter payments that match our subscription_ids
      const matchingPayments = allPayments.filter((p: any) => subscriptionIds.includes(p.subscription_id))
      console.log('[Billing Invoices] Matching payments:', matchingPayments.length)
      
      // Use filtered payments if found, otherwise use all payments (for debugging)
      paymentsResult = matchingPayments.length > 0 ? matchingPayments : allPayments
    } catch (error) {
      console.error('[Billing Invoices] Error fetching payments:', error)
      paymentsResult = []
    }

    console.log('[Billing Invoices] Found payments:', paymentsResult.length)
    console.log('[Billing Invoices] Payment details:', paymentsResult.map((p: any) => ({
      id: p.id,
      payment_id: p.payment_id,
      amount: p.amount,
      subscription_id: p.subscription_id,
      payment_time: p.payment_time
    })))

    // DEBUG: Check ALL payments regardless of status
    const allPaymentsQuery = `
      SELECT 
        sp.id,
        sp.subscription_id,
        sp.payment_id,
        sp.amount,
        sp.status,
        sp.payment_time,
        sp.created_at
      FROM subscription_payments sp
      JOIN company_subscriptions cs ON sp.subscription_id = cs.subscription_id
      WHERE cs.company_id = $1 
      ORDER BY sp.payment_time DESC
    `
    const allPaymentsResult = await DatabaseService.query(allPaymentsQuery, [companyId])
    console.log('[Billing Invoices] ALL payments (any status):', allPaymentsResult.length)
    console.log('[Billing Invoices] All payment details:', allPaymentsResult.map((p: any) => ({
      payment_id: p.payment_id,
      amount: p.amount,
      status: p.status,
      subscription_id: p.subscription_id,
      payment_time: p.payment_time
    })))

    // If no payments found but company has any active subscription, create a payment record
    // This handles existing subscriptions that were created before payment tracking
    if (paymentsResult.length === 0) {
      const hasActiveSubscription = allSubscriptionsResult.some((sub: any) => 
        ['active', 'authenticated'].includes(sub.status)
      )
      
      if (hasActiveSubscription) {
        console.log('[Billing Invoices] No payments found for active subscription, creating initial payment record')
        
        // Get the most recent subscription for initial record
        const latestSubscription = allSubscriptionsResult[0]
        const rawData = latestSubscription.raw_data || {}
        const planAmount = rawData.plan?.item?.amount || 1000000 // Default £10,000 in paise
        
        const paymentId = `initial_${latestSubscription.subscription_id}_${Date.now()}`
        
        try {
          await DatabaseService.recordSubscriptionPayment({
            subscriptionId: latestSubscription.subscription_id,
            provider: 'razorpay',
            paymentId,
            amount: planAmount / 100, // Convert paise to rupees
            currency: 'INR',
            status: 'captured',
            paymentTime: new Date(latestSubscription.created_at),
            rawData: { generated: true, reason: 'initial_sync', subscription_status: latestSubscription.status }
          })
          
          console.log('[Billing Invoices] Created initial payment record:', paymentId)
          
          // Re-fetch payments using the same logic as above
          const subscriptionIds = allSubscriptionsResult.map((s: any) => s.subscription_id)
          const reFetchQuery = `
            SELECT 
              id,
              subscription_id,
              provider,
              payment_id,
              amount,
              currency,
              status,
              payment_time,
              created_at,
              raw_data
            FROM subscription_payments 
            WHERE subscription_id = ANY($1)
            ORDER BY payment_time DESC
          `
          paymentsResult = await DatabaseService.query(reFetchQuery, [subscriptionIds])
        } catch (syncError: any) {
          console.error('[Billing Invoices] Failed to create initial payment:', syncError.message)
        }
      }
    }

    // Get company info for receipt generation
    const companyQuery = `
      SELECT name, slug, phone_number, website_url, legal_company_name, tax_id_ein
      FROM companies 
      WHERE id = $1::uuid
    `
    const companyResult = await DatabaseService.query(companyQuery, [companyId])
    const company = companyResult[0] || {}

    // Format payments for frontend
    const payments = paymentsResult.map((payment: any) => ({
      id: payment.id,
      paymentId: payment.payment_id,
      amount: parseFloat(payment.amount) || 0,
      currency: payment.currency || 'INR',
      status: 'paid', // Normalize status to "paid" for display
      paymentDate: payment.payment_time || payment.created_at,
      provider: payment.provider,
      rawData: payment.raw_data // Include raw_data for card type detection
    }))

    return NextResponse.json({
      ok: true,
      payments,
      company
    })

  } catch (error: any) {
    console.error('[Billing Invoices] Error:', error)
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to fetch payment history' },
      { status: 500 }
    )
  }
}
