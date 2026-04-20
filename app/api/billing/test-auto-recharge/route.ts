import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { checkAndAutoRecharge } from '@/lib/auto-recharge'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/billing/test-auto-recharge
 * 
 * Test endpoint for auto-recharge functionality
 * This allows manual testing without waiting for balance threshold trigger
 */
export async function POST(request: NextRequest) {
  try {
    // Get company ID from session
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    let companyId: string | null = null
    
    if (sessionCookie?.value) {
      try {
        let cookieValue = sessionCookie.value
        try {
          cookieValue = decodeURIComponent(cookieValue)
        } catch { /* use raw value if decode fails */ }
        
        const session = JSON.parse(cookieValue)
        companyId = session.companyId || session.company?.id
      } catch (e) {
        console.log('[Test Auto-Recharge] Failed to parse session cookie:', e)
      }
    }
    
    if (!companyId) {
      return NextResponse.json(
        { error: 'Unauthorized - Company ID not found in session' },
        { status: 401 }
      )
    }

    console.log(`[Test Auto-Recharge] Testing auto-recharge for company: ${companyId}`)

    // Test auto-recharge with force=true to bypass threshold check
    const result = await checkAndAutoRecharge(companyId, true)

    console.log(`[Test Auto-Recharge] Result:`, result)

    return NextResponse.json({
      success: true,
      result,
      message: result.triggered 
        ? 'Auto-recharge was triggered and processed'
        : result.success 
          ? 'Auto-recharge check completed (no recharge needed)'
          : 'Auto-recharge failed'
    })

  } catch (error: any) {
    console.error('[Test Auto-Recharge] Error:', error)
    return NextResponse.json(
      { 
        error: error?.message || 'Failed to test auto-recharge',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    )
  }
}
