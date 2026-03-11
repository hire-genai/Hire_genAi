import { NextRequest, NextResponse } from 'next/server'
import { GoogleCalendarService } from '@/lib/google-calendar'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      console.error('❌ [GOOGLE CALLBACK] OAuth error:', error)
      return NextResponse.redirect(
        new URL('/admin-hiregenai/customer-interaction?google_error=' + encodeURIComponent(error), request.url)
      )
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/admin-hiregenai/customer-interaction?google_error=no_code', request.url)
      )
    }

    await GoogleCalendarService.handleCallback(code)

    console.log('✅ [GOOGLE CALLBACK] Calendar connected successfully')

    return NextResponse.redirect(
      new URL('/admin-hiregenai/customer-interaction?google_connected=true', request.url)
    )
  } catch (error: any) {
    console.error('❌ [GOOGLE CALLBACK] Error:', error.message)
    return NextResponse.redirect(
      new URL('/admin-hiregenai/customer-interaction?google_error=' + encodeURIComponent(error.message || 'callback_failed'), request.url)
    )
  }
}
