import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { cookies } from 'next/headers'
import { stripe } from '@/stripe/stripeController'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/subscriptions/stripe/cancel
 *
 * Cancels the active Stripe subscription for the authenticated company.
 * By default, cancels at cycle end (user keeps access until billing period ends).
 *
 * Request body (optional):
 * {
 *   cancelAtCycleEnd: boolean (default: true)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 })
    }

    // ─── 1. Authenticate ───
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    let companyId: string | null = null

    if (sessionCookie?.value) {
      try {
        let cookieValue = sessionCookie.value
        try {
          cookieValue = decodeURIComponent(cookieValue)
        } catch {
          /* use raw */
        }
        const session = JSON.parse(cookieValue)
        companyId = session.companyId || session.company?.id
      } catch (e) {
        console.log('[Stripe Subscription Cancel] Failed to parse session cookie:', e)
      }
    }

    if (!companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ─── 2. Parse body ───
    let cancelAtCycleEnd = true
    try {
      const body = await request.json()
      if (body?.cancelAtCycleEnd === false) cancelAtCycleEnd = false
    } catch {
      /* default */
    }

    // ─── 3. Get existing subscription ───
    const subscription = await DatabaseService.getSubscription(companyId, 'stripe')
    if (!subscription) {
      return NextResponse.json({ error: 'No Stripe subscription found' }, { status: 404 })
    }

    if (subscription.cancel_at_cycle_end === true) {
      return NextResponse.json(
        { error: 'Subscription is already scheduled for cancellation' },
        { status: 400 }
      )
    }

    if (subscription.status === 'cancelled') {
      return NextResponse.json({ error: 'Subscription is already cancelled' }, { status: 400 })
    }

    const stripeSubId = subscription.subscription_id
    if (!stripeSubId || stripeSubId.startsWith('stripe_session_')) {
      return NextResponse.json(
        { error: 'Subscription is still pending payment — cannot cancel yet' },
        { status: 400 }
      )
    }

    // ─── 4. Cancel via Stripe API ───
    let updatedSub: any
    if (cancelAtCycleEnd) {
      updatedSub = await stripe.subscriptions.update(stripeSubId, {
        cancel_at_period_end: true,
      })
    } else {
      updatedSub = await stripe.subscriptions.cancel(stripeSubId)
    }

    const currentEnd = updatedSub.current_period_end
      ? new Date(updatedSub.current_period_end * 1000)
      : subscription.next_billing_time
      ? new Date(subscription.next_billing_time)
      : undefined

    // ─── 5. Update DB ───
    if (cancelAtCycleEnd) {
      await DatabaseService.updateSubscriptionStatus(
        companyId,
        'stripe',
        'active',
        currentEnd,
        true
      )
    } else {
      await DatabaseService.updateSubscriptionStatus(
        companyId,
        'stripe',
        'cancelled',
        currentEnd,
        false
      )
    }

    return NextResponse.json({
      ok: true,
      message: cancelAtCycleEnd
        ? 'Subscription will be cancelled at the end of the current billing period'
        : 'Subscription cancelled immediately',
      subscription: {
        id: stripeSubId,
        status: cancelAtCycleEnd ? 'active' : 'cancelled',
        cancelAtCycleEnd,
        currentEnd: currentEnd?.toISOString() || null,
        endedAt: updatedSub.ended_at ? new Date(updatedSub.ended_at * 1000).toISOString() : null,
      },
    })
  } catch (error: any) {
    console.error('[Stripe Subscription Cancel] Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to cancel subscription' },
      { status: 500 }
    )
  }
}
