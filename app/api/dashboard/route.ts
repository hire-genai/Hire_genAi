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

    // Get companyId and date filters from query params
    let companyId: string | null = request.nextUrl.searchParams.get('companyId')
    let userId: string | null = null
    const startDate = request.nextUrl.searchParams.get('startDate')
    const endDate = request.nextUrl.searchParams.get('endDate')
    const userRole = request.nextUrl.searchParams.get('userRole') || 'recruiter'
    
    // Validate date parameters
    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Start date and end date are required' }, { status: 400 })
    }
    
    // Parse dates and validate
    const filterStartDate = new Date(startDate + 'T00:00:00.000Z')
    const filterEndDate = new Date(endDate + 'T23:59:59.999Z')
    
    if (isNaN(filterStartDate.getTime()) || isNaN(filterEndDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
    }

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
    
    // Get user's actual role from database for validation
    let userActualRole: string = 'recruiter'
    if (userId) {
      try {
        const roleQuery = `
          SELECT ur.role FROM user_roles ur 
          JOIN users u ON ur.user_id = u.id 
          WHERE u.id = $1::uuid AND u.company_id = $2::uuid
          LIMIT 1
        `
        const roleResult = await DatabaseService.query(roleQuery, [userId, companyId])
        if (roleResult.length > 0) {
          userActualRole = roleResult[0].role
        }
      } catch (roleErr) {
        console.log('Could not verify user role, defaulting to recruiter')
      }
    }
    
    // Enforce role-based restrictions: recruiters can only access recruiter data
    const allowedRole = userActualRole === 'recruiter' ? 'recruiter' : userRole
    if (userActualRole === 'recruiter' && userRole !== 'recruiter') {
      return NextResponse.json({ 
        error: 'Access denied: Recruiters can only access recruiter-level data' 
      }, { status: 403 })
    }

    // --- 1. KPI Stats (single efficient query with date filtering) ---
    const kpiQuery = `
      SELECT
        -- Job counts (filter by creation date)
        (SELECT COUNT(*) FROM job_postings WHERE company_id = $1::uuid AND status = 'open' AND created_at >= $2::timestamp AND created_at <= $3::timestamp) AS open_jobs,
        (SELECT COUNT(*) FROM job_postings WHERE company_id = $1::uuid AND created_at >= $2::timestamp AND created_at <= $3::timestamp) AS total_jobs,
        (SELECT COUNT(*) FROM job_postings WHERE company_id = $1::uuid AND status = 'draft' AND created_at >= $2::timestamp AND created_at <= $3::timestamp) AS draft_jobs,
        (SELECT COUNT(*) FROM job_postings WHERE company_id = $1::uuid AND status = 'closed' AND created_at >= $2::timestamp AND created_at <= $3::timestamp) AS closed_jobs,
        
        -- Application / pipeline counts (filter by application date)
        (SELECT COUNT(*) FROM applications WHERE company_id = $1::uuid AND applied_at >= $2::timestamp AND applied_at <= $3::timestamp) AS total_applications,
        (SELECT COUNT(*) FROM applications WHERE company_id = $1::uuid AND current_stage NOT IN ('hired', 'rejected', 'withdrawn') AND applied_at >= $2::timestamp AND applied_at <= $3::timestamp) AS active_candidates,
        (SELECT COUNT(*) FROM applications WHERE company_id = $1::uuid AND current_stage = 'screening' AND applied_at >= $2::timestamp AND applied_at <= $3::timestamp) AS screening_count,
        (SELECT COUNT(*) FROM applications WHERE company_id = $1::uuid AND current_stage = 'ai_interview' AND applied_at >= $2::timestamp AND applied_at <= $3::timestamp) AS interview_count,
        (SELECT COUNT(*) FROM applications WHERE company_id = $1::uuid AND current_stage = 'hiring_manager' AND applied_at >= $2::timestamp AND applied_at <= $3::timestamp) AS hm_count,
        (SELECT COUNT(*) FROM applications WHERE company_id = $1::uuid AND current_stage = 'offer' AND applied_at >= $2::timestamp AND applied_at <= $3::timestamp) AS offer_count,
        (SELECT COUNT(*) FROM applications WHERE company_id = $1::uuid AND current_stage = 'hired' AND applied_at >= $2::timestamp AND applied_at <= $3::timestamp) AS hired_count,
        (SELECT COUNT(*) FROM applications WHERE company_id = $1::uuid AND current_stage = 'rejected' AND applied_at >= $2::timestamp AND applied_at <= $3::timestamp) AS rejected_count,
        
        -- New applications in the date range
        (SELECT COUNT(*) FROM applications WHERE company_id = $1::uuid AND applied_at >= $2::timestamp AND applied_at <= $3::timestamp) AS new_in_period,
        
        -- Avg interview score (from interviews table, filter by application date)
        (SELECT ROUND(AVG(i.interview_score)::numeric, 1) FROM interviews i JOIN applications a ON i.application_id = a.id WHERE a.company_id = $1::uuid AND a.applied_at >= $2::timestamp AND a.applied_at <= $3::timestamp AND i.interview_score IS NOT NULL) AS avg_interview_score,
        
        -- Offer acceptance rate (filter by application date)
        (SELECT COUNT(*) FROM applications WHERE company_id = $1::uuid AND offer_status = 'accepted' AND applied_at >= $2::timestamp AND applied_at <= $3::timestamp) AS offers_accepted,
        (SELECT COUNT(*) FROM applications WHERE company_id = $1::uuid AND offer_status IN ('accepted', 'declined') AND applied_at >= $2::timestamp AND applied_at <= $3::timestamp) AS offers_decided,
        
        -- Hired count in date range
        (SELECT COUNT(*) FROM applications WHERE company_id = $1::uuid AND current_stage = 'hired' AND applied_at >= $2::timestamp AND applied_at <= $3::timestamp) AS hired_total,
        
        -- Candidate count (filter by creation date)
        (SELECT COUNT(*) FROM candidates WHERE company_id = $1::uuid AND created_at >= $2::timestamp AND created_at <= $3::timestamp) AS total_candidates,
        
        -- Team members (no date filter needed)
        (SELECT COUNT(*) FROM users WHERE company_id = $1::uuid AND status = 'active') AS team_members
    `
    const kpiResult = await DatabaseService.query(kpiQuery, [companyId, filterStartDate, filterEndDate])
    const kpi = kpiResult[0] || {}

    // --- 2. Recent candidates (filter by date range) ---
    const recentQuery = `
      SELECT 
        a.id,
        a.current_stage,
        a.applied_at,
        a.ai_cv_score,
        i.interview_score,
        c.full_name,
        c.email,
        c.experience_years,
        j.title AS position
      FROM applications a
      JOIN candidates c ON a.candidate_id = c.id
      JOIN job_postings j ON a.job_id = j.id
      LEFT JOIN interviews i ON i.application_id = a.id
      WHERE a.company_id = $1::uuid 
        AND a.applied_at >= $2::timestamp 
        AND a.applied_at <= $3::timestamp
      ORDER BY a.applied_at DESC
      LIMIT 10
    `
    const recentCandidates = await DatabaseService.query(recentQuery, [companyId, filterStartDate, filterEndDate])

    // --- 3. Pipeline breakdown by job (filter applications by date range) ---
    const pipelineQuery = `
      SELECT 
        j.id,
        j.title,
        j.department,
        j.status,
        j.created_at,
        COUNT(a.id) FILTER (WHERE a.applied_at >= $2::timestamp AND a.applied_at <= $3::timestamp) AS total_candidates,
        COUNT(a.id) FILTER (WHERE a.current_stage = 'screening' AND a.applied_at >= $2::timestamp AND a.applied_at <= $3::timestamp) AS screening,
        COUNT(a.id) FILTER (WHERE a.current_stage = 'ai_interview' AND a.applied_at >= $2::timestamp AND a.applied_at <= $3::timestamp) AS ai_interview,
        COUNT(a.id) FILTER (WHERE a.current_stage = 'hiring_manager' AND a.applied_at >= $2::timestamp AND a.applied_at <= $3::timestamp) AS hiring_manager,
        COUNT(a.id) FILTER (WHERE a.current_stage = 'offer' AND a.applied_at >= $2::timestamp AND a.applied_at <= $3::timestamp) AS offer,
        COUNT(a.id) FILTER (WHERE a.current_stage = 'hired' AND a.applied_at >= $2::timestamp AND a.applied_at <= $3::timestamp) AS hired,
        COUNT(a.id) FILTER (WHERE a.current_stage = 'rejected' AND a.applied_at >= $2::timestamp AND a.applied_at <= $3::timestamp) AS rejected
      FROM job_postings j
      LEFT JOIN applications a ON j.id = a.job_id
      WHERE j.company_id = $1::uuid AND j.status IN ('open', 'onhold')
      GROUP BY j.id, j.title, j.department, j.status, j.created_at
      ORDER BY j.created_at DESC
      LIMIT 10
    `
    const pipelineByJob = await DatabaseService.query(pipelineQuery, [companyId, filterStartDate, filterEndDate])

    // --- 4. Stage time averages (filter by application date) ---
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
        AND a.applied_at >= $2::timestamp 
        AND a.applied_at <= $3::timestamp
      GROUP BY to_stage
      ORDER BY avg_days DESC
    `
    let stageTimeAvgs: any[] = []
    try {
      stageTimeAvgs = await DatabaseService.query(stageTimeQuery, [companyId, filterStartDate, filterEndDate])
    } catch {
      // application_stage_history might be empty
    }

    // --- 5. Source effectiveness (filter by date range) ---
    const sourceQuery = `
      SELECT 
        COALESCE(a.source, 'Direct') AS source,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE a.current_stage IN ('ai_interview', 'hiring_manager', 'offer', 'hired')) AS advanced,
        COUNT(*) FILTER (WHERE a.current_stage = 'hired') AS hired
      FROM applications a
      WHERE a.company_id = $1::uuid 
        AND a.applied_at >= $2::timestamp 
        AND a.applied_at <= $3::timestamp
      GROUP BY COALESCE(a.source, 'Direct')
      ORDER BY total DESC
      LIMIT 8
    `
    const sourceEffectiveness = await DatabaseService.query(sourceQuery, [companyId, filterStartDate, filterEndDate])

    // --- 6. Sourcing Activity ---
    const sourcingActivityQuery = `
      WITH source_mapping AS (
        SELECT 
          c.id as candidate_id,
          CASE 
            WHEN c.source_type = 'Direct' THEN COALESCE(c.sub_source, 'Direct')
            WHEN c.source_type = 'Agency' THEN 'Agency'
            WHEN c.source_type = 'Employee Referral' THEN 'Referrals'
            ELSE 'Direct'
          END as channel,
          c.source_type,
          c.sub_source,
          a.id as application_id,
          a.current_stage
        FROM candidates c
        LEFT JOIN applications a ON c.id = a.candidate_id
        WHERE c.company_id = $1::uuid
      ),
      source_stats AS (
        SELECT 
          channel,
          COUNT(DISTINCT candidate_id) as outreach,
          COUNT(DISTINCT application_id) as responses,
          COUNT(DISTINCT CASE WHEN current_stage IN ('ai_interview', 'hiring_manager', 'offer', 'hired') THEN application_id END) as advanced
        FROM source_mapping
        GROUP BY channel
        HAVING COUNT(DISTINCT candidate_id) > 0
        ORDER BY outreach DESC
      )
      SELECT 
        channel,
        outreach::text,
        responses::text,
        CASE 
          WHEN outreach > 0 THEN ROUND((responses::decimal / outreach::decimal) * 100, 0)::text
          ELSE '0'
        END as conversion_rate,
        CASE 
          WHEN outreach > 0 AND (advanced::decimal / outreach::decimal) >= 0.5 THEN 'High'
          WHEN outreach > 0 AND (advanced::decimal / outreach::decimal) >= 0.3 THEN 'Medium'
          WHEN outreach > 0 THEN 'Low'
          ELSE 'Medium'
        END as quality
      FROM source_stats
    `
    const sourcingActivity = await DatabaseService.query(sourcingActivityQuery, [companyId])

    // --- 7. Recruiters list (team members) ---
    const recruitersQuery = `
      SELECT u.id, u.full_name AS name, u.email,
        (SELECT COUNT(*) FROM job_postings jp WHERE jp.created_by = u.email AND jp.status = 'open') AS active_jobs,
        (SELECT COUNT(*) FROM applications a2 
         JOIN job_postings jp2 ON a2.job_id = jp2.id 
         WHERE jp2.created_by = u.email AND a2.current_stage NOT IN ('hired', 'rejected', 'withdrawn')) AS active_candidates
      FROM users u
      WHERE u.company_id = $1::uuid AND u.status = 'active'
      ORDER BY u.full_name
    `
    const recruiters = await DatabaseService.query(recruitersQuery, [companyId])

    // --- 8. Manager Team Pipeline Health Data ---
    // Get recruiters under the manager using user role table
    const teamPipelineQuery = `
      SELECT DISTINCT 
        u.id,
        u.email,
        u.full_name AS name,
        -- Active Jobs count from job_posting filtered by created_by (recruiter email)
        (SELECT COUNT(*) FROM job_postings jp 
         WHERE jp.created_by = u.email AND jp.status = 'open') AS active_jobs,
        -- Active Candidates count from applications table filtered by recruiter
        (SELECT COUNT(*) FROM applications a 
         JOIN job_postings jp ON a.job_id = jp.id 
         WHERE jp.created_by = u.email AND a.current_stage NOT IN ('hired', 'rejected', 'withdrawn')) AS active_candidates,
        -- Total Hired count from applications where status = hired
        (SELECT COUNT(*) FROM applications a 
         JOIN job_postings jp ON a.job_id = jp.id 
         WHERE jp.created_by = u.email AND a.current_stage = 'hired') AS total_hired
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      WHERE u.company_id = $1::uuid 
        AND u.status = 'active'
        AND ur.role = 'recruiter'
      ORDER BY u.full_name
    `
    const teamPipelineData = await DatabaseService.query(teamPipelineQuery, [companyId])

    // --- 9. Manager Offer Acceptance Rate Data ---
    // Calculate real offer acceptance rate for team recruiters
    const offerAcceptanceQuery = `
      SELECT 
        u.id,
        u.full_name AS name,
        u.email,
        -- Offers Given = count where offer_status = 'sent' or 'under_review' or 'negotiating'
        (SELECT COUNT(*) FROM applications a 
         JOIN job_postings jp ON a.job_id = jp.id 
         WHERE jp.created_by = u.email AND a.offer_status IN ('sent', 'under_review', 'negotiating')) AS offers_given,
        -- Offers Accepted = count where offer_status = 'accepted'
        (SELECT COUNT(*) FROM applications a 
         JOIN job_postings jp ON a.job_id = jp.id 
         WHERE jp.created_by = u.email AND a.offer_status = 'accepted') AS offers_accepted
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      WHERE u.company_id = $1::uuid 
        AND u.status = 'active'
        AND ur.role = 'recruiter'
      ORDER BY u.full_name
    `
    const offerAcceptanceData = await DatabaseService.query(offerAcceptanceQuery, [companyId])

    // --- 10. Manager Team Capacity Load Data ---
    // Calculate real capacity load for team recruiters
    const capacityLoadQuery = `
      SELECT 
        u.id,
        u.full_name AS name,
        u.email,
        -- Active Reqs = count of active job_posting where created_by = recruiter email and status = 'open'
        (SELECT COUNT(*) FROM job_postings jp 
         WHERE jp.created_by = u.email AND jp.status = 'open') AS active_reqs
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      WHERE u.company_id = $1::uuid 
        AND u.status = 'active'
        AND ur.role = 'recruiter'
      ORDER BY u.full_name
    `
    const capacityLoadData = await DatabaseService.query(capacityLoadQuery, [companyId])

    // Get performance settings for capacity defaults
    const performanceQuery = `
      SELECT interview_schedule_sla, cost_per_hire_budget, hiring_per_month
      FROM performance_settings 
      WHERE company_id = $1::uuid
    `
    const performanceSettings = await DatabaseService.query(performanceQuery, [companyId])
    const defaultCapacity = performanceSettings?.[0]?.hiring_per_month || performanceSettings?.[0]?.interview_schedule_sla || 7 // Use hiring_per_month first, then SLA, then default to 7

    // --- 11. Manager Hiring Manager Data ---
    // Get hiring managers and their application counts
    const hiringManagerQuery = `
      SELECT 
        u.id,
        COALESCE(u.full_name, 'Unknown') AS "managerName",
        u.email,
        ur.role as "userRole",
        -- Approved = count applications where hm_status = 'Approved'
        (SELECT COUNT(*) FROM applications a 
         WHERE a.hm_status = 'Approved' AND 
         EXISTS (SELECT 1 FROM job_postings jp WHERE jp.id = a.job_id AND jp.company_id = $1::uuid)) AS approved,
        -- Pending = count applications where hm_status IN ('Waiting for HM feedback', 'Under Review', 'OnHold')
        (SELECT COUNT(*) FROM applications a 
         WHERE a.hm_status IN ('Waiting for HM feedback', 'Under Review', 'OnHold') AND 
         EXISTS (SELECT 1 FROM job_postings jp WHERE jp.id = a.job_id AND jp.company_id = $1::uuid)) AS pending,
        -- Rejected = count applications where hm_status = 'Rejected'
        (SELECT COUNT(*) FROM applications a 
         WHERE a.hm_status = 'Rejected' AND 
         EXISTS (SELECT 1 FROM job_postings jp WHERE jp.id = a.job_id AND jp.company_id = $1::uuid)) AS rejected,
        -- Average rating from hm_rating field
        (SELECT AVG(a.hm_rating) FROM applications a 
         WHERE a.hm_rating IS NOT NULL AND 
         EXISTS (SELECT 1 FROM job_postings jp WHERE jp.id = a.job_id AND jp.company_id = $1::uuid)) AS avg_rating,
        -- Previous quarter rating (simplified - using older applications)
        (SELECT AVG(a.hm_rating) FROM applications a 
         WHERE a.hm_rating IS NOT NULL AND a.created_at < NOW() - INTERVAL '3 months'
         AND EXISTS (SELECT 1 FROM job_postings jp WHERE jp.id = a.job_id AND jp.company_id = $1::uuid)) AS prev_quarter_rating
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      WHERE u.company_id = $1::uuid 
        AND u.status = 'active'
        AND LOWER(ur.role) IN ('hiring_manager', 'manager', 'hiringmanager')
      ORDER BY u.full_name
    `
    const hiringManagerData = await DatabaseService.query(hiringManagerQuery, [companyId])
    
    // Debug logging
    console.log('Hiring Manager Query Result:', hiringManagerData)

    // Calculate satisfaction score from actual hiring managers data
    const currentRating = hiringManagerData && hiringManagerData.length > 0 
      ? hiringManagerData.reduce((sum: number, hm: any) => sum + (parseFloat(hm.avg_rating) || 0), 0) / hiringManagerData.length
      : 0
    const previousRating = hiringManagerData && hiringManagerData.length > 0
      ? hiringManagerData.reduce((sum: number, hm: any) => sum + (parseFloat(hm.prev_quarter_rating) || 0), 0) / hiringManagerData.length  
      : 0
    const ratingChange = currentRating - previousRating

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
          newThisWeek: parseInt(kpi.new_in_period) || 0,
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
        sourcingActivity: (sourcingActivity || []).map((sa: any) => ({
          channel: sa.channel,
          outreach: sa.outreach,
          responses: sa.responses,
          conversionRate: sa.conversion_rate,
          quality: sa.quality,
        })),
        recruiters: (recruiters || []).map((r: any) => ({
          id: r.id,
          name: r.name,
          email: r.email,
          activeJobs: parseInt(r.active_jobs) || 0,
          activeCandidates: parseInt(r.active_candidates) || 0,
        })),
        teamPipelineHealth: (teamPipelineData || []).map((t: any) => ({
          id: t.id,
          name: t.name,
          email: t.email,
          activeJobs: parseInt(t.active_jobs) || 0,
          activeCandidates: parseInt(t.active_candidates) || 0,
          totalHired: parseInt(t.total_hired) || 0,
        })),
        teamOfferAcceptance: (offerAcceptanceData || []).map((o: any) => {
          const offersGiven = parseInt(o.offers_given) || 0
          const offersAccepted = parseInt(o.offers_accepted) || 0
          const rate = offersGiven > 0 ? Math.round((offersAccepted / offersGiven) * 100) : 0
          return {
            id: o.id,
            name: o.name,
            email: o.email,
            offers: offersGiven,
            accepted: offersAccepted,
            rate: `${rate}%`
          }
        }),
        teamCapacityLoad: (capacityLoadData || []).map((c: any) => {
          const activeReqs = parseInt(c.active_reqs) || 0
          const standardCapacity = defaultCapacity // Use performance settings or default to 10
          const loadPercent = Math.round((activeReqs / standardCapacity) * 100)
          
          let status = 'Normal'
          if (loadPercent > 100) status = 'Overloaded'
          else if (loadPercent >= 70) status = 'High'
          
          return {
            id: c.id,
            name: c.name,
            email: c.email,
            activeReqs: activeReqs,
            capacity: standardCapacity,
            loadPercent: `${loadPercent}%`,
            status: status
          }
        }),
        hiringManagerStats: (hiringManagerData || []).map((hm: any) => ({
          id: hm.id,
          managerName: hm.managerName, // Now using COALESCE from SQL
          email: hm.email,
          approved: parseInt(hm.approved) || 0,
          pending: parseInt(hm.pending) || 0,
          rejected: parseInt(hm.rejected) || 0,
          userRole: hm.userRole // Add role for debugging
        })),
        hiringManagerSatisfaction: {
          currentRating: currentRating.toFixed(1),
          previousRating: previousRating.toFixed(1),
          change: ratingChange.toFixed(1)
        },
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
