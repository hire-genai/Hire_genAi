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

    // Get companyId from query param or session cookie
    let companyId: string | null = req.nextUrl.searchParams.get('companyId')

    if (!companyId) {
      try {
        const cookieStore = await cookies()
        const sessionCookie = cookieStore.get('session')
        if (sessionCookie?.value) {
          const session = JSON.parse(sessionCookie.value)
          companyId = session.companyId || session.company?.id || null
        }
      } catch {
        console.log('Failed to parse session cookie for candidates')
      }
    }

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 })
    }

    // Get bucket counts filtered by company_id
    const bucketCountsQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE ai_cv_score IS NOT NULL) AS screening,
        COUNT(*) FILTER (WHERE current_stage = 'ai_interview') AS interview,
        COUNT(*) FILTER (WHERE current_stage = 'hiring_manager') AS hiring_manager,
        COUNT(*) FILTER (WHERE current_stage = 'offer') AS offer,
        COUNT(*) FILTER (WHERE current_stage = 'hired') AS hired,
        COUNT(*) FILTER (WHERE current_stage = 'rejected') AS rejected,
        COUNT(*) AS total
      FROM applications
      WHERE company_id = $1::uuid
    `
    const bucketCountsResult = await DatabaseService.query(bucketCountsQuery, [companyId])
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

    // Get applications with candidate and job info
    const applicationsQuery = `
      SELECT 
        a.id,
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
        c.id AS candidate_id,
        c.full_name,
        c.email,
        c.phone,
        c.location AS candidate_location,
        c.linkedin_url,
        c.resume_url,
        c.photo_url,
        c.source AS candidate_source,
        j.id AS job_id,
        j.title AS position,
        j.location AS job_location
      FROM applications a
      JOIN candidates c ON a.candidate_id = c.id
      JOIN job_postings j ON a.job_id = j.id
      WHERE a.company_id = $1::uuid
      ORDER BY a.applied_at DESC
    `
    const applicationsResult = await DatabaseService.query(applicationsQuery, [companyId])

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
        comments: app.remarks || app.interview_feedback || app.hm_feedback || '',
        photoUrl: app.photo_url || '',
        linkedinUrl: app.linkedin_url || '',
        resumeUrl: app.resume_url || ''
      }

      applicationsData.all.push(formattedApp)

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
      screening: await getScreeningStats(companyId),
      interview: await getInterviewStats(companyId),
      hiringManager: await getHiringManagerStats(companyId),
      offer: await getOfferStats(companyId),
      hired: await getHiredStats(companyId),
      rejected: await getRejectedStats(companyId)
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

async function getScreeningStats(companyId: string) {
  const result = await DatabaseService.query(`
    SELECT 
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE is_qualified = true) AS qualified,
      COUNT(*) FILTER (WHERE is_qualified = false) AS unqualified
    FROM applications WHERE ai_cv_score IS NOT NULL AND company_id = $1::uuid
  `, [companyId])
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

async function getInterviewStats(companyId: string) {
  const result = await DatabaseService.query(`
    SELECT 
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE interview_recommendation IN ('Strongly Recommend', 'Recommend')) AS qualified,
      COUNT(*) FILTER (WHERE interview_recommendation IN ('Reject', 'On Hold')) AS unqualified
    FROM applications WHERE current_stage = 'ai_interview' AND company_id = $1::uuid
  `, [companyId])
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

async function getHiringManagerStats(companyId: string) {
  const result = await DatabaseService.query(`
    SELECT 
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE hm_status = 'Approved') AS approved,
      COUNT(*) FILTER (WHERE hm_status = 'Rejected') AS rejected
    FROM applications WHERE current_stage = 'hiring_manager' AND company_id = $1::uuid
  `, [companyId])
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

async function getOfferStats(companyId: string) {
  const result = await DatabaseService.query(`
    SELECT 
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE offer_status = 'accepted') AS accepted,
      COUNT(*) FILTER (WHERE offer_status = 'declined') AS declined
    FROM applications WHERE current_stage = 'offer' AND company_id = $1::uuid
  `, [companyId])
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

async function getHiredStats(companyId: string) {
  const result = await DatabaseService.query(`
    SELECT 
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE onboarding_status = 'Complete') AS onboarded,
      COUNT(*) FILTER (WHERE onboarding_status IS NULL OR onboarding_status != 'Complete') AS awaiting
    FROM applications WHERE current_stage = 'hired' AND company_id = $1::uuid
  `, [companyId])
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

async function getRejectedStats(companyId: string) {
  const result = await DatabaseService.query(`
    SELECT 
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE rejection_stage = 'screening') AS from_screening,
      COUNT(*) FILTER (WHERE rejection_stage = 'ai_interview') AS from_interview,
      COUNT(*) FILTER (WHERE rejection_stage NOT IN ('screening', 'ai_interview') OR rejection_stage IS NULL) AS from_other
    FROM applications WHERE current_stage = 'rejected' AND company_id = $1::uuid
  `, [companyId])
  const r = result?.[0] || {}
  return {
    totalRejected: parseInt(r.total) || 0,
    fromScreening: parseInt(r.from_screening) || 0,
    fromInterview: parseInt(r.from_interview) || 0,
    fromOther: parseInt(r.from_other) || 0
  }
}
