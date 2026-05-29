import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { cookies } from 'next/headers'
import { stripe } from '@/stripe/stripeController'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/subscriptions/stripe/status
 *
 * Returns the current Stripe subscription status for the authenticated company.
 * Pass ?refresh=true to fetch latest from Stripe API and sync.
 */
export async function GET(request: NextRequest) {
  try {
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
        console.log('[Stripe Subscription Status] Failed to parse session cookie:', e)
      }
    }

    if (!companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const subscription = await DatabaseService.getSubscription(companyId, 'stripe')

    if (!subscription) {
      return NextResponse.json({
        ok: true,
        hasSubscription: false,
        subscription: null,
      })
    }

    // Optionally refresh from Stripe
    const refresh = request.nextUrl.searchParams.get('refresh') === 'true'
    let stripeData: any = null

    if (
      refresh &&
      subscription.subscription_id &&
      !subscription.subscription_id.startsWith('stripe_session_') &&
      process.env.STRIPE_SECRET_KEY
    ) {
      try {
        stripeData = await stripe.subscriptions.retrieve(subscription.subscription_id, {
          expand: ['default_payment_method', 'latest_invoice', 'items.data.price.product'],
        })

        // Sync status if changed
        const mappedStatus = mapStripeStatus(stripeData.status)
        const nextBilling = stripeData.current_period_end
          ? new Date(stripeData.current_period_end * 1000)
          : undefined

        if (mappedStatus !== subscription.status || nextBilling) {
          await DatabaseService.updateSubscriptionStatus(
            companyId,
            'stripe',
            mappedStatus,
            nextBilling
          )
        }

        // Backfill plan_name from Stripe if missing in DB
        if (!subscription.plan_name) {
          const price: any = stripeData.items?.data?.[0]?.price
          const product = price?.product
          const planName =
            (product && typeof product === 'object' && product.name) ||
            price?.nickname ||
            null
          if (planName) {
            await DatabaseService.query(
              `UPDATE company_subscriptions
                 SET plan_name = $2, updated_at = NOW()
               WHERE company_id = $1::uuid AND provider = 'stripe'`,
              [companyId, planName]
            )
            subscription.plan_name = planName
          }
        }
      } catch (e) {
        console.error('[Stripe Subscription Status] Failed to refresh from Stripe:', e)
      }
    }

    const isActive = ['active', 'authenticated'].includes(subscription.status)

    return NextResponse.json({
      ok: true,
      hasSubscription: true,
      isActive,
      subscription: {
        id: subscription.subscription_id,
        provider: subscription.provider,
        planId: subscription.plan_id,
        planName: subscription.plan_name || null,
        status: stripeData ? mapStripeStatus(stripeData.status) : subscription.status,
        subscriberEmail: subscription.subscriber_email,
        startTime: subscription.start_time,
        nextBillingTime: stripeData?.current_period_end
          ? new Date(stripeData.current_period_end * 1000).toISOString()
          : subscription.next_billing_time,
        cancelAtCycleEnd: subscription.cancel_at_cycle_end,
        customerId: subscription.customer_id,
        checkoutUrl: subscription.subscription_link || null,
        createdAt: subscription.created_at,
        updatedAt: subscription.updated_at,
      },
      stripeDetails: stripeData
        ? {
            currentPeriodStart: stripeData.current_period_start
              ? new Date(stripeData.current_period_start * 1000).toISOString()
              : null,
            currentPeriodEnd: stripeData.current_period_end
              ? new Date(stripeData.current_period_end * 1000).toISOString()
              : null,
            cancelAtPeriodEnd: stripeData.cancel_at_period_end,
            status: stripeData.status,
          }
        : null,
    })
  } catch (error: any) {
    console.error('[Stripe Subscription Status] Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to get subscription status' },
      { status: 500 }
    )
  }
}

function mapStripeStatus(stripeStatus: string): string {
  switch (stripeStatus) {
    case 'active':
    case 'trialing':
      return 'active'
    case 'past_due':
    case 'unpaid':
      return 'halted'
    case 'canceled':
      return 'cancelled'
    case 'incomplete':
    case 'incomplete_expired':
      return 'pending'
    case 'paused':
      return 'paused'
    default:
      return stripeStatus
  }
}
