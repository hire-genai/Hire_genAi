// Invoice Types for PDF Generation

export interface SellerDetails {
  companyName: string
  legalName: string
  email: string
  phone: string
  website: string
  address: {
    street: string
    city: string
    state: string
    postal: string
    country: string
  }
  gstin: string | null
  taxId: string | null
}

export interface BuyerDetails {
  companyName: string
  legalName: string | null
  contactName: string
  email: string
  phone: string | null
  address: {
    street: string | null
    city: string | null
    state: string | null
    postal: string | null
    country: string | null
  } | null
}

export interface PaymentDetails {
  paymentId: string
  amount: number
  currency: string
  status: string
  method: string | null
  methodDetails: {
    type: 'card' | 'upi' | 'netbanking' | 'wallet' | 'unknown'
    cardLast4?: string | null
    cardNetwork?: string | null
    cardType?: string | null
    bank?: string | null
    wallet?: string | null
    vpa?: string | null
  }
  paidAt: Date | null
}

export interface SubscriptionDetails {
  subscriptionId: string
  planId: string | null
  planName: string
  status: string
  billingCycle: 'monthly' | 'yearly'
  startDate: Date | null
  nextBillingDate: Date | null
}

export interface InvoiceLineItem {
  description: string
  details: string | null
  quantity: number
  unitPrice: number
  total: number
}

export interface InvoiceData {
  invoiceId: string
  invoiceNumber: string
  invoiceDate: Date
  dueDate: Date | null
  seller: SellerDetails
  buyer: BuyerDetails
  subscription: SubscriptionDetails
  payment: PaymentDetails
  lineItems: InvoiceLineItem[]
  subtotal: number
  tax: number
  taxRate: number
  total: number
  currency: string
  currencySymbol: string
  status: 'paid' | 'pending' | 'failed' | 'refunded'
}

export function getSellerFromEnv(): SellerDetails {
  return {
    companyName: process.env.NEXT_PUBLIC_COMPANY_NAME || 'HireGenAI',
    legalName: process.env.COMPANY_LEGAL_NAME || 'HireGenAI Inc.',
    email: process.env.NEXT_PUBLIC_COMPANY_EMAIL || 'contact@hiregenai.com',
    phone: process.env.COMPANY_PHONE || '',
    website: process.env.NEXT_PUBLIC_COMPANY_WEBSITE || 'https://hiregenai.com',
    address: {
      street: process.env.COMPANY_ADDRESS_STREET || '',
      city: process.env.COMPANY_ADDRESS_CITY || '',
      state: process.env.COMPANY_ADDRESS_STATE || '',
      postal: process.env.COMPANY_ADDRESS_POSTAL || '',
      country: process.env.COMPANY_ADDRESS_COUNTRY || 'India',
    },
    gstin: process.env.COMPANY_GSTIN || null,
    taxId: process.env.COMPANY_TAX_ID || null,
  }
}

export function formatCurrency(amount: number, currency: string = 'INR'): string {
  const symbols: Record<string, string> = {
    INR: 'Rs.',
    USD: '$',
    EUR: 'â',
    GBP: 'Â',
  }
  const symbol = symbols[currency.toUpperCase()] || currency
  return `${symbol}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function getCurrencySymbol(currency: string = 'INR'): string {
  const symbols: Record<string, string> = {
    INR: 'Rs.',
    USD: '$',
    EUR: 'â',
    GBP: 'Â',
  }
  return symbols[currency.toUpperCase()] || currency
}

export function formatDate(date: Date | string | null): string {
  if (!date) return 'N/A'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function generateInvoiceNumber(paymentId: string, date: Date): string {
  const year = date.getFullYear().toString().slice(-2)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const shortId = paymentId.replace(/^pay_/, '').slice(-6).toUpperCase()
  return `HG-${year}${month}-${shortId}`
}

export function parsePaymentMethod(rawData: any): PaymentDetails['methodDetails'] {
  if (!rawData) {
    return { type: 'unknown' }
  }

  const method = rawData.method || rawData.paymentMethod || null
  
  if (method === 'card' || rawData.card) {
    return {
      type: 'card',
      cardLast4: rawData.card?.last4 || rawData.cardLast4 || null,
      cardNetwork: rawData.card?.network || rawData.cardNetwork || null,
      cardType: rawData.card?.type || rawData.cardType || null,
    }
  }
  
  if (method === 'upi' || rawData.vpa) {
    return {
      type: 'upi',
      vpa: rawData.vpa || null,
    }
  }
  
  if (method === 'netbanking' || rawData.bank) {
    return {
      type: 'netbanking',
      bank: rawData.bank || null,
    }
  }
  
  if (method === 'wallet' || rawData.wallet) {
    return {
      type: 'wallet',
      wallet: rawData.wallet || null,
    }
  }
  

  return { type: 'unknown' }
}

export function getPlanName(planId: string | null): string {
  if (!planId) return 'HireGenAI Pro Plan'

  const planNames: Record<string, string> = {
    'plan_pro_monthly': 'HireGenAI Pro Plan (Monthly)',
    'plan_pro_yearly': 'HireGenAI Pro Plan (Yearly)',
    'plan_enterprise_monthly': 'HireGenAI Enterprise Plan (Monthly)',
    'plan_enterprise_yearly': 'HireGenAI Enterprise Plan (Yearly)',
  }

  return planNames[planId] || 'HireGenAI Pro Plan'
}

export function getBillingCycle(planId: string | null): 'monthly' | 'yearly' {
  if (!planId) return 'monthly'
  return planId.includes('yearly') ? 'yearly' : 'monthly'
}
