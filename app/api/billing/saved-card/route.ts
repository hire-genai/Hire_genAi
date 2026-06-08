import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/billing/saved-card
 * 
 * Fetches saved auto-recharge card details for the authenticated company.
 * Returns card last 4 digits, network, type, and whether auto-recharge is enabled.
 */
export async function GET(request: NextRequest) {
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
        console.log('[Saved Card] Failed to parse session cookie:', e)
      }
    }
    
    if (!companyId) {
      return NextResponse.json(
        { error: 'Unauthorized - Company ID not found in session' },
        { status: 401 }
      )
    }

    // ─── 2. Fetch saved card details from company_subscriptions ───
    const query = `
      SELECT 
        auto_recharge_token_id,
        auto_recharge_customer_id,
        auto_recharge_card_last4,
        auto_recharge_card_network,
        auto_recharge_card_type,
        auto_recharge_card_issuer,
        auto_recharge_token_created_at,
        customer_id
      FROM company_subscriptions 
      WHERE company_id = $1::uuid 
        AND provider = 'razorpay'
      ORDER BY updated_at DESC
      LIMIT 1
    `
    
    const result = await DatabaseService.query(query, [companyId])
    
    // Also fetch auto-recharge enabled status from company_billing
    const billingQuery = `
      SELECT auto_recharge_enabled
      FROM company_billing
      WHERE company_id = $1::uuid
    `
    const billingResult = await DatabaseService.query(billingQuery, [companyId])
    const autoRechargeEnabled = billingResult.length > 0 ? billingResult[0].auto_recharge_enabled : false
    
    if (result.length === 0 || !result[0].auto_recharge_token_id) {
      // No saved card
      return NextResponse.json({
        ok: true,
        hasSavedCard: false,
        card: null,
        autoRechargeEnabled,
        customerId: result.length > 0 ? result[0].customer_id : null
      })
    }

    const cardData = result[0]
    
    return NextResponse.json({
      ok: true,
      hasSavedCard: true,
      card: {
        last4: cardData.auto_recharge_card_last4,
        network: cardData.auto_recharge_card_network,
        type: cardData.auto_recharge_card_type,
        issuer: cardData.auto_recharge_card_issuer,
        tokenCreatedAt: cardData.auto_recharge_token_created_at
      },
      autoRechargeEnabled,
      customerId: cardData.auto_recharge_customer_id || cardData.customer_id
    })

  } catch (error: any) {
    console.error('[Saved Card] GET Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch saved card' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/billing/saved-card
 * 
 * Saves auto-recharge card details after successful Razorpay authorization.
 * Called by webhook or after payment completion.
 */
export async function POST(request: NextRequest) {
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
        console.log('[Saved Card] Failed to parse session cookie:', e)
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
      tokenId, 
      customerId, 
      cardLast4, 
      cardNetwork, 
      cardType, 
      cardIssuer 
    } = body

    if (!tokenId || !customerId) {
      return NextResponse.json(
        { error: 'tokenId and customerId are required' },
        { status: 400 }
      )
    }

    // ─── 3. Update company_subscriptions with auto-recharge token ───
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
      cardLast4 || null,
      cardNetwork || null,
      cardType || null,
      cardIssuer || null
    ])

    if (result.length === 0) {
      // No existing subscription record, create one
      const insertQuery = `
        INSERT INTO company_subscriptions (
          company_id,
          provider,
          subscription_id,
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
        cardLast4 || null,
        cardNetwork || null,
        cardType || null,
        cardIssuer || null
      ])
    }

    console.log(`[Saved Card] Saved auto-recharge card for company: ${companyId}`)

    return NextResponse.json({
      ok: true,
      message: 'Card saved successfully for auto-recharge'
    })

  } catch (error: any) {
    console.error('[Saved Card] POST Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to save card' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/billing/saved-card
 * 
 * Removes saved auto-recharge card and disables auto-recharge.
 */
export async function DELETE(request: NextRequest) {
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
        console.log('[Saved Card] Failed to parse session cookie:', e)
      }
    }
    
    if (!companyId) {
      return NextResponse.json(
        { error: 'Unauthorized - Company ID not found in session' },
        { status: 401 }
      )
    }

    // ─── 2. Remove auto-recharge token from company_subscriptions ───
    const updateQuery = `
      UPDATE company_subscriptions 
      SET 
        auto_recharge_token_id = NULL,
        auto_recharge_customer_id = NULL,
        auto_recharge_card_last4 = NULL,
        auto_recharge_card_network = NULL,
        auto_recharge_card_type = NULL,
        auto_recharge_card_issuer = NULL,
        auto_recharge_token_created_at = NULL,
        updated_at = NOW()
      WHERE company_id = $1::uuid AND provider = 'razorpay'
    `

    await DatabaseService.query(updateQuery, [companyId])

    // ─── 3. Disable auto-recharge in company_billing ───
    const billingQuery = `
      UPDATE company_billing 
      SET 
        auto_recharge_enabled = FALSE,
        updated_at = NOW()
      WHERE company_id = $1::uuid
    `

    await DatabaseService.query(billingQuery, [companyId])

    console.log(`[Saved Card] Removed auto-recharge card for company: ${companyId}`)

    return NextResponse.json({
      ok: true,
      message: 'Card removed and auto-recharge disabled'
    })

  } catch (error: any) {
    console.error('[Saved Card] DELETE Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to remove card' },
      { status: 500 }
    )
  }
}
