import { webhookHandler } from '../../../../stripe/stripeRoutes'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = webhookHandler

export const GET = () => {
  return NextResponse.json(
    { message: 'Stripe webhook endpoint — only POST requests accepted' },
    { status: 200 }
  )
}
