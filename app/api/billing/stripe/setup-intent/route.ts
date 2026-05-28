import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { DatabaseService } from '@/lib/database'
import { stripe, getOrCreateStripeCustomer } from '@/stripe/stripeController'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/billing/stripe/setup-intent
 *
 * Creates a Stripe Checkout Session in `setup` mode so the user can save a card
 * for auto-recharge. Returns { url } to redirect the user to Stripe's hosted page.
 *
 * On success Stripe redirects to:
 *   /settings?tab=payment&stripe_card_saved=1&session_id={CHECKOUT_SESSION_ID}
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')

    let companyId: string | null = null
    let email: string | null = null
    let userId: string | null = null

    if (sessionCookie?.value) {
      try {
        let val = sessionCookie.value
        try { val = decodeURIComponent(val) } catch { /* use raw */ }
        const sess = JSON.parse(val)
        companyId = sess.companyId || sess.company?.id || null
        email = sess.email || sess.user?.email || null
        userId = sess.userId || sess.user?.id || null
      } catch { /* ignore */ }
    }

    if (!companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!email) {
      const rows = await DatabaseService.query(
        `SELECT email FROM users WHERE company_id = $1::uuid ORDER BY created_at ASC LIMIT 1`,
        [companyId]
      ) as any[]
      email = rows[0]?.email || null
    }

    const customerId = await getOrCreateStripeCustomer({ companyId, email, userId })

    // Persist customer_id so it survives even if no subscription row existed
    await DatabaseService.query(
      `INSERT INTO company_subscriptions (company_id, provider, subscription_id, customer_id, status, created_at, updated_at)
       VALUES ($1::uuid, 'stripe', 'auto_recharge_only', $2, 'active', NOW(), NOW())
       ON CONFLICT (company_id, provider) DO UPDATE SET
         customer_id = COALESCE(EXCLUDED.customer_id, company_subscriptions.customer_id),
         updated_at = NOW()`,
      [companyId, customerId]
    )

    const origin =
      request.headers.get('origin') ||
      `${request.nextUrl.protocol}//${request.nextUrl.host}`

    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      customer: customerId,
      payment_method_types: ['card'],
      metadata: {
        company_id: companyId,
        purpose: 'save_card_auto_recharge',
      },
      success_url: `${origin}/settings?tab=payment&stripe_card_saved=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/settings?tab=payment&stripe_card_cancel=1`,
    })

    console.log(`[Stripe SetupIntent] Checkout session created: ${session.id} for company: ${companyId}`)

    return NextResponse.json({ ok: true, url: session.url, sessionId: session.id })
  } catch (error: any) {
    console.error('[Stripe SetupIntent] Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to create setup session' }, { status: 500 })
  }
}
