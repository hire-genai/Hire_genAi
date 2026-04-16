import { DatabaseService } from '@/lib/database'

/**
 * Check if auto-recharge should be triggered and create a Razorpay addon if needed.
 * 
 * This function:
 * 1. Fetches wallet_balance, auto_recharge_enabled, auto_recharge_amount, auto_recharge_threshold from company_billing
 * 2. Fetches active subscription_id from company_subscriptions
 * 3. If auto_recharge_enabled is false → returns early
 * 4. If wallet_balance >= auto_recharge_threshold → returns early
 * 5. Creates a Razorpay addon on the subscription for the auto_recharge_amount
 * 
 * @param companyId - The company UUID to check and potentially auto-recharge
 * @returns Object with success status and details
 */
export async function checkAndAutoRecharge(companyId: string): Promise<{
  success: boolean
  triggered: boolean
  message: string
  addonId?: string
  paymentId?: string
  orderId?: string
  amount?: number
}> {
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
    const autoRechargeAmount = parseFloat(billing.auto_recharge_amount) || 2000
    const autoRechargeThreshold = parseFloat(billing.auto_recharge_threshold) || 100

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

    // ─── 4. Fetch customer_id, token_id, and subscriber_email from company_subscriptions ───
    const subscriptionQuery = `
      SELECT customer_id, token_id, subscription_id, subscriber_email
      FROM company_subscriptions 
      WHERE company_id = $1::uuid 
        AND status = 'active'
      ORDER BY updated_at DESC
      LIMIT 1
    `
    
    const subscriptionResult = await DatabaseService.query(subscriptionQuery, [companyId])
    
    if (subscriptionResult.length === 0) {
      return {
        success: false,
        triggered: false,
        message: 'No active subscription found for auto-recharge'
      }
    }

    const { 
      customer_id: customerId, 
      token_id: tokenId, 
      subscription_id: subscriptionId,
      subscriber_email 
    } = subscriptionResult[0]
    
    if (!tokenId) {
      console.warn(`[Auto-Recharge] No token found for company ${companyId}`)
      return {
        success: false,
        triggered: false,
        message: 'No token found for recurring payments'
      }
    }

    // ─── 5. Get Razorpay credentials ───
    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET

    if (!keyId || !keySecret) {
      console.error('[Auto-Recharge] Razorpay credentials not configured')
      return {
        success: false,
        triggered: false,
        message: 'Payment system not configured'
      }
    }

    // ─── 6. Create Razorpay Order ───
    const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64')
    
    const orderPayload = {
      amount: Math.round(autoRechargeAmount * 100), // Convert to paise
      currency: 'INR',
      notes: {
        company_id: companyId,
        description: 'Wallet Auto Recharge'
      }
    }

    console.log(`[Auto-Recharge] Creating order for company ${companyId}:`, {
      customerId,
      tokenId,
      amount: autoRechargeAmount,
      walletBalance,
      threshold: autoRechargeThreshold
    })

    const orderResponse = await fetch(
      'https://api.razorpay.com/v1/orders',
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderPayload)
      }
    )

    const orderData = await orderResponse.json()

    if (!orderResponse.ok) {
      console.error('[Auto-Recharge] Razorpay Order API error:', orderData)
      return {
        success: false,
        triggered: true,
        message: orderData.error?.description || 'Failed to create auto-recharge order'
      }
    }

    console.log(`[Auto-Recharge] Order created successfully:`, orderData.id)

    // 7. Fetch customer details from Razorpay API and company email as fallback
    let customerEmail = subscriber_email || ''
    let customerContact = '9999999999' // Default fallback

    // First, try to get company email from database as fallback
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
          console.log(`[Auto-Recharge] Using company user email as fallback: ${customerEmail}`)
        }
      } catch (err) {
        console.warn(`[Auto-Recharge] Failed to fetch company email:`, err)
      }
    }

    try {
      console.log(`[Auto-Recharge] Fetching customer details for: ${customerId}`)
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
        console.log(`[Auto-Recharge] Customer details fetched:`, {
          email: customerData.email,
          contact: customerData.contact
        })
        
        // Use Razorpay customer data if available (prefer non-empty values)
        if (customerData.email) customerEmail = customerData.email
        if (customerData.contact) customerContact = customerData.contact
      } else {
        console.warn(`[Auto-Recharge] Failed to fetch customer details, using fallbacks`)
      }
    } catch (error) {
      console.warn(`[Auto-Recharge] Error fetching customer details:`, error)
    }

    // Validate email - Razorpay requires a valid email for recurring payments
    if (!customerEmail) {
      console.error(`[Auto-Recharge] No email found for customer. Cannot create recurring payment.`)
      return {
        success: false,
        triggered: true,
        message: 'No email found for customer - cannot create recurring payment'
      }
    }

    console.log(`[Auto-Recharge] Using email: ${customerEmail}, contact: ${customerContact}`)

    // 8. Create Recurring Payment with proper customer details
    const paymentPayload = {
      customer_id: customerId,
      token: tokenId,
      order_id: orderData.id,
      email: customerEmail,
      contact: customerContact,
      amount: Math.round(autoRechargeAmount * 100),
      currency: 'INR'
    }

    const paymentResponse = await fetch(
      'https://api.razorpay.com/v1/payments/create/recurring',
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentPayload)
      }
    )

    const paymentData = await paymentResponse.json()

    if (!paymentResponse.ok) {
      console.error('[Auto-Recharge] Razorpay Payment API error:', paymentData)
      return {
        success: false,
        triggered: true,
        message: paymentData.error?.description || 'Failed to create recurring payment'
      }
    }

    console.log(`[Auto-Recharge] Recurring payment created successfully:`, paymentData.id)

    return {
      success: true,
      triggered: true,
      message: 'Auto-recharge payment created successfully',
      paymentId: paymentData.id,
      orderId: orderData.id,
      amount: autoRechargeAmount
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
