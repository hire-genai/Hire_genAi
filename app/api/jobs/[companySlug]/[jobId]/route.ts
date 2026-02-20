import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

// GET - Fetch public job details by companySlug and jobId
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companySlug: string; jobId: string }> }
) {
  try {
    const { companySlug, jobId } = await params

    if (!companySlug || !jobId) {
      return NextResponse.json(
        { error: 'Company slug and job ID are required' },
        { status: 400 }
      )
    }

    // Fetch job by ID only (don't join on slug since column may not exist)
    const jobs = await DatabaseService.query(
      `SELECT jp.*
      FROM job_postings jp
      WHERE jp.id = $1::uuid
      LIMIT 1`,
      [jobId]
    )

    if (jobs.length === 0) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    const job = jobs[0]

    // Fetch company info separately (slug column may not exist)
    let companyInfo: any = { name: '', slug: companySlug, website: '', industry: '', size: '' }
    try {
      const companies = await DatabaseService.query(
        `SELECT name, slug, website_url, industry, size_band FROM companies WHERE id = $1::uuid`,
        [job.company_id]
      )
      if (companies.length > 0) {
        const c = companies[0]
        const derivedSlug = c.slug || c.name?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || ''
        companyInfo = {
          name: c.name || '',
          slug: derivedSlug,
          website: c.website_url || '',
          industry: c.industry || '',
          size: c.size_band || ''
        }
      }
    } catch {
      // slug column may not exist, try without it
      try {
        const companies = await DatabaseService.query(
          `SELECT name, website_url, industry, size_band FROM companies WHERE id = $1::uuid`,
          [job.company_id]
        )
        if (companies.length > 0) {
          const c = companies[0]
          companyInfo = {
            name: c.name || '',
            slug: c.name?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || companySlug,
            website: c.website_url || '',
            industry: c.industry || '',
            size: c.size_band || ''
          }
        }
      } catch {
        // ignore - use defaults
      }
    }

    // Validate companySlug matches (loose check - derived slug)
    if (companyInfo.slug && companyInfo.slug !== companySlug) {
      return NextResponse.json(
        { error: 'Job not found or company mismatch' },
        { status: 404 }
      )
    }

    // Auto-close job if application deadline has passed
    if (job.application_deadline && job.status === 'open') {
      const deadline = new Date(job.application_deadline)
      deadline.setHours(23, 59, 59, 999) // end of deadline day
      if (new Date() > deadline) {
        try {
          await DatabaseService.query(
            `UPDATE job_postings SET status = 'closed', updated_at = NOW() WHERE id = $1::uuid`,
            [jobId]
          )
          job.status = 'closed'
        } catch {
          // ignore update error, still reflect closed status
          job.status = 'closed'
        }
      }
    }

    // Validate job status (must be open/published/draft for preview)
    if (job.status !== 'open' && job.status !== 'published' && job.status !== 'draft') {
      return NextResponse.json(
        { error: 'This job is no longer accepting applications' },
        { status: 403 }
      )
    }

    // Check if screening is enabled
    const screeningEnabled = job.enable_screening_questions === true
    let screeningConfig = job.screening_questions || {}

    // Parse if string
    if (typeof screeningConfig === 'string') {
      try { screeningConfig = JSON.parse(screeningConfig) } catch { screeningConfig = {} }
    }

    // Normalize expectedSkills: split any multiline strings into individual items
    if (screeningConfig && Array.isArray(screeningConfig.expectedSkills)) {
      screeningConfig.expectedSkills = screeningConfig.expectedSkills
        .flatMap((s: string) => s.split('\n'))
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0)
    }

    return NextResponse.json({
      success: true,
      data: {
        id: job.id,
        title: job.title,
        department: job.department,
        location: job.location,
        jobType: job.job_type,
        workMode: job.work_mode,
        salaryMin: job.salary_min,
        salaryMax: job.salary_max,
        currency: job.currency,
        description: job.description,
        responsibilities: job.responsibilities || [],
        requiredSkills: job.required_skills || [],
        preferredSkills: job.preferred_skills || [],
        experienceYears: job.experience_years,
        requiredEducation: job.required_education,
        certificationsRequired: job.certifications_required,
        languagesRequired: job.languages_required,
        applicationDeadline: job.application_deadline,
        expectedStartDate: job.expected_start_date,
        status: job.status,
        publishedAt: job.published_at,
        clientCompanyName: job.client_company_name || null,
        // Screening config
        screeningEnabled,
        screeningConfig,
        // Company info
        company: companyInfo
      }
    })
  } catch (error) {
    console.error('Error fetching public job:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Update an existing job (full payload, including publish of draft)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ companySlug: string; jobId: string }> }
) {
  try {
    const { companySlug, jobId } = await params

    const body = await request.json()
    if (!jobId || !companySlug) {
      return NextResponse.json({ error: 'Job ID and company slug are required' }, { status: 400 })
    }

    // Verify job belongs to company
    const jobCheck = await DatabaseService.query(
      `SELECT jp.id, jp.company_id FROM job_postings jp
       JOIN companies c ON jp.company_id = c.id
       WHERE jp.id = $1::uuid AND (c.slug = $2 OR LOWER(REPLACE(c.name, ' ', '-')) = $2)
       LIMIT 1`,
      [jobId, companySlug]
    )
    if (!jobCheck || jobCheck.length === 0) {
      return NextResponse.json({ error: 'Job not found or company mismatch' }, { status: 404 })
    }

    // Quick single-field patch (e.g. toggle autoScheduleInterview from job card)
    const bodyKeys = Object.keys(body)
    if (bodyKeys.length === 1 && bodyKeys[0] === 'autoScheduleInterview') {
      await DatabaseService.query(
        `UPDATE job_postings SET auto_schedule_interview = $1::boolean, updated_at = NOW() WHERE id = $2::uuid`,
        [body.autoScheduleInterview === true, jobId]
      )
      return NextResponse.json({ success: true })
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
      isDraft,
      status: incomingStatus
    } = body

    // Normalize enums
    const allowedJobTypes = ['Full-time', 'Part-time', 'Contract', 'Temporary']
    const allowedWorkModes = ['Remote', 'Hybrid', 'On-site']
    const normalizedJobType = allowedJobTypes.includes(jobType) ? jobType : 'Full-time'
    const normalizedWorkMode = allowedWorkModes.includes(workMode) ? workMode : 'Hybrid'

    const status = incomingStatus || (isDraft ? 'draft' : 'open')
    const publishedAt = status === 'open' || status === 'published' ? new Date().toISOString() : null

    // Update full job
    await DatabaseService.query(
      `UPDATE job_postings SET
        title = $1,
        department = $2,
        location = $3,
        job_type = $4,
        work_mode = $5,
        salary_min = $6,
        salary_max = $7,
        currency = $8,
        application_deadline = $9,
        expected_start_date = $10,
        description = $11,
        responsibilities = $12,
        required_skills = $13,
        preferred_skills = $14,
        experience_years = $15,
        required_education = $16,
        certifications_required = $17,
        languages_required = $18,
        hiring_manager_name = $19,
        hiring_manager_email = $20,
        number_of_openings = $21,
        hiring_priority = $22,
        target_time_to_fill_days = $23,
        budget_allocated = $24,
        target_sources = $25,
        diversity_goals = $26,
        diversity_target_pct = $27,
        job_open_date = $28,
        expected_hires_per_month = $29,
        target_offer_acceptance_pct = $30,
        candidate_response_sla_hrs = $31,
        interview_schedule_sla_hrs = $32,
        cost_per_hire_budget = $33,
        agency_fee_pct = $34,
        job_board_costs = $35,
        auto_schedule_interview = $36,
        interview_link_expiry_hours = $37,
        enable_screening_questions = $38,
        screening_questions = $39,
        client_company_name = $40,
        status = $41,
        published_at = $42,
        updated_at = NOW()
       WHERE id = $43::uuid`,
      [
        jobTitle,
        department || null,
        location || null,
        normalizedJobType,
        normalizedWorkMode,
        salaryMin ? parseFloat(salaryMin) : null,
        salaryMax ? parseFloat(salaryMax) : null,
        currency || 'USD',
        applicationDeadline || null,
        expectedStartDate || null,
        jobDescription || null,
        responsibilities?.filter((r: string) => r.trim()) || [],
        requiredSkills?.filter((s: string) => s.trim()) || [],
        preferredSkills?.filter((s: string) => s.trim()) || [],
        experienceYears ? parseInt(experienceYears) : null,
        requiredEducation || null,
        certificationsRequired || null,
        languagesRequired || null,
        hiringManager || null,
        hiringManagerEmail || null,
        numberOfOpenings ? parseInt(numberOfOpenings) : 1,
        hiringPriority || 'Medium',
        targetTimeToFill ? parseInt(targetTimeToFill) : null,
        budgetAllocated ? parseFloat(budgetAllocated) : null,
        targetSources || [],
        diversityGoals || false,
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
        clientCompanyName || null,
        status,
        publishedAt,
        jobId
      ]
    )

    // Upsert interview questions
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
            jobId,
            JSON.stringify(selectedCriteria || []),
            JSON.stringify(interviewQuestions || [])
          ]
        )
      } catch (iqError) {
        console.log('Could not save interview questions (table may not exist):', iqError)
      }
    }

    return NextResponse.json({ success: true, message: 'Job updated successfully' })
  } catch (error) {
    console.error('Error updating job:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
