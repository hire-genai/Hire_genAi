import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyId, startDate, endDate } = body

    if (!companyId || !startDate || !endDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get company information
    const companyQuery = `
      SELECT name, slug, phone_number, website_url, legal_company_name, tax_id_ein
      FROM companies 
      WHERE id = $1::uuid
    `
    const companyResult = await DatabaseService.query(companyQuery, [companyId])
    
    if (companyResult.length === 0) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    const company = companyResult[0]

    // Get usage data for the date range
    const usageQuery = `
      SELECT 
        entry_type,
        description,
        quantity,
        unit_price,
        amount,
        created_at,
        metadata
      FROM usage_ledger 
      WHERE company_id = $1::uuid 
        AND created_at >= $2::date 
        AND created_at <= $3::date + INTERVAL '1 day'
        AND amount > 0
      ORDER BY created_at DESC
    `
    
    const usageResult = await DatabaseService.query(usageQuery, [companyId, startDate, endDate])

    // Calculate totals by service type
    const totals = {
      cvParsing: 0,
      questionGeneration: 0,
      videoInterviews: 0,
      total: 0
    }

    const itemizedUsage: any[] = []

    usageResult.forEach((entry: any) => {
      const amount = parseFloat(entry.amount) || 0
      totals.total += amount

      // Categorize by entry type
      switch (entry.entry_type) {
        case 'CV_PARSING':
          totals.cvParsing += amount
          break
        case 'JD_QUESTIONS':
          totals.questionGeneration += amount
          break
        case 'VIDEO_INTERVIEW':
          totals.videoInterviews += amount
          break
      }

      itemizedUsage.push({
        date: new Date(entry.created_at).toLocaleDateString('en-IN'),
        service: entry.description,
        quantity: entry.quantity || 1,
        unitPrice: parseFloat(entry.unit_price) || 0,
        amount: amount
      })
    })

    // Return invoice data as JSON
    const invoiceData = {
      company,
      startDate,
      endDate,
      totals,
      itemizedUsage,
      invoiceNumber: `INV-${Date.now()}`,
      invoiceDate: new Date().toLocaleDateString('en-IN')
    }

    return NextResponse.json({
      success: true,
      invoice: invoiceData
    })

  } catch (error: any) {
    console.error('Invoice generation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function generateInvoiceHtml(data: {
  company: any
  startDate: string
  endDate: string
  totals: any
  itemizedUsage: any[]
  invoiceNumber: string
  invoiceDate: string
}) {
  const { company, startDate, endDate, totals, itemizedUsage, invoiceNumber, invoiceDate } = data

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Invoice ${invoiceNumber}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; }
        .logo { font-size: 24px; font-weight: bold; color: #059669; }
        .invoice-info { text-align: right; }
        .invoice-info h1 { margin: 0; color: #374151; }
        .invoice-info p { margin: 5px 0; color: #6b7280; }
        .company-info { margin-bottom: 30px; }
        .company-info h3 { margin: 0 0 10px 0; color: #374151; }
        .company-info p { margin: 2px 0; color: #6b7280; }
        .invoice-details { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .invoice-details div { flex: 1; }
        .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        .table th { background-color: #f9fafb; font-weight: 600; color: #374151; }
        .table .amount { text-align: right; }
        .summary { margin-top: 20px; }
        .summary-row { display: flex; justify-content: space-between; padding: 8px 0; }
        .summary-row.total { font-weight: bold; font-size: 18px; border-top: 2px solid #e5e7eb; padding-top: 15px; margin-top: 15px; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px; }
        @media print {
            body { margin: 0; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">HireGenAI</div>
        <div class="invoice-info">
            <h1>INVOICE</h1>
            <p><strong>Invoice #:</strong> ${invoiceNumber}</p>
            <p><strong>Date:</strong> ${invoiceDate}</p>
            <p><strong>Period:</strong> ${startDate} to ${endDate}</p>
        </div>
    </div>

    <div class="company-info">
        <h3>Bill To:</h3>
        <p><strong>${company.name || company.legal_company_name || 'Company'}</strong></p>
        ${company.legal_company_name && company.legal_company_name !== company.name ? `<p>${company.legal_company_name}</p>` : ''}
        ${company.tax_id_ein ? `<p>Tax ID: ${company.tax_id_ein}</p>` : ''}
        ${company.phone_number ? `<p>Phone: ${company.phone_number}</p>` : ''}
        ${company.website_url ? `<p>Website: ${company.website_url}</p>` : ''}
    </div>

    <table class="table">
        <thead>
            <tr>
                <th>Date</th>
                <th>Service</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th class="amount">Amount</th>
            </tr>
        </thead>
        <tbody>
            ${itemizedUsage.map(item => `
                <tr>
                    <td>${item.date}</td>
                    <td>${item.service}</td>
                    <td>${item.quantity}</td>
                    <td>₹${item.unitPrice.toFixed(2)}</td>
                    <td class="amount">₹${item.amount.toFixed(2)}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <div class="summary">
        <div class="summary-row">
            <span>CV Parsing:</span>
            <span>₹${totals.cvParsing.toFixed(2)}</span>
        </div>
        <div class="summary-row">
            <span>Question Generation:</span>
            <span>₹${totals.questionGeneration.toFixed(2)}</span>
        </div>
        <div class="summary-row">
            <span>Video Interviews:</span>
            <span>₹${totals.videoInterviews.toFixed(2)}</span>
        </div>
        <div class="summary-row total">
            <span>Total Amount:</span>
            <span>₹${totals.total.toFixed(2)}</span>
        </div>
    </div>

    <div class="footer">
        <p>Thank you for using HireGenAI!</p>
        <p>This is a computer-generated invoice. No signature required.</p>
    </div>

    <script class="no-print">
        // Auto-print when page loads
        window.onload = function() {
            setTimeout(function() {
                window.print();
            }, 500);
        }
    </script>
</body>
</html>
  `.trim()
}
