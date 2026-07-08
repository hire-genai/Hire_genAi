import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

// GET - Fetch all public (open) jobs for a company by slug
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companySlug: string }> }
) {
  try {
    const { companySlug } = await params

    if (!companySlug) {
      return NextResponse.json({ error: 'Company slug is required' }, { status: 400 })
    }

    // Find company — try with slug column first, fall back to name matching
    let company: any = null

    try {
      // Try with slug column
      const companies = await DatabaseService.query(
        `SELECT id, name, slug, website_url, industry, size_band
         FROM companies
         WHERE slug = $1
         LIMIT 1`,
        [companySlug]
      )
      if (companies.length > 0) company = companies[0]
    } catch {
      // slug column doesn't exist — ignore
    }

    // If not found by slug column, try matching by derived name slug
    if (!company) {
      try {
        const all = await DatabaseService.query(
          `SELECT id, name, website_url, industry, size_band FROM companies`,
          []
        )
        company = all.find((c: any) => {
          const derived = c.name?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
          return derived === companySlug
        }) || null
      } catch (e) {
        console.error('Error fetching companies for slug match:', e)
      }
    }

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    const derivedSlug =
      company.slug ||
      company.name?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') ||
      companySlug

    // Fetch all open jobs for this company
    const jobs = await DatabaseService.query(
      `SELECT
        jp.id,
        jp.title,
        jp.department,
        jp.location,
        jp.job_type,
        jp.work_mode,
        jp.salary_min,
        jp.salary_max,
        jp.currency,
        jp.description,
        jp.required_skills,
        jp.preferred_skills,
        jp.experience_years,
        jp.application_deadline,
        jp.expected_start_date,
        jp.status,
        jp.published_at,
        jp.created_at,
        jp.hiring_priority,
        jp.number_of_openings
       FROM job_postings jp
       WHERE jp.company_id = $1::uuid
         AND jp.status = 'open'
       ORDER BY jp.published_at DESC NULLS LAST, jp.created_at DESC`,
      [company.id]
    )

    return NextResponse.json({
      company: {
        id: company.id,
        name: company.name || '',
        slug: derivedSlug,
        website: company.website_url || '',
        industry: company.industry || '',
        size: company.size_band || '',
        logoUrl: null,
      },
      jobs: jobs.map((j: any) => {
        // Parse required_skills — stored as text[], JSON string, or newline string
        const parseSkills = (val: any): string[] => {
          if (!val) return []
          if (Array.isArray(val)) return val.filter(Boolean)
          if (typeof val === 'string') {
            try { const parsed = JSON.parse(val); if (Array.isArray(parsed)) return parsed.filter(Boolean) } catch {}
            return val.split(/[\n,]/).map((s: string) => s.trim()).filter(Boolean)
          }
          return []
        }
        return {
          id: j.id,
          title: j.title || '',
          department: j.department || '',
          location: j.location || '',
          jobType: j.job_type || 'Full-time',
          workMode: j.work_mode || 'Hybrid',
          salaryMin: j.salary_min ? Number(j.salary_min) : null,
          salaryMax: j.salary_max ? Number(j.salary_max) : null,
          currency: j.currency || 'USD',
          description: j.description || '',
          requiredSkills: parseSkills(j.required_skills),
          preferredSkills: parseSkills(j.preferred_skills),
          experienceYears: j.experience_years ? Number(j.experience_years) : null,
          applicationDeadline: j.application_deadline || null,
          expectedStartDate: j.expected_start_date || null,
          status: j.status,
          publishedAt: j.published_at || j.created_at,
          hiringPriority: j.hiring_priority || null,
          numberOfOpenings: j.number_of_openings ? Number(j.number_of_openings) : 1,
        }
      }),
    })
  } catch (error) {
    console.error('Error fetching company jobs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
