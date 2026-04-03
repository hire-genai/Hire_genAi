import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/subscriptions/cancel
 * 
 * Cancels the active Razorpay subscription for the authenticated company.
 * The subscription will remain active until the end of the current billing period.
 * 
 * Request body (optional):
 * {
 *   cancelAtCycleEnd: boolean (default: true) - If true, cancels at end of current cycle
 * }
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
        console.log('[Subscription Cancel] Failed to parse session cookie:', e)
      }
    }
    
    if (!companyId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // ─── 2. Parse request body ───
    let cancelAtCycleEnd = true
    try {
      const body = await request.json()
      cancelAtCycleEnd = body.cancelAtCycleEnd !== false
    } catch {
      // Use default if no body
    }

    // ─── 3. Get existing subscription ───
    const subscription = await DatabaseService.getSubscription(companyId, 'razorpay')

    if (!subscription) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      )
    }

    if (subscription.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Subscription is already cancelled' },
        { status: 400 }
      )
    }

    // ─── 4. Get Razorpay credentials ───
    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET

    if (!keyId || !keySecret) {
      console.error('[Subscription Cancel] Razorpay credentials not configured')
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 500 }
      )
    }

    // ─── 5. Cancel subscription via Razorpay API ───
    const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64')
    
    const cancelPayload = {
      cancel_at_cycle_end: cancelAtCycleEnd ? 1 : 0
    }

    console.log(`[Subscription Cancel] Cancelling subscription: ${subscription.subscription_id}`)

    const razorpayResponse = await fetch(
      `https://api.razorpay.com/v1/subscriptions/${subscription.subscription_id}/cancel`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cancelPayload)
      }
    )

    const razorpayData = await razorpayResponse.json()

    if (!razorpayResponse.ok) {
      console.error('[Subscription Cancel] Razorpay API error:', razorpayData)
      return NextResponse.json(
        { error: razorpayData.error?.description || 'Failed to cancel subscription' },
        { status: razorpayResponse.status }
      )
    }

    console.log('[Subscription Cancel] Razorpay subscription cancelled:', razorpayData.status)

    // ─── 6. Update local database ───
    await DatabaseService.updateSubscriptionStatus(
      companyId,
      'razorpay',
      razorpayData.status || 'cancelled'
    )

    // ─── 7. Return result ───
    return NextResponse.json({
      ok: true,
      message: cancelAtCycleEnd 
        ? 'Subscription will be cancelled at the end of the current billing period'
        : 'Subscription cancelled immediately',
      subscription: {
        id: subscription.subscription_id,
        status: razorpayData.status,
        endedAt: razorpayData.ended_at 
          ? new Date(razorpayData.ended_at * 1000).toISOString() 
          : null
      }
    })

  } catch (error: any) {
    console.error('[Subscription Cancel] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to cancel subscription' },
      { status: 500 }
    )
  }
}
