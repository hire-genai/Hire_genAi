import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/subscription/current
 * 
 * Fetches the current active subscription for the authenticated company.
 * Returns the subscription_link (Razorpay short_url) for the Manage Plan functionality.
 * 
 * If subscription_link is null (older records), fetches from Razorpay API and backfills DB.
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
        console.log('[Subscription Current] Failed to parse session cookie:', e)
      }
    }
    
    if (!companyId) {
      return NextResponse.json(
        { error: 'Unauthorized - Company ID not found in session' },
        { status: 401 }
      )
    }

    // ─── 2. Get active subscription from company_subscriptions ───
    const activeSubscription = await DatabaseService.getActiveSubscription(companyId)
    
    if (!activeSubscription) {
      return NextResponse.json(
        { error: 'No active subscription found for this company' },
        { status: 404 }
      )
    }

    let subscriptionLink = activeSubscription.subscription_link

    // ─── 3. Fallback: If subscription_link is null, fetch from Razorpay API ───
    if (!subscriptionLink && activeSubscription.subscription_id) {
      console.log(`[Subscription Current] No subscription_link found, fetching from Razorpay API for: ${activeSubscription.subscription_id}`)
      
      const keyId = process.env.RAZORPAY_KEY_ID
      const keySecret = process.env.RAZORPAY_KEY_SECRET

      if (keyId && keySecret) {
        try {
          const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64')
          
          const response = await fetch(
            `https://api.razorpay.com/v1/subscriptions/${activeSubscription.subscription_id}`,
            {
              headers: {
                'Authorization': `Basic ${authHeader}`
              }
            }
          )

          if (response.ok) {
            const razorpayData = await response.json()
            subscriptionLink = razorpayData.short_url

            // Backfill the subscription_link in database
            if (subscriptionLink) {
              console.log(`[Subscription Current] Backfilling subscription_link: ${subscriptionLink}`)
              await DatabaseService.query(
                `UPDATE company_subscriptions 
                 SET subscription_link = $1, updated_at = NOW()
                 WHERE company_id = $2::uuid AND provider = $3`,
                [subscriptionLink, companyId, activeSubscription.provider]
              )
            }
          } else {
            console.error('[Subscription Current] Razorpay API error:', await response.text())
          }
        } catch (razorpayError) {
          console.error('[Subscription Current] Failed to fetch from Razorpay:', razorpayError)
        }
      }
    }

    // ─── 4. Return subscription details with link ───
    if (!subscriptionLink) {
      return NextResponse.json(
        { error: 'Subscription management link not available. Please contact support.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ok: true,
      subscription: {
        subscriptionId: activeSubscription.subscription_id,
        provider: activeSubscription.provider,
        status: activeSubscription.status,
        subscriptionLink: subscriptionLink,
        createdAt: activeSubscription.created_at
      }
    })

  } catch (error: any) {
    console.error('[Subscription Current] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch current subscription' },
      { status: 500 }
    )
  }
}
