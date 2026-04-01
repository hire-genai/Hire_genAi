import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/razorpay/webhook
 * 
 * Razorpay sends webhook events here after payment completion.
 * This endpoint:
 * 1. Verifies the webhook signature using RAZORPAY_WEBHOOK_SECRET
 * 2. Handles `payment.captured` and `payment_link.paid` events
 * 3. Records payment in `payment_transactions` (idempotent - skips duplicates)
 * 4. Updates `company_billing.wallet_balance`
 * 5. Returns 200 to acknowledge receipt
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

    // Handle payment.captured (from SDK orders) and payment_link.paid (from payment links)
    if (eventType === 'payment.captured' || eventType === 'payment_link.paid') {
      const payment = event.payload.payment?.entity
      
      if (!payment) {
        console.error('[Razorpay Webhook] No payment entity in payload')
        return NextResponse.json({ ok: true, message: 'No payment entity' })
      }

      const paymentId = payment.id                         // razorpay payment id
      const orderId = payment.order_id || null              // may be null for payment links
      const amountInPaise = payment.amount                  // amount in paise
      const amountInRupees = amountInPaise / 100            // convert to INR
      const currency = payment.currency || 'INR'
      const paymentEmail = payment.email || ''
      const paymentNotes = payment.notes || {}

      console.log(`[Razorpay Webhook] Payment: ${paymentId}, Amount: ₹${amountInRupees}, Email: ${paymentEmail}`)
      console.log(`[Razorpay Webhook] Notes:`, paymentNotes)

      // ─── 3. Idempotency check - skip if already processed ───
      const existingPayment = await DatabaseService.query(
        `SELECT id FROM payment_transactions WHERE provider_payment_id = $1`,
        [paymentId]
      )

      if (existingPayment.length > 0) {
        console.log(`[Razorpay Webhook] Payment already processed (idempotent skip): ${paymentId}`)
        return NextResponse.json({ ok: true, message: 'Already processed' })
      }

      // ─── 4. Find company by email or notes ───
      let companyId = paymentNotes.company_id || paymentNotes.companyId || null

      // If no companyId in notes, try to find by email
      if (!companyId && paymentEmail) {
        console.log(`[Razorpay Webhook] Looking up company by email: ${paymentEmail}`)
        const userResult = await DatabaseService.query(
          `SELECT c.id as company_id 
           FROM users u 
           JOIN companies c ON c.id = u.company_id 
           WHERE u.email = $1 
           LIMIT 1`,
          [paymentEmail]
        )

        if (userResult.length > 0) {
          companyId = userResult[0].company_id
          console.log(`[Razorpay Webhook] Found company by email: ${companyId}`)
        }
      }

      if (!companyId) {
        console.error(`[Razorpay Webhook] Could not determine company for payment: ${paymentId}, email: ${paymentEmail}`)
        // Still return 200 — we don't want Razorpay to keep retrying
        // Log it so we can manually credit later
        return NextResponse.json({ 
          ok: false, 
          error: 'Company not found',
          paymentId,
          email: paymentEmail,
          amount: amountInRupees
        })
      }

      // ─── 5. Record payment and update wallet (reuse existing verify logic) ───
      await DatabaseService.query('BEGIN')

      try {
        // Record the payment transaction
        const paymentRecord = await DatabaseService.query(
          `INSERT INTO payment_transactions (
            company_id, provider, provider_order_id, provider_payment_id, 
            amount, currency, amount_in_paise, 
            status, description, notes, completed_at
          ) VALUES (
            $1::uuid, 'razorpay', $2, $3, $4, $5, $6, 'completed', $7, $8, NOW()
          ) RETURNING id`,
          [
            companyId,
            orderId,
            paymentId,
            amountInRupees,
            currency,
            amountInPaise,
            `Wallet recharge via Razorpay Payment Link (webhook)`,
            JSON.stringify({ email: paymentEmail, source: 'webhook', event: eventType })
          ]
        )

        const transactionId = paymentRecord[0]?.id

        // Add credits to wallet - CRITICAL: This must succeed for payment to be valid
        let newBalance = 0
        
        try {
          // Try using the DB function first
          const walletResult = await DatabaseService.query(
            `SELECT add_wallet_credits($1::uuid, $2, $3::uuid) as new_balance`,
            [companyId, amountInRupees, transactionId]
          )
          newBalance = parseFloat(walletResult[0]?.new_balance || '0')
          console.log(`[Razorpay Webhook] add_wallet_credits returned: ${newBalance}`)
        } catch (funcError: any) {
          console.warn(`[Razorpay Webhook] add_wallet_credits function failed, using fallback:`, funcError.message)
          newBalance = NaN // Force fallback
        }

        // Fallback: manual update if function doesn't exist or failed
        if (isNaN(newBalance) || newBalance === 0) {
          console.log(`[Razorpay Webhook] Using manual wallet update fallback`)
          
          // Ensure company_billing record exists
          await DatabaseService.query(
            `INSERT INTO company_billing (company_id, wallet_balance, status, created_at, updated_at)
             VALUES ($1::uuid, 0, 'trial', NOW(), NOW())
             ON CONFLICT (company_id) DO NOTHING`,
            [companyId]
          )

          // Update wallet balance - CRITICAL: wallet_balance = wallet_balance + amount
          const updateResult = await DatabaseService.query(
            `UPDATE company_billing 
             SET wallet_balance = wallet_balance + $2,
                 status = 'active',
                 updated_at = NOW()
             WHERE company_id = $1::uuid
             RETURNING wallet_balance`,
            [companyId, amountInRupees]
          )

          newBalance = parseFloat(updateResult[0]?.wallet_balance || '0')
          console.log(`[Razorpay Webhook] Manual update result - new balance: ${newBalance}`)
          
          // Verify the update actually happened
          if (updateResult.length === 0) {
            throw new Error('Failed to update wallet balance - no rows affected')
          }
        }

        await DatabaseService.query('COMMIT')

        console.log(`[Razorpay Webhook] ✅ Success! Company: ${companyId}, Credited: ₹${amountInRupees}, New Balance: ₹${newBalance}`)

        return NextResponse.json({
          ok: true,
          message: 'Payment processed',
          companyId,
          amountCredited: amountInRupees,
          newBalance,
          transactionId
        })

      } catch (dbError: any) {
        await DatabaseService.query('ROLLBACK')
        console.error(`[Razorpay Webhook] DB Error:`, dbError)
        throw dbError
      }

    } else {
      // Other event types — acknowledge but don't process
      console.log(`[Razorpay Webhook] Ignoring event type: ${eventType}`)
      return NextResponse.json({ ok: true, message: `Event ${eventType} acknowledged` })
    }

  } catch (error: any) {
    console.error('[Razorpay Webhook] Error:', error)
    // Return 200 even on error to prevent Razorpay from retrying
    // (failed payments are logged and can be investigated)
    return NextResponse.json(
      { ok: false, error: error.message || 'Webhook processing failed' },
      { status: 200 }
    )
  }
}
