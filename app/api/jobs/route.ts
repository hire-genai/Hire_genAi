import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { cookies } from 'next/headers'

// GET - Fetch all jobs for the current user's company
export async function GET(request: NextRequest) {
  try {
    // Get user from session cookie
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    let companyId: string | null = null
    let userId: string | null = null

    if (sessionCookie?.value) {
      try {
        const session = JSON.parse(sessionCookie.value)
        companyId = session.companyId || session.company?.id
        userId = session.userId || session.user?.id
      } catch {
        console.log('Failed to parse session cookie')
      }
    }

    // If no session, lookup the first company from DB as fallback
    if (!companyId) {
      try {
        const companies = await DatabaseService.query(
          `SELECT id FROM companies ORDER BY created_at ASC LIMIT 1`
        )
        if (companies.length > 0) {
          companyId = companies[0].id
        }
      } catch {
        console.log('Could not lookup fallback company')
      }
    }

    // If still no company, return empty list
    if (!companyId) {
      return NextResponse.json({ success: true, data: [] })
    }

    // Fetch jobs
    const jobs = await DatabaseService.query(
      `SELECT jp.*
      FROM job_postings jp
      WHERE jp.company_id = $1::uuid
      ORDER BY jp.created_at DESC`,
      [companyId]
    )

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
            `SELECT full_name, email FROM users WHERE id = $1::uuid`,
            [job.created_by]
          )
          if (user.length > 0) {
            job.recruiter_name = user[0].full_name
            job.recruiter_email = user[0].email
          }
        }
      } catch {
        // users table lookup failed
      }

      // Try to get candidate counts
      try {
        const counts = await DatabaseService.query(
          `SELECT COUNT(*) as total FROM candidates WHERE job_id = $1::uuid`,
          [job.id]
        )
        job.total_candidates = counts[0]?.total || 0
      } catch {
        job.total_candidates = 0
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

// POST - Create a new job posting
export async function POST(request: NextRequest) {
  try {
    // Get user from session cookie
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    let userId: string | null = null
    let companyId: string | null = null

    if (sessionCookie?.value) {
      try {
        const session = JSON.parse(sessionCookie.value)
        userId = session.userId || session.user?.id
        companyId = session.companyId || session.company?.id
      } catch {
        console.log('Failed to parse session cookie')
      }
    }

    // Fallback: lookup first user and company from DB
    if (!companyId || !userId) {
      try {
        const users = await DatabaseService.query(
          `SELECT u.id as user_id, u.company_id 
           FROM users u 
           ORDER BY u.created_at ASC LIMIT 1`
        )
        if (users.length > 0) {
          if (!userId) userId = users[0].user_id
          if (!companyId) companyId = users[0].company_id
        }
      } catch {
        console.log('Could not lookup fallback user/company')
      }
    }

    if (!userId || !companyId) {
      return NextResponse.json(
        { error: 'No user or company found. Please sign up first.' },
        { status: 400 }
      )
    }

    const body = await request.json()
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
      hiringManager,
      hiringManagerEmail,
      numberOfOpenings,
      hiringPriority,
      targetTimeToFill,
      budgetAllocated,
      targetSources,
      diversityGoals,
      diversityTargetPercentage,
      // Metrics
      jobOpenDate,
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
      autoScheduleInterview,
      interviewLinkExpiryHours,
      // Screening Questions
      enableScreeningQuestions,
      screeningQuestions,
      // Status
      isDraft
    } = body

    // Validate required fields
    if (!jobTitle) {
      return NextResponse.json(
        { error: 'Job title is required' },
        { status: 400 }
      )
    }

    const status = isDraft ? 'draft' : 'open'
    const publishedAt = isDraft ? null : new Date().toISOString()

    // Insert job posting - try full insert, fallback to basic if new columns don't exist
    let newJob: any
    try {
      const jobResult = await DatabaseService.query(
        `INSERT INTO job_postings (
          company_id, created_by, title, department, location,
          job_type, work_mode, salary_min, salary_max, currency,
          application_deadline, expected_start_date, description,
          responsibilities, required_skills, preferred_skills,
          experience_years, required_education, certifications_required,
          languages_required, hiring_manager_name, hiring_manager_email,
          number_of_openings, hiring_priority, target_time_to_fill_days,
          budget_allocated, target_sources, diversity_goals, diversity_target_pct,
          job_open_date, expected_hires_per_month, target_offer_acceptance_pct,
          candidate_response_sla_hrs, interview_schedule_sla_hrs,
          cost_per_hire_budget, agency_fee_pct, job_board_costs,
          auto_schedule_interview, interview_link_expiry_hours,
          enable_screening_questions, screening_questions,
          status, published_at
        ) VALUES (
          $1::uuid, $2::uuid, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13, $14, $15, $16,
          $17, $18, $19, $20, $21, $22, $23, $24,
          $25, $26, $27, $28, $29, $30, $31, $32,
          $33, $34, $35, $36, $37, $38, $39, $40,
          $41, $42, $43
        ) RETURNING *`,
        [
          companyId, userId, jobTitle,
          department || null, location || null,
          jobType || 'Full-time', workMode || 'Hybrid',
          salaryMin ? parseFloat(salaryMin) : null,
          salaryMax ? parseFloat(salaryMax) : null,
          currency || 'USD',
          applicationDeadline || null, expectedStartDate || null,
          jobDescription || null,
          responsibilities?.filter((r: string) => r.trim()) || [],
          requiredSkills?.filter((s: string) => s.trim()) || [],
          preferredSkills?.filter((s: string) => s.trim()) || [],
          experienceYears ? parseInt(experienceYears) : null,
          requiredEducation || null, certificationsRequired || null,
          languagesRequired || null,
          hiringManager || null, hiringManagerEmail || null,
          numberOfOpenings ? parseInt(numberOfOpenings) : 1,
          hiringPriority || 'Medium',
          targetTimeToFill ? parseInt(targetTimeToFill) : null,
          budgetAllocated ? parseFloat(budgetAllocated) : null,
          targetSources || [], diversityGoals || false,
          diversityTargetPercentage ? parseFloat(diversityTargetPercentage) : null,
          jobOpenDate || new Date().toISOString().split('T')[0],
          expectedHiresPerMonth ? parseInt(expectedHiresPerMonth) : null,
          targetOfferAcceptanceRate ? parseFloat(targetOfferAcceptanceRate) : null,
          candidateResponseTimeSLA ? parseInt(candidateResponseTimeSLA) : null,
          interviewScheduleSLA ? parseInt(interviewScheduleSLA) : null,
          costPerHireBudget ? parseFloat(costPerHireBudget) : null,
          agencyFeePercentage ? parseFloat(agencyFeePercentage) : null,
          jobBoardCosts ? parseFloat(jobBoardCosts) : null,
          autoScheduleInterview || false,
          interviewLinkExpiryHours || 48,
          enableScreeningQuestions || false,
          JSON.stringify(screeningQuestions || {}),
          status, publishedAt
        ]
      )
      newJob = jobResult[0]
    } catch (fullInsertError: any) {
      // Fallback: minimal insert with only guaranteed columns
      console.log('Full insert failed, trying minimal insert:', fullInsertError.message)
      const jobResult = await DatabaseService.query(
        `INSERT INTO job_postings (
          company_id, created_by, title, status, published_at
        ) VALUES (
          $1::uuid, $2::uuid, $3, $4, $5
        ) RETURNING *`,
        [
          companyId, userId, jobTitle, status, publishedAt
        ]
      )
      newJob = jobResult[0]
    }

    // Insert interview questions if provided (table may not exist yet)
    if (selectedCriteria?.length > 0 || interviewQuestions?.length > 0) {
      try {
        await DatabaseService.query(
          `INSERT INTO job_interview_questions (job_id, selected_criteria, questions)
           VALUES ($1::uuid, $2, $3)
           ON CONFLICT (job_id) DO UPDATE SET
             selected_criteria = $2,
             questions = $3,
             updated_at = NOW()`,
          [
            newJob.id,
            JSON.stringify(selectedCriteria || []),
            JSON.stringify(interviewQuestions || [])
          ]
        )
      } catch (iqError) {
        console.log('Could not save interview questions (table may not exist):', iqError)
      }
    }

    return NextResponse.json({
      success: true,
      message: isDraft ? 'Job saved as draft' : 'Job published successfully',
      data: newJob
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating job posting:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
