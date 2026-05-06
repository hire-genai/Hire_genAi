import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/subscriptions/create
 * 
 * Creates a new Razorpay subscription for the authenticated company.
 * Returns subscription details including the short_url for payment.
 * 
 * Request body:
 * {
 *   planType: 'monthly' | 'yearly'
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // ─── 1. Authenticate user from session cookie ───
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    let userId: string | null = null
    let companyId: string | null = null
    let email: string | null = null

    if (sessionCookie?.value) {
      try {
        let cookieValue = sessionCookie.value
        try {
          cookieValue = decodeURIComponent(cookieValue)
        } catch { /* use raw value if decode fails */ }
        
        const session = JSON.parse(cookieValue)
        companyId = session.companyId || session.company?.id
        userId = session.userId || session.user?.id
        email = session.email || session.user?.email
      } catch (e) {
        console.log('[Subscription Create] Failed to parse session cookie:', e)
      }
    }
    
    if (!userId || !companyId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // ─── 2. Parse request body ───
    const body = await request.json()
    const { planType = 'monthly' } = body

    // ─── 3. Get plan ID from environment ───
    const planId = planType === 'yearly' 
      ? process.env.RAZORPAY_PLAN_ID_YEARLY 
      : process.env.RAZORPAY_PLAN_ID_MONTHLY

    if (!planId) {
      console.error(`[Subscription Create] Plan ID not configured for: ${planType}`)
      return NextResponse.json(
        { error: `Subscription plan not configured. Please contact support.` },
        { status: 500 }
      )
    }

    // ─── 4. Check for existing active subscription ───
    const existingSubscription = await DatabaseService.getActiveSubscription(companyId)
    
    if (existingSubscription && existingSubscription.status === 'active') {
      return NextResponse.json(
        { 
          error: 'Active subscription already exists',
          subscription: {
            id: existingSubscription.subscription_id,
            status: existingSubscription.status,
            nextBillingDate: existingSubscription.next_billing_time
          }
        },
        { status: 400 }
      )
    }

    // ─── 5. Get Razorpay credentials ───
    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET

    if (!keyId || !keySecret) {
      console.error('[Subscription Create] Razorpay credentials not configured')
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 500 }
      )
    }

    // ─── 6. Create subscription via Razorpay API ───
    const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64')
    
    const subscriptionPayload = {
      plan_id: planId,
      total_count: 12, // 12 billing cycles (1 year for monthly, 12 years for yearly)
      quantity: 1,
      customer_notify: 1,
      notes: {
        company_id: companyId,
        user_id: userId,
        email: email,
        plan_type: planType
      }
    }

    console.log('[Subscription Create] Creating subscription with payload:', subscriptionPayload)

    const razorpayResponse = await fetch('https://api.razorpay.com/v1/subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(subscriptionPayload)
    })

    const razorpayData = await razorpayResponse.json()

    if (!razorpayResponse.ok) {
      console.error('[Subscription Create] Razorpay API error:', razorpayData)
      return NextResponse.json(
        { error: razorpayData.error?.description || 'Failed to create subscription' },
        { status: razorpayResponse.status }
      )
    }

    console.log('[Subscription Create] Razorpay subscription created:', razorpayData.id)

    // ─── 7. Store subscription in database (including short_url for Manage Plan) ───
    await DatabaseService.upsertSubscription({
      companyId,
      provider: 'razorpay',
      subscriptionId: razorpayData.id,
      planId: planId,
      status: razorpayData.status || 'created',
      subscriberEmail: email || undefined,
      subscriptionLink: razorpayData.short_url || undefined,
      rawData: razorpayData
    })

    // ─── 8. Return subscription details ───
    return NextResponse.json({
      ok: true,
      subscription: {
        id: razorpayData.id,
        status: razorpayData.status,
        planId: planId,
        planType: planType,
        shortUrl: razorpayData.short_url, // URL for customer to complete payment
        createdAt: new Date(razorpayData.created_at * 1000).toISOString()
      }
    })

  } catch (error: any) {
    console.error('[Subscription Create] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create subscription' },
      { status: 500 }
    )
  }
}
