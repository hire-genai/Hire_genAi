/**
 * scripts/seed-test-company.js
 *
 * Creates (or re-uses) a test company + recruiter user + one open job posting
 * in the real database so the apply-form E2E tests have something to hit.
 *
 * Run:
 *   node scripts/seed-test-company.js
 *
 * Outputs JSON:
 *   { companyId, companySlug, userId, jobId }
 *
 * Safe to run multiple times – uses ON CONFLICT / SELECT to avoid duplicates.
 */

require('dotenv').config({ path: '.env.local' })

const { neon } = require('@neondatabase/serverless')

const DB_URL = process.env.DATABASE_URL
if (!DB_URL) {
  console.error('DATABASE_URL not set in .env.local')
  process.exit(1)
}

const sql = neon(DB_URL)

const COMPANY_NAME  = 'E2E Test Corp'
const COMPANY_SLUG  = 'e2e-test-corp'
const USER_EMAIL    = 'recruiter@e2etestcorp.com'
const USER_NAME     = 'E2E Recruiter'
const JOB_TITLE     = 'Senior Software Engineer (E2E Test)'

async function seed() {
  // ── 1. Company ──────────────────────────────────────────────────────────
  let companyRows = await sql`
    SELECT id, slug FROM companies WHERE slug = ${COMPANY_SLUG} LIMIT 1
  `

  let companyId, companySlug

  if (companyRows.length > 0) {
    companyId   = companyRows[0].id
    companySlug = companyRows[0].slug
    console.log(`[seed] Company already exists: ${companyId} (${companySlug})`)
  } else {
    const inserted = await sql`
      INSERT INTO companies (name, slug, status, verified, created_at)
      VALUES (${COMPANY_NAME}, ${COMPANY_SLUG}, 'active', true, NOW())
      RETURNING id, slug
    `
    companyId   = inserted[0].id
    companySlug = inserted[0].slug
    console.log(`[seed] Created company: ${companyId} (${companySlug})`)
  }

  // ── 2. User (recruiter) ─────────────────────────────────────────────────
  let userRows = await sql`
    SELECT id FROM users WHERE email = ${USER_EMAIL} LIMIT 1
  `

  let userId

  if (userRows.length > 0) {
    userId = userRows[0].id
    console.log(`[seed] User already exists: ${userId}`)
  } else {
    const inserted = await sql`
      INSERT INTO users (company_id, email, full_name, status, created_at, updated_at)
      VALUES (${companyId}::uuid, ${USER_EMAIL}, ${USER_NAME}, 'active', NOW(), NOW())
      RETURNING id
    `
    userId = inserted[0].id
    console.log(`[seed] Created user: ${userId}`)

    // Give user the recruiter role
    await sql`
      INSERT INTO user_roles (user_id, role)
      VALUES (${userId}::uuid, 'recruiter')
      ON CONFLICT DO NOTHING
    `
  }

  // ── 3. Job posting ──────────────────────────────────────────────────────
  // Check if our test job already exists (by title + company)
  let jobRows = await sql`
    SELECT id FROM job_postings
    WHERE company_id = ${companyId}::uuid
      AND title = ${JOB_TITLE}
      AND status = 'open'
    LIMIT 1
  `

  let jobId

  if (jobRows.length > 0) {
    jobId = jobRows[0].id
    console.log(`[seed] Job already exists: ${jobId}`)
  } else {
    const inserted = await sql`
      INSERT INTO job_postings (
        company_id, created_by, title, department, location,
        job_type, work_mode,
        description,
        required_skills, preferred_skills,
        experience_years,
        number_of_openings,
        status, published_at, job_open_date,
        auto_schedule_interview,
        created_at, updated_at
      ) VALUES (
        ${companyId}::uuid,
        ${userId}::uuid,
        ${JOB_TITLE},
        'Engineering',
        'Remote',
        'Full-time',
        'Remote',
        'We are looking for a Senior Software Engineer to join our E2E test team. You will work on cutting-edge AI hiring tools.',
        ARRAY['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
        ARRAY['AWS', 'Docker', 'GraphQL'],
        '3-5 years',
        1,
        'open',
        NOW(),
        CURRENT_DATE,
        false,
        NOW(),
        NOW()
      )
      RETURNING id
    `
    jobId = inserted[0].id
    console.log(`[seed] Created job: ${jobId}`)
  }

  const result = { companyId, companySlug, userId, jobId }
  console.log('\n[seed] Done! Test data:')
  console.log(JSON.stringify(result, null, 2))
  console.log(`\n[seed] Apply URL: http://localhost:3000/apply/${companySlug}/${jobId}`)
  console.log(`[seed] Job listing URL: http://localhost:3000/jobs/${companySlug}/${jobId}`)

  return result
}

seed().catch(err => {
  console.error('[seed] Error:', err.message)
  process.exit(1)
})
