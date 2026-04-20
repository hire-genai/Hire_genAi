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

    // ─── HANDLE RELEVANT EVENTS ───
    if (eventType.startsWith('subscription.')) {
      return await handleSubscriptionEvent(event, eventType)
    }

    // Handle payment events for complete payment details
    if (eventType.startsWith('payment.')) {
      return await handlePaymentEvent(event, eventType)
    }

    // Handle invoice events
    if (eventType.startsWith('invoice.')) {
      return await handleInvoiceEvent(event, eventType)
    }

    // All other events are ignored
    console.log(`[Razorpay Webhook] Ignoring event: ${eventType}`)
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

        // Extract and save customer_id and token_id for recurring payments
        const customerId = subscription.customer_id
        const tokenId = event.payload.payment?.entity?.token_id
        
        if (customerId || tokenId) {
          console.log(`[Razorpay Webhook] Updating subscription with customer_id: ${customerId}, token_id: ${tokenId}`)
          
          await DatabaseService.query(`
            UPDATE company_subscriptions 
            SET 
              customer_id = $2,
              token_id = $3,
              updated_at = NOW()
            WHERE company_id = $1::uuid AND provider = 'razorpay' AND subscription_id = $4
          `, [companyId, customerId || null, tokenId || null, subscriptionId])
          
          console.log(`[Razorpay Webhook] Saved payment tokens for subscription: ${subscriptionId}`)
        } else {
          console.warn(`[Razorpay Webhook] No customer_id or token_id found in subscription: ${subscriptionId}`)
        }

        // Activate company billing
        await DatabaseService.activateCompanyFromSubscription(companyId)
        console.log(`[Razorpay Webhook] Company billing activated for: ${companyId}`)

        // Credit wallet on first subscription activation
        await DatabaseService.query(
          `INSERT INTO company_billing (company_id, wallet_balance, status, created_at, updated_at)
           VALUES ($1::uuid, 10000, 'active', NOW(), NOW())
           ON CONFLICT (company_id) DO UPDATE SET
             wallet_balance = CASE 
               WHEN company_billing.wallet_balance = 0 THEN 10000
               ELSE company_billing.wallet_balance + 10000
             END,
             status = 'active',
             updated_at = NOW()
           WHERE company_id = $1::uuid`,
          [companyId]
        )
        console.log(`[Razorpay Webhook] Credited ₹10,000 to wallet for subscription activation, company: ${companyId}`)

        // Record the first payment in subscription_payments table
        // For activated event, payment info might be in different locations
        const activationPayment = event.payload.payment?.entity
        const paidAmount = subscription.paid_count > 0 ? (subscription.plan?.item?.amount || 1000000) : 0
        
        if (activationPayment) {
          // Payment entity exists in webhook payload
          await DatabaseService.recordSubscriptionPayment({
            subscriptionId,
            provider: 'razorpay',
            paymentId: activationPayment.id,
            amount: activationPayment.amount / 100,
            currency: activationPayment.currency || 'INR',
            status: 'captured',
            paymentTime: new Date(),
            companyId,
            rawData: activationPayment
          })
          console.log(`[Razorpay Webhook] Recorded first payment: ${activationPayment.id}`)
        } else if (paidAmount > 0) {
          // No payment entity, but subscription is paid - create payment record from subscription data
          const paymentId = `sub_payment_${subscriptionId}_${Date.now()}`
          await DatabaseService.recordSubscriptionPayment({
            subscriptionId,
            provider: 'razorpay',
            paymentId,
            amount: paidAmount / 100,
            currency: 'INR',
            status: 'captured',
            paymentTime: currentStart || new Date(),
            companyId,
            rawData: { subscription_id: subscriptionId, generated: true }
          })
          console.log(`[Razorpay Webhook] Generated first payment record: ${paymentId}`)
        }

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

        // Extract and save customer_id and token_id for recurring payments
        const chargedCustomerId = subscription.customer_id
        const chargedTokenId = event.payload.payment?.entity?.token_id
        
        if (chargedCustomerId || chargedTokenId) {
          console.log(`[Razorpay Webhook] Updating subscription with customer_id: ${chargedCustomerId}, token_id: ${chargedTokenId}`)
          
          await DatabaseService.query(`
            UPDATE company_subscriptions 
            SET 
              customer_id = $2,
              token_id = $3,
              updated_at = NOW()
            WHERE company_id = $1::uuid AND provider = 'razorpay' AND subscription_id = $4
          `, [companyId, chargedCustomerId || null, chargedTokenId || null, subscriptionId])
          
          console.log(`[Razorpay Webhook] Saved payment tokens for subscription: ${subscriptionId}`)
        } else {
          console.warn(`[Razorpay Webhook] No customer_id or token_id found in subscription.charged: ${subscriptionId}`)
        }

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
            companyId,
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

/**
 * Handle Razorpay payment webhook events
 * Captures complete payment details including method, auth type, bank, wallet info
 */
async function handlePaymentEvent(event: any, eventType: string) {
  const payment = event.payload.payment?.entity
  
  if (!payment) {
    console.error('[Razorpay Webhook] No payment entity in payload')
    return NextResponse.json({ ok: true, message: 'No payment entity' })
  }

  const paymentId = payment.id
  const amount = payment.amount / 100 // Convert paise to rupees
  const currency = payment.currency || 'INR'
  const status = payment.status
  const method = payment.method
  const description = payment.description || ''
  
  console.log(`[Razorpay Webhook] Payment: ${paymentId}, Amount: Rs${amount}, Method: ${method}, Status: ${status}`)

  // Find associated subscription from payment notes or description
  let subscriptionId = payment.notes?.subscription_id || payment.notes?.subscriptionId || null
  let companyId = payment.notes?.company_id || payment.notes?.companyId || null
  
  // Try to extract subscription info from description
  if (!subscriptionId && description) {
    const subMatch = description.match(/sub_(.+)/)
    if (subMatch) {
      subscriptionId = subMatch[1]
    }
  }
  
  // If we have subscriptionId but no companyId, fetch from subscription
  if (subscriptionId && !companyId) {
    try {
      const subResult = await DatabaseService.getSubscriptionByProviderId(subscriptionId, 'razorpay')
      if (subResult) {
        companyId = subResult.company_id
      }
    } catch (error) {
      console.log('[Razorpay Webhook] Could not find subscription for payment:', subscriptionId)
    }
  }

  // ─── Handle Card Authorization for Auto-Recharge ───
  // Check if this is a card authorization payment (purpose: card_authorization)
  const isCardAuthorization = payment.notes?.purpose === 'card_authorization' || 
                               payment.notes?.type === 'auto_recharge_setup'
  
  if (isCardAuthorization && companyId && status === 'captured') {
    try {
      console.log(`[Razorpay Webhook] Processing card authorization for auto-recharge, company: ${companyId}`)
      
      // Fetch expanded payment to get token and card details
      const keyId = process.env.RAZORPAY_KEY_ID?.trim()
      const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim()
      
      if (keyId && keySecret) {
        const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64')
        const expandedResponse = await fetch(
          `https://api.razorpay.com/v1/payments/${paymentId}?expand[]=card&expand[]=token`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Basic ${authHeader}`,
              'Content-Type': 'application/json'
            }
          }
        )
        
        if (expandedResponse.ok) {
          const expandedPayment = await expandedResponse.json()
          const tokenId = expandedPayment.token_id
          const customerId = expandedPayment.customer_id
          const cardInfo = expandedPayment.card || {}
          
          if (tokenId) {
            console.log(`[Razorpay Webhook] Saving auto-recharge token: ${tokenId} for company: ${companyId}`)
            
            // Save auto-recharge token to company_subscriptions
            await DatabaseService.query(`
              UPDATE company_subscriptions 
              SET 
                auto_recharge_token_id = $2,
                auto_recharge_customer_id = $3,
                auto_recharge_card_last4 = $4,
                auto_recharge_card_network = $5,
                auto_recharge_card_type = $6,
                auto_recharge_card_issuer = $7,
                auto_recharge_token_created_at = NOW(),
                updated_at = NOW()
              WHERE company_id = $1::uuid AND provider = 'razorpay'
            `, [
              companyId,
              tokenId,
              customerId || null,
              cardInfo.last4 || null,
              cardInfo.network || null,
              cardInfo.type || null,
              cardInfo.issuer || null
            ])
            
            console.log(`[Razorpay Webhook] Auto-recharge card saved successfully for company: ${companyId}`)
          }
        }
      }
      
      return NextResponse.json({
        ok: true,
        message: 'Card authorization processed for auto-recharge',
        companyId,
        paymentId
      })
    } catch (cardAuthError: any) {
      console.error('[Razorpay Webhook] Error processing card authorization:', cardAuthError)
      // Don't fail the webhook
    }
  }

  // Only process payments that belong to a company subscription
  if (!companyId) {
    console.log(`[Razorpay Webhook] Payment ${paymentId} does not belong to any company subscription`)
    return NextResponse.json({ ok: true, message: 'Payment not associated with company subscription' })
  }

  try {
    // Step 1 — Fetch expanded payment from Razorpay API
    let expandedPayment = payment // Fallback to webhook payment object
    const keyId = process.env.RAZORPAY_KEY_ID?.trim()
    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim()
    
    if (keyId && keySecret) {
      try {
        const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64')
        const expandedResponse = await fetch(
          `https://api.razorpay.com/v1/payments/${paymentId}?expand[]=card&expand[]=token`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Basic ${authHeader}`,
              'Content-Type': 'application/json'
            }
          }
        )
        
        if (expandedResponse.ok) {
          expandedPayment = await expandedResponse.json()
          console.log(`[Razorpay Webhook] Fetched expanded payment data for: ${paymentId}`)
        } else {
          console.log(`[Razorpay Webhook] Failed to fetch expanded payment, using webhook data: ${paymentId}`)
        }
      } catch (fetchError: any) {
        console.log(`[Razorpay Webhook] Error fetching expanded payment, using webhook data: ${fetchError.message}`)
      }
    }

    // Step 2 — Derive auth_type if missing
    let authType = expandedPayment.auth_type || null
    if (!authType && expandedPayment.token_id && expandedPayment.customer_id && keyId && keySecret) {
      try {
        const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64')
        const tokenResponse = await fetch(
          `https://api.razorpay.com/v1/customers/${expandedPayment.customer_id}/tokens/${expandedPayment.token_id}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Basic ${authHeader}`,
              'Content-Type': 'application/json'
            }
          }
        )
        
        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json()
          authType = tokenData.recurring_details?.auth_type || null
          console.log(`[Razorpay Webhook] Derived auth_type from token: ${authType}`)
        }
      } catch (tokenError: any) {
        console.log(`[Razorpay Webhook] Error fetching token for auth_type: ${tokenError.message}`)
      }
    }

    // Step 3 — Build enriched payment object inline
    const enrichedPayment = {
      paymentId: expandedPayment.id || paymentId,
      amount: (expandedPayment.amount || 0) / 100,
      currency: expandedPayment.currency || 'INR',
      status: expandedPayment.status || status,
      method: expandedPayment.method || method,
      authType: authType,
      bank: expandedPayment.bank || null,
      wallet: expandedPayment.wallet || null,
      vpa: expandedPayment.vpa || null,
      email: expandedPayment.email || null,
      contact: expandedPayment.contact || null,
      card: expandedPayment.card ? {
        network: expandedPayment.card.network || null,
        type: expandedPayment.card.type || null,
        last4: expandedPayment.card.last4 || null,
        issuer: expandedPayment.card.issuer || null
      } : null,
      createdAt: expandedPayment.created_at ? new Date(expandedPayment.created_at * 1000) : new Date(),
      rawData: expandedPayment // Full expanded response
    }

    // Step 4 — Ensure we have company_id (lookup if needed)
    if (!companyId && subscriptionId) {
      try {
        const companyResult = await DatabaseService.query(`
          SELECT company_id FROM company_subscriptions 
          WHERE subscription_id = $1 
          LIMIT 1
        `, [subscriptionId])
        
        if (companyResult[0]?.company_id) {
          companyId = companyResult[0].company_id
        }
      } catch (error) {
        console.log('[Razorpay Webhook] Could not lookup company_id for subscription:', subscriptionId)
      }
    }

    // Step 5 — Pass enriched object to DatabaseService.recordSubscriptionPayment
    await DatabaseService.recordSubscriptionPayment({
      subscriptionId: subscriptionId || 'unknown',
      companyId: companyId || null,
      provider: 'razorpay',
      paymentId: enrichedPayment.paymentId,
      amount: enrichedPayment.amount,
      currency: enrichedPayment.currency,
      status: enrichedPayment.status === 'captured' ? 'captured' : enrichedPayment.status,
      paymentTime: enrichedPayment.createdAt,
      rawData: enrichedPayment // Store enriched payment details
    })

    console.log(`[Razorpay Webhook] Recorded comprehensive payment details: ${paymentId}`)

    // ─── Handle Wallet Auto Recharge ───
    // Check both description and notes.type for auto-recharge identification
    const isAutoRecharge = description === 'Wallet Auto Recharge' || 
                           payment.notes?.type === 'auto_recharge'
    
    if (isAutoRecharge && companyId && enrichedPayment.status === 'captured') {
      try {
        console.log(`[Razorpay Webhook] Processing wallet auto-recharge for company: ${companyId}, amount: Rs${enrichedPayment.amount}`)
        
        // Get current wallet balance before update
        const currentBalanceResult = await DatabaseService.query(
          `SELECT wallet_balance FROM company_billing WHERE company_id = $1::uuid`,
          [companyId]
        )
        const walletBalanceBefore = currentBalanceResult.length > 0 
          ? parseFloat(currentBalanceResult[0].wallet_balance) 
          : 0
        
        // Add amount to wallet_balance in company_billing table
        const walletUpdateQuery = `
          UPDATE company_billing 
          SET 
            wallet_balance = wallet_balance + $2,
            updated_at = NOW()
          WHERE company_id = $1::uuid
          RETURNING wallet_balance
        `
        
        const walletResult = await DatabaseService.query(walletUpdateQuery, [companyId, enrichedPayment.amount])
        
        if (walletResult.length > 0) {
          const newBalance = parseFloat(walletResult[0].wallet_balance)
          console.log(`[Razorpay Webhook] Wallet auto-recharge successful! New balance: Rs${newBalance}`)
          
          // Update auto_recharge_transactions table with captured status
          await DatabaseService.query(`
            UPDATE auto_recharge_transactions 
            SET 
              status = 'captured',
              wallet_balance_after = $2,
              method = $3,
              card_last4 = $4,
              card_network = $5,
              card_type = $6,
              raw_data = $7::jsonb,
              updated_at = NOW()
            WHERE payment_id = $1
          `, [
            paymentId,
            newBalance,
            enrichedPayment.method || null,
            enrichedPayment.card?.last4 || null,
            enrichedPayment.card?.network || null,
            enrichedPayment.card?.type || null,
            JSON.stringify(enrichedPayment.rawData || {})
          ])
          
          // Create ledger entry for the auto-recharge
          await DatabaseService.addLedgerEntry({
            companyId,
            entryType: 'AUTO_RECHARGE',
            description: `Wallet Auto Recharge - Payment ID: ${paymentId}`,
            amount: enrichedPayment.amount,
            balanceBefore: walletBalanceBefore,
            balanceAfter: newBalance
          })
          
          console.log(`[Razorpay Webhook] Auto-recharge ledger entry created for payment: ${paymentId}`)
          
          // Restore any jobs/interviews that were on hold due to low balance
          try {
            const restoredJobsCount = await DatabaseService.restoreJobsAfterRecharge(companyId)
            const restoredInterviewsCount = await DatabaseService.restoreInterviewsAfterRecharge(companyId)
            if (restoredJobsCount > 0 || restoredInterviewsCount > 0) {
              console.log(`[Razorpay Webhook] Restored ${restoredJobsCount} jobs and ${restoredInterviewsCount} interviews after auto-recharge`)
            }
          } catch (restoreError: any) {
            console.error('[Razorpay Webhook] Failed to restore jobs/interviews:', restoreError.message)
          }
        } else {
          console.error(`[Razorpay Webhook] Failed to update wallet balance for company: ${companyId}`)
        }
        
      } catch (walletError: any) {
        console.error(`[Razorpay Webhook] Error processing wallet auto-recharge:`, walletError)
        // Don't fail the webhook - auto-recharge is supplementary
      }
    }
    
    // Handle failed auto-recharge payments
    if (isAutoRecharge && companyId && enrichedPayment.status === 'failed') {
      try {
        console.log(`[Razorpay Webhook] Auto-recharge payment failed for company: ${companyId}, payment: ${paymentId}`)
        
        // Update auto_recharge_transactions table with failed status
        await DatabaseService.query(`
          UPDATE auto_recharge_transactions 
          SET 
            status = 'failed',
            error_code = $2,
            error_description = $3,
            error_reason = $4,
            raw_data = $5::jsonb,
            updated_at = NOW()
          WHERE payment_id = $1
        `, [
          paymentId,
          payment.error_code || null,
          payment.error_description || null,
          payment.error_reason || null,
          JSON.stringify(enrichedPayment.rawData || {})
        ])
        
        console.log(`[Razorpay Webhook] Recorded failed auto-recharge: ${paymentId}`)
      } catch (failError: any) {
        console.error(`[Razorpay Webhook] Error recording failed auto-recharge:`, failError)
      }
    }

    return NextResponse.json({
      ok: true,
      message: 'Payment details recorded',
      paymentId,
      companyId,
      method,
      amount
    })

  } catch (error: any) {
    console.error('[Razorpay Webhook] Error recording payment:', error)
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to record payment' },
      { status: 200 } // Return 200 to prevent retries
    )
  }
}

/**
 * Handle Razorpay invoice webhook events
 */
async function handleInvoiceEvent(event: any, eventType: string) {
  const invoice = event.payload.invoice?.entity
  
  if (!invoice) {
    console.error('[Razorpay Webhook] No invoice entity in payload')
    return NextResponse.json({ ok: true, message: 'No invoice entity' })
  }

  console.log(`[Razorpay Webhook] Invoice: ${invoice.id}, Type: ${eventType}`)
  
  // Invoice events are logged but not processed separately
  // Payment details are captured in payment events
  return NextResponse.json({ 
    ok: true, 
    message: 'Invoice event acknowledged',
    invoiceId: invoice.id 
  })
}
