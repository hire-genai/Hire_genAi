import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID
  const paypalClientId = process.env.PAYPAL_CLIENT_ID

  console.log('[Payment Config] RAZORPAY_KEY_ID:', razorpayKeyId ? `${razorpayKeyId.substring(0, 10)}...` : 'NOT SET')
  console.log('[Payment Config] PAYPAL_CLIENT_ID:', paypalClientId ? `${paypalClientId.substring(0, 10)}...` : 'NOT SET')

  return NextResponse.json({
    ok: true,
    razorpayKeyId: razorpayKeyId || null,
    paypalClientId: paypalClientId || null,
  })
}
