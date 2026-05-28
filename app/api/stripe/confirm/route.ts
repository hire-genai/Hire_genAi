import { NextRequest, NextResponse } from 'next/server'
import { stripe, processSuccessfulCheckout } from '@/stripe/stripeController'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe is not configured. Set STRIPE_SECRET_KEY.' },
        { status: 500 }
      )
    }

    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const sessionId: string | undefined = body?.session_id || body?.sessionId
    if (!sessionId) {
      return NextResponse.json({ error: 'session_id is required' }, { status: 400 })
    }

    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent'],
    })

    if (checkoutSession.payment_status !== 'paid') {
      return NextResponse.json(
        {
          ok: false,
          paid: false,
          payment_status: checkoutSession.payment_status,
          message: 'Payment not completed yet',
        },
        { status: 202 }
      )
    }

    await processSuccessfulCheckout(checkoutSession)

    return NextResponse.json({
      ok: true,
      paid: true,
      sessionId: checkoutSession.id,
      amount: (checkoutSession.amount_total || 0) / 100,
      currency: (checkoutSession.currency || 'usd').toUpperCase(),
    })
  } catch (err: any) {
    console.error('[Stripe] confirm error:', err)
    return NextResponse.json(
      { error: err?.message || 'Stripe confirm failed' },
      { status: 500 }
    )
  }
}
