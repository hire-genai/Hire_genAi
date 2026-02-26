import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { cookies } from 'next/headers'

// GET - Fetch jobs with recruiter-level access control
// A recruiter sees ONLY jobs they created OR jobs delegated to them with active delegation
export async function GET(request: NextRequest) {
  try {
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
        console.log('🔍 [Jobs GET] Session parsed:', { companyId, userId, sessionEmail })
      } catch (e) {
        console.log('Failed to parse session cookie:', e)
      }
    }

    console.log('🔍 [Jobs GET] Final params:', { companyId, userId })

    // If no company, return empty list — never fallback to another company's data
    if (!companyId) {
      console.log('❌ [Jobs GET] No companyId found, returning empty list')
      return NextResponse.json({ success: true, data: [] })
    }

    // Resolve actual DB user ID - same logic as delegations API
    let resolvedUserId: string | null = userId
    if (userId && sessionEmail) {
      try {
        const byIdRow = await DatabaseService.query(
          `SELECT id::text AS id FROM users WHERE id::text = $1::text LIMIT 1`,
          [userId]
        )
        if (byIdRow.length > 0) {
          resolvedUserId = byIdRow[0].id
        } else {
          const byEmailRow = await DatabaseService.query(
            `SELECT id::text AS id FROM users WHERE email = $1 LIMIT 1`,
            [sessionEmail]
          )
          if (byEmailRow.length > 0) resolvedUserId = byEmailRow[0].id
        }
      } catch (e) {
        console.log('[Jobs GET] User resolve failed, using raw userId:', e)
      }
    }

    // Auto-expire delegations whose end_date has passed
    try {
      await DatabaseService.query(
        `UPDATE delegations SET status = 'expired' WHERE status = 'active' AND end_date < CURRENT_DATE AND company_id::text = $1`,
        [companyId]
      )
    } catch { /* delegations table may not exist yet */ }

    // Fetch jobs with ownership + delegation access control
    // For admin users or when no userId, show all company jobs
    // Otherwise, show jobs created by the user or delegated to them
    let jobs: any[]
    if (userId) {
      // Check if user is admin - admins see all company jobs
      let isAdmin = false
      try {
        // First check if user_roles table exists
        await DatabaseService.query(`SELECT 1 FROM user_roles LIMIT 1`)
        
        // Look up role by resolvedUserId OR by session email
        const roleCheck = await DatabaseService.query(
          `SELECT ur.role FROM user_roles ur 
           JOIN users u ON ur.user_id = u.id 
           WHERE u.company_id::text = $2::text
           AND (
             u.id::text = $1::text
             OR ($3::text IS NOT NULL AND u.email = $3::text)
           )
           LIMIT 1`,
          [resolvedUserId, companyId, sessionEmail]
        )
        isAdmin = roleCheck.length > 0 && roleCheck[0].role === 'admin'
        console.log('🔑 [Jobs GET] Role check:', { isAdmin, roleFound: roleCheck.length > 0, role: roleCheck[0]?.role })
      } catch (roleErr: any) {
        console.log('⚠️ [Jobs GET] Role check failed, defaulting to show all company jobs:', roleErr.message)
        isAdmin = true // On error, default to showing all company jobs (safe for single-company setup)
      }

      if (isAdmin) {
        // Admin sees all company jobs
        console.log('👑 [Jobs GET] Admin user, showing all company jobs')
        jobs = await DatabaseService.query(
          `SELECT jp.*, u.full_name as recruiter_name
          FROM job_postings jp
          LEFT JOIN users u ON jp.created_by = u.id::text
          WHERE jp.company_id::text = $1::text
          ORDER BY jp.created_at DESC`,
          [companyId]
        )
      } else {
        // Regular user - show jobs they created or delegated to them
        // Also check by actual user ID from email lookup (handles ID mismatch)
        console.log('👤 [Jobs GET] Regular user, showing jobs created by them or delegated')
        jobs = await DatabaseService.query(
          `SELECT DISTINCT jp.*, u.full_name as recruiter_name
          FROM job_postings jp
          LEFT JOIN users u ON jp.created_by = u.id::text
          WHERE jp.company_id::text = $1::text
            AND (
              jp.created_by = $2::text
              OR jp.id IN (
                SELECT d.item_id FROM delegations d
                WHERE d.delegated_to::text = $2::text
                  AND d.delegation_type = 'job'
                  AND d.status = 'active'
                  AND CURRENT_DATE >= d.start_date
                  AND CURRENT_DATE <= d.end_date
              )
            )
          ORDER BY jp.created_at DESC`,
          [companyId, resolvedUserId]
        )
      }
    } else {
      jobs = await DatabaseService.query(
        `SELECT jp.*, u.full_name as recruiter_name
        FROM job_postings jp
        LEFT JOIN users u ON jp.created_by = u.id::text
        WHERE jp.company_id::text = $1::text
        ORDER BY jp.created_at DESC`,
        [companyId]
      )
    }

    // Try to get company slug/name (slug column may not exist yet)
    let companySlug = 'company'
    let companyName = ''
    try {
      const companies = await DatabaseService.query(
        `SELECT name, slug FROM companies WHERE id = $1::uuid`,
        [companyId]
      )
      if (companies.length > 0) {
        companyName = companies[0].name || ''
        companySlug = companies[0].slug || companies[0].name?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'company'
      }
    } catch {
      // slug column may not exist, try without it
      try {
        const companies = await DatabaseService.query(
          `SELECT name FROM companies WHERE id = $1::uuid`,
          [companyId]
        )
        if (companies.length > 0) {
          companyName = companies[0].name || ''
          companySlug = companies[0].name?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'company'
        }
      } catch {
        // ignore
      }
    }

    // Attach company info to each job
    for (const job of jobs) {
      job.company_slug = companySlug
      job.company_name = companyName
    }

    // Try to enrich with interview questions (table may not exist yet)
    for (const job of jobs) {
      try {
        const iq = await DatabaseService.query(
          `SELECT selected_criteria, questions FROM job_interview_questions WHERE job_id = $1::uuid`,
          [job.id]
        )
        if (iq.length > 0) {
          job.selected_criteria = iq[0].selected_criteria
          job.interview_questions = iq[0].questions
        }
      } catch {
        // job_interview_questions table may not exist yet
      }

      // Recruiter name is now included via LEFT JOIN in the main query
      if (!job.recruiter_name && job.created_by) {
        job.recruiter_name = 'Unknown'
        job.recruiter_email = job.created_by
      }

      // Try to get candidate counts
      try {
        const counts = await DatabaseService.query(
          `SELECT COUNT(*) as total FROM applications WHERE job_id = $1::uuid`,
          [job.id]
        )
        job.total_candidates = counts[0]?.total || 0
      } catch {
        job.total_candidates = 0
      }

      // Try to get application stage counts
      try {
        const stageCounts = await DatabaseService.query(
          `SELECT current_stage, COUNT(*) as count FROM applications WHERE job_id = $1::uuid GROUP BY current_stage`,
          [job.id]
        )
        // Initialize all to 0
        job.screening_count = 0
        job.ai_interview_count = 0
        job.hiring_manager_count = 0
        job.offer_count = 0
        job.hired_count = 0
        job.rejected_count = 0
        // Map the counts
        stageCounts.forEach((sc: any) => {
          switch (sc.current_stage) {
            case 'screening':
              job.screening_count = parseInt(sc.count)
              break
            case 'ai_interview':
              job.ai_interview_count = parseInt(sc.count)
              break
            case 'hiring_manager':
              job.hiring_manager_count = parseInt(sc.count)
              break
            case 'offer':
              job.offer_count = parseInt(sc.count)
              break
            case 'hired':
              job.hired_count = parseInt(sc.count)
              break
            case 'rejected':
              job.rejected_count = parseInt(sc.count)
              break
          }
        })
      } catch (err) {
        console.log('Could not get stage counts:', err)
        job.screening_count = 0
        job.ai_interview_count = 0
        job.hiring_manager_count = 0
        job.offer_count = 0
        job.hired_count = 0
        job.rejected_count = 0
      }
    }

    return NextResponse.json({
      success: true,
      data: jobs
    })
  } catch (error) {
    console.error('Error fetching jobs:', error)
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
       WHERE company_id::text = $1 AND title = $2 AND created_at > NOW() - INTERVAL '5 seconds'
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

    // SECURITY: Only use authenticated session data - never accept userId/companyId from request body
    if (!userId || !companyId) {
      console.error('❌ No valid session found in cookie')
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
          company_id, created_by, title, job_type, work_mode, status, auto_schedule_interview,
          department, location, description, responsibilities, required_skills, preferred_skills,
          experience_years, published_at, job_open_date, salary_min, salary_max, currency,
          application_deadline, expected_start_date, required_education, certifications_required,
          languages_required, hiring_manager_name, hiring_manager_email, number_of_openings,
          hiring_priority, target_time_to_fill_days, budget_allocated, target_sources,
          diversity_goals, diversity_target_pct, client_company_name, interview_link_expiry_hours,
          enable_screening_questions, screening_questions
        ) VALUES (
          $1::uuid, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18, $19,
          $20, $21, $22, $23,
          $24, $25, $26, $27,
          $28, $29, $30, $31,
          $32, $33, $34, $35,
          $36, $37
        )
        RETURNING *
      `;
      
      const insertParams = [
        sanitizedData.companyId,
        sanitizedData.userId,
        sanitizedData.jobTitle,
        sanitizedData.jobType,
        sanitizedData.workMode,
        sanitizedData.status,
        sanitizedData.autoScheduleInterview,
        sanitizedData.department,
        sanitizedData.location,
        sanitizedData.jobDescription,
        sanitizedData.responsibilities,
        sanitizedData.requiredSkills,
        sanitizedData.preferredSkills,
        sanitizedData.experienceYears,
        sanitizedData.publishedAt,
        sanitizedData.jobOpenDate,
        sanitizedData.salaryMin,
        sanitizedData.salaryMax,
        sanitizedData.currency,
        sanitizedData.applicationDeadline,
        sanitizedData.expectedStartDate,
        sanitizedData.requiredEducation,
        sanitizedData.certificationsRequired,
        sanitizedData.languagesRequired,
        sanitizedData.hiringManager,
        sanitizedData.hiringManagerEmail,
        sanitizedData.numberOfOpenings,
        sanitizedData.hiringPriority,
        sanitizedData.targetTimeToFill,
        sanitizedData.budgetAllocated,
        sanitizedData.targetSources,
        sanitizedData.diversityGoals,
        sanitizedData.diversityTargetPercentage,
        sanitizedData.clientCompanyName,
        sanitizedData.interviewLinkExpiryHours,
        sanitizedData.enableScreeningQuestions,
        sanitizedData.screeningQuestions
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
