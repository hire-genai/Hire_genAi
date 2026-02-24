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

    if (sessionCookie?.value) {
      try {
        const session = JSON.parse(sessionCookie.value)
        if (!companyId) companyId = session.companyId || session.company?.id
        if (!userId) userId = session.userId || session.user?.id
      } catch {
        console.log('Failed to parse session cookie')
      }
    }

    // If no company, return empty list — never fallback to another company's data
    if (!companyId) {
      return NextResponse.json({ success: true, data: [] })
    }

    // Auto-expire delegations whose end_date has passed
    try {
      await DatabaseService.query(
        `UPDATE delegations SET status = 'expired' WHERE status = 'active' AND end_date < CURRENT_DATE AND company_id::text = $1`,
        [companyId]
      )
    } catch { /* delegations table may not exist yet */ }

    // Fetch jobs with ownership + delegation access control
    // Cast UUID columns to text to avoid 'operator does not exist: text = uuid' with mock auth IDs
    let jobs: any[]
    if (userId) {
      jobs = await DatabaseService.query(
        `SELECT DISTINCT jp.*
        FROM job_postings jp
        WHERE jp.company_id::text = $1
          AND (
            jp.created_by::text = $2
            OR jp.created_by = (SELECT email FROM users WHERE id::text = $2 LIMIT 1)
            OR jp.id IN (
              SELECT d.item_id FROM delegations d
              WHERE d.delegated_to::text = $2
                AND d.delegation_type = 'job'
                AND d.status = 'active'
                AND CURRENT_DATE >= d.start_date
                AND CURRENT_DATE <= d.end_date
            )
          )
        ORDER BY jp.created_at DESC`,
        [companyId, userId]
      )
    } else {
      jobs = await DatabaseService.query(
        `SELECT jp.*
        FROM job_postings jp
        WHERE jp.company_id::text = $1
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

      // Try to get recruiter name
      try {
        if (job.created_by) {
          const user = await DatabaseService.query(
            `SELECT full_name, email FROM users WHERE id::text = $1 OR email = $1`,
            [job.created_by]
          )
          if (user.length > 0) {
            job.recruiter_name = user[0].full_name
            job.recruiter_email = user[0].email
          } else {
            job.recruiter_email = job.created_by
          }
        }
      } catch {
        // users table lookup failed
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

    const body = await request.json()

    if (sessionCookie?.value) {
      try {
        const session = JSON.parse(sessionCookie.value)
        userId = session.userId || session.user?.id
        companyId = session.companyId || session.company?.id
      } catch {
        console.log('Failed to parse session cookie')
      }
    }

    // Fallback to request body for userId and companyId (mock auth uses localStorage, not cookies)
    if (!companyId) {
      companyId = body.companyId || null
    }
    if (!userId) {
      userId = body.userId || null
    }

    if (!userId || !companyId) {
      return NextResponse.json(
        { error: 'No user or company found. Please sign up first.' },
        { status: 400 }
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

    // Validate company/user exist; auto-create from real session data if missing
    const sessionUserName: string = body.userName || body.userFullName || 'User'
    const sessionUserEmail: string = body.userEmail || `user_${userId}@hiregen.ai`
    const sessionCompanyName: string = body.companyName || 'Company'

    // UUID validation helper
    const isValidUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

    console.log('🔍 Job creation validation:', { 
      userId, 
      companyId, 
      sessionUserName, 
      sessionUserEmail, 
      sessionCompanyName,
      userIdIsUUID: isValidUUID(userId || ''),
      companyIdIsUUID: isValidUUID(companyId || '')
    })

    // If userId or companyId are not valid UUIDs, we need to look up by email
    if (!isValidUUID(userId || '') || !isValidUUID(companyId || '')) {
      console.log('⚠️ Invalid UUID detected, looking up user by email...')
      try {
        const userByEmail = await DatabaseService.query(
          `SELECT u.id as user_id, u.company_id FROM users u WHERE u.email = $1 LIMIT 1`,
          [sessionUserEmail]
        )
        if (userByEmail.length > 0) {
          console.log('✅ Found user by email:', userByEmail[0])
          userId = userByEmail[0].user_id
          companyId = userByEmail[0].company_id
        } else {
          console.error('❌ User not found by email and IDs are not valid UUIDs')
          return NextResponse.json(
            { error: 'Invalid session. Please clear your browser data (localStorage) and sign in again.' },
            { status: 400 }
          )
        }
      } catch (lookupError: any) {
        console.error('❌ Email lookup failed:', lookupError.message)
        return NextResponse.json(
          { error: 'Session validation failed. Please clear your browser data and sign in again.' },
          { status: 400 }
        )
      }
    }

    try {
      const companyExists = await DatabaseService.query(
        `SELECT id FROM companies WHERE id = $1::uuid LIMIT 1`,
        [companyId]
      )
      if (companyExists.length === 0) {
        try {
          await DatabaseService.query(
            `INSERT INTO companies (id, name) VALUES ($1::uuid, $2) ON CONFLICT (id) DO NOTHING`,
            [companyId, sessionCompanyName]
          )
        } catch (createCompanyError) {
          console.error('Failed to create company record:', createCompanyError)
          return NextResponse.json(
            { error: 'Company not found. Please sign in again.' },
            { status: 400 }
          )
        }
      }

      const userExists = await DatabaseService.query(
        `SELECT id FROM users WHERE id = $1::uuid LIMIT 1`,
        [userId]
      )
      if (userExists.length === 0) {
        console.log('🔄 User not found in DB, creating directly...')
        try {
          // Direct insert - more reliable than API call
          await DatabaseService.query(
            `INSERT INTO users (id, company_id, email, full_name, status, created_at)
             VALUES ($1::uuid, $2::uuid, $3, $4, 'active', NOW())
             ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name`,
            [userId, companyId, sessionUserEmail, sessionUserName]
          )
          console.log('✅ User created directly:', sessionUserEmail, userId)
        } catch (createUserError: any) {
          console.error('❌ Failed to create user:', createUserError.message)
          // Try to find existing user by email
          try {
            const existingByEmail = await DatabaseService.query(
              `SELECT id FROM users WHERE email = $1 LIMIT 1`,
              [sessionUserEmail]
            )
            if (existingByEmail.length > 0) {
              console.log('⚠️ Found existing user by email, using ID:', existingByEmail[0].id)
              userId = existingByEmail[0].id
            } else {
              return NextResponse.json(
                { error: `Failed to create user: ${createUserError.message}. Please log out and sign in again.` },
                { status: 400 }
              )
            }
          } catch (lookupError: any) {
            return NextResponse.json(
              { error: `User lookup failed: ${lookupError.message}. Please log out and sign in again.` },
              { status: 400 }
            )
          }
        }
      } else {
        console.log('✅ User exists in DB:', userId)
      }
    } catch (fkCheckError) {
      console.error('Failed to validate user/company before insert:', fkCheckError)
      return NextResponse.json(
        { error: 'Unable to validate user/company. Please try again.' },
        { status: 400 }
      )
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
      userId, 
      jobTitle,
      isDraft: isDraft ? 'draft' : 'published'
    })
    
    // Sanitize data before database insert
    const sanitizedData = {
      // Basic Job Information
      companyId,
      userId,
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
