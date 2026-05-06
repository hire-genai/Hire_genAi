import { InvoiceData, formatCurrency, formatDate } from './invoice-types'

/**
 * Generates premium HTML template for invoice PDF
 * Beautiful modern design with FontAwesome icons and professional styling
 * Optimized for Puppeteer PDF generation
 */
export function generateInvoiceHTML(invoice: InvoiceData): string {
  const { seller, buyer, subscription, payment, lineItems } = invoice

  // Format payment method display with icons
  const getPaymentMethodDisplay = () => {
    const { methodDetails } = payment
    switch (methodDetails.type) {
      case 'card':
        return `<i class="fab fa-cc-visa"></i> <i class="fab fa-cc-mastercard"></i> Credit Card •••• ${methodDetails.cardLast4 || '****'}`
      case 'upi':
        return `<i class="fas fa-mobile-alt"></i> UPI${methodDetails.vpa ? ` - ${methodDetails.vpa}` : ''}`
      case 'netbanking':
        return `<i class="fas fa-university"></i> Net Banking${methodDetails.bank ? ` - ${methodDetails.bank}` : ''}`
      case 'wallet':
        return `<i class="fas fa-wallet"></i> Wallet${methodDetails.wallet ? ` - ${methodDetails.wallet}` : ''}`
      default:
        return `<i class="fas fa-credit-card"></i> ${payment.method || 'Online Payment'}`
    }
  }

  // Format addresses
  const formatAddress = (addr: any) => {
    if (!addr) return ''
    return [addr.street, addr.city, addr.state, addr.postal, addr.country]
      .filter(Boolean)
      .join(', ')
  }

  const sellerAddress = formatAddress(seller.address)
  const buyerAddress = formatAddress(buyer.address)

  // Status badge styles
  const getStatusBadge = () => {
    switch (invoice.status) {
      case 'paid':
        return '<span class="status-badge status-paid"><i class="fas fa-check-circle"></i> PAID</span>'
      case 'failed':
        return '<span class="status-badge status-failed"><i class="fas fa-times-circle"></i> FAILED</span>'
      case 'pending':
        return '<span class="status-badge status-pending"><i class="fas fa-clock"></i> PENDING</span>'
      case 'refunded':
        return '<span class="status-badge status-refunded"><i class="fas fa-undo"></i> REFUNDED</span>'
      default:
        return '<span class="status-badge status-unknown"><i class="fas fa-question-circle"></i> UNKNOWN</span>'
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice ${invoice.invoiceNumber} | ${seller.companyName}</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        @page {
            size: A4;
            margin: 0;
        }

        body {
            font-family: 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
            background: white;
            color: #1f2937;
            line-height: 1.5;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        .invoice-wrapper {
            max-width: 1000px;
            width: 100%;
            margin: 0 auto;
            background: white;
            border-radius: 32px;
            box-shadow: 0 25px 45px -12px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }

        #invoiceContent {
            background: white;
            padding: 24px 28px 32px 28px;
        }

        /* Header */
        .invoice-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            flex-wrap: wrap;
            margin-bottom: 24px;
            border-bottom: 2px solid #f0f2f5;
            padding-bottom: 16px;
        }

        .brand h1 {
            font-size: 28px;
            font-weight: 800;
            letter-spacing: -0.3px;
        }

        .brand h1 .hire-text {
            color: #000000;
        }

        .brand h1 .genai-text {
            color: #059669;
        }

        .brand h1 i {
            color: #059669;
            margin-right: 8px;
        }

        .brand p {
            color: #5b6e8c;
            font-weight: 500;
            margin-top: 6px;
            font-size: 14px;
        }

        .invoice-badge {
            text-align: right;
        }

        .invoice-badge .invoice-title {
            font-size: 32px;
            font-weight: 800;
            color: #1f2b3c;
        }

        .invoice-badge .invoice-id {
            background: #f3f6fc;
            padding: 6px 14px;
            border-radius: 40px;
            font-weight: 600;
            color: #1f4a8a;
            margin-top: 8px;
            font-size: 15px;
            display: inline-block;
        }

        .invoice-badge .invoice-id i {
            margin-right: 6px;
        }

        /* Status Badges */
        .status-badge {
            display: inline-block;
            padding: 6px 16px;
            border-radius: 100px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 12px;
            margin-left: 8px;
        }

        .status-paid {
            background: #ecfdf5;
            color: #059669;
        }

        .status-failed {
            background: #fef2f2;
            color: #dc2626;
        }

        .status-pending {
            background: #fffbeb;
            color: #d97706;
        }

        .status-refunded {
            background: #eef2ff;
            color: #4f46e5;
        }

        .status-unknown {
            background: #f3f4f6;
            color: #6b7280;
        }

        /* Info Panel */
        .info-panel {
            display: flex;
            flex-wrap: wrap;
            justify-content: space-between;
            gap: 24px;
            margin-bottom: 24px;
            background: #F9FBFE;
            padding: 16px 20px;
            border-radius: 16px;
        }

        .company-info, .buyer-info {
            flex: 1;
        }

        .info-label {
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 700;
            color: #5f7f9e;
            margin-bottom: 12px;
        }

        .info-label i {
            margin-right: 6px;
        }

        .company-details h3, .buyer-details h3 {
            font-size: 20px;
            font-weight: 700;
            color: #0b2b42;
        }

        .company-details p, .buyer-details p {
            color: #2c3e50;
            margin-top: 6px;
            line-height: 1.5;
            font-size: 15px;
        }

        .plan-highlight {
            background: #eef3fc;
            padding: 10px 16px;
            border-radius: 18px;
            display: inline-block;
            margin-top: 12px;
            font-weight: 600;
            color: #0057a3;
            font-size: 14px;
        }

        .plan-highlight i {
            margin-right: 6px;
        }

        /* Plan Card */
        .plan-card {
            background: linear-gradient(105deg, #F0F7FF 0%, #FFFFFF 100%);
            border-radius: 20px;
            padding: 16px 20px;
            margin-bottom: 20px;
            border: 1px solid #e2edf7;
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 20px;
            align-items: flex-start;
        }

        .plan-name {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            grid-column: 1;
        }

        .plan-name i {
            font-size: 40px;
            color: #f7b32b;
            background: #ffffffc9;
            padding: 10px;
            border-radius: 60px;
            flex-shrink: 0;
        }

        .plan-text h2 {
            font-size: 24px;
            font-weight: 800;
            color: #14273e;
            margin-bottom: 4px;
        }

        .plan-text span {
            color: #2f5d8f;
            font-weight: 500;
            font-size: 14px;
        }

        .plan-price {
            text-align: right;
            grid-column: 2;
            grid-row: 1 / 3;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
        }

        .price-main {
            font-size: 32px;
            font-weight: 800;
            color: #1f5e3a;
            line-height: 1;
        }

        .price-main small {
            font-size: 14px;
            font-weight: 500;
            color: #546e7a;
            display: block;
            margin-top: 2px;
        }

        .billing-cycle {
            font-size: 12px;
            color: #4f6f8f;
            margin-top: 4px;
            display: none;
        }

        /* Table */
        .invoice-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }

        .invoice-table th {
            text-align: left;
            padding: 14px 8px;
            background-color: #F1F5F9;
            font-weight: 700;
            border-bottom: 2px solid #dce5ec;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #475569;
        }

        .invoice-table th:last-child {
            text-align: right;
        }

        .invoice-table td {
            padding: 16px 8px;
            border-bottom: 1px solid #e9edf2;
            font-size: 14px;
        }

        .invoice-table td:last-child {
            text-align: right;
        }

        .item-description {
            font-weight: 600;
            color: #1f2937;
        }

        .item-details {
            font-size: 13px;
            color: #5f7f9e;
            margin-top: 2px;
        }

        .amount-highlight {
            font-weight: 800;
            color: #0f3b2c;
        }

        .total-row td {
            border-bottom: none;
            padding-top: 16px;
        }

        .total-label {
            font-size: 18px;
            font-weight: 800;
        }

        .total-amount {
            font-size: 22px;
            font-weight: 800;
            color: #1b6b47;
        }

        /* Payment Footer */
        .payment-footer {
            display: flex;
            justify-content: space-between;
            flex-wrap: wrap;
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px dashed #cad5e0;
            gap: 16px;
        }

        .payment-method {
            background: #F7FAFE;
            padding: 12px 20px;
            border-radius: 20px;
            font-size: 14px;
            flex: 1;
        }

        .payment-method strong {
            display: block;
            margin-bottom: 4px;
            color: #1f2937;
        }

        .payment-method .transaction-id {
            font-size: 12px;
            color: #64748b;
            margin-top: 4px;
        }

        .thankyou {
            font-size: 16px;
            font-weight: 600;
            color: #1b4c6e;
            text-align: right;
            flex: 1;
        }

        .thankyou .date-info {
            font-size: 12px;
            font-weight: 400;
            color: #64748b;
            margin-top: 4px;
        }

        /* Footer Note */
        .footer-note {
            font-size: 11px;
            color: #8fadcc;
            margin-top: 12px;
            text-align: center;
            border-top: 1px solid #eef2f8;
            padding-top: 12px;
        }

        .footer-note i {
            margin-right: 6px;
        }

        /* Tax Info */
        .tax-info {
            background: #fffbeb;
            padding: 12px 16px;
            border-radius: 8px;
            margin-top: 16px;
            font-size: 12px;
            color: #92400e;
        }

        .tax-info strong {
            color: #1f2937;
        }

        @media (max-width: 700px) {
            #invoiceContent { padding: 20px; }
            .price-main { font-size: 28px; }
            .plan-text h2 { font-size: 22px; }
        }
    </style>
</head>
<body>
<div class="invoice-wrapper">
    <div id="invoiceContent">
        <!-- Header -->
        <div class="invoice-header">
            <div class="brand">
                <h1><i class="fas fa-brain"></i> <span class="hire-text">Hire</span><span class="genai-text">GenAI</span></h1>
                <p>AI-powered recruitment · smart hiring solutions</p>
            </div>
            <div class="invoice-badge">
                <div class="invoice-title">INVOICE ${getStatusBadge()}</div>
                <div class="invoice-id"><i class="far fa-file-alt"></i> ${invoice.invoiceNumber}</div>
            </div>
        </div>

        <!-- Seller & Buyer -->
        <div class="info-panel">
            <div class="company-info">
                <div class="info-label"><i class="fas fa-store"></i> PROVIDER / SELLER</div>
                <div class="company-details">
                    <h3>${seller.legalName || seller.companyName}</h3>
                    <p>
                        ${sellerAddress ? `${sellerAddress}<br>` : ''}
                        ${seller.email}<br>
                        ${seller.phone ? `${seller.phone}<br>` : ''}
                        ${seller.gstin ? `GSTIN: ${seller.gstin}` : seller.taxId ? `Tax ID: ${seller.taxId}` : ''}
                    </p>
                </div>
            </div>
            <div class="buyer-info">
                <div class="info-label"><i class="fas fa-user-check"></i> BILLED TO (BUYER)</div>
                <div class="buyer-details">
                    <h3>${buyer.companyName}</h3>
                    <p>
                        ${buyer.contactName}<br>
                        ${buyerAddress ? `${buyerAddress}<br>` : ''}
                        ${buyer.email}
                    </p>
                    <div class="plan-highlight"><i class="fas fa-crown"></i> ${subscription.planName}</div>
                </div>
            </div>
        </div>

        <!-- Plan Card -->
        <div class="plan-card">
            <div class="plan-name">
                <i class="fas fa-gem"></i>
                <div class="plan-text">
                    <h2>${subscription.planName}</h2>
                    <span>Enterprise-grade AI recruiting · Unlimited job postings · Smart candidate matching</span>
                </div>
            </div>
            <div class="plan-price">
                <div class="price-main">${formatCurrency(invoice.total, invoice.currency)} <small>/ ${subscription.billingCycle === 'yearly' ? 'year' : 'month'}</small></div>
                <div class="billing-cycle">Billed ${subscription.billingCycle}</div>
            </div>
        </div>

        <!-- Invoice Table -->
        <table class="invoice-table">
            <thead>
                <tr>
                    <th>Description</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${lineItems.map(item => `
                <tr>
                    <td>
                        <div class="item-description">${item.description}</div>
                        ${item.details ? `<div class="item-details">${item.details}</div>` : ''}
                    </td>
                    <td>${item.quantity}</td>
                    <td>${formatCurrency(item.unitPrice, invoice.currency)}</td>
                    <td>${formatCurrency(item.total, invoice.currency)}</td>
                </tr>
                `).join('')}
                <tr>
                    <td colspan="3" style="text-align: right; font-weight: 700;">Subtotal</td>
                    <td class="amount-highlight">${formatCurrency(invoice.subtotal, invoice.currency)}</td>
                </tr>
                ${invoice.tax > 0 ? `
                <tr>
                    <td colspan="3" style="text-align: right; font-weight: 600;">Tax (${invoice.taxRate}%)</td>
                    <td>${formatCurrency(invoice.tax, invoice.currency)}</td>
                </tr>
                ` : ''}
                <tr class="total-row">
                    <td colspan="3" style="text-align: right;" class="total-label">Total Due (${invoice.currency})</td>
                    <td class="total-amount">${formatCurrency(invoice.total, invoice.currency)}</td>
                </tr>
            </tbody>
        </table>

        <!-- Payment Footer -->
        <div class="payment-footer">
            <div class="payment-method">
                <strong>Payment Method:</strong>
                ${getPaymentMethodDisplay()}
                <div class="transaction-id">Transaction ID: ${payment.paymentId}</div>
            </div>
            <div class="thankyou">
                <i class="fas fa-check-circle"></i> Thank you for choosing ${seller.companyName}!
                <div class="date-info">
                    Invoice generated: ${formatDate(invoice.invoiceDate)}${invoice.status === 'paid' ? ' | Paid' : ''}
                </div>
            </div>
        </div>

        ${seller.gstin || seller.taxId ? `
        <div class="tax-info">
            <strong>Tax Information:</strong> 
            ${seller.gstin ? `GSTIN: ${seller.gstin}` : ''}
            ${seller.taxId ? `Tax ID: ${seller.taxId}` : ''}
            ${buyer.address?.state && seller.address.state && buyer.address.state === seller.address.state 
              ? ' | CGST + SGST applicable' 
              : ' | IGST applicable'}
        </div>
        ` : ''}

        <div class="footer-note">
            <i class="fas fa-laptop-code"></i> ${subscription.planName} includes priority support, custom AI models & team collaboration.<br>
            For billing inquiries, contact ${seller.email}
        </div>
    </div>
</div>
</body>
</html>`
}
