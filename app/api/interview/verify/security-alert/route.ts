import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST: Log security alerts during interview verification
// This is a non-critical endpoint - it logs alerts but never blocks the flow
export async function POST(req: Request) {
  try {
    const { applicationId, alertType, timestamp } = await req.json()

    console.warn(`[SECURITY ALERT] Type: ${alertType}, Application: ${applicationId}, Time: ${timestamp}`)

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('[Security Alert] Error:', error?.message)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
