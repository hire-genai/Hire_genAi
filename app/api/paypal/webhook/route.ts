import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

const PAYPAL_API_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://api-m.paypal.com' 
  : 'https://api-m.sandbox.paypal.com'

async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID
  const clientSecret = process.env.PAYPAL_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials not configured')
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!response.ok) {
    throw new Error('Failed to authenticate with PayPal')
  }

  const data = await response.json()
  return data.access_token
}

async function verifyWebhookSignature(
  request: NextRequest,
  body: string
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID

  if (!webhookId) {
    console.warn('[PayPal Webhook] PAYPAL_WEBHOOK_ID not configured, skipping signature verification')
    return true
  }

  try {
    const accessToken = await getPayPalAccessToken()

    const verifyPayload = {
      auth_algo: request.headers.get('paypal-auth-algo'),
      cert_url: request.headers.get('paypal-cert-url'),
      transmission_id: request.headers.get('paypal-transmission-id'),
      transmission_sig: request.headers.get('paypal-transmission-sig'),
      transmission_time: request.headers.get('paypal-transmission-time'),
      webhook_id: webhookId,
      webhook_event: JSON.parse(body),
    }

    const response = await fetch(`${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(verifyPayload),
    })

    if (!response.ok) {
      console.error('[PayPal Webhook] Signature verification failed')
      return false
    }

    const result = await response.json()
    return result.verification_status === 'SUCCESS'
  } catch (error) {
    console.error('[PayPal Webhook] Error verifying signature:', error)
    return false
  }
}

async function handleSubscriptionActivated(resource: any) {
  console.log('[PayPal Webhook] Subscription activated:', resource.id)

  const updateQuery = `
    UPDATE company_subscriptions 
    SET status = 'active', updated_at = NOW()
    WHERE subscription_id = $1 AND provider = 'paypal'
  `
  await DatabaseService.query(updateQuery, [resource.id])

  // Update company billing status
  const getCompanyQuery = `
    SELECT company_id FROM company_subscriptions 
    WHERE subscription_id = $1 AND provider = 'paypal'
  `
  const result = await DatabaseService.query(getCompanyQuery, [resource.id])
  
  if (result.length > 0) {
    const updateBillingQuery = `
      UPDATE company_billing 
      SET subscription_status = 'active', updated_at = NOW()
      WHERE company_id = $1::uuid
    `
    await DatabaseService.query(updateBillingQuery, [result[0].company_id])
  }
}

async function handleSubscriptionCancelled(resource: any) {
  console.log('[PayPal Webhook] Subscription cancelled:', resource.id)

  const updateQuery = `
    UPDATE company_subscriptions 
    SET status = 'cancelled', updated_at = NOW()
    WHERE subscription_id = $1 AND provider = 'paypal'
  `
  await DatabaseService.query(updateQuery, [resource.id])

  // Update company billing status
  const getCompanyQuery = `
    SELECT company_id FROM company_subscriptions 
    WHERE subscription_id = $1 AND provider = 'paypal'
  `
  const result = await DatabaseService.query(getCompanyQuery, [resource.id])
  
  if (result.length > 0) {
    const updateBillingQuery = `
      UPDATE company_billing 
      SET subscription_status = 'cancelled', updated_at = NOW()
      WHERE company_id = $1::uuid
    `
    await DatabaseService.query(updateBillingQuery, [result[0].company_id])
  }
}

async function handleSubscriptionSuspended(resource: any) {
  console.log('[PayPal Webhook] Subscription suspended:', resource.id)

  const updateQuery = `
    UPDATE company_subscriptions 
    SET status = 'suspended', updated_at = NOW()
    WHERE subscription_id = $1 AND provider = 'paypal'
  `
  await DatabaseService.query(updateQuery, [resource.id])

  // Update company billing status
  const getCompanyQuery = `
    SELECT company_id FROM company_subscriptions 
    WHERE subscription_id = $1 AND provider = 'paypal'
  `
  const result = await DatabaseService.query(getCompanyQuery, [resource.id])
  
  if (result.length > 0) {
    const updateBillingQuery = `
      UPDATE company_billing 
      SET subscription_status = 'suspended', updated_at = NOW()
      WHERE company_id = $1::uuid
    `
    await DatabaseService.query(updateBillingQuery, [result[0].company_id])
  }
}

async function handlePaymentCompleted(resource: any) {
  console.log('[PayPal Webhook] Payment completed for subscription:', resource.billing_agreement_id)

  // Log the payment
  const insertPaymentQuery = `
    INSERT INTO subscription_payments (
      subscription_id,
      provider,
      payment_id,
      amount,
      currency,
      status,
      payment_time,
      raw_data,
      created_at
    ) VALUES (
      $1,
      'paypal',
      $2,
      $3,
      $4,
      'completed',
      $5,
      $6,
      NOW()
    )
    ON CONFLICT (payment_id, provider) DO NOTHING
  `

  await DatabaseService.query(insertPaymentQuery, [
    resource.billing_agreement_id,
    resource.id,
    resource.amount?.total || resource.amount?.value || '0',
    resource.amount?.currency || resource.amount?.currency_code || 'USD',
    resource.create_time || new Date().toISOString(),
    JSON.stringify(resource),
  ])
}

async function handlePaymentFailed(resource: any) {
  console.log('[PayPal Webhook] Payment failed for subscription:', resource.billing_agreement_id)

  // Log the failed payment
  const insertPaymentQuery = `
    INSERT INTO subscription_payments (
      subscription_id,
      provider,
      payment_id,
      amount,
      currency,
      status,
      payment_time,
      raw_data,
      created_at
    ) VALUES (
      $1,
      'paypal',
      $2,
      $3,
      $4,
      'failed',
      $5,
      $6,
      NOW()
    )
    ON CONFLICT (payment_id, provider) DO NOTHING
  `

  await DatabaseService.query(insertPaymentQuery, [
    resource.billing_agreement_id,
    resource.id,
    resource.amount?.total || resource.amount?.value || '0',
    resource.amount?.currency || resource.amount?.currency_code || 'USD',
    resource.create_time || new Date().toISOString(),
    JSON.stringify(resource),
  ])
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    
    // Verify webhook signature (optional but recommended)
    const isValid = await verifyWebhookSignature(request, body)
    if (!isValid) {
      console.error('[PayPal Webhook] Invalid signature')
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      )
    }

    const event = JSON.parse(body)
    const eventType = event.event_type
    const resource = event.resource

    console.log('[PayPal Webhook] Received event:', eventType)

    // Log the webhook event
    const logQuery = `
      INSERT INTO webhook_logs (
        provider,
        event_type,
        event_id,
        raw_data,
        created_at
      ) VALUES (
        'paypal',
        $1,
        $2,
        $3,
        NOW()
      )
    `
    await DatabaseService.query(logQuery, [
      eventType,
      event.id,
      JSON.stringify(event),
    ]).catch(err => console.warn('[PayPal Webhook] Failed to log event:', err.message))

    // Handle different event types
    switch (eventType) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        await handleSubscriptionActivated(resource)
        break

      case 'BILLING.SUBSCRIPTION.CANCELLED':
        await handleSubscriptionCancelled(resource)
        break

      case 'BILLING.SUBSCRIPTION.SUSPENDED':
        await handleSubscriptionSuspended(resource)
        break

      case 'BILLING.SUBSCRIPTION.EXPIRED':
        await handleSubscriptionCancelled(resource)
        break

      case 'PAYMENT.SALE.COMPLETED':
        await handlePaymentCompleted(resource)
        break

      case 'PAYMENT.SALE.DENIED':
      case 'PAYMENT.SALE.REFUNDED':
      case 'PAYMENT.SALE.REVERSED':
        await handlePaymentFailed(resource)
        break

      default:
        console.log('[PayPal Webhook] Unhandled event type:', eventType)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('[PayPal Webhook] Error processing webhook:', error)
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
