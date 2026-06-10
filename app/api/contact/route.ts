import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { sendContactMail, FROM_CONTACT } from '@/lib/smtp'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fullName, workEmail, companyName, phoneNumber, subject, message, agreedToTerms } = body

    // Validate required fields
    if (!fullName || !workEmail || !companyName || !subject || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    // Insert into database using DatabaseService
    const result = await DatabaseService.query(
      `INSERT INTO contact_messages (full_name, work_email, company_name, phone_number, subject, message, agreed_to_terms, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [fullName, workEmail, companyName, phoneNumber || null, subject, message, agreedToTerms, 'new_lead']
    )

    console.log('Contact message saved:', result)

    // Send confirmation email to the user
    try {
      await sendContactMail({
        from: `HireGenAI Support <${FROM_CONTACT}>`,
        to: workEmail,
        subject: "We've received your message – HireGenAI",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333">
            <h2 style="color:#4F46E5">Thanks for reaching out, ${fullName}!</h2>
            <p>We've received your message and our team will get back to you within 1 business day.</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Your message:</strong><br/>${message.replace(/\n/g, '<br/>')}</p>
            <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
            <p style="font-size:13px;color:#888">HireGenAI · support@hire-genai.com</p>
          </div>
        `,
      })
      console.log('✅ Contact confirmation email sent to:', workEmail)
    } catch (emailErr) {
      console.error('⚠️ Failed to send contact confirmation email:', emailErr)
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Your message has been received. We will get back to you soon.',
        data: result
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error processing contact form:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH endpoint to update contact message status (admin only)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status, adminNotes, interactionSummary, replied } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Message ID is required' },
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

    if (replied !== undefined) {
      updates.push(`replied = $${paramIndex}`)
      params.push(replied)
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
    const sql = `UPDATE contact_messages SET ${updates.join(', ')} WHERE id = CAST($${paramIndex} AS UUID) RETURNING *`

    const result = await DatabaseService.query(sql, params)

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: result[0]
    })
  } catch (error) {
    console.error('Error updating contact message:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve contact messages (admin only)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: string[] = []
    const params: any[] = []

    if (status) {
      params.push(status)
      where.push(`status = $${params.length}`)
    }

    const whereClause = where.length > 0 ? ` WHERE ${where.join(' AND ')}` : ''

    let sql = `SELECT * FROM contact_messages${whereClause}`
    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    const dataParams = [...params, limit, offset]

    const data = await DatabaseService.query(sql, dataParams)

    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM contact_messages${whereClause}`
    const countResult = await DatabaseService.query(countSql, params)
    const total = parseInt(countResult[0]?.total || '0')

    return NextResponse.json(
      {
        success: true,
        data: data,
        total,
        limit,
        offset
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error fetching contact messages:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
