import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')

    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let cookieValue = sessionCookie.value
    try {
      cookieValue = decodeURIComponent(cookieValue)
    } catch {
      /* use raw */
    }

    const session = JSON.parse(cookieValue)
    const companyId = session.companyId || session.company?.id

    if (!companyId) {
      return NextResponse.json({ error: 'No company ID in session' }, { status: 401 })
    }

    // Fetch company billing
    const billing = (await DatabaseService.query(
      `SELECT wallet_balance, status, updated_at FROM company_billing WHERE company_id = $1::uuid`,
      [companyId]
    )) as any[]

    // Fetch last 5 Stripe payments
    const payments = (await DatabaseService.query(
      `SELECT id, payment_id, amount, currency, status, payment_time, created_at
       FROM subscription_payments
       WHERE provider = 'stripe' AND company_id = $1::uuid
       ORDER BY payment_time DESC NULLS LAST
       LIMIT 5`,
      [companyId]
    )) as any[]

    // Fetch last 5 ledger entries
    const ledger = (await DatabaseService.query(
      `SELECT id, entry_type, description, amount, balance_before, balance_after, created_at
       FROM usage_ledger
       WHERE company_id = $1::uuid AND entry_type = 'WALLET_TOPUP'
       ORDER BY created_at DESC
       LIMIT 5`,
      [companyId]
    )) as any[]

    // Fetch last 5 webhook logs
    const webhooks = (await DatabaseService.query(
      `SELECT id, provider, event_type, event_id, created_at
       FROM webhook_logs
       WHERE provider = 'stripe'
       ORDER BY created_at DESC
       LIMIT 5`
    )) as any[]

    return NextResponse.json({
      ok: true,
      companyId,
      billing: billing[0] || null,
      payments: payments || [],
      ledger: ledger || [],
      webhooks: webhooks || [],
      summary: {
        totalPayments: payments.length,
        walletBalance: billing[0]?.wallet_balance || 0,
        totalLedgerEntries: ledger.length,
        totalWebhooks: webhooks.length,
      },
    })
  } catch (err: any) {
    console.error('[Stripe Verify] Error:', err)
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}
