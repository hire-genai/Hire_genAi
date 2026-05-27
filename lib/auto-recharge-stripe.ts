import { DatabaseService } from '@/lib/database'
import { stripe } from '@/stripe/stripeController'
import { randomUUID } from 'crypto'

const RECHARGE_COOLDOWN_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Check if Stripe auto-recharge should be triggered and charge using saved PaymentMethod.
 *
 * Flow:
 * 1. Fetch wallet_balance, auto_recharge settings from company_billing
 * 2. Check if enabled and below threshold
 * 3. Idempotency check via auto_recharge_transactions (5-min cooldown)
 * 4. Fetch stripe_pm_id + customer_id from company_subscriptions (provider='stripe')
 * 5. Create PaymentIntent with confirm=true, off_session=true
 * 6. If succeeded → credit wallet immediately
 * 7. Record in auto_recharge_transactions
 */
export async function checkAndAutoRechargeStripe(
  companyId: string,
  force = false
): Promise<{
  success: boolean
  triggered: boolean
  message: string
  paymentId?: string
  amount?: number
  walletBalance?: number
}> {
  try {
    // ─── 1. Fetch billing settings ───
    const billingRows = await DatabaseService.query(
      `SELECT wallet_balance, auto_recharge_enabled, auto_recharge_amount, auto_recharge_threshold
       FROM company_billing WHERE company_id = $1::uuid`,
      [companyId]
    ) as any[]

    if (billingRows.length === 0) {
      return { success: true, triggered: false, message: 'No billing record found' }
    }

    const billing = billingRows[0]
    const walletBalance = parseFloat(billing.wallet_balance) || 0
    const autoRechargeEnabled = billing.auto_recharge_enabled || false
    const autoRechargeAmount = parseFloat(billing.auto_recharge_amount) || 2
    const autoRechargeThreshold = parseFloat(billing.auto_recharge_threshold) || 50

    // ─── 2. Guard checks ───
    if (!autoRechargeEnabled) {
      return { success: true, triggered: false, message: 'Auto-recharge is disabled' }
    }

    if (!force && walletBalance >= autoRechargeThreshold) {
      return {
        success: true,
        triggered: false,
        message: `Wallet balance (${walletBalance}) is above threshold (${autoRechargeThreshold})`,
      }
    }

    // ─── 3. Idempotency — prevent duplicate recharges within 5 minutes ───
    const recent = await DatabaseService.query(
      `SELECT id, status FROM auto_recharge_transactions
       WHERE company_id = $1::uuid
         AND created_at > NOW() - INTERVAL '5 minutes'
         AND status IN ('created', 'authorized', 'captured', 'succeeded')
       ORDER BY created_at DESC LIMIT 1`,
      [companyId]
    ) as any[]

    if (recent.length > 0) {
      return {
        success: true,
        triggered: false,
        message: `Auto-recharge already in progress or recently completed (status: ${recent[0].status})`,
      }
    }

    // ─── 4. Fetch Stripe payment method + customer ───
    const subRows = await DatabaseService.query(
      `SELECT stripe_pm_id, customer_id, subscriber_email
       FROM company_subscriptions
       WHERE company_id = $1::uuid AND provider = 'stripe'
       ORDER BY updated_at DESC LIMIT 1`,
      [companyId]
    ) as any[]

    if (subRows.length === 0 || !subRows[0].stripe_pm_id) {
      return {
        success: false,
        triggered: false,
        message: 'No saved Stripe payment method found. Please add a card in Settings → Payment.',
      }
    }

    const stripePmId: string = subRows[0].stripe_pm_id
    const stripeCustomerId: string | null = subRows[0].customer_id || null
    const subscriberEmail: string | null = subRows[0].subscriber_email || null

    if (!stripeCustomerId) {
      return {
        success: false,
        triggered: false,
        message: 'No Stripe customer ID found for company',
      }
    }

    // Amount in cents (Stripe uses smallest currency unit)
    const amountInCents = Math.round(autoRechargeAmount * 100)
    const idempotencyKey = randomUUID()

    console.log(`[Stripe Auto-Recharge] Initiating for company ${companyId}:`, {
      pm: stripePmId.substring(0, 12) + '...',
      amount: autoRechargeAmount,
      walletBalance,
      threshold: autoRechargeThreshold,
    })

    // ─── 5. Create PaymentIntent (off-session) ───
    let paymentIntent: any
    try {
      paymentIntent = await stripe.paymentIntents.create(
        {
          amount: amountInCents,
          currency: 'usd',
          customer: stripeCustomerId,
          payment_method: stripePmId,
          confirm: true,
          off_session: true,
          description: 'Wallet Auto Recharge',
          metadata: {
            company_id: companyId,
            purpose: 'auto_recharge',
            idempotency_key: idempotencyKey,
          },
        },
        { idempotencyKey }
      )
    } catch (stripeError: any) {
      const errorCode = stripeError.code || 'STRIPE_ERROR'
      const errorMessage = stripeError.message || 'Stripe payment failed'

      console.error(`[Stripe Auto-Recharge] PaymentIntent creation failed:`, {
        code: errorCode,
        message: errorMessage,
      })

      // Record failed attempt
      await recordStripeAutoRechargeTransaction(companyId, {
        payment_id: `stripe_ar_fail_${idempotencyKey}`,
        customer_id: stripeCustomerId,
        pm_id: stripePmId,
        amount: autoRechargeAmount,
        amount_cents: amountInCents,
        status: 'failed',
        email: subscriberEmail,
        error_code: errorCode,
        error_description: errorMessage,
        wallet_balance_before: walletBalance,
        raw_data: { error: stripeError.raw || errorMessage },
      })

      return {
        success: false,
        triggered: true,
        message: errorMessage,
      }
    }

    const piId: string = paymentIntent.id
    const piStatus: string = paymentIntent.status

    console.log(`[Stripe Auto-Recharge] PaymentIntent ${piId} status: ${piStatus}`)

    if (piStatus === 'succeeded') {
      // ─── 6. Credit wallet immediately (same as Razorpay success path) ───
      const amountPaid = (paymentIntent.amount_received || paymentIntent.amount || 0) / 100

      await DatabaseService.query(
        `INSERT INTO company_billing (company_id, wallet_balance, status, created_at, updated_at)
         VALUES ($1::uuid, 0, 'active', NOW(), NOW())
         ON CONFLICT (company_id) DO NOTHING`,
        [companyId]
      )

      const beforeRows = await DatabaseService.query(
        `SELECT wallet_balance FROM company_billing WHERE company_id = $1::uuid`,
        [companyId]
      ) as any[]
      const balanceBefore = beforeRows[0] ? parseFloat(beforeRows[0].wallet_balance) : 0

      const updatedRows = await DatabaseService.query(
        `UPDATE company_billing SET wallet_balance = wallet_balance + $2, status = 'active', updated_at = NOW()
         WHERE company_id = $1::uuid RETURNING wallet_balance`,
        [companyId, amountPaid]
      ) as any[]
      const balanceAfter = updatedRows[0] ? parseFloat(updatedRows[0].wallet_balance) : balanceBefore + amountPaid

      console.log(`[Stripe Auto-Recharge] Wallet credited — company: ${companyId}, +${amountPaid}, balance: ${balanceBefore} → ${balanceAfter}`)

      try {
        await DatabaseService.addLedgerEntry({
          companyId,
          entryType: 'WALLET_TOPUP',
          description: `Stripe auto-recharge — PaymentIntent ${piId}`,
          amount: amountPaid,
          balanceBefore,
          balanceAfter,
          metadata: { provider: 'stripe', purpose: 'auto_recharge', paymentIntentId: piId, currency: 'USD' },
        })
      } catch (e) {
        console.error('[Stripe Auto-Recharge] addLedgerEntry failed:', e)
      }

      try {
        await DatabaseService.restoreJobsAfterRecharge(companyId)
        await DatabaseService.restoreInterviewsAfterRecharge(companyId)
      } catch (e) {
        console.error('[Stripe Auto-Recharge] restore after recharge error:', e)
      }

      // Record successful transaction
      await recordStripeAutoRechargeTransaction(companyId, {
        payment_id: piId,
        customer_id: stripeCustomerId,
        pm_id: stripePmId,
        amount: amountPaid,
        amount_cents: amountInCents,
        status: 'captured',
        email: subscriberEmail,
        wallet_balance_before: walletBalance,
        raw_data: paymentIntent,
      })

      return {
        success: true,
        triggered: true,
        message: 'Auto-recharge successful',
        paymentId: piId,
        amount: amountPaid,
        walletBalance: balanceAfter,
      }
    }

    // Payment requires action (e.g. 3DS) — webhook will handle when it resolves
    if (piStatus === 'requires_action' || piStatus === 'processing') {
      console.log(`[Stripe Auto-Recharge] PaymentIntent ${piId} requires further action: ${piStatus}`)

      await recordStripeAutoRechargeTransaction(companyId, {
        payment_id: piId,
        customer_id: stripeCustomerId,
        pm_id: stripePmId,
        amount: autoRechargeAmount,
        amount_cents: amountInCents,
        status: 'created',
        email: subscriberEmail,
        wallet_balance_before: walletBalance,
        raw_data: paymentIntent,
      })

      return {
        success: true,
        triggered: true,
        message: `Payment ${piStatus} — will complete via webhook`,
        paymentId: piId,
        amount: autoRechargeAmount,
      }
    }

    // Any other status = failed
    const failReason = paymentIntent.last_payment_error?.message || `Unexpected status: ${piStatus}`
    console.error(`[Stripe Auto-Recharge] PaymentIntent ${piId} failed: ${failReason}`)

    await recordStripeAutoRechargeTransaction(companyId, {
      payment_id: piId,
      customer_id: stripeCustomerId,
      pm_id: stripePmId,
      amount: autoRechargeAmount,
      amount_cents: amountInCents,
      status: 'failed',
      email: subscriberEmail,
      error_code: paymentIntent.last_payment_error?.code || 'PAYMENT_FAILED',
      error_description: failReason,
      wallet_balance_before: walletBalance,
      raw_data: paymentIntent,
    })

    return { success: false, triggered: true, message: failReason }
  } catch (error: any) {
    console.error('[Stripe Auto-Recharge] Unexpected error:', error)
    return { success: false, triggered: false, message: error.message || 'Auto-recharge failed' }
  }
}

async function recordStripeAutoRechargeTransaction(
  companyId: string,
  data: {
    payment_id: string
    customer_id: string
    pm_id: string
    amount: number
    amount_cents: number
    status: string
    email?: string | null
    error_code?: string
    error_description?: string
    wallet_balance_before?: number
    raw_data?: any
  }
): Promise<void> {
  try {
    await DatabaseService.query(
      `INSERT INTO auto_recharge_transactions (
         company_id, payment_id, order_id, customer_id, token_id,
         amount, amount_paise, status, email,
         error_code, error_description,
         wallet_balance_before, raw_data, description
       ) VALUES (
         $1::uuid, $2, $3, $4, $5,
         $6, $7, $8, $9,
         $10, $11,
         $12, $13::jsonb, $14
       )
       ON CONFLICT (payment_id) DO UPDATE SET
         status            = EXCLUDED.status,
         error_code        = EXCLUDED.error_code,
         error_description = EXCLUDED.error_description,
         raw_data          = EXCLUDED.raw_data,
         updated_at        = NOW()`,
      [
        companyId,
        data.payment_id,
        'stripe_auto_recharge',  // order_id placeholder
        data.customer_id,
        data.pm_id,              // token_id = stripe pm_id
        data.amount,
        data.amount_cents,       // amount_paise = cents for Stripe
        data.status,
        data.email || null,
        data.error_code || null,
        data.error_description || null,
        data.wallet_balance_before || null,
        JSON.stringify(data.raw_data || {}),
        'Wallet Auto Recharge (Stripe)',
      ]
    )
  } catch (error) {
    console.error('[Stripe Auto-Recharge] Failed to record transaction:', error)
  }
}
