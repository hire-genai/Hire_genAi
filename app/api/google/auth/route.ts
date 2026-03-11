import { NextResponse } from 'next/server'
import { GoogleCalendarService } from '@/lib/google-calendar'

export async function GET() {
  try {
    const authUrl = GoogleCalendarService.getAuthUrl()
    return NextResponse.redirect(authUrl)
  } catch (error: any) {
    console.error('❌ [GOOGLE AUTH] Error:', error.message)
    return NextResponse.json(
      { error: error.message || 'Failed to generate auth URL' },
      { status: 500 }
    )
  }
}
