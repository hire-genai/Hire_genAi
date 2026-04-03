import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/payment/verify
 * Verify payment and add credits to company wallet
 * 
 * Body:
 * - provider: 'razorpay' | 'paypal'
 * - paymentId: string (razorpay_payment_id or paypal order_id)
 * - orderId: string (razorpay_order_id)
 * - signature: string (razorpay_signature for verification)
 * - amount: number (amount in paise for razorpay, cents for paypal)
 * - companyId: string
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { provider, paymentId, orderId, subscriptionId, signature, amount, companyId } = body

    if (!provider || !paymentId || !companyId) {
      return NextResponse.json(
        { ok: false, error: 'Missing required fields: provider, paymentId, companyId' },
        { status: 400 }
      )
    }

    console.log(`[Payment Verify] Provider: ${provider}, PaymentID: ${paymentId}, CompanyID: ${companyId}`)

    // Verify payment based on provider
    let verified = false
    let amountInRupees = 0

    if (provider === 'razorpay') {
      // Verify Razorpay signature
      const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET
      
      if (!razorpayKeySecret) {
        console.error('[Payment Verify] RAZORPAY_KEY_SECRET not configured')
        return NextResponse.json(
          { ok: false, error: 'Payment verification not configured' },
          { status: 500 }
        )
      }

      if (signature) {
        let expectedSignature: string
        
        if (subscriptionId) {
          // Subscription flow: SHA256(payment_id + "|" + subscription_id, secret)
          expectedSignature = crypto
            .createHmac('sha256', razorpayKeySecret)
            .update(`${paymentId}|${subscriptionId}`)
            .digest('hex')
          console.log(`[Payment Verify] Subscription signature verification for: ${paymentId}|${subscriptionId}`)
        } else if (orderId) {
          // Order flow: SHA256(order_id + "|" + payment_id, secret)
          expectedSignature = crypto
            .createHmac('sha256', razorpayKeySecret)
            .update(`${orderId}|${paymentId}`)
            .digest('hex')
          console.log(`[Payment Verify] Order signature verification for: ${orderId}|${paymentId}`)
        } else {
          console.error('[Payment Verify] Neither subscriptionId nor orderId provided')
          return NextResponse.json(
            { ok: false, error: 'Missing subscriptionId or orderId for signature verification' },
            { status: 400 }
          )
        }

        verified = expectedSignature === signature
        console.log(`[Payment Verify] Razorpay signature verification: ${verified}`)
      } else {
        // For test mode or when signature is not provided, trust the payment
        // In production, always verify signature
        console.warn('[Payment Verify] No signature provided, accepting payment (test mode)')
        verified = true
      }

      // Convert paise to rupees
      amountInRupees = (amount || 10000) / 100

    } else if (provider === 'paypal') {
      // PayPal verification - in production, verify with PayPal API
      // For now, trust the payment ID
      verified = true
      // PayPal amount is in USD, convert to INR (approximate)
      amountInRupees = (amount || 100) * 83 // 1 USD ≈ 83 INR
      console.log(`[Payment Verify] PayPal payment accepted: ${paymentId}`)
    } else {
      return NextResponse.json(
        { ok: false, error: 'Invalid payment provider' },
        { status: 400 }
      )
    }

    if (!verified) {
      return NextResponse.json(
        { ok: false, error: 'Payment verification failed' },
        { status: 400 }
      )
    }

    // Check if payment already processed (idempotency)
    const existingPayment = await DatabaseService.query(
      `SELECT id FROM payment_transactions WHERE provider_payment_id = $1`,
      [paymentId]
    )

    if (existingPayment.length > 0) {
      console.log(`[Payment Verify] Payment already processed: ${paymentId}`)
      
      // Get current wallet balance
      const billing = await DatabaseService.query(
        `SELECT wallet_balance FROM company_billing WHERE company_id = $1::uuid`,
        [companyId]
      )
      
      return NextResponse.json({
        ok: true,
        message: 'Payment already processed',
        walletBalance: parseFloat(billing[0]?.wallet_balance || '0')
      })
    }

    // Start transaction to record payment and update wallet
    await DatabaseService.query('BEGIN')

    try {
      // 1. Record the payment transaction
      const paymentRecord = await DatabaseService.query(
        `INSERT INTO payment_transactions (
          company_id, provider, provider_order_id, provider_payment_id, 
          provider_signature, amount, currency, amount_in_paise, 
          status, description, completed_at
        ) VALUES (
          $1::uuid, $2, $3, $4, $5, $6, $7, $8, 'completed', $9, NOW()
        ) RETURNING id`,
        [
          companyId,
          provider,
          orderId || null,
          paymentId,
          signature || null,
          amountInRupees,
          provider === 'razorpay' ? 'INR' : 'USD',
          amount || null,
          `Wallet recharge via ${provider}`
        ]
      )

      const transactionId = paymentRecord[0]?.id

      // 2. Add credits to wallet - CRITICAL: This must succeed for payment to be valid
      let newBalance = 0
      
      try {
        // Try using the DB function first
        const walletResult = await DatabaseService.query(
          `SELECT add_wallet_credits($1::uuid, $2, $3::uuid) as new_balance`,
          [companyId, amountInRupees, transactionId]
        )
        newBalance = parseFloat(walletResult[0]?.new_balance || '0')
        console.log(`[Payment Verify] add_wallet_credits returned: ${newBalance}`)
      } catch (funcError: any) {
        console.warn(`[Payment Verify] add_wallet_credits function failed, using fallback:`, funcError.message)
        newBalance = NaN // Force fallback
      }

      // Fallback: manual update if function doesn't exist or failed
      if (isNaN(newBalance) || newBalance === 0) {
        console.log(`[Payment Verify] Using manual wallet update fallback`)
        
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
        console.log(`[Payment Verify] Manual update result - new balance: ${newBalance}`)
        
        // Verify the update actually happened
        if (updateResult.length === 0) {
          throw new Error('Failed to update wallet balance - no rows affected')
        }
      }

      await DatabaseService.query('COMMIT')

      console.log(`[Payment Verify] Success! New wallet balance: ₹${newBalance}`)

      // Restore jobs and interviews that were put on hold due to trial expiry
      try {
        const restoredJobsCount = await DatabaseService.restoreJobsAfterRecharge(companyId)
        const restoredInterviewsCount = await DatabaseService.restoreInterviewsAfterRecharge(companyId)
        if (restoredJobsCount > 0 || restoredInterviewsCount > 0) {
          console.log(`[Payment Verify] Restored ${restoredJobsCount} jobs and ${restoredInterviewsCount} interviews after recharge`)
        }
      } catch (restoreError: any) {
        console.error('[Payment Verify] Failed to restore jobs/interviews after recharge:', restoreError.message)
        // Don't fail the payment if restoration fails
      }

      return NextResponse.json({
        ok: true,
        message: 'Payment verified and wallet credited',
        transactionId,
        amountCredited: amountInRupees,
        walletBalance: newBalance,
        currency: 'INR'
      })

    } catch (dbError: any) {
      await DatabaseService.query('ROLLBACK')
      throw dbError
    }

  } catch (error: any) {
    console.error('[Payment Verify] Error:', error)
    return NextResponse.json(
      { ok: false, error: error.message || 'Payment verification failed' },
      { status: 500 }
    )
  }
}
