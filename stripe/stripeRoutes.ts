import type { NextRequest } from 'next/server'
import { createCheckoutSession, handleWebhookEvent } from './stripeController'
import { NextResponse } from 'next/server'

export async function checkoutHandler(req: NextRequest) {
  return createCheckoutSession(req)
}

export async function webhookHandler(req: NextRequest) {
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  const rawBody = await req.text()

  try {
    const event = await handleWebhookEvent(rawBody, signature)
    return NextResponse.json({ received: true, type: event.type })
  } catch (err: any) {
    console.error('[Stripe] Webhook verification failed:', err?.message)
    return NextResponse.json(
      { error: `Webhook Error: ${err?.message}` },
      { status: 400 }
    )
  }
}
