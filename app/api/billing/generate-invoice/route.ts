import { NextRequest, NextResponse } from 'next/server'

/**
 * DEPRECATED: This API has been disabled.
 * Usage-based invoice generation is no longer supported.
 * Payment history is now available via /api/billing/invoices
 */
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { 
      error: 'This API has been deprecated. Please use /api/billing/invoices for payment history.',
      deprecated: true 
    }, 
    { status: 410 } // 410 Gone
  )
}
