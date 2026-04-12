import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { cookies } from 'next/headers'
import { InvoiceData, getSellerFromEnv, generateInvoiceNumber, parsePaymentMethod, getPlanName, getBillingCycle, getCurrencySymbol } from '@/lib/invoice-types'

/**
 * GET /api/invoice/[id]
 * 
 * Returns invoice data for a specific payment ID
 * - Payment details from subscription_payments table
 * - Subscription details from company_subscriptions table
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const paymentId = params.id

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Payment ID is required' },
        { status: 400 }
      )
    }

    // Get company ID from session
    const cookieStore = await cookies()
    const companyId = cookieStore.get('company_id')?.value

    if (!companyId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Fetch payment record
    const paymentResult = await DatabaseService.query(
      `SELECT sp.*, cs.plan_id, cs.status as subscription_status,
              cs.start_time, cs.next_billing_time, cs.subscription_id
       FROM subscription_payments sp
       LEFT JOIN company_subscriptions cs ON cs.subscription_id = sp.subscription_id
       WHERE sp.payment_id = $1 AND sp.company_id = $2::uuid
       LIMIT 1`,
      [paymentId, companyId]
    )

    if (paymentResult.length === 0) {
      // Try without company_id filter (for older records)
      const fallbackResult = await DatabaseService.query(
        `SELECT sp.*, cs.plan_id, cs.status as subscription_status,
                cs.start_time, cs.next_billing_time, cs.subscription_id,
                cs.company_id
         FROM subscription_payments sp
         LEFT JOIN company_subscriptions cs ON cs.subscription_id = sp.subscription_id
         WHERE sp.payment_id = $1
         LIMIT 1`,
        [paymentId]
      )

      if (fallbackResult.length === 0) {
        return NextResponse.json(
          { error: 'Invoice not found' },
          { status: 404 }
        )
      }

      // Verify the payment belongs to the requesting company
      if (fallbackResult[0].company_id && fallbackResult[0].company_id !== companyId) {
        return NextResponse.json(
          { error: 'Unauthorized access to invoice' },
          { status: 403 }
        )
      }
    }

    const payment = paymentResult[0] || (await DatabaseService.query(
      `SELECT sp.*, cs.plan_id, cs.status as subscription_status,
              cs.start_time, cs.next_billing_time, cs.subscription_id
       FROM subscription_payments sp
       LEFT JOIN company_subscriptions cs ON cs.subscription_id = sp.subscription_id
       WHERE sp.payment_id = $1
       LIMIT 1`,
      [paymentId]
    ))[0]

    // Fetch company details (buyer)
    const companyResult = await DatabaseService.query(
      `SELECT c.*, ca.street_address, ca.city, ca.state_province, ca.postal_code, ca.country
       FROM companies c
       LEFT JOIN company_addresses ca ON ca.company_id = c.id AND ca.is_primary = true
       WHERE c.id = $1::uuid
       LIMIT 1`,
      [companyId]
    )

    if (companyResult.length === 0) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    const company = companyResult[0]

    // Fetch primary user (admin) for contact name
    const userResult = await DatabaseService.query(
      `SELECT u.full_name, u.email
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       WHERE u.company_id = $1::uuid AND u.status = 'active'
       ORDER BY
         CASE WHEN ur.role = 'admin' THEN 1
              WHEN ur.role = 'manager' THEN 2
              ELSE 3 END,
         u.created_at ASC
       LIMIT 1`,
      [companyId]
    )

    const primaryUser = userResult[0] || { full_name: 'Customer', email: company.email || '' }

    // Parse raw_data for payment method details
    const rawData = payment.raw_data || {}
    const methodDetails = parsePaymentMethod(rawData)

    // Build invoice data
    const paymentDate = payment.payment_time ? new Date(payment.payment_time) : new Date(payment.created_at)
    const currency = payment.currency || 'INR'
    const amount = parseFloat(payment.amount) || 0

    const invoiceData: InvoiceData = {
      invoiceId: payment.id,
      invoiceNumber: generateInvoiceNumber(paymentId, paymentDate),
      invoiceDate: paymentDate,
      dueDate: null, // Already paid

      seller: getSellerFromEnv(),

      buyer: {
        companyName: company.name,
        legalName: company.legal_company_name || null,
        contactName: primaryUser.full_name,
        email: primaryUser.email || company.email || '',
        phone: company.phone_number || null,
        address: company.street_address ? {
          street: company.street_address,
          city: company.city,
          state: company.state_province,
          postal: company.postal_code,
          country: company.country,
        } : null,
      },

      subscription: {
        subscriptionId: payment.subscription_id || '',
        planId: payment.plan_id || null,
        planName: getPlanName(payment.plan_id),
        status: payment.subscription_status || 'active',
        billingCycle: getBillingCycle(payment.plan_id),
        startDate: payment.start_time ? new Date(payment.start_time) : null,
        nextBillingDate: payment.next_billing_time ? new Date(payment.next_billing_time) : null,
      },

      payment: {
        paymentId: paymentId,
        amount: amount,
        currency: currency,
        status: payment.status || 'captured',
        method: rawData.method || methodDetails.type,
        methodDetails: methodDetails,
        paidAt: paymentDate,
      },

      lineItems: [
        {
          description: getPlanName(payment.plan_id),
          details: `${getBillingCycle(payment.plan_id) === 'monthly' ? 'Monthly' : 'Annual'} subscription - AI sourcing, advanced analytics, API access, priority support`,
          quantity: 1,
          unitPrice: amount,
          total: amount,
        },
      ],

      subtotal: amount,
      tax: 0, // Add GST calculation if needed
      taxRate: 0,
      total: amount,
      currency: currency,
      currencySymbol: getCurrencySymbol(currency),
      status: payment.status === 'captured' || payment.status === 'success' ? 'paid' :
              payment.status === 'failed' ? 'failed' :
              payment.status === 'refunded' ? 'refunded' : 'pending',
    }

    return NextResponse.json({
      success: true,
      invoice: invoiceData,
    })

  } catch (error: any) {
    console.error('[Invoice API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch invoice' },
      { status: 500 }
    )
  }
}
