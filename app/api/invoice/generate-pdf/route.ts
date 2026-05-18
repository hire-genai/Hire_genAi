import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { generateInvoiceHTML } from '@/lib/invoice-template'
import { InvoiceData, getSellerFromEnv, generateInvoiceNumber, parsePaymentMethod, getPlanName, getBillingCycle, getCurrencySymbol } from '@/lib/invoice-types'

/**
 * GET /api/invoice/generate-pdf
 * 
 * Generates a PDF invoice for a specific payment using query parameters
 * Uses Puppeteer to convert HTML template to high-quality PDF
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const paymentId = searchParams.get('paymentId')
    const companyId = searchParams.get('companyId')

    if (!paymentId || !companyId) {
      return NextResponse.json(
        { error: 'Payment ID and Company ID are required' },
        { status: 400 }
      )
    }

    // Fetch invoice data
    const invoiceData = await getInvoiceData(paymentId, companyId)
    
    if (!invoiceData) {
      return NextResponse.json(
        { error: 'Invoice not found or unauthorized' },
        { status: 404 }
      )
    }

    // Generate PDF
    const pdfBuffer = await generatePDF(invoiceData)

    // Return PDF with proper headers
    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="invoice-${invoiceData.invoiceNumber}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })

  } catch (error: any) {
    console.error('[Invoice PDF] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/invoice/generate-pdf
 * 
 * Generates a PDF invoice for a specific payment using request body
 * Uses Puppeteer to convert HTML template to high-quality PDF
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { paymentId, companyId } = body

    if (!paymentId || !companyId) {
      return NextResponse.json(
        { error: 'Payment ID and Company ID are required' },
        { status: 400 }
      )
    }

    // Fetch invoice data
    const invoiceData = await getInvoiceData(paymentId, companyId)
    
    if (!invoiceData) {
      return NextResponse.json(
        { error: 'Invoice not found or unauthorized' },
        { status: 404 }
      )
    }

    // Generate PDF
    const pdfBuffer = await generatePDF(invoiceData)

    // Return PDF with proper headers
    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="invoice-${invoiceData.invoiceNumber}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })

  } catch (error: any) {
    console.error('[Invoice PDF] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}

/**
 * Fetch invoice data from database
 * - Payment details from subscription_payments table
 * - Company details from companies table  
 * - Subscription details from company_subscriptions table
 */
async function getInvoiceData(paymentId: string, companyId: string): Promise<InvoiceData | null> {
  // Fetch payment record
  let payment = null

  // First try with company_id filter
  const paymentResult = await DatabaseService.query(
    `SELECT sp.*, cs.plan_id, cs.status as subscription_status,
            cs.start_time, cs.next_billing_time, cs.subscription_id
     FROM subscription_payments sp
     LEFT JOIN company_subscriptions cs ON cs.subscription_id = sp.subscription_id
     WHERE sp.payment_id = $1 AND sp.company_id = $2::uuid
     LIMIT 1`,
    [paymentId, companyId]
  )

  if (paymentResult.length > 0) {
    payment = paymentResult[0]
  } else {
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
      return null
    }

    // Verify the payment belongs to the requesting company
    if (fallbackResult[0].company_id && fallbackResult[0].company_id !== companyId) {
      return null
    }

    payment = fallbackResult[0]
  }

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
    return null
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
    dueDate: null,

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
    tax: 0,
    taxRate: 0,
    total: amount,
    currency: currency,
    currencySymbol: getCurrencySymbol(currency),
    status: payment.status === 'captured' || payment.status === 'success' ? 'paid' :
            payment.status === 'failed' ? 'failed' :
            payment.status === 'refunded' ? 'refunded' : 'pending',
  }

  return invoiceData
}

/**
 * Generate PDF using Puppeteer (HTML to PDF conversion)
 * Produces high-quality, pixel-perfect PDF matching the HTML design
 *
 * Vercel-compatible: uses puppeteer-core + @sparticuz/chromium on serverless
 * (the regular `puppeteer` package can't find a Chrome binary in Lambda).
 * Falls back to a locally-installed Chrome on dev/Windows.
 */
async function generatePDF(invoiceData: InvoiceData): Promise<Buffer> {
  // Generate HTML from template
  const html = generateInvoiceHTML(invoiceData)

  const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME

  const puppeteer = (await import('puppeteer-core')).default
  let browser: any = null

  try {
    let launchOptions: any

    if (isServerless) {
      // @sparticuz/chromium ships a Lambda-compatible Chromium binary
      const chromium = (await import('@sparticuz/chromium')).default
      launchOptions = {
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      }
    } else {
      // Dev / local — use whatever Chrome is installed. Override with
      // PUPPETEER_EXECUTABLE_PATH if your Chrome lives somewhere else.
      const localChrome =
        process.env.PUPPETEER_EXECUTABLE_PATH ||
        (process.platform === 'win32'
          ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
          : process.platform === 'darwin'
            ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
            : '/usr/bin/google-chrome')
      launchOptions = {
        headless: true,
        executablePath: localChrome,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--font-render-hinting=none',
        ],
      }
    }

    browser = await puppeteer.launch(launchOptions)
    const page = await browser.newPage()

    await page.setContent(html, { waitUntil: 'domcontentloaded' })

    // Small delay so web fonts settle before printing
    await new Promise(resolve => setTimeout(resolve, 1000))

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
      preferCSSPageSize: true,
    })

    return Buffer.from(pdfBuffer)
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}
