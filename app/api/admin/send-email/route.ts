import { NextRequest, NextResponse } from 'next/server'
import { EmailService } from '@/lib/email-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { recipientEmail, recipientName, subject, message, meetingId } = body

    if (!recipientEmail || !subject || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: recipientEmail, subject, message' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(recipientEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    await EmailService.sendAdminReply({
      recipientName: recipientName || 'User',
      recipientEmail,
      subject,
      message,
    })

    console.log('✅ [ADMIN EMAIL] Sent to:', recipientEmail, 'Subject:', subject)

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
    })
  } catch (error: any) {
    console.error('❌ [ADMIN EMAIL] Failed:', error.message)
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    )
  }
}
