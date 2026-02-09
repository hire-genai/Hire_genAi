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
