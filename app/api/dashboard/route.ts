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
    const recruiterId = request.nextUrl.searchParams.get('recruiterId') // For manager/director filtering
    
    // Validate date parameters
    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Start date and end date are required' }, { status: 400 })
    }
    
    // Parse dates and validate
    const filterStartDate = new Date(startDate + 'T00:00:00.000Z')
    const filterEndDate = new Date(endDate + 'T23:59:59.999Z')
    
    console.log('Date Filter Debug:', {
      startDate,
      endDate,
      filterStartDate: filterStartDate.toISOString(),
      filterEndDate: filterEndDate.toISOString(),
      filterStartDateLocal: filterStartDate.toString(),
      filterEndDateLocal: filterEndDate.toString()
    })
    
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
    // Build recruiter filter conditions for different query contexts
    const recruiterFilterJP = recruiterId ? `AND jp.recruiter_id = $4::uuid` : ''
    const recruiterFilterJ = recruiterId ? `AND j.recruiter_id = $4::uuid` : ''
    const queryParams = recruiterId ? [companyId, filterStartDate, filterEndDate, recruiterId] : [companyId, filterStartDate, filterEndDate]
    
    // Debug logging
    console.log('DEBUG - Recruiter Filter Info:', {
      recruiterId,
      recruiterFilterJP,
      recruiterFilterJ,
      queryParams: queryParams.length
    })
    
    // Debug: Check if recruiter has jobs
    if (recruiterId) {
      const debugRecruiterQuery = `
        SELECT 
          COUNT(*) as total_jobs,
          COUNT(*) FILTER (WHERE recruiter_id = $2::uuid) as recruiter_jobs,
          COUNT(*) FILTER (WHERE recruiter_id IS NULL) as null_recruiter_jobs,
          COUNT(*) FILTER (WHERE created_by = $2::text) as created_by_recruiter
        FROM job_postings 
        WHERE company_id = $1::uuid
      `
      const debugResult = await DatabaseService.query(debugRecruiterQuery, [companyId, recruiterId])
      console.log('DEBUG - Recruiter Jobs Check:', debugResult[0])
      
      // If recruiter_id is NULL but created_by matches, update it
      if (debugResult[0].null_recruiter_jobs > 0 && debugResult[0].created_by_recruiter > 0) {
        console.log('FIXING: Updating NULL recruiter_id fields based on created_by')
        const updateQuery = `
          UPDATE job_postings 
          SET recruiter_id = $2::uuid 
          WHERE company_id = $1::uuid 
            AND created_by = $2::text 
            AND recruiter_id IS NULL
        `
        await DatabaseService.query(updateQuery, [companyId, recruiterId])
        console.log('FIXED: Updated recruiter_id fields')
      }
    }
    
    const kpiQuery = `
      SELECT
        -- Job counts (filter by creation date and recruiter)
        (SELECT COUNT(*) FROM job_postings jp WHERE jp.company_id = $1::uuid AND jp.status = 'open' AND jp.created_at >= $2::timestamp AND jp.created_at <= $3::timestamp ${recruiterFilterJP}) AS open_jobs,
        (SELECT COUNT(*) FROM job_postings jp WHERE jp.company_id = $1::uuid AND jp.created_at >= $2::timestamp AND jp.created_at <= $3::timestamp ${recruiterFilterJP}) AS total_jobs,
        (SELECT COUNT(*) FROM job_postings jp WHERE jp.company_id = $1::uuid AND jp.status = 'draft' AND jp.created_at >= $2::timestamp AND jp.created_at <= $3::timestamp ${recruiterFilterJP}) AS draft_jobs,
        (SELECT COUNT(*) FROM job_postings jp WHERE jp.company_id = $1::uuid AND jp.status = 'closed' AND jp.created_at >= $2::timestamp AND jp.created_at <= $3::timestamp ${recruiterFilterJP}) AS closed_jobs,
        
        -- Application / pipeline counts (filter by application date and recruiter)
        (SELECT COUNT(*) FROM applications a JOIN job_postings jp ON a.job_id = jp.id WHERE a.company_id = $1::uuid AND a.applied_at >= $2::timestamp AND a.applied_at <= $3::timestamp ${recruiterFilterJP}) AS total_applications,
        (SELECT COUNT(*) FROM applications a JOIN job_postings jp ON a.job_id = jp.id WHERE a.company_id = $1::uuid AND a.current_stage NOT IN ('hired', 'rejected', 'withdrawn') AND a.applied_at >= $2::timestamp AND a.applied_at <= $3::timestamp ${recruiterFilterJP}) AS active_candidates,
        (SELECT COUNT(*) FROM applications a JOIN job_postings jp ON a.job_id = jp.id WHERE a.company_id = $1::uuid AND a.current_stage = 'screening' AND a.applied_at >= $2::timestamp AND a.applied_at <= $3::timestamp ${recruiterFilterJP}) AS screening_count,
        (SELECT COUNT(*) FROM applications a JOIN job_postings jp ON a.job_id = jp.id WHERE a.company_id = $1::uuid AND a.current_stage = 'ai_interview' AND a.applied_at >= $2::timestamp AND a.applied_at <= $3::timestamp ${recruiterFilterJP}) AS interview_count,
        (SELECT COUNT(*) FROM applications a JOIN job_postings jp ON a.job_id = jp.id WHERE a.company_id = $1::uuid AND a.current_stage = 'hiring_manager' AND a.applied_at >= $2::timestamp AND a.applied_at <= $3::timestamp ${recruiterFilterJP}) AS hm_count,
        (SELECT COUNT(*) FROM applications a JOIN job_postings jp ON a.job_id = jp.id WHERE a.company_id = $1::uuid AND a.current_stage = 'offer' AND a.applied_at >= $2::timestamp AND a.applied_at <= $3::timestamp ${recruiterFilterJP}) AS offer_count,
        (SELECT COUNT(*) FROM applications a JOIN job_postings jp ON a.job_id = jp.id WHERE a.company_id = $1::uuid AND a.current_stage = 'hired' AND a.applied_at >= $2::timestamp AND a.applied_at <= $3::timestamp ${recruiterFilterJP}) AS hired_count,
        (SELECT COUNT(*) FROM applications a JOIN job_postings jp ON a.job_id = jp.id WHERE a.company_id = $1::uuid AND a.current_stage = 'rejected' AND a.applied_at >= $2::timestamp AND a.applied_at <= $3::timestamp ${recruiterFilterJP}) AS rejected_count,
        
        -- New applications in the date range
        (SELECT COUNT(*) FROM applications a JOIN job_postings jp ON a.job_id = jp.id WHERE a.company_id = $1::uuid AND a.applied_at >= $2::timestamp AND a.applied_at <= $3::timestamp ${recruiterFilterJP}) AS new_in_period,
        
        -- Avg interview score (from interviews table, filter by application date and recruiter)
        (SELECT ROUND(AVG(i.interview_score)::numeric, 1) FROM interviews i JOIN applications a ON i.application_id = a.id JOIN job_postings jp ON a.job_id = jp.id WHERE a.company_id = $1::uuid AND a.applied_at >= $2::timestamp AND a.applied_at <= $3::timestamp AND i.interview_score IS NOT NULL ${recruiterFilterJP}) AS avg_interview_score,
        
        -- Offer acceptance rate (filter by application date and recruiter)
        (SELECT COUNT(*) FROM applications a JOIN job_postings jp ON a.job_id = jp.id WHERE a.company_id = $1::uuid AND a.offer_status = 'accepted' AND a.applied_at >= $2::timestamp AND a.applied_at <= $3::timestamp ${recruiterFilterJP}) AS offers_accepted,
        (SELECT COUNT(*) FROM applications a JOIN job_postings jp ON a.job_id = jp.id WHERE a.company_id = $1::uuid AND a.offer_status IN ('accepted', 'declined') AND a.applied_at >= $2::timestamp AND a.applied_at <= $3::timestamp ${recruiterFilterJP}) AS offers_decided,
        
        -- Hired count in date range
        (SELECT COUNT(*) FROM applications a JOIN job_postings jp ON a.job_id = jp.id WHERE a.company_id = $1::uuid AND a.current_stage = 'hired' AND a.applied_at >= $2::timestamp AND a.applied_at <= $3::timestamp ${recruiterFilterJP}) AS hired_total,
        
        -- Candidate count (filter by creation date)
        (SELECT COUNT(*) FROM candidates WHERE company_id = $1::uuid AND created_at >= $2::timestamp AND created_at <= $3::timestamp) AS total_candidates,
        
        -- Team members (no date filter needed)
        (SELECT COUNT(*) FROM users WHERE company_id = $1::uuid AND status = 'active') AS team_members
    `
    const kpiResult = await DatabaseService.query(kpiQuery, queryParams)
    const kpi = kpiResult[0] || {}
    
    // Debug logging for KPI data
    console.log('Dashboard KPI Data:', {
      companyId,
      dateRange: { start: filterStartDate, end: filterEndDate },
      kpi: {
        openJobs: kpi.open_jobs,
        totalApplications: kpi.total_applications,
        activeCandidates: kpi.active_candidates,
        totalCandidates: kpi.total_candidates
      }
    })

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
        ${recruiterFilterJ}
      ORDER BY a.applied_at DESC
      LIMIT 10
    `
    const recentCandidates = await DatabaseService.query(recentQuery, queryParams)
    console.log('Recent Candidates Data:', JSON.stringify(recentCandidates, null, 2))

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
        AND j.created_at >= $2::timestamp AND j.created_at <= $3::timestamp
        ${recruiterFilterJ}
      GROUP BY j.id, j.title, j.department, j.status, j.created_at
      ORDER BY j.created_at DESC
      LIMIT 10
    `
    const pipelineByJob = await DatabaseService.query(pipelineQuery, queryParams)

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
    // For recruiter role, filter by their specific jobs; for manager/director, show all company data
    const sourceQuery = userRole === 'recruiter' && userId ? `
      SELECT 
        CASE 
          WHEN c.source_type = 'Direct' THEN COALESCE(c.sub_source, 'Direct')
          WHEN c.source_type = 'Agency' THEN 'Agency'
          WHEN c.source_type = 'Employee Referral' THEN 'Referrals'
          ELSE 'Direct'
        END AS source,
        COUNT(DISTINCT c.id) AS total,
        COUNT(DISTINCT CASE WHEN a.current_stage IN ('offer', 'hired') OR a.offer_status = 'accepted' THEN c.id END) AS converted
      FROM candidates c
      LEFT JOIN applications a ON c.id = a.candidate_id
      LEFT JOIN job_postings jp ON a.job_id = jp.id
      WHERE c.company_id = $1::uuid 
        AND c.created_at >= $2::timestamp 
        AND c.created_at <= $3::timestamp
        AND (jp.created_by = $4::text OR a.id IS NULL)  -- Include candidates without applications for this recruiter
      GROUP BY 
        CASE 
          WHEN c.source_type = 'Direct' THEN COALESCE(c.sub_source, 'Direct')
          WHEN c.source_type = 'Agency' THEN 'Agency'
          WHEN c.source_type = 'Employee Referral' THEN 'Referrals'
          ELSE 'Direct'
        END
      ORDER BY total DESC
      LIMIT 8
    ` : `
      SELECT 
        CASE 
          WHEN c.source_type = 'Direct' THEN COALESCE(c.sub_source, 'Direct')
          WHEN c.source_type = 'Agency' THEN 'Agency'
          WHEN c.source_type = 'Employee Referral' THEN 'Referrals'
          ELSE 'Direct'
        END AS source,
        COUNT(DISTINCT c.id) AS total,
        COUNT(DISTINCT CASE WHEN a.current_stage IN ('offer', 'hired') OR a.offer_status = 'accepted' THEN c.id END) AS converted
      FROM candidates c
      LEFT JOIN applications a ON c.id = a.candidate_id
      WHERE c.company_id = $1::uuid 
        AND c.created_at >= $2::timestamp 
        AND c.created_at <= $3::timestamp
      GROUP BY 
        CASE 
          WHEN c.source_type = 'Direct' THEN COALESCE(c.sub_source, 'Direct')
          WHEN c.source_type = 'Agency' THEN 'Agency'
          WHEN c.source_type = 'Employee Referral' THEN 'Referrals'
          ELSE 'Direct'
        END
      ORDER BY total DESC
      LIMIT 8
    `
    
    const sourceQueryParams = userRole === 'recruiter' && userId 
      ? [companyId, filterStartDate, filterEndDate, userId]
      : [companyId, filterStartDate, filterEndDate]
    
    const sourceEffectiveness = await DatabaseService.query(sourceQuery, sourceQueryParams)

    // --- 6. Sourcing Activity ---
    // For recruiter role, filter by their specific jobs; for manager/director, show all company data
    const sourcingActivityQuery = userRole === 'recruiter' && userId ? `
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
        LEFT JOIN applications a ON c.id = a.candidate_id AND a.applied_at >= $2::timestamp AND a.applied_at <= $3::timestamp
        LEFT JOIN job_postings jp ON a.job_id = jp.id
        WHERE c.company_id = $1::uuid
          AND c.created_at >= $2::timestamp AND c.created_at <= $3::timestamp
          AND (jp.created_by = $4::text OR a.id IS NULL)  -- Include candidates without applications for this recruiter
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
    ` : `
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
        LEFT JOIN applications a ON c.id = a.candidate_id AND a.applied_at >= $2::timestamp AND a.applied_at <= $3::timestamp
        WHERE c.company_id = $1::uuid
          AND c.created_at >= $2::timestamp AND c.created_at <= $3::timestamp
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
    
    const sourcingActivityParams = userRole === 'recruiter' && userId 
      ? [companyId, filterStartDate, filterEndDate, userId]
      : [companyId, filterStartDate, filterEndDate]
    
    const sourcingActivity = await DatabaseService.query(sourcingActivityQuery, sourcingActivityParams)

    // --- 7. Recruiters list (team members) ---
    const recruitersQuery = `
      SELECT u.id, u.full_name AS name, u.email,
        (SELECT COUNT(*) FROM job_postings jp WHERE jp.created_by = u.id::text AND jp.status = 'open' AND jp.created_at >= $2::timestamp AND jp.created_at <= $3::timestamp) AS active_jobs,
        (SELECT COUNT(*) FROM applications a2 
         JOIN job_postings jp2 ON a2.job_id = jp2.id 
         WHERE jp2.created_by = u.id::text AND a2.current_stage NOT IN ('hired', 'rejected', 'withdrawn') AND a2.applied_at >= $2::timestamp AND a2.applied_at <= $3::timestamp) AS active_candidates
      FROM users u
      WHERE u.company_id = $1::uuid AND u.status = 'active'
      ORDER BY u.full_name
    `
    const recruiters = await DatabaseService.query(recruitersQuery, [companyId, filterStartDate, filterEndDate])

    // --- 8. Manager Team Pipeline Health Data ---
    // Get team metrics with bottlenecks and efficiency calculations
    const teamPipelineQuery = `
      SELECT 
        u.full_name AS recruiter,
        -- Total candidates managed by this recruiter
        (SELECT COUNT(*) FROM applications a 
         JOIN job_postings jp ON a.job_id = jp.id 
         WHERE jp.company_id = $1::uuid AND jp.created_by = u.id::text AND a.applied_at >= $2::timestamp AND a.applied_at <= $3::timestamp) AS total_candidates,
        -- Bottlenecks: candidates stuck in same stage for more than 2 days
        (SELECT COUNT(*) FROM applications a 
         JOIN job_postings jp ON a.job_id = jp.id 
         WHERE jp.company_id = $1::uuid AND jp.created_by = u.id::text 
         AND a.applied_at >= $2::timestamp AND a.applied_at <= $3::timestamp
         AND a.current_stage NOT IN ('hired', 'rejected', 'withdrawn')
         AND (CURRENT_DATE - a.updated_at::date) > 2) AS bottlenecks,
        -- Average time in current stage (in days)
        (SELECT COALESCE(AVG(CURRENT_DATE - a.updated_at::date), 0) FROM applications a 
         JOIN job_postings jp ON a.job_id = jp.id 
         WHERE jp.company_id = $1::uuid AND jp.created_by = u.id::text 
         AND a.applied_at >= $2::timestamp AND a.applied_at <= $3::timestamp
         AND a.current_stage NOT IN ('hired', 'rejected', 'withdrawn')) AS avg_time_in_stage
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      WHERE u.company_id = $1::uuid 
        AND u.status = 'active'
        AND ur.role IN ('recruiter', 'manager', 'hiring_manager')
      ORDER BY u.full_name
    `
    const teamPipelineData = await DatabaseService.query(teamPipelineQuery, [companyId, filterStartDate, filterEndDate])
    console.log('Team Pipeline Data:', JSON.stringify(teamPipelineData, null, 2))
    
    // Debug: Check job_postings created_by values
    const debugJobsQuery = `
      SELECT created_by, status, COUNT(*) as count 
      FROM job_postings 
      WHERE company_id = $1::uuid 
      GROUP BY created_by, status
    `
    const debugJobs = await DatabaseService.query(debugJobsQuery, [companyId])
    console.log('Job Postings by created_by:', JSON.stringify(debugJobs, null, 2))

    // --- 9. Manager Offer Acceptance Rate Data ---
    // Calculate real offer acceptance rate for all team members
    const offerAcceptanceQuery = `
      SELECT 
        u.id,
        u.full_name AS name,
        u.email,
        -- Offers Given = count where offer_status = 'sent' or 'under_review' or 'negotiating' or current_stage = 'offer'
        (SELECT COUNT(*) FROM applications a 
         JOIN job_postings jp ON a.job_id = jp.id 
         WHERE jp.company_id = $1::uuid AND jp.created_by = u.id::text AND (a.offer_status IN ('sent', 'under_review', 'negotiating') OR a.current_stage = 'offer') AND a.applied_at >= $2::timestamp AND a.applied_at <= $3::timestamp) AS offers_given,
        -- Offers Accepted = count where offer_status = 'accepted'
        (SELECT COUNT(*) FROM applications a 
         JOIN job_postings jp ON a.job_id = jp.id 
         WHERE jp.company_id = $1::uuid AND jp.created_by = u.id::text AND a.offer_status = 'accepted' AND a.applied_at >= $2::timestamp AND a.applied_at <= $3::timestamp) AS offers_accepted
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      WHERE u.company_id = $1::uuid 
        AND u.status = 'active'
        AND ur.role IN ('recruiter', 'manager', 'hiring_manager')
      ORDER BY u.full_name
    `
    const offerAcceptanceData = await DatabaseService.query(offerAcceptanceQuery, [companyId, filterStartDate, filterEndDate])
    console.log('Offer Acceptance Data:', JSON.stringify(offerAcceptanceData, null, 2))

    // --- 10. Manager Team Capacity Load Data ---
    // Calculate real capacity load for all team members
    const capacityLoadQuery = `
      SELECT 
        u.id,
        u.full_name AS name,
        u.email,
        -- Active Reqs = count of active job_posting where created_by = user id and status = 'open'
        (SELECT COUNT(*) FROM job_postings jp 
         WHERE jp.company_id = $1::uuid AND jp.created_by = u.id::text AND jp.status = 'open' AND jp.created_at >= $2::timestamp AND jp.created_at <= $3::timestamp) AS active_reqs
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      WHERE u.company_id = $1::uuid 
        AND u.status = 'active'
        AND ur.role IN ('recruiter', 'manager', 'hiring_manager')
      ORDER BY u.full_name
    `
    const capacityLoadData = await DatabaseService.query(capacityLoadQuery, [companyId, filterStartDate, filterEndDate])
    console.log('Capacity Load Data:', JSON.stringify(capacityLoadData, null, 2))

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
         WHERE a.hm_status = 'Approved' AND a.applied_at >= $2::timestamp AND a.applied_at <= $3::timestamp AND
         EXISTS (SELECT 1 FROM job_postings jp WHERE jp.id = a.job_id AND jp.company_id = $1::uuid)) AS approved,
        -- Pending = count applications where hm_status IN ('Waiting for HM feedback', 'Under Review', 'OnHold')
        (SELECT COUNT(*) FROM applications a 
         WHERE a.hm_status IN ('Waiting for HM feedback', 'Under Review', 'OnHold') AND a.applied_at >= $2::timestamp AND a.applied_at <= $3::timestamp AND
         EXISTS (SELECT 1 FROM job_postings jp WHERE jp.id = a.job_id AND jp.company_id = $1::uuid)) AS pending,
        -- Rejected = count applications where hm_status = 'Rejected'
        (SELECT COUNT(*) FROM applications a 
         WHERE a.hm_status = 'Rejected' AND a.applied_at >= $2::timestamp AND a.applied_at <= $3::timestamp AND
         EXISTS (SELECT 1 FROM job_postings jp WHERE jp.id = a.job_id AND jp.company_id = $1::uuid)) AS rejected,
        -- Average rating from hm_rating field
        (SELECT AVG(a.hm_rating) FROM applications a 
         WHERE a.hm_rating IS NOT NULL AND a.applied_at >= $2::timestamp AND a.applied_at <= $3::timestamp AND
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
    const hiringManagerData = await DatabaseService.query(hiringManagerQuery, [companyId, filterStartDate, filterEndDate])
    
    // Debug logging
    console.log('Hiring Manager Query Result:', hiringManagerData)

    // --- 12. Director Hiring Velocity Data ---
    // Calculate real hiring velocity for director dashboard
    const hiringVelocityQuery = `
      SELECT 
        -- Total applications count in date range
        (SELECT COUNT(*) FROM applications a 
         WHERE a.applied_at >= $2::timestamp AND a.applied_at <= $3::timestamp
         AND EXISTS (SELECT 1 FROM job_postings jp WHERE jp.id = a.job_id AND jp.company_id = $1::uuid)) AS total_applications,
        -- Hiring Velocity = hired candidates in date range
        (SELECT COUNT(*) FROM applications a 
         WHERE a.current_stage = 'hired' 
         AND a.applied_at >= $2::timestamp AND a.applied_at <= $3::timestamp
         AND EXISTS (SELECT 1 FROM job_postings jp WHERE jp.id = a.job_id AND jp.company_id = $1::uuid)) AS hiring_velocity
    `
    const hiringVelocityData = await DatabaseService.query(hiringVelocityQuery, [companyId, filterStartDate, filterEndDate])

    // --- 13. Director Hiring Velocity Monthly Data ---
    // Get monthly hiring plans and actual hires
    console.log('Fetching monthly hiring data for company:', companyId)
    
    // First check performance_settings data
    const performanceCheckQuery = `
      SELECT 
        hiring_per_month,
        created_at,
        updated_at
      FROM performance_settings 
      WHERE company_id = $1::uuid
    `
    const performanceCheck = await DatabaseService.query(performanceCheckQuery, [companyId])
    console.log('Performance Settings Data:', performanceCheck)
    
    const monthlyHiringQuery = `
      WITH monthly_plan AS (
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          hiring_per_month as plan_value
        FROM performance_settings 
        WHERE company_id = $1::uuid 
        AND hiring_per_month IS NOT NULL
        ORDER BY created_at ASC
      ),
      monthly_hires AS (
        SELECT 
          DATE_TRUNC('month', hire_date) as month,
          COUNT(*) as hires_count
        FROM applications a
        WHERE a.current_stage = 'hired' 
        AND a.hire_date IS NOT NULL
        AND a.applied_at >= $2::timestamp AND a.applied_at <= $3::timestamp
        AND EXISTS (SELECT 1 FROM job_postings jp WHERE jp.id = a.job_id AND jp.company_id = $1::uuid)
        GROUP BY DATE_TRUNC('month', hire_date)
        ORDER BY month ASC
      )
      SELECT 
        TO_CHAR(m.month, 'YYYY-MM') as month,
        TO_CHAR(m.month, 'Month') as month_name,
        COALESCE(mp.plan_value, 0) as plan,
        COALESCE(mh.hires_count, 0) as hires
      FROM (
        SELECT generate_series(
          DATE_TRUNC('month', $2::timestamp)::date,
          DATE_TRUNC('month', $3::timestamp)::date,
          '1 month'
        ) as month
      ) m
      LEFT JOIN LATERAL (
        SELECT plan_value 
        FROM monthly_plan mp2 
        WHERE mp2.month <= m.month 
        ORDER BY mp2.month DESC 
        LIMIT 1
      ) mp ON true
      LEFT JOIN monthly_hires mh ON mh.month = m.month
      ORDER BY m.month ASC
    `
    const monthlyHiringData = await DatabaseService.query(monthlyHiringQuery, [companyId, filterStartDate, filterEndDate])
    console.log('Monthly Hiring Data:', monthlyHiringData)

    // --- 14. Director Quality of Hire Data ---
    // Calculate real quality of hire metrics
    const qualityOfHireQuery = `
      SELECT 
        -- Average quality_of_hire_rating
        AVG((qoh.rating)::numeric) as avg_rating,
        -- Total hired candidates with quality rating
        COUNT(*) as total_count,
        -- Retention calculation: hired at least 3 months ago and still active
        (SELECT COUNT(*) 
         FROM applications a2
         WHERE a2.current_stage = 'hired' 
         AND a2.hire_date IS NOT NULL
         AND a2.hire_date <= NOW() - INTERVAL '3 months'
         AND EXISTS (SELECT 1 FROM job_postings jp WHERE jp.id = a2.job_id AND jp.company_id = $1::uuid)
         AND (a2.quality_of_hire_rating->>'employmentStatus' = 'Still with the Firm' 
              OR a2.quality_of_hire_rating->>'employmentStatus' IS NULL)) as retained_count,
        -- Total eligible for retention (hired at least 3 months ago)
        (SELECT COUNT(*) 
         FROM applications a3
         WHERE a3.current_stage = 'hired' 
         AND a3.hire_date IS NOT NULL
         AND a3.hire_date <= NOW() - INTERVAL '3 months'
         AND EXISTS (SELECT 1 FROM job_postings jp WHERE jp.id = a3.job_id AND jp.company_id = $1::uuid)) as retention_eligible
      FROM applications a
      JOIN job_postings jp ON a.job_id = jp.id
      CROSS JOIN LATERAL jsonb_to_record(a.quality_of_hire_rating) AS qoh(rating int, "employmentStatus" text)
      WHERE jp.company_id = $1::uuid
        AND a.current_stage = 'hired'
        AND a.quality_of_hire_rating IS NOT NULL
        AND a.quality_of_hire_rating->>'rating' IS NOT NULL
        AND a.applied_at >= $2::timestamp AND a.applied_at <= $3::timestamp
    `
    const qualityOfHireData = await DatabaseService.query(qualityOfHireQuery, [companyId, filterStartDate, filterEndDate])

    // --- 15. Director Quality of Hire Detailed Data ---
    // Get cohort analysis based on actual hire dates
    console.log('Fetching Quality of Hire detailed data for company:', companyId)
    
    // First check if there's any quality_of_hire_rating data
    const qualityCheckQuery = `
      SELECT COUNT(*) as count
      FROM applications a
      JOIN job_postings jp ON a.job_id = jp.id
      WHERE jp.company_id = $1::uuid
        AND a.current_stage = 'hired'
        AND a.quality_of_hire_rating IS NOT NULL
        AND a.quality_of_hire_rating->>'rating' IS NOT NULL
    `
    const qualityCheck = await DatabaseService.query(qualityCheckQuery, [companyId])
    console.log('Quality Rating Data Count:', qualityCheck)
    
    const qualityOfHireDetailedQuery = `
      WITH hired_cohorts AS (
        SELECT 
          TO_CHAR(DATE_TRUNC('quarter', hire_date), 'YYYY "Q"Q') as cohort,
          AVG((qoh.rating)::numeric) as avg_rating,
          COUNT(*) as count,
          -- Calculate retention for this cohort
          COUNT(CASE 
            WHEN a.hire_date <= NOW() - INTERVAL '3 months' 
            AND (a.quality_of_hire_rating->>'employmentStatus' = 'Still with the Firm' 
                 OR a.quality_of_hire_rating->>'employmentStatus' IS NULL)
            THEN 1 
          END) as retained_count,
          COUNT(CASE 
            WHEN a.hire_date <= NOW() - INTERVAL '3 months' 
            THEN 1 
          END) as retention_eligible
        FROM applications a
        JOIN job_postings jp ON a.job_id = jp.id
        CROSS JOIN LATERAL jsonb_to_record(a.quality_of_hire_rating) AS qoh(rating int, "employmentStatus" text)
        WHERE jp.company_id = $1::uuid
          AND a.current_stage = 'hired'
          AND a.quality_of_hire_rating IS NOT NULL
          AND a.quality_of_hire_rating->>'rating' IS NOT NULL
          AND a.hire_date IS NOT NULL
          AND a.applied_at >= $2::timestamp AND a.applied_at <= $3::timestamp
        GROUP BY DATE_TRUNC('quarter', hire_date)
        ORDER BY DATE_TRUNC('quarter', hire_date) DESC
        LIMIT 4
      )
      SELECT 
        cohort,
        ROUND(avg_rating, 1) as avg_rating,
        CASE 
          WHEN retention_eligible > 0 THEN ROUND((retained_count::numeric / retention_eligible) * 100)
          ELSE 0 
        END as retention_3mo,
        CASE 
          WHEN avg_rating >= 4.5 THEN 'High'
          WHEN avg_rating >= 4.0 THEN 'Medium-High'
          WHEN avg_rating >= 3.5 THEN 'Medium'
          ELSE 'Low'
        END as performance_index,
        count
      FROM hired_cohorts
      ORDER BY cohort DESC
    `
    const qualityOfHireDetailedData = await DatabaseService.query(qualityOfHireDetailedQuery, [companyId, filterStartDate, filterEndDate])
    console.log('Quality of Hire Detailed Data:', qualityOfHireDetailedData)

    // --- 16. Director Total Candidates Detailed Data ---
    // Get cohort analysis based on candidate created_at dates
    const totalCandidatesDetailedQuery = `
      WITH candidate_cohorts AS (
        SELECT 
          TO_CHAR(DATE_TRUNC('quarter', c.created_at), 'YYYY "Q"Q') as cohort,
          COUNT(*) as total_candidates,
          COUNT(CASE 
            WHEN NOT EXISTS (
              SELECT 1 FROM applications a 
              WHERE a.candidate_id = c.id 
              AND a.current_stage IN ('hired', 'rejected', 'withdrawn')
            )
            THEN 1 
          END) as active_candidates
        FROM candidates c
        WHERE c.company_id = $1::uuid
          AND c.created_at IS NOT NULL
          AND c.created_at >= $2::timestamptz
          AND c.created_at <= $3::timestamptz
        GROUP BY DATE_TRUNC('quarter', c.created_at)
        ORDER BY DATE_TRUNC('quarter', c.created_at) DESC
        LIMIT 6
      )
      SELECT 
        cohort,
        total_candidates,
        active_candidates,
        CASE 
          WHEN total_candidates > 0 THEN ROUND((active_candidates::numeric / total_candidates) * 100)
          ELSE 0 
        END as active_percentage
      FROM candidate_cohorts
      ORDER BY cohort DESC
    `
    const totalCandidatesDetailedData = await DatabaseService.query(totalCandidatesDetailedQuery, [companyId, filterStartDate, filterEndDate])
    console.log('Total Candidates Detailed Data:', totalCandidatesDetailedData)

    // --- Fetch Performance Settings for Cost Calculations ---
    const performanceSettingsQuery = `
      SELECT 
        cost_per_hire_budget,
        job_board_costs,
        cost_currency,
        hiring_per_month
      FROM performance_settings 
      WHERE company_id = $1::uuid
    `
    const costSettings = await DatabaseService.query(performanceSettingsQuery, [companyId])
    const settings = costSettings.length > 0 ? costSettings[0] : null

    // --- Fetch Agency and Client Rates ---
    const agencyClientQuery = `
      SELECT 
        connection_type,
        rate_type,
        rate
      FROM agency_client_connections 
      WHERE company_id = $1::uuid
    `
    const agencyClientData = await DatabaseService.query(agencyClientQuery, [companyId])
    
    
    // --- Fetch Quarterly Cost Breakdown (month-wise effective values) ---
    const quarterlyCostQuery = `
      WITH monthly_hires AS (
        -- Step 1: Count hired candidates grouped by month using hire_date
        SELECT 
          EXTRACT(YEAR  FROM a.hire_date)::int    AS hire_year,
          EXTRACT(MONTH FROM a.hire_date)::int    AS hire_month,
          EXTRACT(QUARTER FROM a.hire_date)::int  AS hire_quarter,
          DATE_TRUNC('month', a.hire_date)::date  AS hire_month_start,
          (DATE_TRUNC('month', a.hire_date) + INTERVAL '1 month - 1 day')::date AS hire_month_end,
          COUNT(a.id)                              AS hired_count,
          COALESCE(SUM(a.offer_amount), 0)         AS total_offer_amount
        FROM applications a
        JOIN job_postings jp ON a.job_id = jp.id
        WHERE jp.company_id = $1::uuid
          AND a.current_stage = 'hired'
          AND a.hire_date IS NOT NULL
          AND a.hire_date >= $2::timestamp
          AND a.hire_date <= $3::timestamp
        GROUP BY hire_year, hire_month, hire_quarter, hire_month_start, hire_month_end
      ),
      monthly_effective_settings AS (
        -- Step 2: Get effective performance settings for each month
        SELECT DISTINCT
          mh.hire_year,
          mh.hire_month,
          mh.hire_quarter,
          mh.hire_month_start,
          mh.hire_month_end,
          mh.hired_count,
          mh.total_offer_amount,
          COALESCE(
            (SELECT ps.cost_per_hire_budget 
             FROM performance_settings ps 
             WHERE ps.company_id = $1::uuid 
               AND ps.updated_at <= mh.hire_month_end
             ORDER BY ps.updated_at DESC 
             LIMIT 1), 
            0
          )::numeric AS effective_cost_per_hire,
          COALESCE(
            (SELECT ps.job_board_costs 
             FROM performance_settings ps 
             WHERE ps.company_id = $1::uuid 
               AND ps.updated_at <= mh.hire_month_end
             ORDER BY ps.updated_at DESC 
             LIMIT 1), 
            0
          )::numeric AS effective_job_board_cost
        FROM monthly_hires mh
      ),
      quarterly_aggregated AS (
        -- Step 3: Aggregate monthly data back to quarters for display
        SELECT 
          hire_year,
          hire_quarter,
          SUM(hired_count) AS hired_count,
          SUM(total_offer_amount) AS total_offer_amount,
          -- Sum monthly recruitment costs (month_cost * month_hires)
          SUM(hired_count * effective_cost_per_hire) AS total_recruitment_cost,
          -- Sum monthly job board costs (month_cost * month_hires)  
          SUM(hired_count * effective_job_board_cost) AS total_job_board_cost
        FROM monthly_effective_settings
        GROUP BY hire_year, hire_quarter
      ),
      agency_costs AS (
        -- Step 4: Sum agency rate × hired-count per agency, per quarter
        -- Link: candidates.source_type = 'Agency' AND candidates.agency_name = agency_client_connections.name
        SELECT
          EXTRACT(YEAR  FROM a.hire_date)::int   AS hire_year,
          EXTRACT(QUARTER FROM a.hire_date)::int AS hire_quarter,
          SUM(
            COALESCE(NULLIF(acc.rate, '')::numeric, 0)
          ) AS total_agency_cost
        FROM applications a
        JOIN job_postings jp   ON a.job_id       = jp.id
        JOIN candidates    c   ON a.candidate_id = c.id
        JOIN agency_client_connections acc
          ON  LOWER(acc.name)       = LOWER(c.agency_name)
          AND acc.company_id        = $1::uuid
          AND acc.connection_type   = 'Agency'
          AND acc.status            = 'active'
        WHERE jp.company_id     = $1::uuid
          AND a.current_stage   = 'hired'
          AND a.hire_date       IS NOT NULL
          AND a.hire_date       >= $2::timestamp
          AND a.hire_date       <= $3::timestamp
          AND c.source_type     = 'Agency'
        GROUP BY hire_year, hire_quarter
      ),
      client_revenue AS (
        -- Step 6: Sum client revenue per quarter across all active clients
        -- Fixed: rate * hired_count | %: (rate/100) * total_offer_amount
        SELECT
          qa.hire_year,
          qa.hire_quarter,
          COALESCE(SUM(
            CASE
              WHEN acc.rate_type = 'Fixed'
                THEN qa.hired_count * COALESCE(NULLIF(acc.rate, '')::numeric, 0)
              WHEN acc.rate_type = '%'
                THEN (COALESCE(NULLIF(acc.rate, '')::numeric, 0) / 100.0) * qa.total_offer_amount
              ELSE 0
            END
          ), 0) AS total_client_revenue
        FROM quarterly_aggregated qa
        LEFT JOIN agency_client_connections acc
          ON  acc.company_id      = $1::uuid
          AND acc.connection_type = 'Client'
          AND acc.status          = 'active'
        GROUP BY qa.hire_year, qa.hire_quarter, qa.hired_count, qa.total_offer_amount
      )
      SELECT
        CONCAT('Q', qa.hire_quarter, ' ', qa.hire_year)      AS quarter,
        qa.hired_count,
        -- Step 2: Recruitment Cost = sum of monthly effective costs
        ROUND(qa.total_recruitment_cost)::int                AS recruitment_cost,
        -- Step 3: Job Board Cost = sum of monthly effective costs
        ROUND(qa.total_job_board_cost)::int                  AS job_board_cost,
        -- Step 4: Agency Cost
        ROUND(COALESCE(ac.total_agency_cost, 0))::int        AS agency_cost,
        -- Step 5: Cost To Company = recruitment + job_board + agency
        ROUND(
          qa.total_recruitment_cost
          + qa.total_job_board_cost
          + COALESCE(ac.total_agency_cost, 0)
        )::int                                               AS cost_to_company,
        -- Step 6: Client Revenue
        ROUND(COALESCE(cr.total_client_revenue, 0))::int     AS client_revenue,
        -- Step 7: Total Spend = Cost To Company - Client Revenue
        ROUND(
          qa.total_recruitment_cost
          + qa.total_job_board_cost
          + COALESCE(ac.total_agency_cost, 0)
          - COALESCE(cr.total_client_revenue, 0)
        )::int                                               AS total_spend
      FROM quarterly_aggregated qa
      LEFT JOIN agency_costs  ac ON ac.hire_year  = qa.hire_year  AND ac.hire_quarter  = qa.hire_quarter
      LEFT JOIN client_revenue cr ON cr.hire_year = qa.hire_year  AND cr.hire_quarter = qa.hire_quarter
      ORDER BY qa.hire_year DESC, qa.hire_quarter DESC
      LIMIT 4
    `

    // Debug: Check actual performance settings values
    const debugSettingsQuery = `
      SELECT 
        cost_per_hire_budget,
        job_board_costs,
        cost_currency
      FROM performance_settings 
      WHERE company_id = $1::uuid
    `
    const debugSettings = await DatabaseService.query(debugSettingsQuery, [companyId])
    console.log('DEBUG - Performance Settings from DB:', debugSettings)

    const quarterlyCostData = await DatabaseService.query(quarterlyCostQuery, [
      companyId,
      filterStartDate,
      filterEndDate,
    ])
    console.log('Quarterly Cost Data:', quarterlyCostData)

    // --- Calculate overall Cost Per Hire from quarterly totals ---
    let hiredCount = parseInt(kpi.hired_count) || 0
    let recruitmentCost = hiredCount * (parseFloat(settings?.cost_per_hire_budget) || 0)
    let jobBoardCost    = hiredCount * (parseFloat(settings?.job_board_costs)       || 0)
    let agencyCost      = 0
    let totalCostToCompany = recruitmentCost + jobBoardCost
    let clientRevenue   = 0
    let totalSpend      = totalCostToCompany
    let costPerHire     = hiredCount > 0 ? Math.round(totalSpend / hiredCount) : 0

    // Update Cost Per Hire calculation using quarterly totals for consistency
    if (quarterlyCostData && quarterlyCostData.length > 0) {
      const quarterlyTotals = quarterlyCostData.reduce((acc: any, q: any) => ({
        hired: acc.hired + (parseInt(q.hired_count) || 0),
        recruitmentCost: acc.recruitmentCost + (parseInt(q.recruitment_cost) || 0),
        jobBoardCost: acc.jobBoardCost + (parseInt(q.job_board_cost) || 0),
        agencyCost: acc.agencyCost + (parseInt(q.agency_cost) || 0),
        clientRevenue: acc.clientRevenue + (parseInt(q.client_revenue) || 0),
        totalSpend: acc.totalSpend + (parseInt(q.total_spend) || 0)
      }), { hired: 0, recruitmentCost: 0, jobBoardCost: 0, agencyCost: 0, clientRevenue: 0, totalSpend: 0 })

      // Use quarterly totals for consistent calculations
      hiredCount = quarterlyTotals.hired
      recruitmentCost = quarterlyTotals.recruitmentCost
      jobBoardCost = quarterlyTotals.jobBoardCost
      agencyCost = quarterlyTotals.agencyCost
      clientRevenue = quarterlyTotals.clientRevenue
      totalSpend = quarterlyTotals.totalSpend
      totalCostToCompany = recruitmentCost + jobBoardCost + agencyCost
      costPerHire = hiredCount > 0 ? Math.round(totalSpend / hiredCount) : 0

      console.log('Updated Cost Analysis:', {
        hiredCount,
        recruitmentCost,
        jobBoardCost,
        agencyCost,
        totalCostToCompany,
        clientRevenue,
        totalSpend,
        costPerHire
      })
    }

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
          advanced: parseInt(se.converted) || 0,
          hired: parseInt(se.converted) || 0,
          conversionRate: parseInt(se.total) > 0
            ? Math.round((parseInt(se.converted) / parseInt(se.total)) * 100)
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
        teamPipelineHealth: (teamPipelineData || []).map((t: any) => {
          const totalCandidates = parseInt(t.total_candidates) || 0
          const bottlenecks = parseInt(t.bottlenecks) || 0
          const efficiency = totalCandidates > 0 ? Math.round(((totalCandidates - bottlenecks) * 100.0) / totalCandidates) : 0
          return {
            recruiter: t.recruiter,
            total_candidates: totalCandidates,
            bottlenecks: bottlenecks,
            avg_time_in_stage: `${Math.round(parseFloat(t.avg_time_in_stage) || 0)}d`,
            efficiency: `${efficiency}%`
          }
        }),
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
        costAnalysis: {
          costPerHire: costPerHire,
          currency: settings?.cost_currency || 'USD',
          totalSpend: totalSpend,
          recruitmentCost: recruitmentCost,
          jobBoardCost: jobBoardCost,
          agencyCost: agencyCost,
          clientRevenue: clientRevenue,
          hiredCount: hiredCount
        },
        quarterlyCostBreakdown: (quarterlyCostData || []).map((q: any) => ({
          quarter: q.quarter,
          hired: parseInt(q.hired_count) || 0,
          recruitmentCost: parseInt(q.recruitment_cost) || 0,
          jobBoardCost: parseInt(q.job_board_cost) || 0,
          agencyCost: parseInt(q.agency_cost) || 0,
          costToCompany: parseInt(q.cost_to_company) || 0,
          clientRevenue: parseInt(q.client_revenue) || 0,
          totalSpend: parseInt(q.total_spend) || 0
        })),
        hiringVelocity: {
          totalHires: parseInt(hiringVelocityData?.[0]?.hiring_velocity) || 0,
          totalApplications: parseInt(hiringVelocityData?.[0]?.total_applications) || 0
        },
        hiringVelocityMonthly: (monthlyHiringData || []).map((m: any) => {
          const plan = parseInt(m.plan) || 0
          const hires = parseInt(m.hires) || 0
          const variance = hires - plan
          const fillRate = plan > 0 ? Math.round((hires / plan) * 100) : 0
          
          return {
            month: m.month_name.trim(),
            plan: plan,
            hires: hires,
            variance: variance,
            trend: variance > 0 ? 'up' : variance < 0 ? 'down' : 'neutral',
            fillRate: `${fillRate}%`
          }
        }),
        qualityOfHire: {
          avgRating: qualityOfHireData?.[0]?.avg_rating ? parseFloat(qualityOfHireData[0].avg_rating).toFixed(1) : '0.0',
          retentionRate: qualityOfHireData?.[0]?.retention_eligible > 0 
            ? Math.round((parseInt(qualityOfHireData[0].retained_count) / parseInt(qualityOfHireData[0].retention_eligible)) * 100)
            : 0,
          totalCount: parseInt(qualityOfHireData?.[0]?.total_count) || 0
        },
        qualityOfHireDetailed: (qualityOfHireDetailedData || []).map((q: any) => ({
          cohort: q.cohort,
          avgRating: q.avg_rating,
          retention3mo: q.retention_3mo,
          performanceIndex: q.performance_index,
          count: q.count
        })),
        totalCandidatesDetailed: (totalCandidatesDetailedData || []).map((t: any) => ({
          cohort: t.cohort,
          totalCandidates: t.total_candidates,
          activeCandidates: t.active_candidates,
          activePercentage: t.active_percentage
        })),
        
        // --- Recruitment ROI Metrics ---
        recruitmentROI: await (async () => {
          console.log('DEBUG - quarterlyCostData:', quarterlyCostData)
          
          // Get currency from performance_settings
          const currencyQuery = `SELECT cost_currency FROM performance_settings WHERE company_id = $1::uuid LIMIT 1`
          const currencyResult = await DatabaseService.query(currencyQuery, [companyId])
          const currency = currencyResult?.[0]?.cost_currency || 'USD'
          
          // METRIC 1 & 2: Use existing quarterlyCostBreakdown data
          // Investment = SUM of all costToCompany from quarterly data
          // Value Created = SUM of all totalSpend from quarterly data
          const totalInvestment = quarterlyCostData.reduce((sum: number, q: any) => sum + (parseInt(q.cost_to_company) || 0), 0)
          const totalValueCreated = quarterlyCostData.reduce((sum: number, q: any) => sum + (parseInt(q.total_spend) || 0), 0)
          const calculatedRoi = totalInvestment > 0 ? Math.abs(totalValueCreated / totalInvestment).toFixed(1) : '0.0'
          
          console.log('DEBUG - ROI Calculations:', {
            totalInvestment,
            totalValueCreated,
            calculatedRoi,
            currency
          })
          
          // METRIC 3: Quality Score - Average quality_of_hire_rating for hired candidates
          const qualityScoreQuery = `
            SELECT 
              AVG((quality_of_hire_rating->>'rating')::numeric) AS avg_quality_rating,
              COUNT(*) AS total_rated
            FROM applications a
            JOIN job_postings jp ON a.job_id = jp.id
            WHERE jp.company_id = $1::uuid
              AND a.current_stage = 'hired'
              AND a.quality_of_hire_rating IS NOT NULL
              AND (quality_of_hire_rating->>'rating') IS NOT NULL
              AND a.hire_date >= DATE_TRUNC('year', CURRENT_DATE)
          `
          
          // METRIC 4: Retention Impact - 3-month retention rate
          const retentionQuery = `
            SELECT 
              COUNT(*) AS eligible_count,
              COUNT(CASE WHEN a.current_stage = 'hired' THEN 1 END) AS retained_count
            FROM applications a
            JOIN job_postings jp ON a.job_id = jp.id
            WHERE jp.company_id = $1::uuid
              AND a.current_stage = 'hired'
              AND a.hire_date IS NOT NULL
              AND a.hire_date <= CURRENT_DATE - INTERVAL '3 months'
          `
          
          const [qualityResult, retentionResult] = await Promise.all([
            DatabaseService.query(qualityScoreQuery, [companyId]),
            DatabaseService.query(retentionQuery, [companyId])
          ])
          
          // Always ensure we have values, even if 0
          const investment = Math.abs(totalInvestment)
          const valueCreated = Math.abs(totalValueCreated)
          const roi = calculatedRoi
          
          const avgQuality = qualityResult?.[0]?.avg_quality_rating ? parseFloat(qualityResult[0].avg_quality_rating) : 0
          const qualityBenchmark = avgQuality >= 4 ? 'Top Quartile' : avgQuality >= 3 ? 'Above Average' : avgQuality > 0 ? 'Needs Improvement' : 'No Data'
          
          const eligibleCount = parseInt(retentionResult?.[0]?.eligible_count) || 0
          const retainedCount = parseInt(retentionResult?.[0]?.retained_count) || 0
          const retentionRate = eligibleCount > 0 ? Math.round((retainedCount / eligibleCount) * 100) : 0
          const retentionBenchmark = eligibleCount > 0 ? (retentionRate >= 85 ? 'Above Target' : 'Below Target') : 'No Data'
          
          // Currency symbol function
          const getCurrencySymbol = (curr: string) => {
            const symbols: Record<string, string> = {
              'USD': '$',
              'INR': '₹',
              'EUR': '€',
              'GBP': '£',
              'JPY': '¥',
              'CAD': 'C$',
              'AUD': 'A$'
            }
            return symbols[curr] || '$'
          }
          
          const currencySymbol = getCurrencySymbol(currency)
          
          // Create detailed calculation breakdown
          const quarterBreakdown = quarterlyCostData.map(q => `${q.quarter}: ${currencySymbol}${q.costToCompany}`).join(' + ')
          const spendBreakdown = quarterlyCostData.map(q => `${q.quarter}: ${currencySymbol}${q.totalSpend}`).join(' + ')
          
          return [
            {
              metric: 'Investment',
              value: investment > 0 ? `${currencySymbol}${investment.toLocaleString()}` : `${currencySymbol}0`,
              period: 'Annual',
              benchmark: 'Industry Avg'
            },
            {
              metric: 'Value Created',
              value: valueCreated > 0 ? `${currencySymbol}${Math.abs(valueCreated).toLocaleString()}` : `${currencySymbol}0`,
              period: 'Annual',
              benchmark: `${roi}x ROI`
            },
            {
              metric: 'Quality Score',
              value: avgQuality > 0 ? `${avgQuality.toFixed(1)}/5` : '0.0/5',
              period: 'YTD',
              benchmark: qualityBenchmark
            },
            {
              metric: 'Retention Impact',
              value: `${retentionRate}%`,
              period: '3 months',
              benchmark: retentionBenchmark
            }
          ]
        })()
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
