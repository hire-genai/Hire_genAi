import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { DatabaseService } from '@/lib/database'
import { stripe } from '@/stripe/stripeController'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function getCompanyId(): Promise<string | null> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  if (!sessionCookie?.value) return null
  try {
    let val = sessionCookie.value
    try { val = decodeURIComponent(val) } catch { /* use raw */ }
    const sess = JSON.parse(val)
    return sess.companyId || sess.company?.id || null
  } catch {
    return null
  }
}

/**
 * GET /api/billing/stripe/saved-card
 * Returns the saved Stripe card details (stripe_pm_id, last4, network, etc.) and
 * whether auto-recharge is enabled for the company.
 */
export async function GET(_request: NextRequest) {
  try {
    const companyId = await getCompanyId()
    if (!companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const rows = await DatabaseService.query(
      `SELECT
         stripe_pm_id,
         stripe_card_last4,
         stripe_card_network,
         stripe_card_type,
         stripe_card_fingerprint,
         stripe_card_saved_at,
         customer_id
       FROM company_subscriptions
       WHERE company_id = $1::uuid AND provider = 'stripe'
       ORDER BY updated_at DESC
       LIMIT 1`,
      [companyId]
    ) as any[]

    const billingRows = await DatabaseService.query(
      `SELECT auto_recharge_enabled FROM company_billing WHERE company_id = $1::uuid`,
      [companyId]
    ) as any[]
    const autoRechargeEnabled = billingRows[0]?.auto_recharge_enabled ?? false

    if (rows.length === 0 || !rows[0].stripe_pm_id) {
      return NextResponse.json({
        ok: true,
        hasSavedCard: false,
        card: null,
        autoRechargeEnabled,
      })
    }

    const r = rows[0]
    return NextResponse.json({
      ok: true,
      hasSavedCard: true,
      card: {
        last4: r.stripe_card_last4,
        network: r.stripe_card_network,
        type: r.stripe_card_type,
        fingerprint: r.stripe_card_fingerprint,
        savedAt: r.stripe_card_saved_at,
      },
      autoRechargeEnabled,
    })
  } catch (error: any) {
    console.error('[Stripe Saved Card] GET Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch saved card' }, { status: 500 })
  }
}

/**
 * POST /api/billing/stripe/saved-card
 * Called after the Stripe Checkout setup session completes.
 * Body: { sessionId: string }
 * Retrieves the SetupIntent payment method from the session and saves card details to DB.
 */
export async function POST(request: NextRequest) {
  try {
    const companyId = await getCompanyId()
    if (!companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { sessionId } = await request.json()
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
    }

    // Retrieve the Checkout Session to get the setup_intent
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['setup_intent.payment_method'],
    })

    if (session.mode !== 'setup') {
      return NextResponse.json({ error: 'Invalid session mode' }, { status: 400 })
    }

    const setupIntent = session.setup_intent as any
    if (!setupIntent) {
      return NextResponse.json({ error: 'No setup intent found in session' }, { status: 400 })
    }

    const paymentMethod = typeof setupIntent.payment_method === 'object'
      ? setupIntent.payment_method
      : null

    if (!paymentMethod) {
      return NextResponse.json({ error: 'Payment method not attached to setup intent' }, { status: 400 })
    }

    const card = paymentMethod.card || {}
    const pmId: string = paymentMethod.id
    const last4: string | null = card.last4 || null
    const network: string | null = card.brand || null
    const type: string | null = card.funding || null
    const fingerprint: string | null = card.fingerprint || null

    // Save to company_subscriptions (upsert for provider='stripe')
    await DatabaseService.query(
      `INSERT INTO company_subscriptions (company_id, provider, subscription_id, stripe_pm_id, stripe_card_last4, stripe_card_network, stripe_card_type, stripe_card_fingerprint, stripe_card_saved_at, status, created_at, updated_at)
       VALUES ($1::uuid, 'stripe', 'auto_recharge_only', $2, $3, $4, $5, $6, NOW(), 'active', NOW(), NOW())
       ON CONFLICT (company_id, provider) DO UPDATE SET
         stripe_pm_id             = EXCLUDED.stripe_pm_id,
         stripe_card_last4        = EXCLUDED.stripe_card_last4,
         stripe_card_network      = EXCLUDED.stripe_card_network,
         stripe_card_type         = EXCLUDED.stripe_card_type,
         stripe_card_fingerprint  = EXCLUDED.stripe_card_fingerprint,
         stripe_card_saved_at     = NOW(),
         updated_at               = NOW()`,
      [companyId, pmId, last4, network, type, fingerprint]
    )

    console.log(`[Stripe Saved Card] Card saved for company: ${companyId}, pm: ${pmId}`)

    return NextResponse.json({
      ok: true,
      message: 'Card saved successfully for auto-recharge',
      card: { last4, network, type },
    })
  } catch (error: any) {
    console.error('[Stripe Saved Card] POST Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to save card' }, { status: 500 })
  }
}

/**
 * DELETE /api/billing/stripe/saved-card
 * Detaches the saved PaymentMethod from Stripe and clears card columns from DB.
 * Also disables auto-recharge.
 */
export async function DELETE(_request: NextRequest) {
  try {
    const companyId = await getCompanyId()
    if (!companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Get the saved pm_id
    const rows = await DatabaseService.query(
      `SELECT stripe_pm_id FROM company_subscriptions
       WHERE company_id = $1::uuid AND provider = 'stripe'
       LIMIT 1`,
      [companyId]
    ) as any[]

    const pmId: string | null = rows[0]?.stripe_pm_id || null

    // Detach from Stripe if it exists
    if (pmId) {
      try {
        await stripe.paymentMethods.detach(pmId)
        console.log(`[Stripe Saved Card] Detached PM ${pmId} for company: ${companyId}`)
      } catch (e: any) {
        // Log but don't block — PM might already be detached
        console.warn(`[Stripe Saved Card] PM detach warning (${pmId}):`, e.message)
      }
    }

    // Clear stripe card columns from DB
    await DatabaseService.query(
      `UPDATE company_subscriptions SET
         stripe_pm_id            = NULL,
         stripe_card_last4       = NULL,
         stripe_card_network     = NULL,
         stripe_card_type        = NULL,
         stripe_card_fingerprint = NULL,
         stripe_card_saved_at    = NULL,
         updated_at              = NOW()
       WHERE company_id = $1::uuid AND provider = 'stripe'`,
      [companyId]
    )

    // Disable auto-recharge
    await DatabaseService.query(
      `UPDATE company_billing SET auto_recharge_enabled = FALSE, updated_at = NOW()
       WHERE company_id = $1::uuid`,
      [companyId]
    )

    console.log(`[Stripe Saved Card] Card removed and auto-recharge disabled for company: ${companyId}`)

    return NextResponse.json({ ok: true, message: 'Card removed and auto-recharge disabled' })
  } catch (error: any) {
    console.error('[Stripe Saved Card] DELETE Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to remove card' }, { status: 500 })
  }
}
