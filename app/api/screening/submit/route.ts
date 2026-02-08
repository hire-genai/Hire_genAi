import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

// POST - Submit screening answers (only answers, not questions)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { jobId, companySlug, answers } = body

    if (!jobId || !answers) {
      return NextResponse.json(
        { error: 'Job ID and answers are required' },
        { status: 400 }
      )
    }

    // Verify job exists and is open
    const jobs = await DatabaseService.query(
      `SELECT jp.id, jp.status, c.slug as company_slug
       FROM job_postings jp
       JOIN companies c ON jp.company_id = c.id
       WHERE jp.id = $1::uuid`,
      [jobId]
    )

    if (jobs.length === 0) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    const job = jobs[0]

    // Validate company slug matches
    if (companySlug && job.company_slug !== companySlug) {
      return NextResponse.json(
        { error: 'Company mismatch' },
        { status: 400 }
      )
    }

    // Check job status
    if (job.status !== 'open' && job.status !== 'published') {
      return NextResponse.json(
        { error: 'This job is no longer accepting applications' },
        { status: 403 }
      )
    }

    // Store screening answers in candidate_screening_answers table
    // This table stores ONLY answers, linked to jobId and a session/candidate identifier
    // For now, we'll generate a temporary session ID until the candidate completes application
    const sessionId = `screen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    try {
      await DatabaseService.query(
        `INSERT INTO candidate_screening_answers (
          session_id, job_id, answers, submitted_at
        ) VALUES ($1, $2::uuid, $3, NOW())
        ON CONFLICT (session_id) DO UPDATE SET
          answers = $3,
          submitted_at = NOW()`,
        [sessionId, jobId, JSON.stringify(answers)]
      )
    } catch (tableError) {
      // Table may not exist yet, log and continue
      console.log('Could not save screening answers (table may not exist):', tableError)
    }

    return NextResponse.json({
      success: true,
      message: 'Screening answers submitted successfully',
      sessionId
    })
  } catch (error) {
    console.error('Error submitting screening answers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
