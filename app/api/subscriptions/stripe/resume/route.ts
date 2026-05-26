import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { cookies } from 'next/headers'
import { stripe } from '@/stripe/stripeController'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/subscriptions/stripe/resume
 *
 * Resumes a Stripe subscription scheduled for cancellation
 * (i.e. cancel_at_period_end = true).
 */
export async function POST(request: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 })
    }

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
        console.log('[Stripe Subscription Resume] Failed to parse session cookie:', e)
      }
    }

    if (!companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const subscription = await DatabaseService.getSubscription(companyId, 'stripe')
    if (!subscription) {
      return NextResponse.json({ error: 'No Stripe subscription found' }, { status: 404 })
    }

    if (!subscription.cancel_at_cycle_end) {
      return NextResponse.json(
        { error: 'Subscription is not scheduled for cancellation' },
        { status: 400 }
      )
    }

    const stripeSubId = subscription.subscription_id
    if (!stripeSubId || stripeSubId.startsWith('stripe_session_')) {
      return NextResponse.json(
        { error: 'Subscription is still pending payment — cannot resume' },
        { status: 400 }
      )
    }

    // Remove cancel_at_period_end flag in Stripe
    const updated = await stripe.subscriptions.update(stripeSubId, {
      cancel_at_period_end: false,
    })

    // Update DB
    await DatabaseService.resumeSubscription(companyId, 'stripe')

    return NextResponse.json({
      ok: true,
      message: 'Subscription resumed — auto-renewal restored',
      subscription: {
        id: stripeSubId,
        status: updated.status,
        cancelAtCycleEnd: false,
      },
    })
  } catch (error: any) {
    console.error('[Stripe Subscription Resume] Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to resume subscription' },
      { status: 500 }
    )
  }
}
