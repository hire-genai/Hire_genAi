import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { applicationId } = body

    if (!applicationId) {
      return NextResponse.json({ error: 'applicationId is required' }, { status: 400 })
    }

    console.log('[Interview Start] Starting for application:', applicationId)

    // Get application details with job info and interview status
    const appData = await DatabaseService.query(`
      SELECT 
        a.id,
        a.job_id,
        a.candidate_id,
        i.interview_status,
        jp.company_id,
        jp.title as job_title,
        c.full_name as candidate_name,
        c.email as candidate_email
      FROM applications a
      JOIN job_postings jp ON a.job_id = jp.id
      JOIN candidates c ON a.candidate_id = c.id
      LEFT JOIN interviews i ON i.application_id = a.id
      WHERE a.id = $1::uuid
    `, [applicationId]) as any[]

    if (!appData || appData.length === 0) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    const application = appData[0]

    // Check if interview already completed
    if (application.interview_status === 'Completed') {
      return NextResponse.json({ error: 'Interview already completed' }, { status: 400 })
    }

    // Fetch questions from job_interview_questions table
    const questionsData = await DatabaseService.query(`
      SELECT questions, selected_criteria
      FROM job_interview_questions
      WHERE job_id = $1::uuid
    `, [application.job_id]) as any[]

    let questions = []
    let selectedCriteria = []

    if (questionsData && questionsData.length > 0) {
      questions = typeof questionsData[0].questions === 'string' 
        ? JSON.parse(questionsData[0].questions) 
        : questionsData[0].questions || []
      selectedCriteria = typeof questionsData[0].selected_criteria === 'string'
        ? JSON.parse(questionsData[0].selected_criteria)
        : questionsData[0].selected_criteria || []
    }

    if (questions.length === 0) {
      return NextResponse.json({ error: 'No interview questions configured for this job' }, { status: 400 })
    }

    console.log('[Interview Start] Loaded', questions.length, 'questions for job:', application.job_id)
    console.log('[Interview Start] Criteria:', selectedCriteria)

    // Generate session ID
    const sessionId = `session_${applicationId}_${Date.now()}`

    // Update interview status to In Progress in interviews table
    await DatabaseService.ensureInterviewRecord(applicationId)
    await DatabaseService.query(`
      UPDATE interviews 
      SET interview_status = 'In Progress'
      WHERE application_id = $1::uuid
    `, [applicationId])

    // Calculate total marks
    const totalMarks = questions.reduce((sum: number, q: any) => sum + (q.marks || 10), 0)

    return NextResponse.json({
      success: true,
      sessionId,
      applicationId,
      companyId: application.company_id,
      jobId: application.job_id,
      jobTitle: application.job_title,
      candidateName: application.candidate_name,
      questions: questions.map((q: any, index: number) => ({
        id: q.id || index + 1,
        question: q.question,
        criterion: q.criterion,
        difficulty: q.difficulty || 'Medium',
        marks: q.marks || 10
      })),
      totalQuestions: questions.length,
      totalMarks,
      selectedCriteria
    })
  } catch (error: any) {
    console.error('[Interview Start] Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to start interview' },
      { status: 500 }
    )
  }
}
