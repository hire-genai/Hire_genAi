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
    const error = await response.text()
    console.error('[PayPal] Failed to get access token:', error)
    throw new Error('Failed to authenticate with PayPal')
  }

  const data = await response.json()
  return data.access_token
}

async function getSubscriptionDetails(subscriptionId: string, accessToken: string) {
  const response = await fetch(`${PAYPAL_API_BASE}/v1/billing/subscriptions/${subscriptionId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('[PayPal] Failed to get subscription details:', error)
    throw new Error('Failed to verify subscription with PayPal')
  }

  return response.json()
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { subscriptionId, companyId } = body

    if (!subscriptionId) {
      return NextResponse.json(
        { ok: false, error: 'subscriptionId is required' },
        { status: 400 }
      )
    }

    if (!companyId) {
      return NextResponse.json(
        { ok: false, error: 'companyId is required' },
        { status: 400 }
      )
    }

    console.log('[PayPal] Verifying subscription:', subscriptionId, 'for company:', companyId)

    // Get PayPal access token
    const accessToken = await getPayPalAccessToken()

    // Verify subscription with PayPal
    const subscription = await getSubscriptionDetails(subscriptionId, accessToken)

    console.log('[PayPal] Subscription details:', {
      id: subscription.id,
      status: subscription.status,
      plan_id: subscription.plan_id,
      subscriber: subscription.subscriber?.email_address,
    })

    // Check if subscription is active
    if (subscription.status !== 'ACTIVE' && subscription.status !== 'APPROVED') {
      return NextResponse.json(
        { 
          ok: false, 
          error: `Subscription is not active. Status: ${subscription.status}` 
        },
        { status: 400 }
      )
    }

    // Store subscription in database
    const upsertQuery = `
      INSERT INTO company_subscriptions (
        company_id,
        provider,
        subscription_id,
        plan_id,
        status,
        subscriber_email,
        start_time,
        next_billing_time,
        raw_data,
        created_at,
        updated_at
      ) VALUES (
        $1::uuid,
        'paypal',
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        NOW(),
        NOW()
      )
      ON CONFLICT (company_id, provider) 
      DO UPDATE SET
        subscription_id = EXCLUDED.subscription_id,
        plan_id = EXCLUDED.plan_id,
        status = EXCLUDED.status,
        subscriber_email = EXCLUDED.subscriber_email,
        start_time = EXCLUDED.start_time,
        next_billing_time = EXCLUDED.next_billing_time,
        raw_data = EXCLUDED.raw_data,
        updated_at = NOW()
      RETURNING id
    `

    await DatabaseService.query(upsertQuery, [
      companyId,
      subscription.id,
      subscription.plan_id,
      subscription.status.toLowerCase(),
      subscription.subscriber?.email_address || null,
      subscription.start_time || null,
      subscription.billing_info?.next_billing_time || null,
      JSON.stringify(subscription),
    ])

    // Update company billing status
    const updateBillingQuery = `
      INSERT INTO company_billing (company_id, subscription_status, updated_at)
      VALUES ($1::uuid, 'active', NOW())
      ON CONFLICT (company_id)
      DO UPDATE SET subscription_status = 'active', updated_at = NOW()
    `
    await DatabaseService.query(updateBillingQuery, [companyId])

    console.log('[PayPal] Subscription verified and stored successfully')

    return NextResponse.json({
      ok: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        planId: subscription.plan_id,
        subscriberEmail: subscription.subscriber?.email_address,
        startTime: subscription.start_time,
        nextBillingTime: subscription.billing_info?.next_billing_time,
      },
    })
  } catch (error: any) {
    console.error('[PayPal] Verification error:', error)
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to verify subscription' },
      { status: 500 }
    )
  }
}
