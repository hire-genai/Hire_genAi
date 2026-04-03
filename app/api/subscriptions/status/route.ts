import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/subscriptions/status
 * 
 * Returns the current subscription status for the authenticated company.
 * Includes both local database record and optionally fetches latest from Razorpay.
 */
export async function GET(request: NextRequest) {
  try {
    // ─── 1. Authenticate user from session cookie ───
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
        console.log('[Subscription Status] Failed to parse session cookie:', e)
      }
    }
    
    if (!companyId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // ─── 2. Get subscription from database ───
    const subscription = await DatabaseService.getSubscription(companyId, 'razorpay')

    if (!subscription) {
      return NextResponse.json({
        ok: true,
        hasSubscription: false,
        subscription: null
      })
    }

    // ─── 3. Optionally refresh from Razorpay (if requested) ───
    const searchParams = request.nextUrl.searchParams
    const refresh = searchParams.get('refresh') === 'true'

    let razorpayData = null
    if (refresh && subscription.subscription_id) {
      try {
        const keyId = process.env.RAZORPAY_KEY_ID
        const keySecret = process.env.RAZORPAY_KEY_SECRET

        if (keyId && keySecret) {
          const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64')
          
          const response = await fetch(
            `https://api.razorpay.com/v1/subscriptions/${subscription.subscription_id}`,
            {
              headers: {
                'Authorization': `Basic ${authHeader}`
              }
            }
          )

          if (response.ok) {
            razorpayData = await response.json()
            
            // Update local record if status changed
            if (razorpayData.status !== subscription.status) {
              const nextBillingTime = razorpayData.charge_at 
                ? new Date(razorpayData.charge_at * 1000) 
                : undefined

              await DatabaseService.updateSubscriptionStatus(
                companyId,
                'razorpay',
                razorpayData.status,
                nextBillingTime
              )
            }
          }
        }
      } catch (refreshError) {
        console.error('[Subscription Status] Failed to refresh from Razorpay:', refreshError)
        // Continue with local data
      }
    }

    // ─── 4. Format response ───
    const isActive = ['active', 'authenticated'].includes(subscription.status)
    
    return NextResponse.json({
      ok: true,
      hasSubscription: true,
      isActive,
      subscription: {
        id: subscription.subscription_id,
        provider: subscription.provider,
        planId: subscription.plan_id,
        status: razorpayData?.status || subscription.status,
        subscriberEmail: subscription.subscriber_email,
        startTime: subscription.start_time,
        nextBillingTime: razorpayData?.charge_at 
          ? new Date(razorpayData.charge_at * 1000).toISOString()
          : subscription.next_billing_time,
        createdAt: subscription.created_at,
        updatedAt: subscription.updated_at
      },
      razorpayDetails: razorpayData ? {
        currentStart: razorpayData.current_start 
          ? new Date(razorpayData.current_start * 1000).toISOString() 
          : null,
        currentEnd: razorpayData.current_end 
          ? new Date(razorpayData.current_end * 1000).toISOString() 
          : null,
        paidCount: razorpayData.paid_count,
        remainingCount: razorpayData.remaining_count,
        shortUrl: razorpayData.short_url
      } : null
    })

  } catch (error: any) {
    console.error('[Subscription Status] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get subscription status' },
      { status: 500 }
    )
  }
}
