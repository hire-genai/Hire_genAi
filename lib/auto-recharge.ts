import { DatabaseService } from '@/lib/database'

/**
 * Determines if a payment error should trigger a retry attempt
 */
function shouldRetryPayment(errorCode: string, httpStatus: number): boolean {
  // Don't retry authentication or authorization errors
  const nonRetryableErrors = [
    'BAD_REQUEST_ERROR',
    'UNAUTHORIZED',
    'INVALID_TOKEN',
    'CUSTOMER_NOT_FOUND',
    'TOKEN_EXPIRED',
    'INVALID_CUSTOMER_ID'
  ]
  
  if (nonRetryableErrors.includes(errorCode)) {
    return false
  }
  
  // Retry server errors, network issues, and temporary failures
  const retryableErrors = [
    'SERVER_ERROR',
    'GATEWAY_ERROR',
    'BAD_GATEWAY_ERROR',
    'SERVICE_UNAVAILABLE',
    'TIMEOUT_ERROR',
    'NETWORK_ERROR'
  ]
  
  if (retryableErrors.includes(errorCode)) {
    return true
  }
  
  // Retry on 5xx HTTP status codes (server errors)
  if (httpStatus >= 500) {
    return true
  }
  
  // Don't retry 4xx errors (client errors) except specific cases
  return false
}
import { randomUUID } from 'crypto'

/**
 * Check if auto-recharge should be triggered and charge using saved token.
 * 
 * This function:
 * 1. Fetches wallet_balance, auto_recharge_enabled, auto_recharge_amount, auto_recharge_threshold from company_billing
 * 2. Fetches customer_id and token_id from company_subscriptions
 * 3. If auto_recharge_enabled is false → returns early
 * 4. If wallet_balance >= auto_recharge_threshold → returns early
 * 5. Checks for pending/in-progress recharge to prevent duplicates (idempotency)
 * 6. Creates a direct payment using POST /v1/payments with saved token
 * 
 * Uses Razorpay's direct token payment API instead of order+recurring flow
 * for more reliable auto-recharge.
 * 
 * @param companyId - The company UUID to check and potentially auto-recharge
 * @returns Object with success status and details
 */
// Cooldown period to prevent duplicate recharges (in milliseconds)
const RECHARGE_COOLDOWN_MS = 5 * 60 * 1000 // 5 minutes

export async function checkAndAutoRecharge(companyId: string): Promise<{
  success: boolean
  triggered: boolean
  message: string
  paymentId?: string
  amount?: number
}> {
  const idempotencyKey = randomUUID()
  
  try {
    // ─── 1. Fetch auto-recharge settings from company_billing ───
    const billingQuery = `
      SELECT 
        wallet_balance,
        auto_recharge_enabled,
        auto_recharge_amount,
        auto_recharge_threshold
      FROM company_billing 
      WHERE company_id = $1::uuid
    `
    
    const billingResult = await DatabaseService.query(billingQuery, [companyId])
    
    if (billingResult.length === 0) {
      return {
        success: true,
        triggered: false,
        message: 'No billing record found for company'
      }
    }

    const billing = billingResult[0]
    const walletBalance = parseFloat(billing.wallet_balance) || 0
    const autoRechargeEnabled = billing.auto_recharge_enabled || false
    const autoRechargeAmount = parseFloat(billing.auto_recharge_amount) || 2
    const autoRechargeThreshold = parseFloat(billing.auto_recharge_threshold) || 50

    // ─── 2. Check if auto-recharge is enabled ───
    if (!autoRechargeEnabled) {
      return {
        success: true,
        triggered: false,
        message: 'Auto-recharge is disabled'
      }
    }

    // ─── 3. Check if wallet balance is above threshold ───
    if (walletBalance >= autoRechargeThreshold) {
      return {
        success: true,
        triggered: false,
        message: `Wallet balance (${walletBalance}) is above threshold (${autoRechargeThreshold})`
      }
    }

    // ─── 4. Idempotency check - prevent duplicate recharges ───
    const recentRechargeQuery = `
      SELECT id, status, created_at 
      FROM auto_recharge_transactions 
      WHERE company_id = $1::uuid 
        AND created_at > NOW() - INTERVAL '5 minutes'
        AND status IN ('created', 'authorized', 'captured')
      ORDER BY created_at DESC 
      LIMIT 1
    `
    
    const recentRecharge = await DatabaseService.query(recentRechargeQuery, [companyId])
    
    if (recentRecharge.length > 0) {
      const recent = recentRecharge[0]
      console.log(`[Auto-Recharge] Skipping - recent recharge found:`, {
        id: recent.id,
        status: recent.status,
        created_at: recent.created_at
      })
      return {
        success: true,
        triggered: false,
        message: `Auto-recharge already in progress or recently completed (status: ${recent.status})`
      }
    }

    // ─── 5. Fetch auto-recharge token (preferred) or subscription token (fallback) ───
    const subscriptionQuery = `
      SELECT 
        customer_id, 
        token_id, 
        subscriber_email,
        auto_recharge_token_id,
        auto_recharge_customer_id
      FROM company_subscriptions 
      WHERE company_id = $1::uuid 
        AND provider = 'razorpay'
      ORDER BY updated_at DESC
      LIMIT 1
    `
    
    const subscriptionResult = await DatabaseService.query(subscriptionQuery, [companyId])
    
    if (subscriptionResult.length === 0) {
      return {
        success: false,
        triggered: false,
        message: 'No subscription record found for auto-recharge'
      }
    }

    const subData = subscriptionResult[0]
    
    // Prefer dedicated auto-recharge token, fallback to subscription token
    const customerId = subData.auto_recharge_customer_id || subData.customer_id
    const tokenId = subData.auto_recharge_token_id || subData.token_id
    const subscriber_email = subData.subscriber_email
    
    // Log which token is being used
    if (subData.auto_recharge_token_id) {
      console.log(`[Auto-Recharge] Using dedicated auto-recharge token for company ${companyId}`)
    } else if (subData.token_id) {
      console.log(`[Auto-Recharge] Using subscription token (fallback) for company ${companyId}`)
    }
    
    if (!customerId) {
      console.warn(`[Auto-Recharge] No customer_id found for company ${companyId}`)
      return {
        success: false,
        triggered: false,
        message: 'No Razorpay customer found for recurring payments'
      }
    }

    if (!tokenId) {
      console.warn(`[Auto-Recharge] No token found for company ${companyId}`)
      return {
        success: false,
        triggered: false,
        message: 'No saved payment method (token) found. Please add a card in Settings → Payment.'
      }
    }

    // ─── 6. Get Razorpay credentials ───
    const keyId = process.env.RAZORPAY_KEY_ID?.trim()
    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim()

    if (!keyId || !keySecret) {
      console.error('[Auto-Recharge] Razorpay credentials not configured')
      return {
        success: false,
        triggered: false,
        message: 'Payment system not configured'
      }
    }

    // Log credentials for debugging (masked)
    console.log(`[Auto-Recharge] Using credentials - Key ID: ${keyId.substring(0, 10)}..., Key Secret length: ${keySecret.length}`)

    const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64')
    const amountInPaise = Math.round(autoRechargeAmount * 100)

    // ─── 7. Get customer email (required for payment receipt) ───
    let customerEmail = subscriber_email || ''
    let customerContact = ''

    // Fetch from Razorpay customer if not available
    if (!customerEmail || !customerContact) {
      try {
        const customerResponse = await fetch(
          `https://api.razorpay.com/v1/customers/${customerId}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Basic ${authHeader}`,
              'Content-Type': 'application/json'
            }
          }
        )

        if (customerResponse.ok) {
          const customerData = await customerResponse.json()
          if (!customerEmail && customerData.email) customerEmail = customerData.email
          if (!customerContact && customerData.contact) customerContact = customerData.contact
        }
      } catch (error) {
        console.warn(`[Auto-Recharge] Error fetching customer details:`, error)
      }
    }

    // Fallback: get email from company users
    if (!customerEmail) {
      try {
        const companyEmailQuery = `
          SELECT u.email 
          FROM users u 
          WHERE u.company_id = $1::uuid 
          ORDER BY u.created_at ASC 
          LIMIT 1
        `
        const companyEmailResult = await DatabaseService.query(companyEmailQuery, [companyId])
        if (companyEmailResult.length > 0 && companyEmailResult[0].email) {
          customerEmail = companyEmailResult[0].email
        }
      } catch (err) {
        console.warn(`[Auto-Recharge] Failed to fetch company email:`, err)
      }
    }

    console.log(`[Auto-Recharge] Initiating direct token payment for company ${companyId}:`, {
      customerId,
      tokenId: tokenId.substring(0, 10) + '...',
      amount: autoRechargeAmount,
      walletBalance,
      threshold: autoRechargeThreshold,
      idempotencyKey
    })

    // ─── 8. Create direct payment using saved token with retry logic ───
    const paymentPayload: Record<string, any> = {
      amount: amountInPaise,
      currency: 'INR',
      customer_id: customerId,
      token: tokenId,
      description: 'Wallet Auto Recharge',
      notes: {
        company_id: companyId,
        type: 'auto_recharge',
        idempotency_key: idempotencyKey
      }
    }

    // Add email if available (for receipt)
    if (customerEmail) {
      paymentPayload.email = customerEmail
    }
    if (customerContact) {
      paymentPayload.contact = customerContact
    }

    // ─── Retry Logic with Exponential Backoff ───
    const MAX_RETRIES = 3
    const RETRY_DELAYS = [2000, 4000, 6000] // 2s, 4s, 6s
    let lastError: any = null
    let transactionId: string | null = null

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`[Auto-Recharge] Payment attempt ${attempt}/${MAX_RETRIES} for company ${companyId}`)

        const paymentResponse = await fetch(
          'https://api.razorpay.com/v1/payments/create/recurring',
          {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${authHeader}`,
              'Content-Type': 'application/json',
              'X-Razorpay-Idempotency-Key': idempotencyKey
            },
            body: JSON.stringify(paymentPayload)
          }
        )

        const paymentData = await paymentResponse.json()

        if (paymentResponse.ok) {
          // ✅ Success - Payment created
          console.log(`[Auto-Recharge] Payment created successfully on attempt ${attempt}:`, {
            paymentId: paymentData.razorpay_payment_id || paymentData.id,
            status: paymentData.status,
            amount: autoRechargeAmount,
            attempt
          })

          // Record or update successful payment
          const finalTransactionId = transactionId || (paymentData.razorpay_payment_id || paymentData.id)
          await recordAutoRechargeTransaction(companyId, {
            payment_id: finalTransactionId,
            customer_id: customerId,
            token_id: tokenId,
            amount: autoRechargeAmount,
            amount_paise: amountInPaise,
            status: paymentData.status || 'created',
            email: customerEmail,
            contact: customerContact,
            wallet_balance_before: walletBalance,
            raw_data: { ...paymentData, attempt_number: attempt }
          })

          return {
            success: true,
            triggered: true,
            message: `Payment created successfully on attempt ${attempt}`,
            paymentId: finalTransactionId,
            amount: autoRechargeAmount
          }
        }

        // ❌ Payment failed - check if we should retry
        const errorCode = paymentData.error?.code
        const errorDescription = paymentData.error?.description || 'Unknown error'
        const errorReason = paymentData.error?.reason

        console.error(`[Auto-Recharge] Payment attempt ${attempt} failed:`, {
          status: paymentResponse.status,
          errorCode,
          errorDescription,
          errorReason,
          payload: { ...paymentPayload, token: '***' }
        })

        lastError = paymentData.error
        
        // Check if error is retryable
        const isRetryableError = shouldRetryPayment(errorCode, paymentResponse.status)
        
        // Record failed attempt
        if (!transactionId) {
          transactionId = `retry_${idempotencyKey}`
        }
        
        await recordAutoRechargeTransaction(companyId, {
          payment_id: transactionId,
          customer_id: customerId,
          token_id: tokenId,
          amount: autoRechargeAmount,
          amount_paise: amountInPaise,
          status: attempt === MAX_RETRIES ? 'failed' : 'retry_failed',
          email: customerEmail,
          contact: customerContact,
          error_code: errorCode,
          error_description: errorDescription,
          error_reason: errorReason,
          wallet_balance_before: walletBalance,
          raw_data: { ...paymentData, attempt_number: attempt }
        })

        if (!isRetryableError) {
          console.log(`[Auto-Recharge] Non-retryable error (${errorCode}), stopping retries`)
          break
        }

        if (attempt < MAX_RETRIES) {
          const delay = RETRY_DELAYS[attempt - 1]
          console.log(`[Auto-Recharge] Retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }

      } catch (networkError: any) {
        console.error(`[Auto-Recharge] Network error on attempt ${attempt}:`, networkError.message)
        lastError = { code: 'NETWORK_ERROR', description: networkError.message }
        
        // Record network error
        if (!transactionId) {
          transactionId = `network_error_${idempotencyKey}`
        }
        
        await recordAutoRechargeTransaction(companyId, {
          payment_id: transactionId,
          customer_id: customerId,
          token_id: tokenId,
          amount: autoRechargeAmount,
          amount_paise: amountInPaise,
          status: attempt === MAX_RETRIES ? 'failed' : 'network_error',
          email: customerEmail,
          contact: customerContact,
          error_code: 'NETWORK_ERROR',
          error_description: networkError.message,
          wallet_balance_before: walletBalance,
          raw_data: { attempt_number: attempt, error: networkError.message }
        })

        if (attempt < MAX_RETRIES) {
          const delay = RETRY_DELAYS[attempt - 1]
          console.log(`[Auto-Recharge] Network error, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    // ❌ All retries exhausted
    console.error(`[Auto-Recharge] All ${MAX_RETRIES} attempts failed for company ${companyId}:`, {
      finalError: lastError,
      transactionId
    })

    return {
      success: false,
      triggered: true,
      message: lastError?.description || `All ${MAX_RETRIES} payment attempts failed`
    }

  } catch (error: any) {
    console.error('[Auto-Recharge] Error:', error)
    return {
      success: false,
      triggered: false,
      message: error.message || 'Failed to process auto-recharge'
    }
  }
}

/**
 * Record auto-recharge transaction in database for tracking and idempotency
 */
async function recordAutoRechargeTransaction(
  companyId: string,
  data: {
    payment_id: string
    customer_id: string
    token_id: string
    amount: number
    amount_paise: number
    status: string
    email?: string
    contact?: string
    error_code?: string
    error_description?: string
    error_reason?: string
    wallet_balance_before?: number
    raw_data?: any
  }
): Promise<void> {
  try {
    const insertQuery = `
      INSERT INTO auto_recharge_transactions (
        company_id,
        payment_id,
        order_id,
        customer_id,
        token_id,
        amount,
        amount_paise,
        status,
        email,
        contact,
        error_code,
        error_description,
        error_reason,
        wallet_balance_before,
        raw_data,
        description
      ) VALUES (
        $1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15::jsonb, $16
      )
      ON CONFLICT (payment_id) DO UPDATE SET
        status = EXCLUDED.status,
        error_code = EXCLUDED.error_code,
        error_description = EXCLUDED.error_description,
        raw_data = EXCLUDED.raw_data,
        updated_at = NOW()
    `
    
    await DatabaseService.query(insertQuery, [
      companyId,
      data.payment_id,
      'direct_token_payment', // No order_id for direct token payments
      data.customer_id,
      data.token_id,
      data.amount,
      data.amount_paise,
      data.status,
      data.email || null,
      data.contact || null,
      data.error_code || null,
      data.error_description || null,
      data.error_reason || null,
      data.wallet_balance_before || null,
      JSON.stringify(data.raw_data || {}),
      'Wallet Auto Recharge'
    ])
  } catch (error) {
    console.error('[Auto-Recharge] Failed to record transaction:', error)
    // Don't throw - this is a non-critical operation
  }
}
