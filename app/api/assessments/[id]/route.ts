import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const assessmentId = params.id
    const sql = neon(process.env.DATABASE_URL!)

    // Get assessment data
    const assessment = await sql`
      SELECT *
      FROM assessments
      WHERE id = ${assessmentId}
      LIMIT 1
    `

    if (assessment.length === 0) {
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      )
    }

    const assessmentData = assessment[0]

    // Format the response
    const response = {
      id: assessmentData.id,
      session_id: assessmentData.session_id,
      contact_email: assessmentData.contact_email,
      contact_name: assessmentData.contact_name,
      contact_company: assessmentData.contact_company,
      contact_phone: assessmentData.contact_phone,
      answers: assessmentData.answers, // JSON object containing all answers
      status: assessmentData.status,
      score: assessmentData.score,
      score_breakdown: assessmentData.score_breakdown,
      completed_at: assessmentData.completed_at,
      created_at: assessmentData.created_at,
      updated_at: assessmentData.updated_at
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Get assessment error:', error)
    return NextResponse.json(
      { error: 'Failed to get assessment' },
      { status: 500 }
    )
  }
}
