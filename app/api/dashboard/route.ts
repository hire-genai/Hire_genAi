import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    if (!DatabaseService.isDatabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // Get companyId from query param or session cookie
    let companyId: string | null = request.nextUrl.searchParams.get('companyId')
    let userId: string | null = null

    if (!companyId) {
      try {
        const cookieStore = await cookies()
        const sessionCookie = cookieStore.get('session')
        if (sessionCookie?.value) {
          const session = JSON.parse(sessionCookie.value)
          companyId = session.companyId || session.company?.id || null
          userId = session.userId || session.user?.id || null
        }
      } catch {
        console.log('Failed to parse session cookie for dashboard')
      }
    }

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 })
    }

    // --- 1. KPI Stats (single efficient query) ---
    const kpiQuery = `
      SELECT
        -- Job counts
        (SELECT COUNT(*) FROM job_postings WHERE company_id = $1::uuid AND status = 'open') AS open_jobs,
        (SELECT COUNT(*) FROM job_postings WHERE company_id = $1::uuid) AS total_jobs,
        (SELECT COUNT(*) FROM job_postings WHERE company_id = $1::uuid AND status = 'draft') AS draft_jobs,
        (SELECT COUNT(*) FROM job_postings WHERE company_id = $1::uuid AND status = 'closed') AS closed_jobs,
        
        -- Application / pipeline counts
        (SELECT COUNT(*) FROM applications WHERE company_id = $1::uuid) AS total_applications,
        (SELECT COUNT(*) FROM applications WHERE company_id = $1::uuid AND current_stage NOT IN ('hired', 'rejected', 'withdrawn')) AS active_candidates,
        (SELECT COUNT(*) FROM applications WHERE company_id = $1::uuid AND current_stage = 'screening') AS screening_count,
        (SELECT COUNT(*) FROM applications WHERE company_id = $1::uuid AND current_stage = 'ai_interview') AS interview_count,
        (SELECT COUNT(*) FROM applications WHERE company_id = $1::uuid AND current_stage = 'hiring_manager') AS hm_count,
        (SELECT COUNT(*) FROM applications WHERE company_id = $1::uuid AND current_stage = 'offer') AS offer_count,
        (SELECT COUNT(*) FROM applications WHERE company_id = $1::uuid AND current_stage = 'hired') AS hired_count,
        (SELECT COUNT(*) FROM applications WHERE company_id = $1::uuid AND current_stage = 'rejected') AS rejected_count,
        
        -- This week's new applications
        (SELECT COUNT(*) FROM applications WHERE company_id = $1::uuid AND applied_at >= NOW() - INTERVAL '7 days') AS new_this_week,
        
        -- Avg interview score
        (SELECT ROUND(AVG(interview_score)::numeric, 1) FROM applications WHERE company_id = $1::uuid AND interview_score IS NOT NULL) AS avg_interview_score,
        
        -- Offer acceptance rate
        (SELECT COUNT(*) FROM applications WHERE company_id = $1::uuid AND offer_status = 'accepted') AS offers_accepted,
        (SELECT COUNT(*) FROM applications WHERE company_id = $1::uuid AND offer_status IN ('accepted', 'declined')) AS offers_decided,
        
        -- Avg time to fill (simplified - just count hired)
        (SELECT COUNT(*) FROM applications WHERE company_id = $1::uuid AND current_stage = 'hired') AS hired_total,
        
        -- Candidate count
        (SELECT COUNT(*) FROM candidates WHERE company_id = $1::uuid) AS total_candidates,
        
        -- Team members
        (SELECT COUNT(*) FROM users WHERE company_id = $1::uuid AND status = 'active') AS team_members
    `
    const kpiResult = await DatabaseService.query(kpiQuery, [companyId])
    const kpi = kpiResult[0] || {}

    // --- 2. Recent candidates (last 10 applications with candidate + job info) ---
    const recentQuery = `
      SELECT 
        a.id,
        a.current_stage,
        a.applied_at,
        a.ai_cv_score,
        a.interview_score,
        c.full_name,
        c.email,
        c.experience_years,
        j.title AS position
      FROM applications a
      JOIN candidates c ON a.candidate_id = c.id
      JOIN job_postings j ON a.job_id = j.id
      WHERE a.company_id = $1::uuid
      ORDER BY a.applied_at DESC
      LIMIT 10
    `
    const recentCandidates = await DatabaseService.query(recentQuery, [companyId])

    // --- 3. Pipeline breakdown by job (top 10 active jobs) ---
    const pipelineQuery = `
      SELECT 
        j.id,
        j.title,
        j.department,
        j.status,
        j.created_at,
        COUNT(a.id) AS total_candidates,
        COUNT(a.id) FILTER (WHERE a.current_stage = 'screening') AS screening,
        COUNT(a.id) FILTER (WHERE a.current_stage = 'ai_interview') AS ai_interview,
        COUNT(a.id) FILTER (WHERE a.current_stage = 'hiring_manager') AS hiring_manager,
        COUNT(a.id) FILTER (WHERE a.current_stage = 'offer') AS offer,
        COUNT(a.id) FILTER (WHERE a.current_stage = 'hired') AS hired,
        COUNT(a.id) FILTER (WHERE a.current_stage = 'rejected') AS rejected
      FROM job_postings j
      LEFT JOIN applications a ON j.id = a.job_id
      WHERE j.company_id = $1::uuid AND j.status IN ('open', 'onhold')
      GROUP BY j.id, j.title, j.department, j.status, j.created_at
      ORDER BY j.created_at DESC
      LIMIT 10
    `
    const pipelineByJob = await DatabaseService.query(pipelineQuery, [companyId])

    // --- 4. Stage time averages (bottleneck detection) ---
    const stageTimeQuery = `
      SELECT 
        to_stage,
        ROUND(AVG(EXTRACT(EPOCH FROM (
          COALESCE(
            (SELECT MIN(ash2.created_at) FROM application_stage_history ash2 
             WHERE ash2.application_id = ash.application_id AND ash2.created_at > ash.created_at),
            NOW()
          ) - ash.created_at
        )) / 86400)::numeric, 1) AS avg_days
      FROM application_stage_history ash
      JOIN applications a ON ash.application_id = a.id
      WHERE a.company_id = $1::uuid
      GROUP BY to_stage
      ORDER BY avg_days DESC
    `
    let stageTimeAvgs: any[] = []
    try {
      stageTimeAvgs = await DatabaseService.query(stageTimeQuery, [companyId])
    } catch {
      // application_stage_history might be empty
    }

    // --- 5. Source effectiveness ---
    const sourceQuery = `
      SELECT 
        COALESCE(a.source, 'Direct') AS source,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE a.current_stage IN ('ai_interview', 'hiring_manager', 'offer', 'hired')) AS advanced,
        COUNT(*) FILTER (WHERE a.current_stage = 'hired') AS hired
      FROM applications a
      WHERE a.company_id = $1::uuid
      GROUP BY COALESCE(a.source, 'Direct')
      ORDER BY total DESC
      LIMIT 8
    `
    const sourceEffectiveness = await DatabaseService.query(sourceQuery, [companyId])

    // --- 6. Recruiters list (team members) ---
    const recruitersQuery = `
      SELECT u.id, u.full_name AS name, u.email,
        (SELECT COUNT(*) FROM job_postings jp WHERE jp.created_by = u.id AND jp.status = 'open') AS active_jobs,
        (SELECT COUNT(*) FROM applications a2 
         JOIN job_postings jp2 ON a2.job_id = jp2.id 
         WHERE jp2.created_by = u.id AND a2.current_stage NOT IN ('hired', 'rejected', 'withdrawn')) AS active_candidates
      FROM users u
      WHERE u.company_id = $1::uuid AND u.status = 'active'
      ORDER BY u.full_name
    `
    const recruiters = await DatabaseService.query(recruitersQuery, [companyId])

    // --- Build response ---
    const offerAcceptanceRate = parseInt(kpi.offers_decided) > 0
      ? Math.round((parseInt(kpi.offers_accepted) / parseInt(kpi.offers_decided)) * 100)
      : 0

    return NextResponse.json({
      success: true,
      data: {
        kpis: {
          openJobs: parseInt(kpi.open_jobs) || 0,
          totalJobs: parseInt(kpi.total_jobs) || 0,
          draftJobs: parseInt(kpi.draft_jobs) || 0,
          closedJobs: parseInt(kpi.closed_jobs) || 0,
          totalApplications: parseInt(kpi.total_applications) || 0,
          activeCandidates: parseInt(kpi.active_candidates) || 0,
          screeningCount: parseInt(kpi.screening_count) || 0,
          interviewCount: parseInt(kpi.interview_count) || 0,
          hmCount: parseInt(kpi.hm_count) || 0,
          offerCount: parseInt(kpi.offer_count) || 0,
          hiredCount: parseInt(kpi.hired_count) || 0,
          rejectedCount: parseInt(kpi.rejected_count) || 0,
          newThisWeek: parseInt(kpi.new_this_week) || 0,
          avgInterviewScore: parseFloat(kpi.avg_interview_score) || 0,
          offerAcceptanceRate,
          avgTimeToFill: 14, // Default placeholder - actual calculation requires proper date columns
          totalCandidates: parseInt(kpi.total_candidates) || 0,
          teamMembers: parseInt(kpi.team_members) || 0,
        },
        recentCandidates: (recentCandidates || []).map((rc: any) => ({
          id: rc.id,
          name: rc.full_name,
          email: rc.email,
          position: rc.position,
          status: formatStage(rc.current_stage),
          experience: rc.experience_years ? `${rc.experience_years} years` : 'N/A',
          appliedDate: rc.applied_at ? formatRelativeTime(new Date(rc.applied_at)) : 'N/A',
          cvScore: rc.ai_cv_score != null ? Math.round(rc.ai_cv_score) : null,
          interviewScore: rc.interview_score != null ? Math.round(rc.interview_score) : null,
        })),
        pipelineByJob: (pipelineByJob || []).map((pj: any) => ({
          id: pj.id,
          title: pj.title,
          department: pj.department || 'General',
          status: pj.status,
          totalCandidates: parseInt(pj.total_candidates) || 0,
          screening: parseInt(pj.screening) || 0,
          aiInterview: parseInt(pj.ai_interview) || 0,
          hiringManager: parseInt(pj.hiring_manager) || 0,
          offer: parseInt(pj.offer) || 0,
          hired: parseInt(pj.hired) || 0,
          rejected: parseInt(pj.rejected) || 0,
          openDays: Math.floor((Date.now() - new Date(pj.created_at).getTime()) / (1000 * 60 * 60 * 24)),
        })),
        stageTimeAvgs: (stageTimeAvgs || []).map((st: any) => ({
          stage: formatStage(st.to_stage),
          avgDays: parseFloat(st.avg_days) || 0,
          bottleneck: parseFloat(st.avg_days) > 5,
        })),
        sourceEffectiveness: (sourceEffectiveness || []).map((se: any) => ({
          source: se.source,
          total: parseInt(se.total) || 0,
          advanced: parseInt(se.advanced) || 0,
          hired: parseInt(se.hired) || 0,
          conversionRate: parseInt(se.total) > 0
            ? Math.round((parseInt(se.advanced) / parseInt(se.total)) * 100)
            : 0,
        })),
        recruiters: (recruiters || []).map((r: any) => ({
          id: r.id,
          name: r.name,
          email: r.email,
          activeJobs: parseInt(r.active_jobs) || 0,
          activeCandidates: parseInt(r.active_candidates) || 0,
        })),
      }
    })
  } catch (error: any) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}

function formatStage(stage: string | null): string {
  if (!stage) return 'Unknown'
  const map: Record<string, string> = {
    'screening': 'Screening',
    'ai_interview': 'Interview',
    'hiring_manager': 'HM Review',
    'offer': 'Offer',
    'hired': 'Hired',
    'rejected': 'Rejected',
    'withdrawn': 'Withdrawn',
  }
  return map[stage] || stage
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hours ago`
  if (diffDays === 1) return '1 day ago'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
