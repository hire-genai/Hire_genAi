import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { cookies } from 'next/headers'

/**
 * GET /api/billing/invoices
 * 
 * Returns payment history (subscription payments) for the logged-in company.
 * Only returns successful payments sorted by payment_time DESC.
 * 
 * If no payments exist but subscription is active, creates a payment record
 * from the subscription data (for existing subscriptions before this feature).
 */
export async function GET(request: NextRequest) {
  try {
    // Get company ID from query params (like other billing APIs)
    const { searchParams } = new URL(request.url)
    let companyId = searchParams.get('companyId')

    // Fallback to cookie if not in query params
    if (!companyId) {
      const cookieStore = await cookies()
      companyId = cookieStore.get('company_id')?.value || null
    }

    if (!companyId) {
      return NextResponse.json({ ok: false, error: 'companyId is required' }, { status: 400 })
    }

    // Simple query: Get all captured payments for this company
    const paymentsQuery = `
      SELECT 
        id,
        subscription_id,
        provider,
        payment_id,
        amount,
        currency,
        status,
        payment_time,
        created_at,
        raw_data
      FROM subscription_payments
      WHERE company_id = $1::uuid
      AND status = 'captured'
      ORDER BY payment_time DESC
    `
    let paymentsResult = await DatabaseService.query(paymentsQuery, [companyId])

    // Get company info for receipt generation
    const companyQuery = `
      SELECT name, slug, phone_number, website_url, legal_company_name, tax_id_ein
      FROM companies 
      WHERE id = $1::uuid
    `
    const companyResult = await DatabaseService.query(companyQuery, [companyId])
    const company = companyResult[0] || {}

    // Format payments for frontend
    const payments = paymentsResult.map((payment: any) => ({
      id: payment.id,
      paymentId: payment.payment_id,
      amount: parseFloat(payment.amount) || 0,
      currency: payment.currency || 'INR',
      status: 'paid', // Normalize status to "paid" for display
      paymentDate: payment.payment_time || payment.created_at,
      provider: payment.provider,
      rawData: payment.raw_data // Include raw_data for card type detection
    }))

    return NextResponse.json({
      ok: true,
      payments,
      company
    })

  } catch (error: any) {
    console.error('[Billing Invoices] Error:', error)
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to fetch payment history' },
      { status: 500 }
    )
  }
}
