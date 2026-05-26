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
        if (session.mode === 'subscription') {
          await processSubscriptionCheckoutCompleted(session)
        } else {
          await processSuccessfulCheckout(session)
        }
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await processSubscriptionEvent(subscription, event.type)
        break
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        await processInvoicePaymentSucceeded(invoice)
        break
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await processInvoicePaymentFailed(invoice)
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

// ============================================================================
// SUBSCRIPTION FLOW — Mirrors Razorpay subscription handling
// ============================================================================

/**
 * Map Stripe subscription status to our internal status
 */
function mapStripeSubscriptionStatus(stripeStatus: string): string {
  switch (stripeStatus) {
    case 'active':
    case 'trialing':
      return 'active'
    case 'past_due':
    case 'unpaid':
      return 'halted'
    case 'canceled':
      return 'cancelled'
    case 'incomplete':
    case 'incomplete_expired':
      return 'pending'
    case 'paused':
      return 'paused'
    default:
      return stripeStatus
  }
}

/**
 * Get or create a Stripe Customer for a company
 */
export async function getOrCreateStripeCustomer(params: {
  companyId: string
  email?: string | null
  userId?: string | null
}): Promise<string> {
  const { companyId, email, userId } = params

  // Check if we already have a Stripe customer for this company
  const existing = (await DatabaseService.query(
    `SELECT customer_id FROM company_subscriptions
     WHERE company_id = $1::uuid AND provider = 'stripe' AND customer_id IS NOT NULL
     LIMIT 1`,
    [companyId]
  )) as any[]

  if (existing.length > 0 && existing[0].customer_id) {
    console.log(`[Stripe] Reusing existing Stripe customer: ${existing[0].customer_id}`)
    return existing[0].customer_id as string
  }

  // Create a new Stripe Customer
  const customer = await stripe.customers.create({
    email: email || undefined,
    metadata: {
      company_id: companyId,
      user_id: userId || '',
    },
  })

  console.log(`[Stripe] Created new Stripe customer: ${customer.id} for company: ${companyId}`)
  return customer.id
}

/**
 * Build enriched payment details from Stripe invoice / payment_intent / charge
 * Mirrors the Razorpay enrichedPayment structure for consistent storage.
 */
async function buildEnrichedStripePayment(params: {
  invoice?: Stripe.Invoice
  paymentIntent?: Stripe.PaymentIntent
}): Promise<any> {
  const { invoice } = params
  let paymentIntent = params.paymentIntent
  const invoiceAny = invoice as any

  // If invoice provided, fetch expanded payment_intent + charges
  if (invoice && !paymentIntent && invoiceAny.payment_intent) {
    const piId =
      typeof invoiceAny.payment_intent === 'string'
        ? invoiceAny.payment_intent
        : invoiceAny.payment_intent?.id
    if (piId) {
      try {
        paymentIntent = await stripe.paymentIntents.retrieve(piId, {
          expand: ['payment_method', 'latest_charge'],
        })
      } catch (e) {
        console.error('[Stripe] Failed to fetch expanded payment_intent:', e)
      }
    }
  }

  const charge =
    paymentIntent && typeof (paymentIntent as any).latest_charge === 'object'
      ? ((paymentIntent as any).latest_charge as Stripe.Charge)
      : null

  const paymentMethodObj =
    paymentIntent && typeof (paymentIntent as any).payment_method === 'object'
      ? ((paymentIntent as any).payment_method as Stripe.PaymentMethod)
      : null

  const methodType =
    paymentMethodObj?.type ||
    charge?.payment_method_details?.type ||
    'card'

  const cardDetails =
    paymentMethodObj?.card ||
    (charge?.payment_method_details as any)?.card ||
    null

  const amount =
    (invoice?.amount_paid ?? paymentIntent?.amount_received ?? paymentIntent?.amount ?? 0) / 100
  const currency = (invoice?.currency || paymentIntent?.currency || 'usd').toUpperCase()
  const invoicePaid = invoice ? (invoice as any).paid === true || (invoice as any).status === 'paid' : false
  const status = paymentIntent?.status === 'succeeded' || invoicePaid ? 'captured' : (paymentIntent?.status || 'unknown')

  return {
    paymentId: paymentIntent?.id || invoice?.id || `stripe_inv_${invoice?.id}`,
    amount,
    currency,
    status,
    method: methodType,
    authType: null,
    bank: (charge?.payment_method_details as any)?.bank_transfer?.country || null,
    wallet: null,
    vpa: null,
    email: invoice?.customer_email || charge?.billing_details?.email || null,
    contact: charge?.billing_details?.phone || null,
    card: cardDetails
      ? {
          network: cardDetails.brand || cardDetails.network || null,
          type: cardDetails.funding || null,
          last4: cardDetails.last4 || null,
          issuer: cardDetails.country || null,
        }
      : null,
    createdAt: invoice?.created
      ? new Date(invoice.created * 1000)
      : paymentIntent?.created
      ? new Date(paymentIntent.created * 1000)
      : new Date(),
    rawData: {
      invoice: invoice || null,
      payment_intent: paymentIntent || null,
      charge: charge || null,
      payment_method: paymentMethodObj || null,
    },
  }
}

/**
 * Resolve company_id from Stripe metadata or by customer lookup
 */
async function resolveCompanyIdFromStripe(params: {
  metadata?: Stripe.Metadata | null
  customerId?: string | null
  email?: string | null
  subscriptionId?: string | null
}): Promise<string | null> {
  const { metadata, customerId, email, subscriptionId } = params

  // 1. Direct from metadata
  if (metadata?.company_id) return metadata.company_id as string

  // 2. Look up by subscription_id — most reliable, always set when checkout completes
  if (subscriptionId) {
    const bySub = (await DatabaseService.query(
      `SELECT company_id FROM company_subscriptions
       WHERE subscription_id = $1 AND provider = 'stripe'
       LIMIT 1`,
      [subscriptionId]
    )) as any[]
    if (bySub.length > 0) return bySub[0].company_id as string
  }

  // 3. Look up by Stripe customer_id stored in our DB
  if (customerId) {
    const byCustomer = (await DatabaseService.query(
      `SELECT company_id FROM company_subscriptions
       WHERE customer_id = $1 AND provider = 'stripe'
       LIMIT 1`,
      [customerId]
    )) as any[]
    if (byCustomer.length > 0) return byCustomer[0].company_id as string
  }

  // 4. Fallback to email lookup
  if (email) {
    const byEmail = (await DatabaseService.query(
      `SELECT c.id AS company_id
       FROM users u
       JOIN companies c ON c.id = u.company_id
       WHERE u.email = $1
       LIMIT 1`,
      [email]
    )) as any[]
    if (byEmail.length > 0) return byEmail[0].company_id as string
  }

  return null
}

/**
 * Handle checkout.session.completed for subscription mode
 * Stores initial subscription record. Wallet credit happens via invoice.payment_succeeded.
 */
export async function processSubscriptionCheckoutCompleted(
  session: Stripe.Checkout.Session
) {
  console.log(`[Stripe] Subscription checkout completed — session: ${session.id}`)

  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id || null

  if (!subscriptionId) {
    console.error('[Stripe] No subscription ID in completed checkout session')
    return
  }

  const customerId =
    typeof session.customer === 'string'
      ? session.customer
      : session.customer?.id || null

  const email = session.customer_email || (session.metadata?.email as string) || null
  const companyId = await resolveCompanyIdFromStripe({
    metadata: session.metadata,
    customerId,
    email,
  })

  if (!companyId) {
    console.error('[Stripe] Could not resolve company for subscription checkout:', session.id)
    return
  }

  // Fetch full subscription details from Stripe
  let subscription: Stripe.Subscription
  try {
    subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['default_payment_method', 'latest_invoice.payment_intent'],
    })
  } catch (e) {
    console.error('[Stripe] Failed to retrieve subscription:', e)
    return
  }

  const priceId = subscription.items.data[0]?.price?.id || null
  const status = mapStripeSubscriptionStatus(subscription.status)
  const startTime = subscription.start_date
    ? new Date(subscription.start_date * 1000)
    : new Date()
  const nextBillingTime = (subscription as any).current_period_end
    ? new Date((subscription as any).current_period_end * 1000)
    : undefined

  await DatabaseService.upsertSubscription({
    companyId,
    provider: 'stripe',
    subscriptionId: subscription.id,
    planId: priceId || undefined,
    status,
    subscriberEmail: email || undefined,
    startTime,
    nextBillingTime,
    subscriptionLink: undefined, // Set later via customer portal or kept as null
    rawData: subscription,
  })

  // Save customer_id + default payment method as token_id (mirrors Razorpay)
  const defaultPm = typeof subscription.default_payment_method === 'object'
    ? subscription.default_payment_method
    : null
  const tokenId =
    defaultPm?.id ||
    (typeof subscription.default_payment_method === 'string'
      ? subscription.default_payment_method
      : null)

  if (customerId || tokenId) {
    await DatabaseService.query(
      `UPDATE company_subscriptions
       SET customer_id = COALESCE($2, customer_id),
           token_id = COALESCE($3, token_id),
           updated_at = NOW()
       WHERE company_id = $1::uuid AND provider = 'stripe' AND subscription_id = $4`,
      [companyId, customerId || null, tokenId || null, subscription.id]
    )
  }

  // Activate company billing
  try {
    await DatabaseService.activateCompanyFromSubscription(companyId)
    console.log(`[Stripe] Company billing activated for: ${companyId}`)
  } catch (e) {
    console.error('[Stripe] activateCompanyFromSubscription error:', e)
  }

  console.log(
    `[Stripe] Subscription stored — company: ${companyId}, subscription: ${subscription.id}, status: ${status}`
  )
}

/**
 * Handle customer.subscription.* events (created, updated, deleted)
 */
export async function processSubscriptionEvent(
  subscription: Stripe.Subscription,
  eventType: string
) {
  console.log(
    `[Stripe] Subscription event: ${eventType} — id: ${subscription.id}, status: ${subscription.status}`
  )

  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id || null

  const companyId = await resolveCompanyIdFromStripe({
    metadata: subscription.metadata,
    customerId,
  })

  if (!companyId) {
    console.error(`[Stripe] Could not resolve company for subscription event: ${subscription.id}`)
    return
  }

  const priceId = subscription.items.data[0]?.price?.id || null
  const mappedStatus = mapStripeSubscriptionStatus(subscription.status)
  const nextBillingTime = (subscription as any).current_period_end
    ? new Date((subscription as any).current_period_end * 1000)
    : undefined

  // For deleted event, force status to cancelled
  const finalStatus = eventType === 'customer.subscription.deleted' ? 'cancelled' : mappedStatus

  await DatabaseService.upsertSubscription({
    companyId,
    provider: 'stripe',
    subscriptionId: subscription.id,
    planId: priceId || undefined,
    status: finalStatus,
    nextBillingTime,
    rawData: subscription,
  })

  // Track cancel_at_period_end flag from Stripe
  if (subscription.cancel_at_period_end !== undefined) {
    await DatabaseService.query(
      `UPDATE company_subscriptions
       SET cancel_at_cycle_end = $2, updated_at = NOW()
       WHERE company_id = $1::uuid AND provider = 'stripe' AND subscription_id = $3`,
      [companyId, subscription.cancel_at_period_end === true, subscription.id]
    )
  }

  // Save default payment method
  const tokenId =
    typeof subscription.default_payment_method === 'string'
      ? subscription.default_payment_method
      : subscription.default_payment_method?.id || null

  if (customerId || tokenId) {
    await DatabaseService.query(
      `UPDATE company_subscriptions
       SET customer_id = COALESCE($2, customer_id),
           token_id = COALESCE($3, token_id),
           updated_at = NOW()
       WHERE company_id = $1::uuid AND provider = 'stripe' AND subscription_id = $4`,
      [companyId, customerId || null, tokenId || null, subscription.id]
    )
  }

  console.log(
    `[Stripe] Subscription status updated — company: ${companyId}, status: ${finalStatus}, cancel_at_period_end: ${subscription.cancel_at_period_end}`
  )
}

/**
 * Handle invoice.payment_succeeded — credit wallet by invoice amount
 * Triggered for BOTH initial subscription payment and recurring renewals.
 */
export async function processInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log(
    `[Stripe] Invoice payment succeeded — id: ${invoice.id}, amount: ${(invoice.amount_paid || 0) / 100} ${invoice.currency}, reason: ${(invoice as any).billing_reason}`
  )

  const subscriptionId =
    typeof (invoice as any).subscription === 'string'
      ? (invoice as any).subscription
      : (invoice as any).subscription?.id || null

  if (!subscriptionId) {
    console.log('[Stripe] Invoice has no subscription — skipping (not a subscription invoice)')
    return
  }

  const customerId =
    typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id || null

  const companyId = await resolveCompanyIdFromStripe({
    metadata: (invoice as any).subscription_details?.metadata || null,
    customerId,
    email: invoice.customer_email,
    subscriptionId,
  })

  if (!companyId) {
    console.error(`[Stripe] Could not resolve company for invoice: ${invoice.id}, subscriptionId: ${subscriptionId}, customerId: ${customerId}`)
    return
  }

  const enriched = await buildEnrichedStripePayment({ invoice })
  const amountPaid = enriched.amount

  if (amountPaid <= 0) {
    console.log(`[Stripe] Invoice ${invoice.id} has zero amount — skipping wallet credit`)
    return
  }

  // Idempotency: check if this payment was already recorded
  const existing = (await DatabaseService.query(
    `SELECT id, status FROM subscription_payments
     WHERE provider = 'stripe' AND payment_id = $1
     LIMIT 1`,
    [enriched.paymentId]
  )) as any[]
  const alreadyCaptured = existing.length > 0 && existing[0].status === 'captured'

  // Record payment (idempotent via UNIQUE constraint)
  await DatabaseService.recordSubscriptionPayment({
    subscriptionId,
    provider: 'stripe',
    paymentId: enriched.paymentId,
    amount: amountPaid,
    currency: enriched.currency,
    status: 'captured',
    paymentTime: enriched.createdAt,
    companyId,
    rawData: enriched,
  })
  console.log(`[Stripe] Recorded subscription_payment: ${enriched.paymentId}`)

  if (alreadyCaptured) {
    console.log(`[Stripe] Payment ${enriched.paymentId} already credited — skipping wallet update`)
    return
  }

  // Ensure company_billing exists
  await DatabaseService.query(
    `INSERT INTO company_billing (company_id, wallet_balance, status, created_at, updated_at)
     VALUES ($1::uuid, 0, 'active', NOW(), NOW())
     ON CONFLICT (company_id) DO NOTHING`,
    [companyId]
  )

  // Get balance before
  const before = (await DatabaseService.query(
    `SELECT wallet_balance FROM company_billing WHERE company_id = $1::uuid`,
    [companyId]
  )) as any[]
  const balanceBefore = before.length > 0 ? parseFloat(before[0].wallet_balance) : 0

  // Credit wallet by exact invoice amount paid
  const updated = (await DatabaseService.query(
    `UPDATE company_billing
        SET wallet_balance = wallet_balance + $2,
            status = 'active',
            updated_at = NOW()
      WHERE company_id = $1::uuid
      RETURNING wallet_balance`,
    [companyId, amountPaid]
  )) as any[]
  const balanceAfter =
    updated.length > 0 ? parseFloat(updated[0].wallet_balance) : balanceBefore + amountPaid

  console.log(
    `[Stripe] Wallet credited — company: ${companyId}, +${amountPaid} ${enriched.currency}, balance: ${balanceBefore} → ${balanceAfter}`
  )

  // Add usage_ledger entry
  try {
    await DatabaseService.addLedgerEntry({
      companyId,
      entryType: 'WALLET_TOPUP',
      description: `Stripe subscription payment — Invoice ${invoice.id}`,
      amount: amountPaid,
      balanceBefore,
      balanceAfter,
      metadata: {
        provider: 'stripe',
        subscriptionId,
        invoiceId: invoice.id,
        paymentId: enriched.paymentId,
        billingReason: (invoice as any).billing_reason,
        currency: enriched.currency,
      },
    })
  } catch (e) {
    console.error('[Stripe] addLedgerEntry failed:', e)
  }

  // Update subscription with next billing time
  const subscriptionFresh = await stripe.subscriptions
    .retrieve(subscriptionId)
    .catch(() => null)
  if (subscriptionFresh) {
    const nextBilling = (subscriptionFresh as any).current_period_end
      ? new Date((subscriptionFresh as any).current_period_end * 1000)
      : undefined
    await DatabaseService.updateSubscriptionStatus(
      companyId,
      'stripe',
      mapStripeSubscriptionStatus(subscriptionFresh.status),
      nextBilling
    )
  }

  // Ensure company is active
  try {
    await DatabaseService.activateCompanyFromSubscription(companyId)
  } catch (e) {
    console.error('[Stripe] activateCompanyFromSubscription error:', e)
  }

  // Restore jobs/interviews on hold
  try {
    const restoredJobs = await DatabaseService.restoreJobsAfterRecharge(companyId)
    const restoredInterviews = await DatabaseService.restoreInterviewsAfterRecharge(companyId)
    if (restoredJobs > 0 || restoredInterviews > 0) {
      console.log(
        `[Stripe] Restored ${restoredJobs} jobs and ${restoredInterviews} interviews after subscription payment`
      )
    }
  } catch (e) {
    console.error('[Stripe] restore after subscription payment error:', e)
  }
}

/**
 * Handle invoice.payment_failed — record failure, mark subscription halted
 */
export async function processInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.warn(`[Stripe] Invoice payment failed — id: ${invoice.id}`)

  const subscriptionId =
    typeof (invoice as any).subscription === 'string'
      ? (invoice as any).subscription
      : (invoice as any).subscription?.id || null

  if (!subscriptionId) return

  const customerId =
    typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id || null

  const companyId = await resolveCompanyIdFromStripe({
    metadata: (invoice as any).subscription_details?.metadata || null,
    customerId,
    email: invoice.customer_email,
    subscriptionId,
  })

  if (!companyId) return

  const enriched = await buildEnrichedStripePayment({ invoice })

  await DatabaseService.recordSubscriptionPayment({
    subscriptionId,
    provider: 'stripe',
    paymentId: enriched.paymentId,
    amount: enriched.amount,
    currency: enriched.currency,
    status: 'failed',
    paymentTime: enriched.createdAt,
    companyId,
    rawData: enriched,
  }).catch((e) => console.error('[Stripe] recordSubscriptionPayment(failed) error:', e))

  // Don't immediately halt — Stripe will retry. Let customer.subscription.updated mark past_due.
  console.log(`[Stripe] Recorded failed invoice payment for company: ${companyId}`)
}

/**
 * Create a subscription checkout session
 * Returns { url, sessionId, customerId } for the client to redirect.
 */
export async function createSubscriptionCheckoutSession(params: {
  companyId: string
  userId: string
  email: string | null
  priceId: string
  planType: string
  origin: string
}): Promise<{ url: string | null; sessionId: string; customerId: string }> {
  const { companyId, userId, email, priceId, planType, origin } = params

  const customerId = await getOrCreateStripeCustomer({ companyId, email, userId })

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: {
      company_id: companyId,
      user_id: userId,
      email: email || '',
      plan_type: planType,
      purpose: 'subscription',
    },
    subscription_data: {
      metadata: {
        company_id: companyId,
        user_id: userId,
        email: email || '',
        plan_type: planType,
      },
    },
    success_url: `${origin}/settings?tab=payment&stripe_sub_success=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/settings?tab=payment&stripe_sub_cancel=1`,
  })

  return {
    url: session.url,
    sessionId: session.id,
    customerId,
  }
}
