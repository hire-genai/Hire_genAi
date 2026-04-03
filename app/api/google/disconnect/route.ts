import { NextResponse } from 'next/server'
import { GoogleCalendarService } from '@/lib/google-calendar'

export async function POST() {
  try {
    await GoogleCalendarService.disconnect()
    return NextResponse.json({ success: true, message: 'Google Calendar disconnected' })
  } catch (error: any) {
    console.error('❌ [GOOGLE DISCONNECT] Error:', error.message)
    return NextResponse.json(
      { error: error.message || 'Failed to disconnect' },
      { status: 500 }
    )
  }
}
