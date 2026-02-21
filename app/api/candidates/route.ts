import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    if (!DatabaseService.isDatabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // Get companyId and userId from query param or session cookie
    let companyId: string | null = req.nextUrl.searchParams.get('companyId')
    let userId: string | null = req.nextUrl.searchParams.get('userId')

    try {
      const cookieStore = await cookies()
      const sessionCookie = cookieStore.get('session')
      if (sessionCookie?.value) {
        const session = JSON.parse(sessionCookie.value)
        if (!companyId) companyId = session.companyId || session.company?.id || null
        if (!userId) userId = session.userId || session.user?.id || null
      }
    } catch {
      console.log('Failed to parse session cookie for candidates')
    }

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 })
    }

    // Auto-expire delegations whose end_date has passed
    try {
      await DatabaseService.query(
        `UPDATE delegations SET status = 'expired' WHERE status = 'active' AND end_date < CURRENT_DATE AND company_id::text = $1`,
        [companyId]
      )
    } catch { /* delegations table may not exist yet */ }

    // Build the accessible jobs filter for recruiter-level access control
    // Cast UUID columns to text to avoid 'operator does not exist: text = uuid' with mock auth IDs
    let accessibleJobsClause = `j.company_id::text = $1`
    let queryParams: any[] = [companyId]

    if (userId) {
      accessibleJobsClause = `j.company_id::text = $1 AND (
        j.created_by::text = $2
        OR j.id IN (
          SELECT d.item_id FROM delegations d
          WHERE d.delegated_to::text = $2
            AND d.delegation_type = 'job'
            AND d.status = 'active'
            AND CURRENT_DATE >= d.start_date
            AND CURRENT_DATE <= d.end_date
        )
        OR a.id IN (
          SELECT d.item_id FROM delegations d
          WHERE d.delegated_to::text = $2
            AND d.delegation_type = 'application'
            AND d.status = 'active'
            AND CURRENT_DATE >= d.start_date
            AND CURRENT_DATE <= d.end_date
        )
      )`
      queryParams = [companyId, userId]
    }

    // Get bucket counts filtered by ownership + delegation
    const bucketCountsQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE a.ai_cv_score IS NOT NULL) AS screening,
        COUNT(*) FILTER (WHERE a.current_stage = 'ai_interview' OR a.current_stage = 'hiring_manager') AS interview,
        COUNT(*) FILTER (WHERE a.current_stage = 'hiring_manager') AS hiring_manager,
        COUNT(*) FILTER (WHERE a.current_stage = 'offer') AS offer,
        COUNT(*) FILTER (WHERE a.current_stage = 'hired') AS hired,
        COUNT(*) FILTER (WHERE a.current_stage = 'rejected') AS rejected,
        COUNT(*) AS total
      FROM applications a
      JOIN job_postings j ON a.job_id = j.id
      WHERE ${accessibleJobsClause}
    `
    const bucketCountsResult = await DatabaseService.query(bucketCountsQuery, queryParams)
    const counts = bucketCountsResult?.[0] || {}

    const bucketData = {
      screening: { count: parseInt(counts.screening) || 0 },
      interview: { count: parseInt(counts.interview) || 0 },
      hiringManager: { count: parseInt(counts.hiring_manager) || 0 },
      offer: { count: parseInt(counts.offer) || 0 },
      hired: { count: parseInt(counts.hired) || 0 },
      rejected: { count: parseInt(counts.rejected) || 0 },
      all: { count: parseInt(counts.total) || 0 }
    }

    // Get applications with candidate and job info + latest stage remarks
    // Filtered by ownership + delegation access control
    const applicationsQuery = `
      SELECT 
        a.id,
        a.job_id,
        a.candidate_id,
        a.current_stage,
        a.applied_at,
        a.source,
        a.ai_cv_score,
        a.is_qualified,
        a.interview_status,
        a.interview_score,
        a.interview_recommendation,
        a.interview_feedback,
        a.hm_status,
        a.hm_feedback,
        a.offer_status,
        a.offer_amount,
        a.hire_date,
        a.start_date,
        a.onboarding_status,
        a.rejection_reason,
        a.rejection_stage,
        a.remarks,
        c.id AS c_id,
        c.full_name,
        c.email,
        c.phone,
        c.location AS candidate_location,
        c.linkedin_url,
        c.resume_url,
        c.photo_url,
        c.source AS candidate_source,
        j.id AS j_id,
        j.title AS position,
        j.location AS job_location,
        (
          SELECT ash.remarks FROM application_stage_history ash
          WHERE ash.application_id = a.id
          ORDER BY ash.created_at DESC LIMIT 1
        ) AS latest_stage_remarks
      FROM applications a
      JOIN candidates c ON a.candidate_id = c.id
      JOIN job_postings j ON a.job_id = j.id
      WHERE ${accessibleJobsClause}
      ORDER BY a.applied_at DESC
    `
    const applicationsResult = await DatabaseService.query(applicationsQuery, queryParams)

    // Organize applications by bucket
    const applicationsData: Record<string, any[]> = {
      all: [],
      screening: [],
      interview: [],
      hiringManager: [],
      offer: [],
      hired: [],
      rejected: []
    }

    for (const app of applicationsResult || []) {
      const formattedApp = {
        id: app.id,
        jobId: app.job_id,
        candidateId: app.candidate_id,
        name: app.full_name || 'Unknown',
        email: app.email || '',
        phone: app.phone || '',
        position: app.position || 'Unknown Position',
        appliedDate: app.applied_at ? new Date(app.applied_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
        source: app.source || app.candidate_source || 'Direct',
        status: formatStage(app.current_stage),
        cvScore: app.ai_cv_score != null ? `${Math.round(app.ai_cv_score)}/100` : '0/100',
        screeningScore: app.ai_cv_score != null ? `${Math.round(app.ai_cv_score)}/100` : '0/100',
        screeningStatus: app.is_qualified ? 'Qualified' : (app.is_qualified === false ? 'Unqualified' : 'Pending'),
        interviewScore: app.interview_score != null ? `${Math.round(app.interview_score)}/100` : '0/100',
        interviewStatus: app.interview_status || 'Not Scheduled',
        interviewResult: app.interview_recommendation || 'Pending',
        hmStatus: app.hm_status || 'Waiting for HM feedback',
        hiringManager: 'Assigned Manager',
        daysWithHM: '0 days',
        offerAmount: app.offer_amount != null ? `$${Number(app.offer_amount).toLocaleString()}` : '$0',
        offerStatus: formatOfferStatus(app.offer_status),
        hireDate: app.hire_date ? new Date(app.hire_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
        startDate: app.start_date ? new Date(app.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
        hireStatus: app.onboarding_status || 'Awaiting Onboarding',
        rejectionStage: formatStage(app.rejection_stage) || '',
        rejectionReason: app.rejection_reason || '',
        comments: app.latest_stage_remarks || app.remarks || app.interview_feedback || app.hm_feedback || '',
        photoUrl: app.photo_url || '',
        linkedinUrl: app.linkedin_url || '',
        resumeUrl: app.resume_url || ''
      }

      applicationsData.all.push(formattedApp)

      // For display: Show candidates in their actual current_stage
      // But for counting: Interview bucket includes both interview and hiring_manager candidates
      const stage = mapStageToKey(app.current_stage)
      if (stage && applicationsData[stage]) {
        applicationsData[stage].push(formattedApp)
      }
    }

    // Calculate bucket stats
    const bucketStats = {
      all: {
        inPipeline: bucketData.screening.count + bucketData.interview.count + bucketData.hiringManager.count + bucketData.offer.count,
        hired: bucketData.hired.count,
        rejected: bucketData.rejected.count
      },
      screening: await getScreeningStats(companyId, userId),
      interview: await getInterviewStats(companyId, userId),
      hiringManager: await getHiringManagerStats(companyId, userId),
      offer: await getOfferStats(companyId, userId),
      hired: await getHiredStats(companyId, userId),
      rejected: await getRejectedStats(companyId, userId)
    }

    return NextResponse.json({
      ok: true,
      bucketData,
      applicationsData,
      bucketStats
    })

  } catch (err: any) {
    console.error('❌ Candidates API error:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch candidates' },
      { status: 500 }
    )
  }
}

function formatStage(stage: string | null): string {
  if (!stage) return 'Unknown'
  const map: Record<string, string> = {
    'screening': 'CV Screening',
    'ai_interview': 'AI Interview',
    'hiring_manager': 'Hiring Manager',
    'offer': 'Offer Stage',
    'hired': 'Hired',
    'rejected': 'Rejected'
  }
  return map[stage] || stage
}

function mapStageToKey(stage: string | null): string | null {
  if (!stage) return null
  const map: Record<string, string> = {
    'screening': 'screening',
    'ai_interview': 'interview',
    'hiring_manager': 'hiringManager',
    'offer': 'offer',
    'hired': 'hired',
    'rejected': 'rejected'
  }
  return map[stage] || null
}

function formatOfferStatus(status: string | null): string {
  if (!status) return 'Not Sent Yet'
  const map: Record<string, string> = {
    'not_sent': 'Not Sent Yet',
    'sent': 'Under Review',
    'negotiating': 'Negotiating',
    'accepted': 'Accepted',
    'declined': 'Declined',
    'expired': 'Expired'
  }
  return map[status] || status
}

// Helper to build the accessible jobs WHERE clause for stats queries
// Uses ::text cast on UUID columns to avoid 'operator does not exist: text = uuid' with mock auth IDs
function buildAccessFilter(companyId: string, userId: string | null): { clause: string, params: any[] } {
  if (userId) {
    return {
      clause: `a.company_id::text = $1 AND (
        j.created_by::text = $2
        OR j.id IN (
          SELECT d.item_id FROM delegations d
          WHERE d.delegated_to::text = $2 AND d.delegation_type = 'job'
            AND d.status = 'active' AND CURRENT_DATE >= d.start_date AND CURRENT_DATE <= d.end_date
        )
        OR a.id IN (
          SELECT d.item_id FROM delegations d
          WHERE d.delegated_to::text = $2 AND d.delegation_type = 'application'
            AND d.status = 'active' AND CURRENT_DATE >= d.start_date AND CURRENT_DATE <= d.end_date
        )
      )`,
      params: [companyId, userId]
    }
  }
  return { clause: `a.company_id::text = $1`, params: [companyId] }
}

async function getScreeningStats(companyId: string, userId: string | null) {
  const { clause, params } = buildAccessFilter(companyId, userId)
  const result = await DatabaseService.query(`
    SELECT 
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE a.is_qualified = true) AS qualified,
      COUNT(*) FILTER (WHERE a.is_qualified = false) AS unqualified
    FROM applications a
    JOIN job_postings j ON a.job_id = j.id
    WHERE a.ai_cv_score IS NOT NULL AND ${clause}
  `, params)
  const r = result?.[0] || {}
  const total = parseInt(r.total) || 0
  const qualified = parseInt(r.qualified) || 0
  const unqualified = parseInt(r.unqualified) || 0
  return {
    totalScreened: total,
    qualified,
    unqualified,
    successRate: total > 0 ? Math.round((qualified / total) * 100) : 0
  }
}

async function getInterviewStats(companyId: string, userId: string | null) {
  const { clause, params } = buildAccessFilter(companyId, userId)
  const result = await DatabaseService.query(`
    SELECT 
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE a.interview_recommendation IN ('Strongly Recommend', 'Recommend')) AS qualified,
      COUNT(*) FILTER (WHERE a.interview_recommendation IN ('Reject', 'On Hold')) AS unqualified
    FROM applications a
    JOIN job_postings j ON a.job_id = j.id
    WHERE a.current_stage = 'ai_interview' AND ${clause}
  `, params)
  const r = result?.[0] || {}
  const total = parseInt(r.total) || 0
  const qualified = parseInt(r.qualified) || 0
  const unqualified = parseInt(r.unqualified) || 0
  return {
    totalInterviewed: total,
    qualified,
    unqualified,
    successRate: total > 0 ? Math.round((qualified / total) * 100) : 0
  }
}

async function getHiringManagerStats(companyId: string, userId: string | null) {
  const { clause, params } = buildAccessFilter(companyId, userId)
  const result = await DatabaseService.query(`
    SELECT 
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE a.hm_status = 'Approved') AS approved,
      COUNT(*) FILTER (WHERE a.hm_status = 'Rejected') AS rejected
    FROM applications a
    JOIN job_postings j ON a.job_id = j.id
    WHERE a.current_stage = 'hiring_manager' AND ${clause}
  `, params)
  const r = result?.[0] || {}
  const total = parseInt(r.total) || 0
  const approved = parseInt(r.approved) || 0
  const rejected = parseInt(r.rejected) || 0
  return {
    totalSentToHM: total,
    approved,
    rejected,
    successRate: total > 0 ? Math.round((approved / total) * 100) : 0
  }
}

async function getOfferStats(companyId: string, userId: string | null) {
  const { clause, params } = buildAccessFilter(companyId, userId)
  const result = await DatabaseService.query(`
    SELECT 
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE a.offer_status = 'accepted') AS accepted,
      COUNT(*) FILTER (WHERE a.offer_status = 'declined') AS declined
    FROM applications a
    JOIN job_postings j ON a.job_id = j.id
    WHERE a.current_stage = 'offer' AND ${clause}
  `, params)
  const r = result?.[0] || {}
  const total = parseInt(r.total) || 0
  const accepted = parseInt(r.accepted) || 0
  const declined = parseInt(r.declined) || 0
  return {
    totalOfferSent: total,
    accepted,
    declined,
    successRate: total > 0 ? Math.round((accepted / total) * 100) : 0
  }
}

async function getHiredStats(companyId: string, userId: string | null) {
  const { clause, params } = buildAccessFilter(companyId, userId)
  const result = await DatabaseService.query(`
    SELECT 
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE a.onboarding_status = 'Complete') AS onboarded,
      COUNT(*) FILTER (WHERE a.onboarding_status IS NULL OR a.onboarding_status != 'Complete') AS awaiting
    FROM applications a
    JOIN job_postings j ON a.job_id = j.id
    WHERE a.current_stage = 'hired' AND ${clause}
  `, params)
  const r = result?.[0] || {}
  const total = parseInt(r.total) || 0
  const onboarded = parseInt(r.onboarded) || 0
  const awaiting = parseInt(r.awaiting) || 0
  return {
    totalHires: total,
    onboarded,
    awaitingOnboard: awaiting,
    successRate: total > 0 ? Math.round((onboarded / total) * 100) : 0
  }
}

async function getRejectedStats(companyId: string, userId: string | null) {
  const { clause, params } = buildAccessFilter(companyId, userId)
  const result = await DatabaseService.query(`
    SELECT 
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE a.rejection_stage = 'screening') AS from_screening,
      COUNT(*) FILTER (WHERE a.rejection_stage = 'ai_interview') AS from_interview,
      COUNT(*) FILTER (WHERE a.rejection_stage NOT IN ('screening', 'ai_interview') OR a.rejection_stage IS NULL) AS from_other
    FROM applications a
    JOIN job_postings j ON a.job_id = j.id
    WHERE a.current_stage = 'rejected' AND ${clause}
  `, params)
  const r = result?.[0] || {}
  return {
    totalRejected: parseInt(r.total) || 0,
    fromScreening: parseInt(r.from_screening) || 0,
    fromInterview: parseInt(r.from_interview) || 0,
    fromOther: parseInt(r.from_other) || 0
  }
}
