import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fullName, workEmail, companyName, phoneNumber, subject, message, agreedToTerms } = body

    // Validate required fields
    if (!fullName || !workEmail || !subject || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Connect to database
    const sql = neon(process.env.DATABASE_URL!)
    
    // Insert contact message
    await sql`
      INSERT INTO contact_messages (
        full_name,
        work_email,
        company_name,
        phone_number,
        subject,
        message,
        agreed_to_terms
      ) VALUES (
        ${fullName},
        ${workEmail},
        ${companyName || null},
        ${phoneNumber || null},
        ${subject},
        ${message},
        ${agreedToTerms || false}
      )
    `

    return NextResponse.json(
      { success: true, message: 'Contact form submitted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Contact form submission error:', error)
    return NextResponse.json(
      { error: 'Failed to submit contact form' },
      { status: 500 }
    )
  }
}
