import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/razorpay/webhook
 * 
 * Razorpay sends webhook events here for subscription management.
 * This endpoint handles ONLY subscription events:
 * 
 * - subscription.activated - Subscription started, update status to active
 * - subscription.charged - Recurring payment successful, update next_billing_time
 * - subscription.halted - Payment failed, update status to halted
 * - subscription.cancelled - Subscription cancelled, update status to cancelled
 * - subscription.completed - Subscription ended normally, update status to completed
 * 
 * All events:
 * 1. Verify webhook signature using RAZORPAY_WEBHOOK_SECRET
 * 2. Log event to webhook_logs table
 * 3. Process based on event type
 * 4. Return 200 to acknowledge receipt
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-razorpay-signature') || ''

    console.log('[Razorpay Webhook] Received event')

    // ─── 1. Verify webhook signature ───
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET

    if (!webhookSecret) {
      console.error('[Razorpay Webhook] RAZORPAY_WEBHOOK_SECRET not configured')
      // Still return 200 to avoid Razorpay retrying endlessly
      return NextResponse.json({ ok: false, error: 'Webhook secret not configured' }, { status: 200 })
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex')

    if (expectedSignature !== signature) {
      console.error('[Razorpay Webhook] Invalid signature')
      console.error('[Razorpay Webhook] Expected:', expectedSignature)
      console.error('[Razorpay Webhook] Received:', signature)
      return NextResponse.json({ ok: false, error: 'Invalid signature' }, { status: 400 })
    }

    console.log('[Razorpay Webhook] Signature verified ✅')

    // ─── 2. Parse event ───
    const event = JSON.parse(rawBody)
    const eventType = event.event

    console.log(`[Razorpay Webhook] Event type: ${eventType}`)

    // Log all webhook events for debugging
    await DatabaseService.logWebhookEvent({
      provider: 'razorpay',
      eventType: eventType,
      eventId: event.payload?.subscription?.entity?.id,
      rawData: event
    })

    // ─── SUBSCRIPTION EVENTS ONLY ───
    if (eventType.startsWith('subscription.')) {
      return await handleSubscriptionEvent(event, eventType)
    }

    // All other events are ignored (no more payment.captured or payment_link.paid)
    console.log(`[Razorpay Webhook] Ignoring non-subscription event: ${eventType}`)
    return NextResponse.json({ ok: true, message: `Event ${eventType} acknowledged but not processed` })

  } catch (error: any) {
    console.error('[Razorpay Webhook] Error:', error)
    // Return 200 even on error to prevent Razorpay from retrying
    return NextResponse.json(
      { ok: false, error: error.message || 'Webhook processing failed' },
      { status: 200 }
    )
  }
}

/**
 * Handle Razorpay subscription webhook events
 */
async function handleSubscriptionEvent(event: any, eventType: string) {
  const subscription = event.payload.subscription?.entity
  
  if (!subscription) {
    console.error('[Razorpay Webhook] No subscription entity in payload')
    return NextResponse.json({ ok: true, message: 'No subscription entity' })
  }

  const subscriptionId = subscription.id
  const planId = subscription.plan_id
  const status = subscription.status
  const customerId = subscription.customer_id
  const notes = subscription.notes || {}
  const shortUrl = subscription.short_url || null
  const currentStart = subscription.current_start ? new Date(subscription.current_start * 1000) : null
  const currentEnd = subscription.current_end ? new Date(subscription.current_end * 1000) : null
  const chargeAt = subscription.charge_at ? new Date(subscription.charge_at * 1000) : null

  console.log(`[Razorpay Webhook] Subscription: ${subscriptionId}, Status: ${status}, Plan: ${planId}`)
  console.log(`[Razorpay Webhook] Notes:`, notes)

  // ─── Find company by notes or customer email ───
  let companyId = notes.company_id || notes.companyId || null
  const subscriberEmail = notes.email || subscription.customer_details?.email || ''

  // If no companyId in notes, try to find by email
  if (!companyId && subscriberEmail) {
    console.log(`[Razorpay Webhook] Looking up company by email: ${subscriberEmail}`)
    const userResult = await DatabaseService.query(
      `SELECT c.id as company_id 
       FROM users u 
       JOIN companies c ON c.id = u.company_id 
       WHERE u.email = $1 
       LIMIT 1`,
      [subscriberEmail]
    )

    if (userResult.length > 0) {
      companyId = userResult[0].company_id
      console.log(`[Razorpay Webhook] Found company by email: ${companyId}`)
    }
  }

  // If still no companyId, check if we have an existing subscription record
  if (!companyId) {
    const existingSub = await DatabaseService.getSubscriptionByProviderId(subscriptionId, 'razorpay')
    if (existingSub) {
      companyId = existingSub.company_id
      console.log(`[Razorpay Webhook] Found company from existing subscription: ${companyId}`)
    }
  }

  if (!companyId) {
    console.error(`[Razorpay Webhook] Could not determine company for subscription: ${subscriptionId}, email: ${subscriberEmail}`)
    return NextResponse.json({ 
      ok: false, 
      error: 'Company not found',
      subscriptionId,
      email: subscriberEmail
    })
  }

  try {
    switch (eventType) {
      case 'subscription.activated':
        // Subscription is now active - first successful payment completed
        console.log(`[Razorpay Webhook] Subscription activated for company: ${companyId}`)
        
        await DatabaseService.upsertSubscription({
          companyId,
          provider: 'razorpay',
          subscriptionId,
          planId,
          status: 'active',
          subscriberEmail,
          startTime: currentStart || new Date(),
          nextBillingTime: chargeAt || currentEnd || undefined,
          subscriptionLink: shortUrl || undefined,
          rawData: subscription
        })

        // Activate company billing
        await DatabaseService.activateCompanyFromSubscription(companyId)
        console.log(`[Razorpay Webhook] Company billing activated for: ${companyId}`)

        // Restore any jobs/interviews that were on hold
        try {
          const restoredJobsCount = await DatabaseService.restoreJobsAfterRecharge(companyId)
          const restoredInterviewsCount = await DatabaseService.restoreInterviewsAfterRecharge(companyId)
          if (restoredJobsCount > 0 || restoredInterviewsCount > 0) {
            console.log(`[Razorpay Webhook] Restored ${restoredJobsCount} jobs and ${restoredInterviewsCount} interviews after subscription activation`)
          }
        } catch (restoreError: any) {
          console.error('[Razorpay Webhook] Failed to restore jobs/interviews:', restoreError.message)
        }

        return NextResponse.json({
          ok: true,
          message: 'Subscription activated',
          companyId,
          subscriptionId,
          status: 'active'
        })

      case 'subscription.charged':
        // Recurring payment successful
        console.log(`[Razorpay Webhook] Subscription charged for company: ${companyId}`)
        
        // Update subscription with new billing date
        await DatabaseService.updateSubscriptionStatus(
          companyId,
          'razorpay',
          'active',
          chargeAt || currentEnd || undefined
        )

        // Ensure company_billing record exists and credit wallet
        await DatabaseService.query(
          `INSERT INTO company_billing (company_id, wallet_balance, status, created_at, updated_at)
           VALUES ($1::uuid, 0, 'active', NOW(), NOW())
           ON CONFLICT (company_id) DO NOTHING`,
          [companyId]
        )
        await DatabaseService.query(
          `UPDATE company_billing 
           SET wallet_balance = wallet_balance + 10000,
               status = 'active',
               updated_at = NOW()
           WHERE company_id = $1::uuid`,
          [companyId]
        )
        console.log(`[Razorpay Webhook] Credited ₹10,000 to wallet for subscription payment, company: ${companyId}`)

        // Record the payment if payment entity exists
        const payment = event.payload.payment?.entity
        if (payment) {
          await DatabaseService.recordSubscriptionPayment({
            subscriptionId,
            provider: 'razorpay',
            paymentId: payment.id,
            amount: payment.amount / 100, // Convert paise to rupees
            currency: payment.currency || 'INR',
            status: 'captured',
            paymentTime: new Date(),
            rawData: payment
          })
        }

        // Ensure company remains active
        await DatabaseService.activateCompanyFromSubscription(companyId)

        return NextResponse.json({
          ok: true,
          message: 'Subscription payment recorded',
          companyId,
          subscriptionId
        })

      case 'subscription.pending':
        // Subscription created but awaiting first payment
        console.log(`[Razorpay Webhook] Subscription pending for company: ${companyId}`)
        
        await DatabaseService.upsertSubscription({
          companyId,
          provider: 'razorpay',
          subscriptionId,
          planId,
          status: 'pending',
          subscriberEmail,
          subscriptionLink: shortUrl || undefined,
          rawData: subscription
        })

        return NextResponse.json({
          ok: true,
          message: 'Subscription pending',
          companyId,
          subscriptionId
        })

      case 'subscription.halted':
        // Payment failed, subscription halted
        console.log(`[Razorpay Webhook] Subscription halted for company: ${companyId}`)
        
        await DatabaseService.updateSubscriptionStatus(companyId, 'razorpay', 'halted')

        return NextResponse.json({
          ok: true,
          message: 'Subscription halted',
          companyId,
          subscriptionId
        })

      case 'subscription.cancelled':
        // Subscription cancelled
        console.log(`[Razorpay Webhook] Subscription cancelled for company: ${companyId}`)
        
        await DatabaseService.cancelSubscription(companyId, 'razorpay')

        return NextResponse.json({
          ok: true,
          message: 'Subscription cancelled',
          companyId,
          subscriptionId
        })

      case 'subscription.completed':
        // Subscription ended (all cycles completed)
        console.log(`[Razorpay Webhook] Subscription completed for company: ${companyId}`)
        
        await DatabaseService.updateSubscriptionStatus(companyId, 'razorpay', 'completed')

        return NextResponse.json({
          ok: true,
          message: 'Subscription completed',
          companyId,
          subscriptionId
        })

      case 'subscription.paused':
        // Subscription paused
        console.log(`[Razorpay Webhook] Subscription paused for company: ${companyId}`)
        
        await DatabaseService.updateSubscriptionStatus(companyId, 'razorpay', 'paused')

        return NextResponse.json({
          ok: true,
          message: 'Subscription paused',
          companyId,
          subscriptionId
        })

      case 'subscription.resumed':
        // Subscription resumed from pause
        console.log(`[Razorpay Webhook] Subscription resumed for company: ${companyId}`)
        
        await DatabaseService.updateSubscriptionStatus(
          companyId,
          'razorpay',
          'active',
          chargeAt || currentEnd || undefined
        )

        // Ensure company is active
        await DatabaseService.activateCompanyFromSubscription(companyId)

        return NextResponse.json({
          ok: true,
          message: 'Subscription resumed',
          companyId,
          subscriptionId
        })

      default:
        console.log(`[Razorpay Webhook] Unhandled subscription event: ${eventType}`)
        return NextResponse.json({ ok: true, message: `Event ${eventType} acknowledged` })
    }
  } catch (error: any) {
    console.error(`[Razorpay Webhook] Error processing subscription event:`, error)
    return NextResponse.json(
      { ok: false, error: error.message || 'Subscription event processing failed' },
      { status: 200 }
    )
  }
}
