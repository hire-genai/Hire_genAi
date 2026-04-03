import { NextResponse } from 'next/server'
import { GoogleCalendarService } from '@/lib/google-calendar'

export async function GET() {
  try {
    const status = await GoogleCalendarService.getStatus()
    return NextResponse.json({ success: true, ...status })
  } catch (error: any) {
    console.error('❌ [GOOGLE STATUS] Error:', error.message)
    return NextResponse.json(
      { success: false, connected: false, error: error.message },
      { status: 500 }
    )
  }
}
