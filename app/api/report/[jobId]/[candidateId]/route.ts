import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string; candidateId: string }> }
) {
  try {
    if (!DatabaseService.isDatabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const { jobId, candidateId } = await params

    if (!jobId || !candidateId) {
      return NextResponse.json({ error: 'jobId and candidateId are required' }, { status: 400 })
    }

    // Fetch application with candidate + job + interview details
    const appQuery = `
      SELECT 
        a.id AS application_id,
        a.job_id,
        a.candidate_id,
        a.current_stage,
        a.applied_at,
        a.source,
        a.ai_cv_score,
        a.is_qualified,
        a.qualification_explanations,
        a.expected_salary,
        a.salary_currency,
        a.salary_period,
        a.available_start_date,
        a.location AS app_location,
        a.linkedin_url AS app_linkedin,
        a.portfolio_url,
        a.resume_text,
        i.interview_status,
        i.interview_score,
        i.interview_evaluations,
        i.interview_recommendation,
        i.interview_summary,
        i.interview_completed_at,
        i.interview_feedback,
        a.hm_status,
        a.hm_feedback,
        a.hm_rating,
        a.remarks,
        c.full_name,
        c.first_name,
        c.last_name,
        c.email,
        c.phone,
        c.location AS candidate_location,
        c.current_company,
        c.current_title,
        c.experience_years,
        c.linkedin_url AS candidate_linkedin,
        c.resume_url,
        c.photo_url,
        j.title AS job_title,
        j.department,
        j.location AS job_location,
        j.job_type,
        j.work_mode,
        j.required_skills,
        j.preferred_skills,
        j.experience_years AS required_experience,
        j.required_education,
        j.description AS job_description
      FROM applications a
      JOIN candidates c ON a.candidate_id = c.id
      JOIN job_postings j ON a.job_id = j.id
      LEFT JOIN interviews i ON i.application_id = a.id
      WHERE a.job_id = $1::uuid AND a.candidate_id = $2::uuid
      LIMIT 1
    `
    const appResult = await DatabaseService.query(appQuery, [jobId, candidateId])

    if (!appResult || appResult.length === 0) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    const app = appResult[0]

    // Parse qualification_explanations JSONB - skills are extracted from here
    const qualExplanations = app.qualification_explanations || {}
    const extracted = qualExplanations.extracted || {}
    const candidateSkills = extracted.skills || []

    // Fetch stage history (for remarks timeline)
    const historyResult = await DatabaseService.query(
      `SELECT ash.from_stage, ash.to_stage, ash.remarks, ash.created_at, u.full_name AS changed_by_name
       FROM application_stage_history ash
       LEFT JOIN users u ON ash.changed_by = u.email
       WHERE ash.application_id = $1::uuid
       ORDER BY ash.created_at DESC`,
      [app.application_id]
    )

    // Build response
    const report = {
      candidate: {
        name: app.full_name || 'Unknown',
        email: app.email || '',
        phone: app.phone || '',
        position: app.job_title || 'Unknown Position',
        location: app.candidate_location || app.app_location || '',
        currentCompany: app.current_company || '',
        currentTitle: app.current_title || '',
        experienceYears: app.experience_years,
        linkedinUrl: app.candidate_linkedin || app.app_linkedin || '',
        resumeUrl: app.resume_url || '',
        photoUrl: app.photo_url || '',
        skills: candidateSkills,
        appliedAt: app.applied_at,
        source: app.source || 'Direct',
      },
      job: {
        id: app.job_id,
        title: app.job_title || '',
        department: app.department || '',
        location: app.job_location || '',
        jobType: app.job_type || '',
        workMode: app.work_mode || '',
        requiredSkills: app.required_skills || [],
        preferredSkills: app.preferred_skills || [],
        requiredExperience: app.required_experience,
        requiredEducation: app.required_education || '',
        description: app.job_description || '',
      },
      screening: {
        score: app.ai_cv_score != null ? Math.round(Number(app.ai_cv_score)) : null,
        isQualified: app.is_qualified,
        qualificationExplanations: qualExplanations,
      },
      application: {
        expectedSalary: app.expected_salary ? Number(app.expected_salary) : null,
        salaryCurrency: app.salary_currency || 'USD',
        salaryPeriod: app.salary_period || 'month',
        availableStartDate: app.available_start_date,
        location: app.app_location || '',
        portfolioUrl: app.portfolio_url || '',
      },
      interview: {
        status: app.interview_status || 'Not Scheduled',
        score: app.interview_score != null ? Math.round(Number(app.interview_score)) : null,
        evaluations: app.interview_evaluations || {},
        recommendation: app.interview_recommendation || '',
        summary: app.interview_summary || '',
        completedAt: app.interview_completed_at,
        feedback: app.interview_feedback || '',
      },
      hiringManager: {
        status: app.hm_status || '',
        feedback: app.hm_feedback || '',
        rating: app.hm_rating,
      },
      currentStage: app.current_stage,
      remarks: app.remarks || '',
      stageHistory: (historyResult || []).map((h: any) => ({
        fromStage: h.from_stage,
        toStage: h.to_stage,
        remarks: h.remarks || '',
        changedBy: h.changed_by_name || '',
        createdAt: h.created_at,
      })),
    }

    return NextResponse.json({ ok: true, report })
  } catch (err: any) {
    console.error('❌ Report API error:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch report' },
      { status: 500 }
    )
  }
}
