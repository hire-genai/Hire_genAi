import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/applications
 *
 * Query applications for a specific job with candidate details.
 *
 * Query Parameters:
 *   - jobId (required): UUID of the job to filter by
 *
 * Returns:
 *   200: { applications: [...] } with candidate email and details
 *   400: Missing or invalid jobId
 *   404: Job not found
 *   500: Database error
 */
export async function GET(request: NextRequest) {
  try {
    if (!DatabaseService.isDatabaseConfigured()) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      )
    }

    // Extract jobId from query params
    const jobId = request.nextUrl.searchParams.get('jobId')

    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId parameter is required' },
        { status: 400 }
      )
    }

    // Validate jobId is a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(jobId)) {
      return NextResponse.json(
        { error: 'Invalid jobId format' },
        { status: 400 }
      )
    }

    // Verify job exists
    const jobCheck = await DatabaseService.query(
      `SELECT id FROM job_postings WHERE id = $1::uuid LIMIT 1`,
      [jobId]
    )

    if (!jobCheck || jobCheck.length === 0) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Query applications with candidate details
    const applications = await DatabaseService.query(
      `SELECT
        a.id,
        a.job_id,
        a.candidate_id,
        a.current_stage,
        a.applied_at,
        a.cv_score,
        a.interview_status,
        a.hm_status,
        a.offer_status,
        c.email,
        c.full_name,
        c.first_name,
        c.last_name,
        c.phone,
        c.location,
        c.linkedin_url,
        c.resume_url,
        c.photo_url
      FROM applications a
      JOIN candidates c ON a.candidate_id = c.id
      WHERE a.job_id = $1::uuid
      ORDER BY a.applied_at DESC`,
      [jobId]
    )

    return NextResponse.json({
      success: true,
      applications: applications,
      total: applications.length,
    })
  } catch (error) {
    console.error('❌ Error fetching applications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
