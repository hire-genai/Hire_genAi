import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { EmailService } from '@/lib/email-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { contactId, recipientEmail, recipientName, subject, message } = body

    // Validate required fields
    if (!contactId || !recipientEmail || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: contactId, recipientEmail, and message are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(recipientEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Send reply email using EmailService
    try {
      await EmailService.sendAdminReply({
        recipientName: recipientName || 'User',
        recipientEmail,
        subject: subject || 'Your Inquiry',
        message
      })
      console.log('✅ Reply email sent successfully to:', recipientEmail)
    } catch (emailError) {
      console.error('❌ Failed to send email:', emailError)
      return NextResponse.json(
        { error: 'Failed to send reply email', details: emailError instanceof Error ? emailError.message : 'Unknown error' },
        { status: 500 }
      )
    }

    // Update contact: mark replied and set status to active_prospect
    try {
      await DatabaseService.query(
        `UPDATE contact_messages 
         SET status = 'active_prospect', replied = true, updated_at = NOW() 
         WHERE id = CAST($1 AS UUID)`,
        [contactId]
      )
      console.log('✅ Contact marked replied & status set to active_prospect')
    } catch (dbError) {
      console.error('⚠️ Failed to update contact status:', dbError)
      // Don't fail the request if status update fails
    }

    return NextResponse.json({
      success: true,
      message: 'Reply sent successfully'
    })

  } catch (error) {
    console.error('❌ Error sending reply email:', error)
    return NextResponse.json(
      { error: 'Failed to send reply email', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
