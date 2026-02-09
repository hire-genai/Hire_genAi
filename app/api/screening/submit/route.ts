import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

// POST - Submit screening answers with eligibility validation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { jobId, companySlug, candidateName, candidateEmail, answers } = body

    // Validate required fields
    if (!jobId || !candidateName || !candidateEmail) 
      {
      return NextResponse.json(
        { error: 'Job ID, candidate name, and candidate email are required' },
        { status: 400 }
      )
    }

    if (!answers) {
      return NextResponse.json(
        { error: 'Screening answers are required' },
        { status: 400 }
      )
    }

    // Verify job exists, is open, and fetch screening criteria
    const jobs = await DatabaseService.query(
      `SELECT jp.id, jp.status, jp.screening_questions,
              jp.enable_screening_questions
       FROM job_postings jp
       WHERE jp.id = $1::uuid`,
      [jobId]
    )

    if (jobs.length === 0) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    const job = jobs[0]

    // Check job status
    if (job.status !== 'open' && job.status !== 'published') {
      return NextResponse.json(
        { error: 'This job is no longer accepting applications' },
        { status: 403 }
      )
    }

    // Parse recruiter screening criteria from job posting
    let screeningCriteria: { minExperience: any; expectedSkills: string[]; expectedSalary: any; noticePeriodNegotiable: any; workAuthorization: any; noticePeriod: any } = { minExperience: null, expectedSkills: [], expectedSalary: null, noticePeriodNegotiable: null, workAuthorization: null, noticePeriod: null }
    try {
      const raw = job.screening_questions
      if (typeof raw === 'string') {
        screeningCriteria = { ...screeningCriteria, ...JSON.parse(raw) }
      } else if (raw && typeof raw === 'object') {
        screeningCriteria = { ...screeningCriteria, ...raw }
      }
    } catch {
      // Use defaults if parsing fails
    }

    // Normalize recruiter skills: if any skill contains newlines, split into individual items
    if (Array.isArray(screeningCriteria.expectedSkills)) {
      screeningCriteria.expectedSkills = screeningCriteria.expectedSkills
        .flatMap((s: string) => s.split('\n'))
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0)
    }

    // --- Eligibility Logic ---
    const nonEligibleReasons: string[] = []

    // 1. Experience check
    const candidateExperience = answers.experience != null ? Number(answers.experience) : null
    const recruiterMinExperience = screeningCriteria.minExperience != null ? Number(screeningCriteria.minExperience) : null

    if (recruiterMinExperience != null && candidateExperience != null) {
      if (candidateExperience < recruiterMinExperience) {
        nonEligibleReasons.push(
          `Experience mismatch: You have ${candidateExperience} year(s) of experience, but the minimum required is ${recruiterMinExperience} year(s).`
        )
      }
    }

    // 2. Salary check
    const candidateSalary = answers.expectedSalary != null ? Number(answers.expectedSalary) : null
    const recruiterMaxSalary = screeningCriteria.expectedSalary != null ? Number(screeningCriteria.expectedSalary) : null

    if (recruiterMaxSalary != null && candidateSalary != null) {
      if (candidateSalary > recruiterMaxSalary) {
        nonEligibleReasons.push(
          `Salary mismatch: Your expected salary ($${candidateSalary.toLocaleString()}) exceeds the budget ($${recruiterMaxSalary.toLocaleString()}).`
        )
      }
    }

    // 3. Skills check (at least 50% match required)
    const recruiterSkills: string[] = Array.isArray(screeningCriteria.expectedSkills) ? screeningCriteria.expectedSkills : []
    const candidateSkills: string[] = Array.isArray(answers.skills) ? answers.skills : []

    let matchedSkillsCount = 0
    const requiredSkillsCount = recruiterSkills.length

    if (requiredSkillsCount > 0) {
      const recruiterSkillsLower = recruiterSkills.map((s: string) => s.toLowerCase().trim())
      const candidateSkillsLower = candidateSkills.map((s: string) => s.toLowerCase().trim())

      matchedSkillsCount = recruiterSkillsLower.filter((s: string) => candidateSkillsLower.includes(s)).length
      const matchPercentage = (matchedSkillsCount / requiredSkillsCount) * 100

      if (matchPercentage < 50) {
        nonEligibleReasons.push(
          `Skill mismatch: You matched ${matchedSkillsCount} out of ${requiredSkillsCount} required skills (${Math.round(matchPercentage)}%). At least 50% match is required.`
        )
      }
    }

    // 4. Work Authorization check
    const recruiterWorkAuth = screeningCriteria.workAuthorization || null
    const candidateWorkAuth = answers.workAuthorization || null

    if (recruiterWorkAuth && candidateWorkAuth) {
      if (recruiterWorkAuth === 'must_have_authorization' && candidateWorkAuth === 'visa_sponsorship') {
        nonEligibleReasons.push(
          'Work authorization mismatch: This position requires candidates who already have work authorization. Visa sponsorship is not available.'
        )
      }
    }

    const isEligible = nonEligibleReasons.length === 0

    // --- Store in screening_submissions table ---
    try {
      const reason = isEligible 
        ? 'Candidate meets all screening criteria and is eligible to proceed.'
        : nonEligibleReasons.length > 0 
          ? nonEligibleReasons[0]
          : 'Candidate does not meet screening requirements.'

      await DatabaseService.query(
        `INSERT INTO screening_submissions (
          job_id, candidate_name, candidate_email,
          experience_years, expected_salary, notice_period, notice_period_negotiable,
          work_authorization,
          selected_skills, additional_info,
          is_eligible, reason, non_eligible_reasons,
          matched_skills_count, required_skills_count,
          recruiter_min_experience, recruiter_max_salary, recruiter_expected_skills,
          recruiter_work_authorization,
          submitted_at
        ) VALUES (
          $1::uuid, $2, $3,
          $4, $5, $6, $7,
          $8,
          $9::text[], $10,
          $11, $12, $13::text[],
          $14, $15,
          $16, $17, $18::text[],
          $19,
          NOW()
        )`,
        [
          jobId,
          candidateName,
          candidateEmail,
          candidateExperience,
          candidateSalary,
          answers.noticePeriod || null,
          answers.noticePeriodNegotiable != null ? answers.noticePeriodNegotiable : null,
          candidateWorkAuth || null,
          candidateSkills.length > 0 ? `{${candidateSkills.map((s: string) => `"${s.replace(/"/g, '\\"')}"`).join(',')}}` : '{}',
          answers.additionalInfo || null,
          isEligible,
          reason,
          nonEligibleReasons.length > 0 ? `{${nonEligibleReasons.map((r: string) => `"${r.replace(/"/g, '\\"')}"`).join(',')}}` : '{}',
          matchedSkillsCount,
          requiredSkillsCount,
          recruiterMinExperience,
          recruiterMaxSalary,
          recruiterSkills.length > 0 ? `{${recruiterSkills.map((s: string) => `"${s.replace(/"/g, '\\"')}"`).join(',')}}` : '{}',
          recruiterWorkAuth || null
        ]
      )
    } catch (dbError: any) {
      console.error('Error saving screening submission:', dbError.message)
      // Don't fail the request if DB save fails — still return eligibility result
    }

    // Return eligibility result
    if (isEligible) {
      return NextResponse.json({
        success: true,
        eligible: true,
        message: 'Congratulations! You meet the eligibility criteria for this position. You will now be redirected to the application form.'
      })
    } else {
      return NextResponse.json({
        success: true,
        eligible: false,
        message: 'Unfortunately, you do not meet the eligibility criteria for this position.',
        reasons: nonEligibleReasons
      })
    }
  } catch (error: any) {
    console.error('Error submitting screening answers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
