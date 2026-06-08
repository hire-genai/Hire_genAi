import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { cookies } from 'next/headers'
import { createSubscriptionCheckoutSession } from '@/stripe/stripeController'

const PLAN_PRICE_IDS: Record<string, string | undefined> = {
  starter_monthly:      process.env.STRIPE_PRICE_ID_STARTER_MONTHLY,
  starter_annual:       process.env.STRIPE_PRICE_ID_STARTER_ANNUAL,
  professional_monthly: process.env.STRIPE_PRICE_ID_PROFESSIONAL_MONTHLY,
  professional_annual:  process.env.STRIPE_PRICE_ID_PROFESSIONAL_ANNUAL,
  business_monthly:     process.env.STRIPE_PRICE_ID_BUSINESS_MONTHLY,
  business_annual:      process.env.STRIPE_PRICE_ID_BUSINESS_ANNUAL,
  large_monthly:        process.env.STRIPE_PRICE_ID_LARGE_MONTHLY,
  large_annual:         process.env.STRIPE_PRICE_ID_LARGE_ANNUAL,
  ultra_monthly:        process.env.STRIPE_PRICE_ID_ULTRA_MONTHLY,
  ultra_annual:         process.env.STRIPE_PRICE_ID_ULTRA_ANNUAL,
  enterprise_monthly:   process.env.STRIPE_PRICE_ID_ENTERPRISE_MONTHLY,
  enterprise_annual:    process.env.STRIPE_PRICE_ID_ENTERPRISE_ANNUAL,
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/subscriptions/stripe/create
 *
 * Creates a Stripe subscription checkout session for the authenticated company.
 * Returns the checkout URL for the user to complete payment.
 *
 * Request body:
 * {
 *   planType: 'monthly' | 'yearly' (defaults to 'monthly')
 * }
 */
export async function POST(request: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe is not configured. Set STRIPE_SECRET_KEY.' },
        { status: 500 }
      )
    }

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
        } catch {
          /* use raw value */
        }
        const session = JSON.parse(cookieValue)
        companyId = session.companyId || session.company?.id
        userId = session.userId || session.user?.id
        email = session.email || session.user?.email
      } catch (e) {
        console.log('[Stripe Subscription Create] Failed to parse session cookie:', e)
      }
    }

    if (!userId || !companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ─── 2. Parse request body ───
    const body = await request.json().catch(() => ({}))
    const planType: 'monthly' | 'yearly' = body?.planType === 'yearly' ? 'yearly' : 'monthly'
    const planName: string | undefined = body?.planName
    const billing: string = body?.billing === 'annual' ? 'annual' : 'monthly'

    // ─── 3. Get price ID from env ───
    // If planName is provided (from /pricing page), look up per-plan price ID.
    // Otherwise fall back to legacy STRIPE_PRICE_ID_MONTHLY / YEARLY.
    let priceId: string | undefined
    if (planName) {
      const key = `${planName.toLowerCase()}_${billing}`
      priceId = PLAN_PRICE_IDS[key]
    }
    if (!priceId) {
      priceId = planType === 'yearly'
        ? process.env.STRIPE_PRICE_ID_YEARLY
        : process.env.STRIPE_PRICE_ID_MONTHLY
    }

    if (!priceId) {
      console.error(`[Stripe Subscription Create] Price ID not configured for: ${planName || planType}`)
      return NextResponse.json(
        { error: `Subscription plan not configured. Please contact support.` },
        { status: 500 }
      )
    }

    // ─── 4. Check for existing active subscription (any provider) ───
    const existing = await DatabaseService.getActiveSubscription(companyId)
    let oldSubscriptionId: string | null = null

    if (existing && existing.status === 'active') {
      if (existing.plan_id === priceId) {
        return NextResponse.json(
          { error: 'You are already on this plan' },
          { status: 400 }
        )
      }
      // Different plan — allow switch; cancel old sub after new checkout completes
      oldSubscriptionId = existing.subscription_id || null
    }

    // ─── 5. Create Stripe checkout session ───
    const origin =
      request.headers.get('origin') ||
      `${request.nextUrl.protocol}//${request.nextUrl.host}`

    const { url, sessionId, customerId } = await createSubscriptionCheckoutSession({
      companyId,
      userId,
      email,
      priceId,
      planType,
      origin,
      oldSubscriptionId,
    })

    if (!url) {
      return NextResponse.json(
        { error: 'Failed to create Stripe checkout session' },
        { status: 500 }
      )
    }

    // ─── 6. Store pending subscription record with customer_id ───
    // For plan switches, skip — keep the existing active record intact until the
    // checkout.session.completed webhook fires and upserts the new subscription.
    if (!oldSubscriptionId) await DatabaseService.query(
      `INSERT INTO company_subscriptions (
         company_id, provider, subscription_id, plan_id, status,
         subscriber_email, subscription_link, customer_id, updated_at
       ) VALUES (
         $1::uuid, 'stripe', $2, $3, 'pending', $4, $5, $6, NOW()
       )
       ON CONFLICT (company_id, provider) DO UPDATE SET
         plan_id = EXCLUDED.plan_id,
         status = 'pending',
         subscriber_email = COALESCE(EXCLUDED.subscriber_email, company_subscriptions.subscriber_email),
         subscription_link = EXCLUDED.subscription_link,
         customer_id = COALESCE(EXCLUDED.customer_id, company_subscriptions.customer_id),
         updated_at = NOW()`,
      [
        companyId,
        `stripe_session_${sessionId}`, // placeholder until webhook gives real subscription_id
        priceId,
        email || null,
        url,
        customerId,
      ]
    )

    return NextResponse.json({
      ok: true,
      subscription: {
        sessionId,
        planId: priceId,
        planType,
        checkoutUrl: url,
        customerId,
      },
    })
  } catch (error: any) {
    console.error('[Stripe Subscription Create] Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to create subscription' },
      { status: 500 }
    )
  }
}
