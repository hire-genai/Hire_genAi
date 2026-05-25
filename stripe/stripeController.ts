import Stripe from 'stripe'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { DatabaseService } from '@/lib/database'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY

if (!stripeSecretKey) {
  console.warn('[Stripe] STRIPE_SECRET_KEY is not set. Stripe endpoints will fail.')
}

export const stripe = new Stripe(stripeSecretKey || 'sk_test_placeholder', {
  apiVersion: '2025-01-27.acacia' as any,
})

type SessionInfo = {
  companyId: string | null
  userId: string | null
  email: string | null
}

async function readSession(): Promise<SessionInfo> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  if (!sessionCookie?.value) {
    return { companyId: null, userId: null, email: null }
  }
  try {
    let cookieValue = sessionCookie.value
    try {
      cookieValue = decodeURIComponent(cookieValue)
    } catch {
      /* use raw */
    }
    const session = JSON.parse(cookieValue)
    return {
      companyId: session.companyId || session.company?.id || null,
      userId: session.userId || session.user?.id || null,
      email: session.email || session.user?.email || null,
    }
  } catch {
    return { companyId: null, userId: null, email: null }
  }
}

export async function createCheckoutSession(req: NextRequest) {
  try {
    if (!stripeSecretKey) {
      return NextResponse.json(
        { error: 'Stripe is not configured. Set STRIPE_SECRET_KEY.' },
        { status: 500 }
      )
    }

    const { companyId, userId, email } = await readSession()

    if (!companyId || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const {
      name = 'HireGenAI Wallet Top-up',
      description = 'Add credits to your HireGenAI wallet',
      amount = 1000,
      currency = 'usd',
      quantity = 1,
    }: {
      name?: string
      description?: string
      amount?: number
      currency?: string
      quantity?: number
    } = body

    const origin =
      req.headers.get('origin') ||
      `${req.nextUrl.protocol}//${req.nextUrl.host}`

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency,
            product_data: { name, description },
            unit_amount: amount,
          },
          quantity,
        },
      ],
      customer_email: email || undefined,
      metadata: {
        company_id: companyId,
        user_id: userId,
        email: email || '',
        purpose: 'wallet_topup',
      },
      payment_intent_data: {
        metadata: {
          company_id: companyId,
          user_id: userId,
          email: email || '',
          purpose: 'wallet_topup',
        },
      },
      success_url: `${origin}/settings?tab=payment&stripe_success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/settings?tab=payment&stripe_cancel=1`,
    })

    return NextResponse.json({
      id: session.id,
      url: session.url,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null,
    })
  } catch (err: any) {
    console.error('[Stripe] createCheckoutSession error:', err)
    return NextResponse.json(
      { error: err?.message || 'Stripe checkout creation failed' },
      { status: 500 }
    )
  }
}

export async function getSession(sessionId: string) {
  return stripe.checkout.sessions.retrieve(sessionId)
}

export async function handleWebhookEvent(rawBody: string, signature: string) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not set')
  }

  const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)

  console.log(`[Stripe] Webhook received — type: ${event.type}, id: ${event.id}, livemode: ${event.livemode}`)

  await DatabaseService.logWebhookEvent({
    provider: 'stripe',
    eventType: event.type,
    eventId: event.id,
    rawData: event,
  }).catch((e) => console.error('[Stripe] logWebhookEvent failed:', e))

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await processSuccessfulCheckout(session)
        break
      }
      case 'payment_intent.succeeded': {
        const intent = event.data.object as Stripe.PaymentIntent
        console.log('[Stripe] PaymentIntent succeeded:', intent.id)
        break
      }
      case 'payment_intent.payment_failed': {
        const intent = event.data.object as Stripe.PaymentIntent
        console.warn('[Stripe] PaymentIntent failed:', intent.id, intent.last_payment_error?.message)
        const companyId = (intent.metadata?.company_id as string) || null
        if (companyId) {
          await DatabaseService.recordSubscriptionPayment({
            subscriptionId: `stripe_pi_${intent.id}`,
            provider: 'stripe',
            paymentId: intent.id,
            amount: (intent.amount || 0) / 100,
            currency: (intent.currency || 'usd').toUpperCase(),
            status: 'failed',
            paymentTime: new Date(),
            companyId,
            rawData: intent,
          }).catch((e) => console.error('[Stripe] recordSubscriptionPayment(failed) error:', e))
        }
        break
      }
      default:
        console.log('[Stripe] Unhandled event:', event.type)
    }
  } catch (e) {
    console.error(`[Stripe] Event processing failed — type: ${event.type}, id: ${event.id}`, e)
  }

  return event
}

export async function processSuccessfulCheckout(session: Stripe.Checkout.Session) {
  const sessionId = session.id
  const companyId =
    (session.metadata?.company_id as string) ||
    (typeof session.payment_intent === 'object'
      ? (session.payment_intent?.metadata?.company_id as string)
      : null) ||
    null

  const email = session.customer_email || (session.metadata?.email as string) || null
  const amountTotal = (session.amount_total || 0) / 100
  const currency = (session.currency || 'usd').toUpperCase()
  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id || sessionId

  console.log(
    `[Stripe] Checkout completed — session: ${sessionId}, company: ${companyId}, amount: ${amountTotal} ${currency}`
  )

  let resolvedCompanyId = companyId
  if (!resolvedCompanyId && email) {
    try {
      const rows = (await DatabaseService.query(
        `SELECT c.id AS company_id
           FROM users u
           JOIN companies c ON c.id = u.company_id
          WHERE u.email = $1
          LIMIT 1`,
        [email]
      )) as any[]
      if (rows.length > 0) resolvedCompanyId = rows[0].company_id
    } catch (e) {
      console.error('[Stripe] Failed to resolve company by email:', e)
    }
  }

  if (!resolvedCompanyId) {
    console.error('[Stripe] No company_id for completed checkout — cannot credit wallet')
    return
  }

  const existing = (await DatabaseService.query(
    `SELECT id, status FROM subscription_payments
      WHERE provider = 'stripe' AND payment_id = $1
      LIMIT 1`,
    [paymentIntentId]
  )) as any[]
  const alreadyCaptured = existing.length > 0 && existing[0].status === 'captured'

  try {
    await DatabaseService.query(
      `INSERT INTO subscription_payments (
         subscription_id, company_id, provider, payment_id,
         amount, currency, status, payment_time, raw_data
       ) VALUES ($1, $2::uuid, $3, $4, $5, $6, $7, $8, $9::jsonb)
       ON CONFLICT (payment_id, provider) DO UPDATE SET
         status = EXCLUDED.status,
         amount = EXCLUDED.amount,
         currency = EXCLUDED.currency,
         payment_time = EXCLUDED.payment_time,
         raw_data = EXCLUDED.raw_data,
         company_id = COALESCE(subscription_payments.company_id, EXCLUDED.company_id)`,
      [
        `stripe_session_${sessionId}`,
        resolvedCompanyId,
        'stripe',
        paymentIntentId,
        amountTotal,
        currency,
        'captured',
        new Date().toISOString(),
        JSON.stringify(session),
      ]
    )
    console.log(`[Stripe] subscription_payments row written for ${paymentIntentId}`)
  } catch (e) {
    console.error('[Stripe] subscription_payments insert failed:', e)
  }

  if (alreadyCaptured) {
    console.log(`[Stripe] Payment ${paymentIntentId} already credited — skipping wallet update`)
    return
  }

  await DatabaseService.query(
    `INSERT INTO company_billing (company_id, wallet_balance, status, created_at, updated_at)
     VALUES ($1::uuid, 0, 'active', NOW(), NOW())
     ON CONFLICT (company_id) DO NOTHING`,
    [resolvedCompanyId]
  )

  const before = (await DatabaseService.query(
    `SELECT wallet_balance FROM company_billing WHERE company_id = $1::uuid`,
    [resolvedCompanyId]
  )) as any[]
  const balanceBefore = before.length > 0 ? parseFloat(before[0].wallet_balance) : 0

  const updated = (await DatabaseService.query(
    `UPDATE company_billing
        SET wallet_balance = wallet_balance + $2,
            status = 'active',
            updated_at = NOW()
      WHERE company_id = $1::uuid
      RETURNING wallet_balance`,
    [resolvedCompanyId, amountTotal]
  )) as any[]
  const balanceAfter = updated.length > 0 ? parseFloat(updated[0].wallet_balance) : balanceBefore + amountTotal
  console.log(`[Stripe] company_billing updated — balance: ${balanceBefore} → ${balanceAfter}`)

  try {
    await DatabaseService.query(
      `INSERT INTO usage_ledger (
         company_id, entry_type, description,
         quantity, unit_price, amount,
         balance_before, balance_after, metadata, created_at
       ) VALUES (
         $1::uuid, $2::ledger_entry_type, $3,
         1, $4, $4,
         $5, $6, $7::jsonb, NOW()
       )`,
      [
        resolvedCompanyId,
        'WALLET_TOPUP',
        `Stripe payment — Session ${sessionId}`,
        amountTotal,
        balanceBefore,
        balanceAfter,
        JSON.stringify({
          provider: 'stripe',
          sessionId,
          paymentIntentId,
          currency,
        }),
      ]
    )
    console.log(`[Stripe] usage_ledger entry written for ${sessionId}`)
  } catch (e) {
    console.error('[Stripe] usage_ledger insert failed:', e)
  }

  try {
    await DatabaseService.activateCompanyFromSubscription(resolvedCompanyId)
  } catch (e) {
    console.error('[Stripe] activateCompanyFromSubscription error:', e)
  }

  try {
    const restoredJobs = await DatabaseService.restoreJobsAfterRecharge(resolvedCompanyId)
    const restoredInterviews = await DatabaseService.restoreInterviewsAfterRecharge(resolvedCompanyId)
    if (restoredJobs > 0 || restoredInterviews > 0) {
      console.log(`[Stripe] Restored ${restoredJobs} jobs and ${restoredInterviews} interviews after top-up`)
    }
  } catch (e) {
    console.error('[Stripe] restore after recharge error:', e)
  }

  console.log(
    `[Stripe] Wallet credited — company: ${resolvedCompanyId}, +${amountTotal} ${currency}, new balance: ${balanceAfter}`
  )
}
