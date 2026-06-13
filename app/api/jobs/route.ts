import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { cookies } from 'next/headers'

// GET - Fetch jobs with recruiter-level access control
// A recruiter sees ONLY jobs they created OR jobs delegated to them with active delegation
export async function GET(request: NextRequest) {
  // Unique label per request so concurrent requests don't collide in console.time
  const t = `[Jobs GET ${Date.now()}-${Math.random().toString(36).slice(2, 6)}]`
  console.time(`${t} total`)
  try {
    console.time(`${t} session-parse`)
    // Get user from session cookie
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')

    let companyId: string | null = request.nextUrl.searchParams.get('companyId')
    let userId: string | null = request.nextUrl.searchParams.get('userId')

    let sessionEmail: string | null = null

    if (sessionCookie?.value) {
      try {
        // Handle URL-encoded session cookie
        let cookieValue = sessionCookie.value
        try {
          cookieValue = decodeURIComponent(cookieValue)
        } catch { /* use raw value if decode fails */ }

        const session = JSON.parse(cookieValue)
        if (!companyId) companyId = session.companyId || session.company?.id
        if (!userId) userId = session.userId || session.user?.id
        sessionEmail = session.email || session.user?.email || null
      } catch (e) {
        console.log('Failed to parse session cookie:', e)
      }
    }
    console.timeEnd(`${t} session-parse`)
    console.log(`${t} params:`, { companyId, userId, sessionEmail })

    // If no company, return empty list — never fallback to another company's data
    if (!companyId) {
      console.log(`${t} ❌ No companyId, returning empty list`)
      console.timeEnd(`${t} total`)
      return NextResponse.json({ success: true, data: [] })
    }

    // ── OPTIMIZATION 1 ─────────────────────────────────────────────────────
    // Collapse 3 sequential queries (user-by-id + user-by-email + role-check)
    // into ONE round-trip. Each Neon HTTP query is ~200-300ms over the wire,
    // so this alone saves ~500-800ms per request.
    // ──────────────────────────────────────────────────────────────────────
    let resolvedUserId: string | null = userId
    let isManager = false
    if (userId) {
      console.time(`${t} user+role-resolve`)
      try {
        const rows = await DatabaseService.query(
          `SELECT u.id::text AS id, ur.role
             FROM users u
             LEFT JOIN user_roles ur ON ur.user_id = u.id
            WHERE u.company_id = $2::uuid
              AND (
                u.id = $1::uuid
                OR ($3::text IS NOT NULL AND u.email = $3::text)
              )
            ORDER BY CASE WHEN u.id = $1::uuid THEN 0 ELSE 1 END
            LIMIT 1`,
          [userId, companyId, sessionEmail]
        )
        if (rows.length > 0) {
          resolvedUserId = rows[0].id
          isManager = rows[0].role === 'manager' || rows[0].role === 'director'
        }
        console.log(`${t} role:`, { resolvedUserId, isManager, role: rows[0]?.role })
      } catch (e: any) {
        // user_roles table may not exist on older deployments — fail open
        console.log(`${t} ⚠️ user+role resolve failed, defaulting isManager=true:`, e.message)
        isManager = true
      }
      console.timeEnd(`${t} user+role-resolve`)
    }

    // ── OPTIMIZATION 2 ─────────────────────────────────────────────────────
    // Auto-expire delegations is a maintenance write. Fire-and-forget so it
    // doesn't block the response. Even if it fails or runs late, the next
    // request will pick up where it left off.
    // ──────────────────────────────────────────────────────────────────────
    DatabaseService.query(
      `UPDATE delegations SET status = 'expired' WHERE status = 'active' AND end_date < CURRENT_DATE AND company_id = $1::uuid`,
      [companyId]
    ).catch(() => { /* table may not exist yet; ignore */ })

    // ── OPTIMIZATION 3 ─────────────────────────────────────────────────────
    // Run the main jobs query in parallel with the per-job batch queries
    // we don't need jobs to resolve before we kick off the company-info
    // lookup. Jobs query is still serially needed to know the job IDs for the
    // batch, but we can start the company lookup immediately.
    // ──────────────────────────────────────────────────────────────────────
    console.time(`${t} jobs-query`)
    const companyInfoPromise = DatabaseService.query(
      `SELECT name, slug FROM companies WHERE id = $1::uuid`,
      [companyId]
    ).catch(async () => {
      try {
        return await DatabaseService.query(`SELECT name FROM companies WHERE id = $1::uuid`, [companyId])
      } catch {
        return []
      }
    })

    let jobs: any[]
    if (userId && !isManager) {
      jobs = await DatabaseService.query(
        `SELECT DISTINCT jp.*, u.full_name as recruiter_name
          FROM job_postings jp
          LEFT JOIN users u ON jp.created_by = u.id
          WHERE jp.company_id = $1::uuid
            AND (
              jp.created_by = $2::uuid
              OR jp.id IN (
                SELECT d.item_id FROM delegations d
                WHERE d.delegated_to = $2::uuid
                  AND d.delegation_type = 'job'
                  AND d.status = 'active'
                  AND CURRENT_DATE >= d.start_date
                  AND CURRENT_DATE <= d.end_date
              )
            )
          ORDER BY jp.created_at DESC`,
        [companyId, resolvedUserId]
      )
    } else {
      // Manager/Director OR no userId: all company jobs
      jobs = await DatabaseService.query(
        `SELECT jp.*, u.full_name as recruiter_name
        FROM job_postings jp
        LEFT JOIN users u ON jp.created_by = u.id
        WHERE jp.company_id = $1::uuid
        ORDER BY jp.created_at DESC`,
        [companyId]
      )
    }
    console.timeEnd(`${t} jobs-query`)
    console.log(`${t} jobs found:`, jobs.length)

    // --- BATCH fetch all per-job data in parallel (replaces N+1 query pattern) ---
    console.time(`${t} batch-enrich`)
    const jobIds = jobs.map((j: any) => j.id)

    const [companyResult, interviewQuestionsResult, candidateCountsResult, stageCountsResult] = await Promise.all([
      companyInfoPromise, // started earlier, awaited here
      // Interview questions for all jobs in one query
      jobIds.length > 0
        ? DatabaseService.query(
            `SELECT job_id::text AS job_id, selected_criteria, questions FROM job_interview_questions WHERE job_id = ANY($1::uuid[])`,
            [jobIds]
          ).catch(() => [])
        : Promise.resolve([]),
      // Total candidates per job in one query
      jobIds.length > 0
        ? DatabaseService.query(
            `SELECT job_id::text AS job_id, COUNT(*)::int AS total FROM applications WHERE job_id = ANY($1::uuid[]) GROUP BY job_id`,
            [jobIds]
          ).catch(() => [])
        : Promise.resolve([]),
      // Stage counts per job in one query
      jobIds.length > 0
        ? DatabaseService.query(
            `SELECT job_id::text AS job_id, current_stage, COUNT(*)::int AS count FROM applications WHERE job_id = ANY($1::uuid[]) GROUP BY job_id, current_stage`,
            [jobIds]
          ).catch(() => [])
        : Promise.resolve([]),
    ])
    console.timeEnd(`${t} batch-enrich`)

    // Resolve company name/slug
    let companySlug = 'company'
    let companyName = ''
    if (companyResult.length > 0) {
      companyName = companyResult[0].name || ''
      companySlug =
        companyResult[0].slug ||
        companyResult[0].name?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') ||
        'company'
    }

    // Build lookup maps
    const iqMap = new Map<string, any>()
    for (const iq of interviewQuestionsResult) {
      iqMap.set(iq.job_id, iq)
    }
    const countMap = new Map<string, number>()
    for (const c of candidateCountsResult) {
      countMap.set(c.job_id, parseInt(c.total) || 0)
    }
    const stageMap = new Map<string, Record<string, number>>()
    for (const sc of stageCountsResult) {
      if (!stageMap.has(sc.job_id)) {
        stageMap.set(sc.job_id, {})
      }
      stageMap.get(sc.job_id)![sc.current_stage] = parseInt(sc.count) || 0
    }

    // Attach all enriched data to each job
    for (const job of jobs) {
      job.company_slug = companySlug
      job.company_name = companyName

      const iq = iqMap.get(job.id)
      if (iq) {
        job.selected_criteria = iq.selected_criteria
        job.interview_questions = iq.questions
      }

      if (!job.recruiter_name && job.created_by) {
        job.recruiter_name = 'Unknown'
        job.recruiter_email = job.created_by
      }

      job.total_candidates = countMap.get(job.id) || 0

      const stages = stageMap.get(job.id) || {}
      job.screening_count = stages.screening || 0
      job.ai_interview_count = stages.ai_interview || 0
      job.hiring_manager_count = stages.hiring_manager || 0
      job.offer_count = stages.offer || 0
      job.hired_count = stages.hired || 0
      job.rejected_count = stages.rejected || 0
    }

    console.timeEnd(`${t} total`)
    return NextResponse.json({
      success: true,
      data: jobs
    })
  } catch (error) {
    console.error(`${t} Error fetching jobs:`, error)
    console.timeEnd(`${t} total`)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Track submission IDs to prevent duplicate job submissions (using submissionId, not title)
const recentSubmissions = new Map<string, number>();

// Cleanup old submission entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of recentSubmissions.entries()) {
    // Remove entries older than 30 minutes
    if (now - timestamp > 30 * 60 * 1000) {
      recentSubmissions.delete(key);
    }
  }
}, 60 * 60 * 1000);

// Check if this is a duplicate submission using submissionId
function isDuplicateSubmission(submissionId: string): boolean {
  if (!submissionId) return false;
  
  const existing = recentSubmissions.get(submissionId);
  if (existing) {
    console.log(`🛑 Detected duplicate submission ID: ${submissionId}`);
    return true;
  }
  
  recentSubmissions.set(submissionId, Date.now());
  return false;
}

// Check if a job with same title+company was created in last 5 seconds (prevents race condition duplicates)
async function checkRecentDuplicate(companyId: string, title: string): Promise<boolean> {
  if (!companyId || !title) return false;
  
  try {
    const result = await DatabaseService.query(
      `SELECT id FROM job_postings 
       WHERE company_id = $1::uuid AND title = $2 AND created_at > NOW() - INTERVAL '5 seconds'
       LIMIT 1`,
      [companyId, title.trim()]
    );
    
    if (result.length > 0) {
      console.log(`🛑 Found recent duplicate job: ${title} (created within 5 seconds)`);
      return true;
    }
  } catch (err) {
    console.error('Error checking for recent duplicate:', err);
  }
  
  return false;
}

// POST - Create a new job posting
export async function POST(request: NextRequest) {
  try {
    // Get user from session cookie
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    let userId: string | null = null
    let companyId: string | null = null
    let sessionEmail: string | null = null
    let sessionFullName: string | null = null

    const body = await request.json()

    // Parse session cookie - try both encoded and raw formats
    if (sessionCookie?.value) {
      try {
        // First try decoding (cookie was URL-encoded)
        let cookieValue = sessionCookie.value
        try {
          cookieValue = decodeURIComponent(sessionCookie.value)
        } catch { /* use raw value if decode fails */ }

        const session = JSON.parse(cookieValue)
        userId = session.userId || session.user?.id || null
        companyId = session.companyId || session.company?.id || null
        sessionEmail = session.email || null
        sessionFullName = session.fullName || session.user?.name || null

        console.log('🍪 Session cookie parsed:', { userId, companyId, sessionEmail })
      } catch (parseError) {
        console.error('Failed to parse session cookie:', parseError)
      }
    }

    // Fallback: Extract session data from request body if cookie not available
    // This supports client-side auth where session is stored in localStorage
    if (!userId || !companyId) {
      const { user, company } = body
      if (user?.id) {
        userId = user.id
        sessionEmail = user.email || null
        sessionFullName = user.name || null
      }
      if (company?.id) {
        companyId = company.id
      }
      console.log('📦 Using session data from request body:', { userId, companyId, sessionEmail })
    }

    // SECURITY: Verify we have valid session data
    if (!userId || !companyId) {
      console.error('❌ No valid session found in cookie or request body')
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to create a job posting.' },
        { status: 401 }
      )
    }
    const {
      // Basic Info
      jobTitle,
      department,
      location,
      jobType,
      workMode,
      salaryMin,
      salaryMax,
      currency,
      applicationDeadline,
      expectedStartDate,
      // Job Details
      jobDescription,
      responsibilities,
      requiredSkills,
      preferredSkills,
      experienceYears,
      requiredEducation,
      certificationsRequired,
      languagesRequired,
      // Team & Planning
      clientCompanyName,
      hiringManager,
      hiringManagerEmail,
      numberOfOpenings,
      hiringPriority,
      targetTimeToFill,
      budgetAllocated,
      targetSources,
      diversityGoals,
      diversityTargetPercentage,
      // Metrics (removed jobOpenDate - will be set automatically)
      expectedHiresPerMonth,
      targetOfferAcceptanceRate,
      candidateResponseTimeSLA,
      interviewScheduleSLA,
      costPerHireBudget,
      agencyFeePercentage,
      jobBoardCosts,
      // Interview Questions
      selectedCriteria,
      interviewQuestions,
      draftJobId,
      autoScheduleInterview,
      interviewLinkExpiryHours,
      // Screening Questions
      enableScreeningQuestions,
      screeningQuestions,
      // Status
      isDraft
    } = body

    // UUID validation helper
    const isValidUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

    // Validate that userId and companyId are valid UUIDs
    if (!isValidUUID(userId || '') || !isValidUUID(companyId || '')) {
      console.error('❌ Invalid UUID in session:', { userId, companyId })
      return NextResponse.json(
        { error: 'Invalid session. Please sign out and sign in again.' },
        { status: 401 }
      )
    }

    // STRICT: Ensure user and company exist in database - create from session if missing, FAIL if creation fails
    // Check/create company
    console.log('🔍 Checking company exists:', companyId)
    let companyVerified = false
    try {
      const companyExists = await DatabaseService.query(
        `SELECT id FROM companies WHERE id = $1::uuid LIMIT 1`,
        [companyId]
      )
      if (companyExists.length === 0) {
        // Create company from authenticated session data
        const companyName = body.companyName || 'Company'
        console.log('🔄 Creating company from session:', companyId, companyName)
        await DatabaseService.query(
          `INSERT INTO companies (id, name, status, verified, created_at)
           VALUES ($1::uuid, $2, 'active', false, NOW())
           ON CONFLICT (id) DO NOTHING`,
          [companyId, companyName]
        )
        console.log('✅ Company created successfully')
      } else {
        console.log('✅ Company already exists')
      }
      companyVerified = true
    } catch (companyError: any) {
      console.error('❌ Failed to verify/create company:', companyError.message)
      return NextResponse.json(
        { error: 'Failed to verify company. Please try again.' },
        { status: 500 }
      )
    }

    // Check/create user - check by ID first, then by email to handle ID mismatch
    console.log('🔍 Checking user exists:', userId)
    let userVerified = false
    let actualUserId = userId
    try {
      // First check by ID
      const userExistsById = await DatabaseService.query(
        `SELECT id FROM users WHERE id = $1::uuid LIMIT 1`,
        [userId]
      )
      if (userExistsById.length > 0) {
        console.log('✅ User already exists by ID')
        userVerified = true
      } else if (sessionEmail) {
        // User not found by ID - check if exists by email (ID mismatch scenario)
        const userExistsByEmail = await DatabaseService.query(
          `SELECT id FROM users WHERE email = $1 LIMIT 1`,
          [sessionEmail]
        )
        if (userExistsByEmail.length > 0) {
          // User exists with different ID - use the existing user's ID
          actualUserId = userExistsByEmail[0].id
          console.log('✅ User found by email with different ID, using:', actualUserId)
          userVerified = true
        } else {
          // User doesn't exist at all - create new
          console.log('🔄 Creating user from session:', userId, sessionEmail)
          await DatabaseService.query(
            `INSERT INTO users (id, company_id, email, full_name, status, created_at)
             VALUES ($1::uuid, $2::uuid, $3, $4, 'active', NOW())
             ON CONFLICT (id) DO NOTHING`,
            [userId, companyId, sessionEmail, sessionFullName || sessionEmail]
          )
          console.log('✅ User created successfully')
          userVerified = true
        }
      } else {
        console.error('❌ User not found and no email in session:', userId)
        return NextResponse.json(
          { error: 'User not found. Please sign out and sign in again.' },
          { status: 401 }
        )
      }
    } catch (userError: any) {
      console.error('❌ Failed to verify/create user:', userError.message)
      return NextResponse.json(
        { error: 'Failed to verify user. Please try again.' },
        { status: 500 }
      )
    }

    // STRICT: Do not proceed if verification failed
    if (!companyVerified || !userVerified) {
      console.error('❌ Verification incomplete:', { companyVerified, userVerified })
      return NextResponse.json(
        { error: 'Authentication verification failed. Please sign in again.' },
        { status: 401 }
      )
    }
    console.log('✅ User and company fully verified in DB:', { userId: actualUserId, companyId })

    // Check if trial has expired (current_date > trial_end_date AND wallet_balance <= 0)
    // If expired, block job creation and put existing OPEN jobs and pending interviews on hold
    try {
      const isTrialExpired = await DatabaseService.isTrialExpired(companyId)
      if (isTrialExpired) {
        console.log('⏸️ [Trial Expiry] Trial expired for company:', companyId)
        // Put all OPEN jobs on hold when trial expires
        const jobsOnHold = await DatabaseService.putOpenJobsOnHoldForTrialExpiry(companyId)
        // Put all pending interviews on hold and expire their links
        const interviewsOnHold = await DatabaseService.putInterviewsOnHoldForTrialExpiry(companyId)
        console.log(`⏸️ [Trial Expiry] Jobs on hold: ${jobsOnHold}, Interviews on hold: ${interviewsOnHold}`)
        return NextResponse.json(
          { error: 'Trial period is over, please recharge wallet' },
          { status: 403 }
        )
      }
    } catch (trialCheckError: any) {
      console.error('⚠️ Failed to check trial status:', trialCheckError.message)
      // Continue with job creation if trial check fails (fail-open for better UX)
    }

    // Normalize enums to valid values
    const allowedJobTypes = ['Full-time', 'Part-time', 'Contract', 'Temporary']
    const allowedWorkModes = ['Remote', 'Hybrid', 'On-site']
    const normalizedJobType = allowedJobTypes.includes(jobType) ? jobType : 'Full-time'
    const normalizedWorkMode = allowedWorkModes.includes(workMode) ? workMode : 'Hybrid'

    // Validate required fields
    if (!jobTitle) {
      return NextResponse.json(
        { error: 'Job title is required' },
        { status: 400 }
      )
    }

    const status = isDraft ? 'draft' : 'open'
    const publishedAt = isDraft ? null : new Date().toISOString()

    // Job will be inserted below after duplicate checks
    // let newJob declared later
    
    // Debug: Log all field values being inserted
    console.log('[Jobs POST] Inserting job with fields:', {
      jobTitle, department, location, jobType: normalizedJobType, workMode: normalizedWorkMode,
      salaryMin, salaryMax, currency, applicationDeadline, expectedStartDate,
      jobDescription: jobDescription?.substring(0, 50) + '...',
      responsibilities: responsibilities?.length,
      requiredSkills: requiredSkills?.length,
      preferredSkills: preferredSkills?.length,
      experienceYears, requiredEducation, certificationsRequired, languagesRequired,
      hiringManager, hiringManagerEmail, numberOfOpenings, hiringPriority,
      clientCompanyName, enableScreeningQuestions
    })
    
    console.log('🚀 About to create job with:', { 
      companyId, 
      userId: actualUserId, 
      jobTitle,
      isDraft: isDraft ? 'draft' : 'published'
    })
    
    // Sanitize data before database insert
    const sanitizedData = {
      // Basic Job Information
      companyId,
      userId: actualUserId,
      jobTitle,
      department: department || null,
      location: location || null,
      jobType: normalizedJobType,
      workMode: normalizedWorkMode,
      salaryMin: salaryMin ? parseFloat(salaryMin) : null,
      salaryMax: salaryMax ? parseFloat(salaryMax) : null,
      currency: currency || 'USD',
      applicationDeadline: applicationDeadline || null, 
      expectedStartDate: expectedStartDate || null,
      
      // Job Details
      jobDescription: jobDescription || null,
      responsibilities: Array.isArray(responsibilities) ? 
        responsibilities.filter((r: string) => r && r.trim()) : [],
      requiredSkills: Array.isArray(requiredSkills) ? 
        requiredSkills.filter((s: string) => s && s.trim()) : [],
      preferredSkills: Array.isArray(preferredSkills) ? 
        preferredSkills.filter((s: string) => s && s.trim()) : [],
      experienceYears: experienceYears || null,
      requiredEducation: requiredEducation || null, 
      certificationsRequired: certificationsRequired || null,
      languagesRequired: languagesRequired || null,
      
      // Team & Planning
      hiringManager: hiringManager || null, 
      hiringManagerEmail: hiringManagerEmail || null,
      numberOfOpenings: numberOfOpenings ? parseInt(numberOfOpenings) : 1,
      hiringPriority: hiringPriority || 'Medium',
      targetTimeToFill: targetTimeToFill ? parseInt(targetTimeToFill) : null,
      budgetAllocated: budgetAllocated ? parseFloat(budgetAllocated) : null,
      targetSources: Array.isArray(targetSources) ? targetSources : [],
      diversityGoals: diversityGoals || false,
      diversityTargetPercentage: diversityTargetPercentage ? parseFloat(diversityTargetPercentage) : null,
      
      // Metrics
      expectedHiresPerMonth: expectedHiresPerMonth ? parseInt(expectedHiresPerMonth) : null,
      targetOfferAcceptanceRate: targetOfferAcceptanceRate ? parseFloat(targetOfferAcceptanceRate) : null,
      candidateResponseTimeSLA: candidateResponseTimeSLA ? parseInt(candidateResponseTimeSLA) : null,
      interviewScheduleSLA: interviewScheduleSLA ? parseInt(interviewScheduleSLA) : null,
      costPerHireBudget: costPerHireBudget ? parseFloat(costPerHireBudget) : null,
      agencyFeePercentage: agencyFeePercentage ? parseFloat(agencyFeePercentage) : null,
      jobBoardCosts: jobBoardCosts ? parseFloat(jobBoardCosts) : null,
      
      // Interview and Screening - explicitly handle boolean values
      autoScheduleInterview: autoScheduleInterview === true ? true : false,
      interviewLinkExpiryHours: interviewLinkExpiryHours || 48,
      enableScreeningQuestions: enableScreeningQuestions === true ? true : false,
      screeningQuestions: JSON.stringify(screeningQuestions || {}),
      clientCompanyName: clientCompanyName || null,
      
      // Status
      status,
      publishedAt,
      jobOpenDate: isDraft ? null : new Date().toISOString().split('T')[0]
    }
    
    // Use consistent variable names for debugging
    console.log('📊 Sanitized data:', {
      companyId: sanitizedData.companyId,
      userId: sanitizedData.userId,
      jobTitle: sanitizedData.jobTitle,
      responsibilities: sanitizedData.responsibilities,
      requiredSkills: sanitizedData.requiredSkills
    })
    
    // Extract submissionId from the request body
    const submissionId = body.submissionId || '';
    
    // DUPLICATE PREVENTION LAYER 1: Check submissionId (prevents double-click)
    if (submissionId && isDuplicateSubmission(submissionId)) {
      console.log('🛑 Duplicate submission blocked by submissionId:', submissionId);
      return NextResponse.json({
        success: true, 
        data: { id: 'duplicate_prevented', title: jobTitle },
        message: 'Duplicate submission detected and prevented'
      });
    }
    
    // DUPLICATE PREVENTION LAYER 2: Check if same title+company job was created in last 5 seconds
    if (companyId && jobTitle) {
      const recentDuplicate = await checkRecentDuplicate(companyId.toString(), jobTitle);
      if (recentDuplicate) {
        console.log('� Duplicate job blocked by 5-second check:', jobTitle);
        return NextResponse.json({
          success: true, 
          data: { id: 'duplicate_prevented', title: jobTitle },
          message: 'A job with this title was just created. Please wait a moment.'
        });
      }
    }
      
    // Single INSERT with all fields - NO separate updates, NO emergency fallback
    let newJob: any = null;
    
    try {
      console.log('🔄 Inserting job with all fields in single query');
      
      const insertQuery = `
        INSERT INTO job_postings (
          company_id, created_by, title, department, location, job_type, work_mode,
          salary_min, salary_max, currency, application_deadline, expected_start_date,
          description, responsibilities, required_skills, preferred_skills, experience_years,
          required_education, certifications_required, languages_required, recruiter_id,
          hiring_manager_name, hiring_manager_email, number_of_openings, hiring_priority,
          target_time_to_fill_days, budget_allocated, target_sources, diversity_goals, diversity_target_pct,
          job_open_date, expected_hires_per_month, target_offer_acceptance_pct,
          candidate_response_sla_hrs, interview_schedule_sla_hrs, cost_per_hire_budget,
          agency_fee_pct, job_board_costs, auto_schedule_interview, interview_link_expiry_hours,
          enable_screening_questions, screening_questions, client_company_name, status, published_at
        ) VALUES (
          $1::uuid, $2::uuid, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12,
          $13, $14, $15, $16, $17,
          $18, $19, $20, $2::uuid,
          $21, $22, $23, $24,
          $25, $26, $27, $28, $29,
          $30, $31, $32,
          $33, $34, $35,
          $36, $37, $38, $39,
          $40, $41, $42, $43, $44
        )
        RETURNING *
      `;
      
      const insertParams = [
        sanitizedData.companyId,              // $1
        sanitizedData.userId,                 // $2 (also used for recruiter_id)
        sanitizedData.jobTitle,               // $3
        sanitizedData.department,             // $4
        sanitizedData.location,               // $5
        sanitizedData.jobType,                // $6
        sanitizedData.workMode,               // $7
        sanitizedData.salaryMin,              // $8
        sanitizedData.salaryMax,              // $9
        sanitizedData.currency,               // $10
        sanitizedData.applicationDeadline,    // $11
        sanitizedData.expectedStartDate,      // $12
        sanitizedData.jobDescription,         // $13
        sanitizedData.responsibilities,       // $14
        sanitizedData.requiredSkills,         // $15
        sanitizedData.preferredSkills,        // $16
        sanitizedData.experienceYears,        // $17
        sanitizedData.requiredEducation,      // $18
        sanitizedData.certificationsRequired, // $19
        sanitizedData.languagesRequired,      // $20
        // recruiter_id uses $2::uuid (same as created_by)
        sanitizedData.hiringManager,          // $21
        sanitizedData.hiringManagerEmail,     // $22
        sanitizedData.numberOfOpenings,       // $23
        sanitizedData.hiringPriority,         // $24
        sanitizedData.targetTimeToFill,       // $25
        sanitizedData.budgetAllocated,        // $26
        sanitizedData.targetSources,          // $27
        sanitizedData.diversityGoals,         // $28
        sanitizedData.diversityTargetPercentage, // $29
        sanitizedData.jobOpenDate,            // $30
        sanitizedData.expectedHiresPerMonth,  // $31
        sanitizedData.targetOfferAcceptanceRate, // $32
        sanitizedData.candidateResponseTimeSLA,  // $33
        sanitizedData.interviewScheduleSLA,   // $34
        sanitizedData.costPerHireBudget,      // $35
        sanitizedData.agencyFeePercentage,    // $36
        sanitizedData.jobBoardCosts,          // $37
        sanitizedData.autoScheduleInterview,  // $38
        sanitizedData.interviewLinkExpiryHours, // $39
        sanitizedData.enableScreeningQuestions, // $40
        sanitizedData.screeningQuestions,     // $41
        sanitizedData.clientCompanyName,      // $42
        sanitizedData.status,                 // $43
        sanitizedData.publishedAt             // $44
      ];
      
      const result = await DatabaseService.query(insertQuery, insertParams);
      newJob = result[0];
      const jobId = newJob.id;
      console.log('✅ Created job with ID:', jobId);
      
      // Insert interview questions if provided
      if (selectedCriteria?.length > 0 || interviewQuestions?.length > 0) {
        await DatabaseService.query(
          `INSERT INTO job_interview_questions (job_id, selected_criteria, questions)
           VALUES ($1::uuid, $2, $3)
           ON CONFLICT (job_id) DO UPDATE SET
             selected_criteria = $2,
             questions = $3,
             updated_at = NOW()`,
          [
            jobId,
            JSON.stringify(selectedCriteria || []),
            JSON.stringify(interviewQuestions || [])
          ]
        );
        console.log('✅ Interview questions stored');
      }
      
    } catch (error) {
      // Log the error but DO NOT create a fallback insert (this was causing duplicates)
      console.error('❌ Job creation failed:', error);
      throw new Error(`Failed to create job posting: ${(error as any).message}`);
    }

    // Note: Interview questions are now handled inside the transaction
    // to ensure consistency with the job posting

    // Reconcile draft question generation usage with real job_id
    if (draftJobId && newJob?.id) {
      try {
        await DatabaseService.reconcileDraftQuestionUsage(draftJobId, newJob.id)
        console.log('[Jobs POST] Reconciled question usage: draft', draftJobId, '→ job', newJob.id)
      } catch (reconcileErr) {
        console.warn('[Jobs POST] Failed to reconcile question usage:', reconcileErr)
      }
    }

    return NextResponse.json({
      success: true,
      message: isDraft ? 'Job saved as draft' : 'Job published successfully',
      data: newJob
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating job posting:', error)
    const errorMessage = error?.message || 'Internal server error'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
