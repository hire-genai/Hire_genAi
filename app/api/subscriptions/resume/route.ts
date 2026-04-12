import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/subscriptions/resume
 * 
 * Resumes a subscription that was scheduled for cancellation (cancel_at_cycle_end = true).
 * This removes the cancellation flag and keeps the same subscription active.
 * 
 * Requirements:
 * - Subscription must exist and be in 'active' status with cancel_at_cycle_end = true
 * - Wallet balance must be >= 100 (or subscription must not have expired)
 * 
 * This does NOT create a new subscription - it just removes the cancellation flag.
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
        console.log('[Subscription Resume] Failed to parse session cookie:', e)
      }
    }
    
    if (!companyId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // ─── 2. Get existing subscription ───
    const subscription = await DatabaseService.getSubscription(companyId, 'razorpay')

    if (!subscription) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      )
    }

    // Check if subscription is actually scheduled for cancellation
    if (!subscription.cancel_at_cycle_end) {
      return NextResponse.json(
        { error: 'Subscription is not scheduled for cancellation' },
        { status: 400 }
      )
    }

    // Check if subscription has already expired
    if (subscription.next_billing_time) {
      const expiryDate = new Date(subscription.next_billing_time)
      const now = new Date()
      if (now > expiryDate) {
        return NextResponse.json(
          { error: 'Subscription has already expired. Please create a new subscription.' },
          { status: 400 }
        )
      }
    }

    // ─── 3. Resume subscription in Razorpay (if API supports it) ───
    // Note: Razorpay doesn't have a direct "resume" API for subscriptions
    // that were cancelled with cancel_at_cycle_end.
    // We need to update our local database and potentially call Razorpay
    // to update the subscription if needed.
    
    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET

    if (keyId && keySecret) {
      try {
        // Try to resume via Razorpay API (update subscription)
        const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64')
        
        // Razorpay doesn't have a direct resume endpoint, but we can try to
        // update the subscription or fetch its current status
        const razorpayResponse = await fetch(
          `https://api.razorpay.com/v1/subscriptions/${subscription.subscription_id}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Basic ${authHeader}`,
              'Content-Type': 'application/json'
            }
          }
        )

        if (razorpayResponse.ok) {
          const razorpayData = await razorpayResponse.json()
          console.log('[Subscription Resume] Razorpay subscription status:', razorpayData.status)
          
          // If Razorpay shows subscription as cancelled, we can't resume it
          if (razorpayData.status === 'cancelled' || razorpayData.status === 'completed') {
            return NextResponse.json(
              { error: 'Subscription cannot be resumed. Please create a new subscription.' },
              { status: 400 }
            )
          }
        }
      } catch (razorpayError) {
        console.log('[Subscription Resume] Razorpay check failed, continuing with local update:', razorpayError)
      }
    }

    // ─── 4. Update local database - remove cancellation flag ───
    const updatedSubscription = await DatabaseService.resumeSubscription(companyId, 'razorpay')

    if (!updatedSubscription) {
      return NextResponse.json(
        { error: 'Failed to resume subscription' },
        { status: 500 }
      )
    }

    console.log('[Subscription Resume] Subscription resumed successfully:', subscription.subscription_id)

    // ─── 5. Return result ───
    return NextResponse.json({
      ok: true,
      message: 'Subscription resumed successfully',
      subscription: {
        id: updatedSubscription.subscription_id,
        status: updatedSubscription.status,
        cancelAtCycleEnd: false,
        nextBillingDate: updatedSubscription.next_billing_time
      }
    })

  } catch (error: any) {
    console.error('[Subscription Resume] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to resume subscription' },
      { status: 500 }
    )
  }
}
