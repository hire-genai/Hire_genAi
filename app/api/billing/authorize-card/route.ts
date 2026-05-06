import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/billing/authorize-card
 * 
 * Creates a Razorpay order for card authorization (small amount like ₹1).
 * This is used to save a card for auto-recharge purposes.
 * 
 * The flow:
 * 1. Create/get Razorpay customer
 * 2. Create order with recurring=1 for token creation
 * 3. Return order details for Razorpay Checkout
 * 4. On payment success, webhook captures token_id
 */
export async function POST(request: NextRequest) {
  try {
    // ─── 1. Authenticate user from session cookie ───
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    let companyId: string | null = null
    let userEmail: string | null = null

    if (sessionCookie?.value) {
      try {
        let cookieValue = sessionCookie.value
        try {
          cookieValue = decodeURIComponent(cookieValue)
        } catch { /* use raw value if decode fails */ }
        
        const session = JSON.parse(cookieValue)
        companyId = session.companyId || session.company?.id
        userEmail = session.email || session.user?.email
      } catch (e) {
        console.log('[Authorize Card] Failed to parse session cookie:', e)
      }
    }
    
    if (!companyId) {
      return NextResponse.json(
        { error: 'Unauthorized - Company ID not found in session' },
        { status: 401 }
      )
    }

    // ─── 2. Get user email if not in session ───
    if (!userEmail) {
      const userQuery = `
        SELECT email FROM users 
        WHERE company_id = $1::uuid 
        ORDER BY created_at ASC 
        LIMIT 1
      `
      const userResult = await DatabaseService.query(userQuery, [companyId])
      if (userResult.length > 0) {
        userEmail = userResult[0].email
      }
    }

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email not found' },
        { status: 400 }
      )
    }

    // ─── 3. Get Razorpay credentials ───
    const keyId = process.env.RAZORPAY_KEY_ID?.trim()
    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim()

    if (!keyId || !keySecret) {
      console.error('[Authorize Card] Razorpay credentials not configured')
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 500 }
      )
    }

    const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64')

    // ─── 4. Check for existing customer or create new one ───
    let customerId: string | null = null

    // First check if we have a customer_id in company_subscriptions
    const subQuery = `
      SELECT customer_id, auto_recharge_customer_id 
      FROM company_subscriptions 
      WHERE company_id = $1::uuid AND provider = 'razorpay'
      LIMIT 1
    `
    const subResult = await DatabaseService.query(subQuery, [companyId])
    
    if (subResult.length > 0) {
      customerId = subResult[0].auto_recharge_customer_id || subResult[0].customer_id
    }

    // If no customer exists, create one
    if (!customerId) {
      console.log(`[Authorize Card] Creating new Razorpay customer for: ${userEmail}`)
      
      const customerResponse = await fetch('https://api.razorpay.com/v1/customers', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: userEmail.split('@')[0],
          email: userEmail,
          notes: {
            company_id: companyId,
            purpose: 'auto_recharge'
          }
        })
      })

      if (!customerResponse.ok) {
        const errorData = await customerResponse.json()
        console.error('[Authorize Card] Failed to create customer:', errorData)
        return NextResponse.json(
          { error: 'Failed to create payment customer' },
          { status: 500 }
        )
      }

      const customerData = await customerResponse.json()
      customerId = customerData.id
      console.log(`[Authorize Card] Created customer: ${customerId}`)
    }

    // ─── 5. Create order for card authorization ───
    // Using ₹1 (100 paise) for authorization
    const authorizationAmount = 100 // 100 paise = ₹1

    const orderResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: authorizationAmount,
        currency: 'INR',
        receipt: `auth_${Date.now()}`,
        notes: {
          company_id: companyId,
          purpose: 'card_authorization',
          type: 'auto_recharge_setup'
        }
      })
    })

    if (!orderResponse.ok) {
      const errorData = await orderResponse.json()
      console.error('[Authorize Card] Failed to create order:', errorData)
      return NextResponse.json(
        { error: 'Failed to create authorization order' },
        { status: 500 }
      )
    }

    const orderData = await orderResponse.json()
    console.log(`[Authorize Card] Created order: ${orderData.id}`)

    // ─── 6. Return order details for Razorpay Checkout ───
    return NextResponse.json({
      ok: true,
      order: {
        id: orderData.id,
        amount: orderData.amount,
        currency: orderData.currency
      },
      customerId,
      keyId,
      userEmail,
      companyId,
      // Checkout options
      checkoutOptions: {
        key: keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'HireGenAI',
        description: 'Save card for Auto-Recharge',
        order_id: orderData.id,
        customer_id: customerId,
        recurring: '1', // Enable recurring/token creation
        prefill: {
          email: userEmail
        },
        notes: {
          company_id: companyId,
          purpose: 'card_authorization',
          type: 'auto_recharge_setup'
        },
        theme: {
          color: '#059669' // Emerald color
        }
      }
    })

  } catch (error: any) {
    console.error('[Authorize Card] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to initiate card authorization' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/billing/authorize-card
 * 
 * Called after successful Razorpay payment to verify and save the token.
 * This is called from the frontend after Razorpay Checkout success callback.
 */
export async function PUT(request: NextRequest) {
  try {
    // ─── 1. Authenticate user from session cookie ───
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    let companyId: string | null = null

    if (sessionCookie?.value) {
      try {
        let cookieValue = sessionCookie.value
        try {
          cookieValue = decodeURIComponent(cookieValue)
        } catch { /* use raw value if decode fails */ }
        
        const session = JSON.parse(cookieValue)
        companyId = session.companyId || session.company?.id
      } catch (e) {
        console.log('[Authorize Card] Failed to parse session cookie:', e)
      }
    }
    
    if (!companyId) {
      return NextResponse.json(
        { error: 'Unauthorized - Company ID not found in session' },
        { status: 401 }
      )
    }

    // ─── 2. Parse request body ───
    const body = await request.json()
    const { 
      razorpay_payment_id, 
      razorpay_order_id, 
      razorpay_signature 
    } = body

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return NextResponse.json(
        { error: 'Missing payment verification parameters' },
        { status: 400 }
      )
    }

    // ─── 3. Verify payment signature ───
    const crypto = await import('crypto')
    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim()

    if (!keySecret) {
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 500 }
      )
    }

    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex')

    if (expectedSignature !== razorpay_signature) {
      console.error('[Authorize Card] Invalid payment signature')
      return NextResponse.json(
        { error: 'Invalid payment signature' },
        { status: 400 }
      )
    }

    console.log(`[Authorize Card] Payment verified: ${razorpay_payment_id}`)

    // ─── 4. Fetch payment details to get token_id ───
    const keyId = process.env.RAZORPAY_KEY_ID?.trim()
    const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64')

    const paymentResponse = await fetch(
      `https://api.razorpay.com/v1/payments/${razorpay_payment_id}?expand[]=card&expand[]=token`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!paymentResponse.ok) {
      console.error('[Authorize Card] Failed to fetch payment details')
      return NextResponse.json(
        { error: 'Failed to fetch payment details' },
        { status: 500 }
      )
    }

    const paymentData = await paymentResponse.json()
    console.log(`[Authorize Card] Payment data:`, {
      id: paymentData.id,
      token_id: paymentData.token_id,
      customer_id: paymentData.customer_id,
      card: paymentData.card
    })

    const tokenId = paymentData.token_id
    const customerId = paymentData.customer_id

    if (!tokenId) {
      console.error('[Authorize Card] No token_id in payment response')
      return NextResponse.json(
        { error: 'Card token not created. Please try again.' },
        { status: 400 }
      )
    }

    // ─── 5. Save token to database ───
    const cardInfo = paymentData.card || {}
    
    const updateQuery = `
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
      RETURNING id
    `

    const result = await DatabaseService.query(updateQuery, [
      companyId,
      tokenId,
      customerId,
      cardInfo.last4 || null,
      cardInfo.network || null,
      cardInfo.type || null,
      cardInfo.issuer || null
    ])

    if (result.length === 0) {
      // No existing subscription record, create one
      const insertQuery = `
        INSERT INTO company_subscriptions (
          company_id,
          provider,
          subscription_id,
          customer_id,
          auto_recharge_token_id,
          auto_recharge_customer_id,
          auto_recharge_card_last4,
          auto_recharge_card_network,
          auto_recharge_card_type,
          auto_recharge_card_issuer,
          auto_recharge_token_created_at,
          status
        ) VALUES (
          $1::uuid,
          'razorpay',
          'auto_recharge_only',
          $3,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          NOW(),
          'active'
        )
        ON CONFLICT (company_id, provider) DO UPDATE SET
          auto_recharge_token_id = $2,
          auto_recharge_customer_id = $3,
          auto_recharge_card_last4 = $4,
          auto_recharge_card_network = $5,
          auto_recharge_card_type = $6,
          auto_recharge_card_issuer = $7,
          auto_recharge_token_created_at = NOW(),
          updated_at = NOW()
      `

      await DatabaseService.query(insertQuery, [
        companyId,
        tokenId,
        customerId,
        cardInfo.last4 || null,
        cardInfo.network || null,
        cardInfo.type || null,
        cardInfo.issuer || null
      ])
    }

    console.log(`[Authorize Card] Saved auto-recharge token for company: ${companyId}`)

    return NextResponse.json({
      ok: true,
      message: 'Card saved successfully for auto-recharge',
      card: {
        last4: cardInfo.last4,
        network: cardInfo.network,
        type: cardInfo.type
      }
    })

  } catch (error: any) {
    console.error('[Authorize Card] PUT Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to verify and save card' },
      { status: 500 }
    )
  }
}
