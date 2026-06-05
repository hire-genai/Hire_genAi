/**
 * tests/utils/test-data.ts
 *
 * Central fixture data for all Playwright tests.
 * Import from this file — never hard-code test values in spec files.
 *
 * Contents:
 *   - VALID_OTP / WRONG_OTP / EXPIRED_OTP  — OTP test values
 *   - TEST_COMPANY                          — company fixture
 *   - TEST_USER                             — recruiter user fixture
 *   - TEST_ADMIN_USER                       — admin user fixture
 *   - TEST_JOB                              — job posting fixture
 *   - TEST_CANDIDATE                        — single candidate with CV
 *   - TEST_CANDIDATES                       — 5 candidates (mix of scores)
 *   - QUALIFIED_CANDIDATES                  — filtered view
 *   - UNQUALIFIED_CANDIDATES                — filtered view
 *   - STRIPE_TEST_CARDS                     — Stripe test card numbers
 *   - PRICING_PLANS                         — plan definitions
 *   - ROI_DEFAULTS                          — ROI calculator defaults
 *   - SMALL_PDF_BASE64                      — minimal valid PDF (1 page blank)
 */

// ─── OTP constants ────────────────────────────────────────────────────────────

/** Fixed OTP that the mocked /api/otp/verify-login endpoint accepts. */
export const VALID_OTP = '123456'

/** An incorrect OTP that the mock endpoint will reject. */
export const WRONG_OTP = '000000'

/**
 * A distinct OTP used to test "expired" scenarios.
 * Wire mockOTPVerifyAPI with a custom response body to simulate expiry rather
 * than relying on the value itself.
 */
export const EXPIRED_OTP = '999999'

// ─── Company fixture ─────────────────────────────────────────────────────────

/**
 * Full company fixture used in signup tests, session injection, and API mocks.
 * All fields reflect the schema in database/schema.sql (companies table).
 */
export const TEST_COMPANY = {
  /** Human-readable company name stored in companies.name */
  name: 'Playwright Test Corp',
  /** Used in session cookie and auth context */
  slug: 'playwright-test-corp',
  /** Primary contact email — must match TEST_USER.email domain */
  email: 'test@playwrightcorp.com',
  /** Email domain registered in company_domains table */
  domain: 'playwrightcorp.com',
  /** One of the industry options in the signup form */
  industry: 'Technology',
  /** One of the size options in the signup form */
  size: '11-50',
  /** Optional website URL */
  website: 'https://playwrightcorp.com',
  /** Optional phone number */
  phone: '+1-555-0100',
  /** Step 2 contact information */
  street: '123 Playwright Avenue',
  city: 'San Francisco',
  state: 'CA',
  postalCode: '94105',
  country: 'United States',
  /** Step 3 legal information */
  legalCompanyName: 'Playwright Test Corporation Inc.',
  taxId: '12-3456789',
  registrationNumber: 'REG-2024-PW',
}

// ─── User fixtures ────────────────────────────────────────────────────────────

/**
 * Primary test user — a recruiter belonging to TEST_COMPANY.
 * Used for loginAs(), mockAuthSession(), and API mock user payloads.
 */
export const TEST_USER = {
  /** Must share domain with TEST_COMPANY.domain */
  email: 'recruiter@playwrightcorp.com',
  name: 'Test Recruiter',
  firstName: 'Test',
  lastName: 'Recruiter',
  jobTitle: 'Talent Acquisition Specialist',
  role: 'recruiter' as const,
}

/**
 * Admin user fixture — elevated permissions within the same company.
 * Useful for tests that require admin-only UI elements.
 */
export const TEST_ADMIN_USER = {
  email: 'admin@playwrightcorp.com',
  name: 'Test Admin',
  firstName: 'Test',
  lastName: 'Admin',
  jobTitle: 'HR Director',
  role: 'admin' as const,
}

// ─── Job fixture ──────────────────────────────────────────────────────────────

/**
 * Fully populated job posting fixture.
 * Matches the fields accepted by POST /api/jobs and displayed by the jobs UI.
 */
export const TEST_JOB = {
  title: 'Senior Software Engineer',
  department: 'Engineering',
  location: 'Remote',
  type: 'Full-time',
  workMode: 'remote' as const,
  salaryMin: 80_000,
  salaryMax: 120_000,
  currency: 'USD',
  experienceYears: '3-5',
  description:
    'We are looking for a Senior Software Engineer to join our engineering team. ' +
    'You will design and implement scalable backend services and collaborate with ' +
    'cross-functional teams to deliver high-quality software.',
  requiredSkills: ['TypeScript', 'React', 'Node.js'],
  preferredSkills: ['PostgreSQL', 'Docker', 'AWS'],
  education: "Bachelor's degree in Computer Science or equivalent",
  numberOfOpenings: '2',
  status: 'open' as const,
}

// ─── Candidate fixtures ───────────────────────────────────────────────────────

/**
 * CV text used as the resumeText field in POST /api/applications/evaluate-cv.
 * Realistic enough to exercise the CV parser without being a real person's data.
 */
const MOCK_CV_TEXT = `
Jane Smith
jane.smith@example.com | +1 555 0200 | linkedin.com/in/janesmith

SUMMARY
Experienced software engineer with 5 years of TypeScript and React development.
Strong background in building scalable Node.js microservices on AWS.

EXPERIENCE
Senior Software Engineer — Acme Corp (2021–Present)
  • Architected a Node.js + PostgreSQL backend serving 2M requests/day
  • Led migration from JavaScript to TypeScript (100% type coverage)
  • Mentored team of 4 junior engineers

Software Engineer — Beta Inc (2019–2021)
  • Built React component library adopted by 6 product teams
  • Integrated Docker-based CI/CD pipeline reducing deploy time by 60%

EDUCATION
Bachelor of Science in Computer Science — Stanford University (2019)

SKILLS
TypeScript, React, Node.js, PostgreSQL, Docker, AWS, Git, REST APIs, GraphQL
`.trim()

/**
 * Single candidate fixture with a full CV text field.
 * Use when a test only needs one candidate (e.g. CV upload or evaluation tests).
 */
export const TEST_CANDIDATE = {
  id: 'cand-001',
  name: 'Jane Smith',
  email: 'jane.smith@example.com',
  phone: '+1-555-0200',
  score: 88,
  qualified: true,
  verdict: 'Strong Match',
  skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker', 'AWS'],
  experience_years: 5,
  education: "Bachelor's in Computer Science — Stanford University",
  /** Full resume text — used for CV evaluation tests */
  cvText: MOCK_CV_TEXT,
  /** Blob URL returned by POST /api/resumes/upload */
  resumeUrl: 'https://blob.vercel-storage.com/test-resumes/jane-smith-cv.pdf',
}

/**
 * Array of 5 candidates — a realistic mix of qualified and unqualified profiles.
 *
 * Score distribution:
 *   cand-001  88  Strong Match    (qualified)
 *   cand-002  72  Good Match      (qualified)
 *   cand-003  45  Weak Match      (unqualified)
 *   cand-004  30  Reject          (unqualified)
 *   cand-005  65  Moderate Match  (qualified)
 */
export const TEST_CANDIDATES = [
  {
    id: 'cand-001',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    phone: '+1-555-0101',
    score: 88,
    qualified: true,
    verdict: 'Strong Match',
    skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
    experience_years: 5,
    education: "Bachelor's in Computer Science",
    stage: 'ai_interview',
  },
  {
    id: 'cand-002',
    name: 'Bob Smith',
    email: 'bob@example.com',
    phone: '+1-555-0102',
    score: 72,
    qualified: true,
    verdict: 'Good Match',
    skills: ['React', 'JavaScript', 'CSS', 'Node.js'],
    experience_years: 3,
    education: "Bachelor's in Information Technology",
    stage: 'ai_interview',
  },
  {
    id: 'cand-003',
    name: 'Carol White',
    email: 'carol@example.com',
    phone: '+1-555-0103',
    score: 45,
    qualified: false,
    verdict: 'Weak Match',
    skills: ['HTML', 'CSS', 'Basic JavaScript'],
    experience_years: 1,
    education: 'Diploma in Web Design',
    stage: 'applied',
  },
  {
    id: 'cand-004',
    name: 'David Brown',
    email: 'david@example.com',
    phone: '+1-555-0104',
    score: 30,
    qualified: false,
    verdict: 'Reject',
    skills: ['Java', 'Spring Boot', 'MySQL'],
    experience_years: 2,
    education: "Bachelor's in Electronics Engineering",
    stage: 'applied',
  },
  {
    id: 'cand-005',
    name: 'Eva Martinez',
    email: 'eva@example.com',
    phone: '+1-555-0105',
    score: 65,
    qualified: true,
    verdict: 'Moderate Match',
    skills: ['React', 'TypeScript', 'REST APIs', 'Git'],
    experience_years: 4,
    education: "Master's in Computer Science",
    stage: 'ai_interview',
  },
]

/** Candidates whose `qualified` flag is true. */
export const QUALIFIED_CANDIDATES = TEST_CANDIDATES.filter(c => c.qualified)

/** Candidates whose `qualified` flag is false. */
export const UNQUALIFIED_CANDIDATES = TEST_CANDIDATES.filter(c => !c.qualified)

// ─── Stripe test cards ────────────────────────────────────────────────────────

/**
 * Stripe test card numbers for payment flow tests.
 * These only work against Stripe's test-mode API — they are safe to commit.
 *
 * @see https://stripe.com/docs/testing#cards
 */
export const STRIPE_TEST_CARDS = {
  /** Visa — always succeeds */
  valid: '4242424242424242',
  /** Generic card decline */
  declined: '4000000000000002',
  /** Insufficient funds */
  insufficientFunds: '4000000000009995',
  /** Requires 3-D Secure authentication */
  requiresAuth: '4000002500003155',
  /** Card expired */
  expired: '4000000000000069',
  /** Incorrect CVC */
  incorrectCvc: '4000000000000127',
  /** Fraudulent (flagged by Stripe Radar) */
  fraudulent: '4100000000000019',
}

// ─── Pricing plans ────────────────────────────────────────────────────────────

/**
 * Pricing plan definitions matching lib/config.ts tier names.
 * Used in pricing-page and subscription tests.
 */
export const PRICING_PLANS = [
  { name: 'Starter',      slug: 'starter',      monthlyPrice:   99, annualPrice:    990 },
  { name: 'Professional', slug: 'professional',  monthlyPrice:  499, annualPrice:  4_990 },
  { name: 'Business',     slug: 'business',      monthlyPrice:  999, annualPrice:  9_990 },
  { name: 'Large',        slug: 'large',         monthlyPrice: 2999, annualPrice: 29_990 },
  { name: 'Ultra',        slug: 'ultra',         monthlyPrice: 3999, annualPrice: 39_990 },
  { name: 'Enterprise',   slug: 'enterprise',    monthlyPrice: 4999, annualPrice: 49_990 },
]

// ─── ROI calculator defaults ──────────────────────────────────────────────────

/**
 * Default slider/input values for the ROI calculator page.
 * Used in roi-calculator spec to assert the initial rendered state.
 */
export const ROI_DEFAULTS = {
  recruiterCount: 1,
  cvsPerReq: 100,
  shortlistRate: 15,
  qualRate: 80,
  hourlyRate: 30,
  workDays: 5,
  dailyHours: 6,
}

// ─── Minimal PDF fixture ──────────────────────────────────────────────────────

/**
 * A minimal valid 1-page blank PDF encoded as base64.
 *
 * Use this when a test needs to attach / upload a PDF file without generating
 * a real one.  Convert to a Buffer for Playwright file uploads:
 *
 * @example
 * const pdfBuffer = Buffer.from(SMALL_PDF_BASE64, 'base64')
 * await page.setInputFiles('#resume-upload', {
 *   name: 'test-cv.pdf',
 *   mimeType: 'application/pdf',
 *   buffer: pdfBuffer,
 * })
 */
export const SMALL_PDF_BASE64 =
  'JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKL01lZGlhQm94IFswIDAgNjEyIDc5Ml0KPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgo+PgplbmRvYmoKeHJlZgowIDQKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDAwNTggMDAwMDAgbiAKMDAwMDAwMDE1NSAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDQKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjIwNAolJUVPRgo='
