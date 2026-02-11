import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    if (!DatabaseService.isDatabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const body = await req.json()
    const {
      jobId,
      candidate,
      resume,
      photoUrl,
      confirmationStatus,
      coverLetter,
      source = 'direct_application',
    } = body || {}

    if (!jobId) return NextResponse.json({ error: 'Missing jobId' }, { status: 400 })
    if (!candidate?.email) return NextResponse.json({ error: 'Missing candidate email' }, { status: 400 })

    const firstName = (candidate.firstName || '').trim()
    const lastName = (candidate.lastName || '').trim()
    const fullName = (candidate.fullName || `${firstName} ${lastName}`.trim()).trim()

    if (!fullName) return NextResponse.json({ error: 'Missing candidate name' }, { status: 400 })

    // 1) Get company_id from job posting (required for candidates & applications tables)
    const jobRows = await DatabaseService.query(
      `SELECT id, company_id FROM job_postings WHERE id = $1::uuid LIMIT 1`,
      [jobId]
    )

    if (!jobRows || jobRows.length === 0) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const companyId = jobRows[0].company_id

    // 2) Upsert candidate by email + company_id
    const existingCandidates = await DatabaseService.query(
      `SELECT id FROM candidates WHERE email = $1 AND company_id = $2::uuid LIMIT 1`,
      [String(candidate.email).toLowerCase(), companyId]
    )

    let candidateId: string

    if (existingCandidates && existingCandidates.length > 0) {
      candidateId = existingCandidates[0].id

      // Update candidate with latest info
      await DatabaseService.query(
        `UPDATE candidates SET
          full_name = $1,
          first_name = $2,
          last_name = $3,
          phone = $4,
          location = $5,
          linkedin_url = $6,
          resume_url = COALESCE($7, resume_url),
          photo_url = COALESCE($8, photo_url)
        WHERE id = $9::uuid`,
        [
          fullName,
          firstName || null,
          lastName || null,
          candidate.phone || null,
          candidate.location || null,
          candidate.linkedinUrl || null,
          resume?.url || null,
          photoUrl || null,
          candidateId,
        ]
      )
    } else {
      // Insert new candidate
      const insertResult = await DatabaseService.query(
        `INSERT INTO candidates (
          company_id, full_name, first_name, last_name, email, phone,
          location, linkedin_url, resume_url, photo_url, source
        ) VALUES (
          $1::uuid, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11
        ) RETURNING id`,
        [
          companyId,
          fullName,
          firstName || null,
          lastName || null,
          String(candidate.email).toLowerCase(),
          candidate.phone || null,
          candidate.location || null,
          candidate.linkedinUrl || null,
          resume?.url || null,
          photoUrl || null,
          source,
        ]
      )

      if (!insertResult || insertResult.length === 0) {
        return NextResponse.json({ error: 'Failed to create candidate' }, { status: 500 })
      }

      candidateId = insertResult[0].id
    }

    // 3) Create application (idempotent on candidate_id + job_id via unique index)
    let applicationId: string | null = null

    // Check if application already exists
    const existingApp = await DatabaseService.query(
      `SELECT id FROM applications WHERE candidate_id = $1::uuid AND job_id = $2::uuid LIMIT 1`,
      [candidateId, jobId]
    )

    if (existingApp && existingApp.length > 0) {
      applicationId = existingApp[0].id
      // Update existing application with new data
      await DatabaseService.query(
        `UPDATE applications SET
          expected_salary = COALESCE($1, expected_salary),
          salary_currency = COALESCE($2, salary_currency),
          salary_period = COALESCE($3, salary_period),
          location = COALESCE($4, location),
          linkedin_url = COALESCE($5, linkedin_url),
          portfolio_url = COALESCE($6, portfolio_url),
          available_start_date = $7,
          willing_to_relocate = COALESCE($8, willing_to_relocate),
          languages = COALESCE($9::jsonb, languages),
          photo_url = COALESCE($10, photo_url),
          cover_letter = COALESCE($11, cover_letter),
          confirmation_status = COALESCE($12, confirmation_status),
          updated_at = NOW()
        WHERE id = $13::uuid`,
        [
          candidate.expectedSalary ? Number(candidate.expectedSalary) : null,
          candidate.salaryCurrency || null,
          candidate.salaryPeriod || null,
          candidate.location || null,
          candidate.linkedinUrl || null,
          candidate.portfolioUrl || null,
          candidate.availableStartDate || null,
          candidate.willingToRelocate != null ? Boolean(candidate.willingToRelocate) : null,
          candidate.languages ? JSON.stringify(candidate.languages) : null,
          photoUrl || null,
          coverLetter || null,
          confirmationStatus || null,
          applicationId,
        ]
      )
    } else {
      // Insert new application
      const appResult = await DatabaseService.query(
        `INSERT INTO applications (
          company_id, job_id, candidate_id, current_stage, applied_at,
          expected_salary, salary_currency, salary_period,
          location, linkedin_url, portfolio_url,
          available_start_date, willing_to_relocate,
          languages, photo_url, cover_letter, source, confirmation_status
        ) VALUES (
          $1::uuid, $2::uuid, $3::uuid, 'screening', NOW(),
          $4, $5, $6,
          $7, $8, $9,
          $10, $11,
          $12::jsonb, $13, $14, $15, $16
        ) RETURNING id`,
        [
          companyId,
          jobId,
          candidateId,
          candidate.expectedSalary ? Number(candidate.expectedSalary) : null,
          candidate.salaryCurrency || 'USD',
          candidate.salaryPeriod || 'month',
          candidate.location || null,
          candidate.linkedinUrl || null,
          candidate.portfolioUrl || null,
          candidate.availableStartDate || null,
          candidate.willingToRelocate != null ? Boolean(candidate.willingToRelocate) : false,
          candidate.languages ? JSON.stringify(candidate.languages) : null,
          photoUrl || null,
          coverLetter || null,
          source,
          confirmationStatus || null,
        ]
      )

      applicationId = appResult?.[0]?.id || null
    }

    console.log(`✅ Application submitted: candidate=${candidateId}, job=${jobId}, app=${applicationId}`)

    return NextResponse.json({
      ok: true,
      candidateId,
      applicationId,
      message: 'Application submitted successfully',
    })
  } catch (err: any) {
    console.error('❌ Application submit error:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to submit application' },
      { status: 500 }
    )
  }
}
