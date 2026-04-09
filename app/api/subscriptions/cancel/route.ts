import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/subscriptions/cancel
 * 
 * Cancels the active Razorpay subscription for the authenticated company.
 * By default, cancels at cycle end (user keeps access until billing period ends).
 * 
 * Request body (optional):
 * {
 *   cancelAtCycleEnd: boolean (default: true) - If true, cancels at end of current cycle
 * }
 * 
 * IMPORTANT: When cancelAtCycleEnd is true:
 * - Razorpay subscription status remains 'active' until cycle end
 * - We set cancel_at_cycle_end = true in our database
 * - User keeps Pro access until current_end date
 * - After current_end, status becomes 'expired'
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
    // Default to true - cancel at cycle end (not immediate)
    let cancelAtCycleEnd = true
    try {
      const body = await request.json()
      // Only set to false if explicitly passed as false
      if (body.cancelAtCycleEnd === false) {
        cancelAtCycleEnd = false
      }
    } catch {
      // Use default (true) if no body
    }

    // ─── 3. Get existing subscription ───
    const subscription = await DatabaseService.getSubscription(companyId, 'razorpay')

    if (!subscription) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      )
    }

    // Check if already scheduled for cancellation
    if (subscription.cancel_at_cycle_end === true) {
      return NextResponse.json(
        { error: 'Subscription is already scheduled for cancellation' },
        { status: 400 }
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

    console.log(`[Subscription Cancel] Cancelling subscription: ${subscription.subscription_id}, cancelAtCycleEnd: ${cancelAtCycleEnd}`)

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

    console.log('[Subscription Cancel] Razorpay response:', {
      status: razorpayData.status,
      current_end: razorpayData.current_end,
      ended_at: razorpayData.ended_at
    })

    // ─── 6. Update local database ───
    // IMPORTANT: When cancel_at_cycle_end is true:
    // - Keep status as 'active' (user still has access)
    // - Set cancel_at_cycle_end = true
    // - Store current_end as the expiry date
    const currentEnd = razorpayData.current_end 
      ? new Date(razorpayData.current_end * 1000) 
      : (subscription.next_billing_time ? new Date(subscription.next_billing_time) : undefined)

    if (cancelAtCycleEnd) {
      // Schedule cancellation - keep active until cycle end
      await DatabaseService.updateSubscriptionStatus(
        companyId,
        'razorpay',
        'active', // Keep as active - derived status will show 'cancelled'
        currentEnd,
        true // cancel_at_cycle_end = true
      )
    } else {
      // Immediate cancellation
      await DatabaseService.updateSubscriptionStatus(
        companyId,
        'razorpay',
        'cancelled',
        currentEnd,
        false
      )
    }

    // ─── 7. Return result ───
    return NextResponse.json({
      ok: true,
      message: cancelAtCycleEnd 
        ? 'Subscription will be cancelled at the end of the current billing period'
        : 'Subscription cancelled immediately',
      subscription: {
        id: subscription.subscription_id,
        status: cancelAtCycleEnd ? 'active' : 'cancelled',
        cancelAtCycleEnd: cancelAtCycleEnd,
        currentEnd: currentEnd?.toISOString() || null,
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
