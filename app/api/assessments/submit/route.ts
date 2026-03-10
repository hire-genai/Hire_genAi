import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      sessionId, 
      contactEmail, 
      contactName, 
      contactCompany, 
      contactPhone,
      answers, 
      status = 'partial' 
    } = body

    if (!sessionId || !answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, answers' },
        { status: 400 }
      )
    }

    const sql = neon(process.env.DATABASE_URL!)

    // Convert answers array to JSON object format
    const answersJson: { [key: string]: any } = {}
    for (const answer of answers) {
      answersJson[answer.questionKey] = {
        questionText: answer.questionText,
        answerValue: answer.answerValue,
        answerIndex: answer.answerIndex
      }
    }

    // Calculate score if completed
    let score = null
    let scoreBreakdown = null
    
    if (status === 'completed') {
      // Simple scoring logic - you can customize this
      const scoreMap: { [key: string]: number } = {
        'question-1': 10, // Applications received
        'question-2': 15, // Time spent screening
        'question-3': 15, // Time-to-hire
        'question-4': 10, // Screening method
        'question-5': 15, // Quality standards
        'question-6': 10, // Cost per hire
        'question-7': 10, // Candidate experience
        'question-8': 15, // People involved
        'question-9': 10, // Technology usage
        'question-10': 10  // Priority areas
      }
      
      let totalScore = 0
      const breakdown: { [key: string]: number } = {}
      
      for (const answer of answers) {
        const points = scoreMap[answer.questionKey] || 0
        // Higher index = better answer (assuming options are ordered from worst to best)
        const answerScore = points * ((answer.answerIndex || 0) + 1) / 4 // Assuming 4 options max
        totalScore += answerScore
        breakdown[answer.questionKey] = answerScore
      }
      
      score = totalScore
      scoreBreakdown = breakdown
    }

    // No duplicate check here - already validated at start

    // Create new assessment
    const newAssessment = await sql`
      INSERT INTO assessments (
        session_id,
        contact_email,
        contact_name,
        contact_company,
        contact_phone,
        answers,
        status,
        score,
        score_breakdown,
        completed_at
      ) VALUES (
        ${sessionId},
        ${contactEmail || null},
        ${contactName || null},
        ${contactCompany || null},
        ${contactPhone || null},
        ${JSON.stringify(answersJson)},
        ${status},
        ${score},
        ${scoreBreakdown ? JSON.stringify(scoreBreakdown) : null},
        ${status === 'completed' ? new Date().toISOString() : null}
      )
      RETURNING id
    `
    
    const assessmentId = newAssessment[0].id

    return NextResponse.json({
      success: true,
      assessmentId,
      score,
      scoreBreakdown,
      status
    })

  } catch (error) {
    console.error('Assessment submission error:', error)
    return NextResponse.json(
      { error: 'Failed to submit assessment' },
      { status: 500 }
    )
  }
}
