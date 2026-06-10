import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { GoogleCalendarService } from '@/lib/google-calendar'
import { sendContactMail, FROM_CONTACT } from '@/lib/smtp'

// POST - Create a new meeting booking
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      fullName,
      workEmail,
      companyName,
      phoneNumber,
      meetingDate,
      meetingTime,
      meetingEndTime,
      durationMinutes,
      timezone,
      meetingLocation,
      notes
    } = body

    // Validate required fields
    if (!fullName || !workEmail || !companyName) {
      return NextResponse.json(
        { error: 'Missing required fields: fullName, workEmail, companyName' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(workEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const endTime = meetingEndTime || meetingTime

    // Check if time slot is available (only if date/time provided)
    if (meetingDate && meetingTime) {
      const isAvailable = await DatabaseService.isTimeSlotAvailable(meetingDate, meetingTime, endTime)
      if (!isAvailable) {
        return NextResponse.json(
          { error: 'This time slot is already booked. Please select a different time.' },
          { status: 409 }
        )
      }
    }

    // Get client info
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Create the booking in database first
    const booking = await DatabaseService.createMeetingBooking({
      fullName,
      workEmail,
      companyName,
      phoneNumber,
      meetingDate,
      meetingTime,
      meetingEndTime: endTime,
      durationMinutes: durationMinutes || 30,
      timezone: timezone || 'India Standard Time',
      meetingLocation: meetingLocation || 'google-meet',
      notes,
      ipAddress,
      userAgent,
      source: 'website'
    })

    console.log('✅ [API] Meeting booking created successfully:', booking.id)

    // Try to create Google Calendar event + Meet link
    let meetLink: string | null = null
    let calendarWarning: string | null = null

    if (meetingDate && meetingTime && endTime) {
      try {
        const calendarResult = await GoogleCalendarService.createMeetingEvent({
          summary: `HireGenAI Meeting - ${fullName}`,
          description: `Meeting with ${fullName} (${workEmail}) from ${companyName}.\n\n${notes ? 'Notes: ' + notes : ''}`,
          meetingDate,
          meetingTime,
          meetingEndTime: endTime,
          attendeeEmail: workEmail,
          attendeeName: fullName,
          timezone: 'Asia/Kolkata',
        })

        if (calendarResult && calendarResult.meetLink) {
          meetLink = calendarResult.meetLink
          // Update booking with meet link
          await DatabaseService.updateMeetingLink(booking.id, meetLink)
          console.log('✅ [API] Google Calendar event created with Meet link:', meetLink)
        } else {
          calendarWarning = 'Google Calendar disconnected. Reconnect to generate meeting links.'
          console.warn('⚠️ [API] Google Calendar not connected, booking saved without Meet link')
        }
      } catch (calError: any) {
        calendarWarning = 'Failed to create Google Calendar event. Meeting saved without Meet link.'
        console.error('⚠️ [API] Google Calendar event creation failed:', calError.message)
      }
    }

    // Send confirmation email to the user
    try {
      const dateStr = meetingDate ? new Date(meetingDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : ''
      const meetLinkHtml = meetLink ? `<p><strong>Meeting Link:</strong> <a href="${meetLink}">${meetLink}</a></p>` : ''
      await sendContactMail({
        from: `HireGenAI Support <${FROM_CONTACT}>`,
        to: workEmail,
        subject: 'Your meeting with HireGenAI is confirmed!',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333">
            <h2 style="color:#4F46E5">Meeting Confirmed, ${fullName}!</h2>
            <p>Your demo meeting with HireGenAI has been booked successfully.</p>
            ${dateStr ? `<p><strong>Date:</strong> ${dateStr}</p>` : ''}
            ${meetingTime ? `<p><strong>Time:</strong> ${meetingTime}${meetingEndTime ? ' – ' + meetingEndTime : ''} (IST)</p>` : ''}
            ${meetLinkHtml}
            ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
            <p>If you need to reschedule or have any questions, just reply to this email.</p>
            <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
            <p style="font-size:13px;color:#888">HireGenAI · support@hire-genai.com</p>
          </div>
        `,
      })
      console.log('✅ [API] Meeting confirmation email sent to:', workEmail)
    } catch (emailErr) {
      console.error('⚠️ [API] Failed to send meeting confirmation email:', emailErr)
    }

    return NextResponse.json({
      success: true,
      message: 'Meeting booked successfully',
      calendarWarning,
      booking: {
        id: booking.id,
        fullName: booking.full_name,
        workEmail: booking.work_email,
        companyName: booking.company_name,
        meetingDate: booking.meeting_date,
        meetingTime: booking.meeting_time,
        meetingEndTime: booking.meeting_end_time,
        meetingLink: meetLink || booking.meeting_link,
        status: booking.status
      }
    })

  } catch (error: any) {
    console.error('❌ [API] Failed to create meeting booking:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create meeting booking' },
      { status: 500 }
    )
  }
}

// PATCH - Update meeting booking status (for admin)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status, adminNotes, interactionSummary } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      )
    }

    const validStatuses = ['new_lead', 'active_prospect', 'inactive_prospect', 'converted_to_customer', 'archived']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    const updates: string[] = []
    const params: any[] = []
    let paramIndex = 1

    if (status) {
      updates.push(`status = $${paramIndex}`)
      params.push(status)
      paramIndex++

      // Set timestamps based on status
      if (status === 'confirmed') {
        updates.push(`confirmed_at = NOW()`)
      } else if (status === 'cancelled') {
        updates.push(`cancelled_at = NOW()`)
      }
    }

    if (adminNotes !== undefined) {
      updates.push(`admin_notes = $${paramIndex}`)
      params.push(adminNotes)
      paramIndex++
    }

    if (interactionSummary !== undefined) {
      updates.push(`interaction_summary = $${paramIndex}`)
      params.push(interactionSummary)
      paramIndex++
    }

    updates.push(`updated_at = NOW()`)

    if (updates.length === 1) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    params.push(id)
    const sql = `UPDATE meeting_bookings SET ${updates.join(', ')} WHERE id = $${paramIndex}::uuid RETURNING *`
    
    const result = await DatabaseService.query(sql, params)

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    console.log('✅ [API] Meeting booking updated:', id, 'Status:', status)

    return NextResponse.json({
      success: true,
      booking: result[0]
    })
  } catch (error: any) {
    console.error('❌ [API] Failed to update meeting booking:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update meeting booking' },
      { status: 500 }
    )
  }
}

// GET - Get all meeting bookings (for admin)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const status = searchParams.get('status') || undefined
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0

    const bookings = await DatabaseService.getMeetingBookings({
      status,
      startDate,
      endDate,
      limit,
      offset
    })

    // Also get stats
    const stats = await DatabaseService.getMeetingBookingsStats()

    return NextResponse.json({
      success: true,
      bookings,
      stats,
      pagination: {
        limit,
        offset,
        total: parseInt(stats?.total || '0')
      }
    })

  } catch (error: any) {
    console.error('❌ [API] Failed to get meeting bookings:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get meeting bookings' },
      { status: 500 }
    )
  }
}
