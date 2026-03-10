import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const sql = neon(process.env.DATABASE_URL!)

    // Check if assessment already exists for this email
    const existingAssessments = await sql`
      SELECT id, created_at FROM assessments 
      WHERE contact_email = ${email}
      LIMIT 1
    `

    if (existingAssessments.length > 0) {
      return NextResponse.json(
        { 
          exists: true, 
          message: 'This email has already completed the assessment.',
          assessmentDate: existingAssessments[0].created_at
        },
        { status: 409 }
      )
    }

    return NextResponse.json({
      exists: false,
      message: 'Email is available for assessment'
    })

  } catch (error) {
    console.error('Check email error:', error)
    return NextResponse.json(
      { error: 'Failed to check email' },
      { status: 500 }
    )
  }
}
