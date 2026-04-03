import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/payment/check-status?email=xxx
 * 
 * Check if user has ANY successful payment in their company.
 * Used by /payment/return page to determine redirect behavior.
 * Database decides everything - no time limits or frontend guessing.
 * 
 * Returns:
 * - hasSuccessPayment: boolean (true if user has any completed payment)
 * - walletBalance: number
 * - companyId: string
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { ok: false, error: 'Email parameter required' },
        { status: 400 }
      )
    }

    // Find the user's company
    const userResult = await DatabaseService.query(
      `SELECT u.id as user_id, u.company_id, c.name as company_name
       FROM users u
       JOIN companies c ON c.id = u.company_id
       WHERE u.email = $1
       LIMIT 1`,
      [email]
    )

    if (userResult.length === 0) {
      return NextResponse.json({
        ok: true,
        hasSuccessPayment: false,
        reason: 'User not found'
      })
    }

    const companyId = userResult[0].company_id

    // Check if user has ANY successful payment (no time limit - DB decides everything)
    const successPayment = await DatabaseService.query(
      `SELECT id, amount, status, completed_at
       FROM payment_transactions
       WHERE company_id = $1::uuid
         AND status = 'completed'
       ORDER BY completed_at DESC
       LIMIT 1`,
      [companyId]
    )

    // Get current wallet balance
    const billing = await DatabaseService.query(
      `SELECT wallet_balance, status
       FROM company_billing
       WHERE company_id = $1::uuid`,
      [companyId]
    )

    const walletBalance = parseFloat(billing[0]?.wallet_balance || '0')
    const billingStatus = billing[0]?.status || 'trial'

    return NextResponse.json({
      ok: true,
      hasSuccessPayment: successPayment.length > 0,
      lastPayment: successPayment[0] || null,
      walletBalance,
      billingStatus,
      companyId
    })

  } catch (error: any) {
    console.error('[Payment Check Status] Error:', error)
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to check payment status' },
      { status: 500 }
    )
  }
}
