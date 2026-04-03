import { NextRequest, NextResponse } from 'next/server'
import Razorpay from 'razorpay'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount, currency = 'INR', companyId } = body

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { ok: false, error: 'Invalid amount' },
        { status: 400 }
      )
    }

    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET

    if (!keyId || !keySecret) {
      console.error('[Razorpay] Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET')
      return NextResponse.json(
        { ok: false, error: 'Payment configuration missing on server' },
        { status: 500 }
      )
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    })

    // Amount is already in paise (smallest unit)
    // Frontend sends: 10000 paise = ₹100
    const amountInPaise = Math.round(amount)

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency,
      receipt: `hg_${(companyId || 'guest').substring(0, 8)}_${Date.now()}`,
      notes: {
        companyId: companyId || '',
        source: 'hiregenai_billing',
      },
    })

    console.log('[Razorpay] Order created:', order.id, '| Amount:', amountInPaise, 'paise')

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    })
  } catch (err: any) {
    console.error('[Razorpay] Order creation error:', err)
    return NextResponse.json(
      { ok: false, error: err?.message || 'Failed to create order' },
      { status: 500 }
    )
  }
}
