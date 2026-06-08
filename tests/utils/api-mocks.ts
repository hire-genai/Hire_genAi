/**
 * tests/utils/api-mocks.ts
 *
 * Playwright route-intercept factory functions for every significant API
 * endpoint in the hire_genai application.
 *
 * Design principles:
 *   - Each factory accepts a `page: Page` and an optional `response` /
 *     domain-specific override so callers can deviate from the default
 *     without reimplementing the route.
 *   - Default responses mirror the real server's success JSON so tests that
 *     only care about UI behaviour don't need to construct payloads.
 *   - Factories never throw; if the request cannot be matched the route is
 *     passed through with `route.continue()`.
 *   - Factories that distinguish GET vs POST / PUT / DELETE do so explicitly
 *     to avoid accidental interception of unrelated requests on the same path.
 *
 * Usage:
 *   import { mockJobsAPI, mockLoginAPI } from '../utils/api-mocks'
 *
 *   test('my test', async ({ page }) => {
 *     await mockLoginAPI(page)
 *     await mockJobsAPI(page, customJobs)
 *     // ... rest of test
 *   })
 */

import { type Page } from '@playwright/test'
import { TEST_CANDIDATES, TEST_JOB, TEST_COMPANY, TEST_USER, VALID_OTP } from './test-data'

// ─── Type helpers ────────────────────────────────────────────────────────────

/** Generic success/failure override for any mock. */
export interface MockOverride {
  status?: number
  body?: Record<string, unknown>
}

// ─── Default mock payloads ───────────────────────────────────────────────────

const DEFAULT_USER_PAYLOAD = {
  id: 'user-001',
  email: TEST_USER.email,
  full_name: TEST_USER.name,
  status: 'active',
  role: TEST_USER.role,
}

const DEFAULT_COMPANY_PAYLOAD = {
  id: 'co-001',
  name: TEST_COMPANY.name,
  status: 'active',
  verified: false,
  industry: TEST_COMPANY.industry,
  size_band: TEST_COMPANY.size,
  website_url: TEST_COMPANY.website,
}

const DEFAULT_SESSION_PAYLOAD = {
  id: 'session-001',
  refreshToken: 'rt-mock-001',
  expiresAt: new Date(Date.now() + 60 * 60 * 1_000).toISOString(),
}

/** Five mock jobs returned by GET /api/jobs */
export const DEFAULT_MOCK_JOBS = [
  {
    id: 'job-001',
    title: 'Senior Software Engineer',
    department: 'Engineering',
    status: 'open',
    location: 'Remote',
    work_mode: 'remote',
    applicants: 12,
    created_at: new Date().toISOString(),
  },
  {
    id: 'job-002',
    title: 'Product Manager',
    department: 'Product',
    status: 'open',
    location: 'New York',
    work_mode: 'hybrid',
    applicants: 5,
    created_at: new Date().toISOString(),
  },
  {
    id: 'job-003',
    title: 'UI/UX Designer',
    department: 'Design',
    status: 'draft',
    location: 'Remote',
    work_mode: 'remote',
    applicants: 0,
    created_at: new Date().toISOString(),
  },
]

// ─── Auth mocks ───────────────────────────────────────────────────────────────

/**
 * Mock POST /api/signup/complete.
 *
 * Default response: 200 with a stubbed user + company + session.
 * Pass `response` to override status code or response body.
 *
 * @example
 * // Happy path
 * await mockSignupAPI(page)
 *
 * // Simulate duplicate-user conflict
 * await mockSignupAPI(page, {
 *   status: 409,
 *   body: { error: 'User already exists. Please use login instead.' },
 * })
 */
export async function mockSignupAPI(page: Page, response?: MockOverride): Promise<void> {
  await page.route('**/api/signup/complete', async route => {
    if (route.request().method() !== 'POST') {
      return route.continue()
    }
    const status = response?.status ?? 200
    const body = response?.body ?? {
      ok: true,
      user: DEFAULT_USER_PAYLOAD,
      company: DEFAULT_COMPANY_PAYLOAD,
      session: DEFAULT_SESSION_PAYLOAD,
      checkoutUrl: null,
    }
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })
  })
}

/**
 * Mock POST /api/otp/send-login (OTP send step of the login flow).
 *
 * Default response: 200 with { ok: true, otp: VALID_OTP }.
 * The `otp` field is returned only in development mode by the real server.
 *
 * @example
 * await mockLoginAPI(page)
 *
 * // Simulate "user not found"
 * await mockLoginAPI(page, {
 *   status: 400,
 *   body: { error: 'User does not exist. Please sign up first before trying to login.' },
 * })
 */
export async function mockLoginAPI(page: Page, response?: MockOverride): Promise<void> {
  await page.route('**/api/otp/send-login', async route => {
    if (route.request().method() !== 'POST') {
      return route.continue()
    }
    const status = response?.status ?? 200
    const body = response?.body ?? {
      ok: true,
      message: 'OTP sent successfully',
      otp: VALID_OTP,
    }
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })
  })
}

/**
 * Mock POST /api/otp/verify-login (OTP verify step of the login flow).
 *
 * Default behaviour:
 *   - Accepts `otp` (defaults to VALID_OTP); returns 200 with user + company.
 *   - Rejects any other code with 400 { error: 'Invalid OTP...' }.
 *
 * Pass `response` to completely override the fulfilled response regardless of
 * the submitted OTP (useful for simulating server errors or lockouts).
 *
 * @param otp       The OTP value that will be accepted (defaults to VALID_OTP).
 * @param response  Override the response for any OTP value.
 *
 * @example
 * await mockOTPVerifyAPI(page)                    // accept VALID_OTP
 * await mockOTPVerifyAPI(page, '654321')          // accept a different code
 * await mockOTPVerifyAPI(page, VALID_OTP, {       // simulate rate-limit
 *   status: 429,
 *   body: { error: 'Too many failed attempts. Please try again later.' },
 * })
 */
export async function mockOTPVerifyAPI(
  page: Page,
  otp: string = VALID_OTP,
  response?: MockOverride,
): Promise<void> {
  await page.route('**/api/otp/verify-login', async route => {
    if (route.request().method() !== 'POST') {
      return route.continue()
    }

    // If caller provided a full override, return it unconditionally
    if (response) {
      return route.fulfill({
        status: response.status ?? 200,
        contentType: 'application/json',
        body: JSON.stringify(response.body ?? { ok: true }),
      })
    }

    // Otherwise inspect the submitted OTP
    let body: Record<string, string> = {}
    try {
      body = JSON.parse(route.request().postData() ?? '{}')
    } catch {
      // ignore
    }

    if (body.otp === otp) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          user: DEFAULT_USER_PAYLOAD,
          company: DEFAULT_COMPANY_PAYLOAD,
          session: DEFAULT_SESSION_PAYLOAD,
        }),
      })
    } else {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, error: 'Invalid OTP. Please check the code and try again.' }),
      })
    }
  })
}

// ─── Job mocks ────────────────────────────────────────────────────────────────

/**
 * Mock GET /api/jobs (jobs listing).
 *
 * Default response: 200 with DEFAULT_MOCK_JOBS array.
 *
 * @param jobs Custom array of job objects to return.
 *
 * @example
 * await mockJobsAPI(page)
 * await mockJobsAPI(page, [{ id: 'job-x', title: 'QA Engineer', status: 'open' }])
 */
export async function mockJobsAPI(page: Page, jobs = DEFAULT_MOCK_JOBS): Promise<void> {
  await page.route('**/api/jobs**', async route => {
    if (route.request().method() !== 'GET') {
      return route.continue()
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ jobs, total: jobs.length }),
    })
  })
}

/**
 * Mock POST /api/jobs (create job).
 *
 * Default response: 200 with a newly created job object.
 * Pass `response` to override.
 *
 * @example
 * await mockCreateJobAPI(page)
 * await mockCreateJobAPI(page, { status: 422, body: { error: 'Title is required' } })
 */
export async function mockCreateJobAPI(page: Page, response?: MockOverride): Promise<void> {
  await page.route('**/api/jobs', async route => {
    if (route.request().method() !== 'POST') {
      return route.continue()
    }
    const status = response?.status ?? 200
    const body = response?.body ?? {
      ok: true,
      job: {
        id: 'job-new-001',
        ...TEST_JOB,
        status: 'open',
        created_at: new Date().toISOString(),
      },
    }
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })
  })
}

// ─── CV / Application mocks ───────────────────────────────────────────────────

/**
 * Mock GET /api/applications and POST /api/applications/evaluate-cv (CV scan results).
 *
 * Intercepts:
 *   GET  glob:/api/applications  → returns the candidates array
 *   POST glob:/api/applications/evaluate-cv  → returns a stubbed evaluation
 *
 * @param results   Array of candidate evaluation objects (defaults to TEST_CANDIDATES).
 *
 * @example
 * await mockCVScanAPI(page)
 * await mockCVScanAPI(page, [qualifiedCandidate])
 */
export async function mockCVScanAPI(
  page: Page,
  results = TEST_CANDIDATES,
): Promise<void> {
  // GET applications listing
  await page.route('**/api/applications**', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ applications: results, total: results.length }),
      })
    } else {
      await route.continue()
    }
  })

  // POST evaluate-cv — return a stubbed evaluation for the first result
  await page.route('**/api/applications/evaluate-cv', async route => {
    if (route.request().method() !== 'POST') {
      return route.continue()
    }
    const first = results[0]
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        evaluation: {
          overall: {
            score_percent: first?.score ?? 75,
            qualified: first?.qualified ?? true,
            reason_summary: first?.verdict ?? 'Good match',
          },
          scores: {
            skills: first?.score ?? 75,
            experience: first?.score ?? 70,
            education: 80,
          },
          extracted: {
            skills: first?.skills ?? [],
            experience_years: first?.experience_years ?? 3,
          },
          eligibility: { eligible: first?.qualified ?? true },
          risk_adjustments: [],
          explainable_score: {
            breakdown: [],
            final_score: first?.score ?? 75,
          },
        },
      }),
    })
  })
}

/**
 * Mock GET /api/report/[jobId]/[candidateId] and POST /api/invoice/generate-pdf
 * to return a minimal PDF binary so PDF-download tests do not need Puppeteer.
 *
 * @param response Optional override (e.g. to simulate a 500 error).
 *
 * @example
 * await mockReportAPI(page)
 */
export async function mockReportAPI(page: Page, response?: MockOverride): Promise<void> {
  const pdfBody = Buffer.from(
    // Minimal valid 1-page PDF (base64 → binary)
    'JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKL01lZGlhQm94IFswIDAgNjEyIDc5Ml0KPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgo+PgplbmRvYmoKeHJlZgowIDQKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDAwNTggMDAwMDAgbiAKMDAwMDAwMDE1NSAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDQKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjIwNAolJUVPRgo=',
    'base64',
  )

  await page.route('**/api/report/**', async route => {
    if (response) {
      return route.fulfill({
        status: response.status ?? 500,
        contentType: 'application/json',
        body: JSON.stringify(response.body ?? { error: 'Failed to generate report' }),
      })
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/pdf',
      headers: { 'Content-Disposition': 'attachment; filename="candidate-report.pdf"' },
      body: pdfBody,
    })
  })

  await page.route('**/api/invoice/generate-pdf**', async route => {
    if (response) {
      return route.fulfill({
        status: response.status ?? 500,
        contentType: 'application/json',
        body: JSON.stringify(response.body ?? { error: 'Failed to generate PDF' }),
      })
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/pdf',
      headers: { 'Content-Disposition': 'attachment; filename="invoice.pdf"' },
      body: pdfBody,
    })
  })
}

/**
 * Mock POST /api/talent-pool/send-email and related email-sending endpoints.
 *
 * Intercepts:
 *   POST glob:/api/talent-pool/send-email
 *   POST glob:/api/email-templates
 *   POST glob:/api/admin/send-email
 *
 * Default response: 200 { ok: true, message: 'Email sent successfully' }
 *
 * @param response Optional override.
 *
 * @example
 * await mockEmailSendAPI(page)
 * await mockEmailSendAPI(page, { status: 503, body: { error: 'SMTP unavailable' } })
 */
export async function mockEmailSendAPI(page: Page, response?: MockOverride): Promise<void> {
  const status = response?.status ?? 200
  const body = response?.body ?? { ok: true, message: 'Email sent successfully' }

  const emailRoutes = [
    '**/api/talent-pool/send-email',
    '**/api/email-templates',
    '**/api/admin/send-email',
  ]

  for (const pattern of emailRoutes) {
    await page.route(pattern, async route => {
      if (route.request().method() !== 'POST') {
        return route.continue()
      }
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(body),
      })
    })
  }
}

// ─── Payment / Stripe mocks ───────────────────────────────────────────────────

/**
 * Mock all Stripe API endpoints:
 *   POST /api/stripe/checkout
 *   POST /api/stripe/confirm
 *   GET  /api/stripe/verify
 *
 * Default response: 200 with a stubbed Stripe checkout URL.
 * Pass `response` with status 400/500 to simulate failures.
 *
 * @example
 * await mockStripeAPI(page)
 * await mockStripeAPI(page, { status: 400, body: { error: 'Card declined' } })
 */
export async function mockStripeAPI(page: Page, response?: MockOverride): Promise<void> {
  const status = response?.status ?? 200
  const body =
    response?.body ??
    ({
      ok: true,
      url: 'https://checkout.stripe.com/pay/cs_test_playwright_mock',
      sessionId: 'cs_test_playwright_mock',
    } as Record<string, unknown>)

  await page.route('**/api/stripe/**', async route => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })
  })
}

/**
 * Mock GET /api/billing/status and related billing endpoints that return the
 * company's current subscription status.
 *
 * @param response Optional override.  Defaults to an active Starter subscription.
 *
 * @example
 * await mockSubscriptionAPI(page)
 * await mockSubscriptionAPI(page, {
 *   body: { subscription: null },  // no active subscription
 * })
 */
export async function mockSubscriptionAPI(page: Page, response?: MockOverride): Promise<void> {
  const status = response?.status ?? 200
  const body = response?.body ?? {
    subscription: {
      id: 'sub-001',
      plan: 'Starter',
      status: 'active',
      provider: 'stripe',
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1_000).toISOString(),
    },
    wallet: {
      balance: 50.0,
      currency: 'USD',
    },
  }

  await page.route('**/api/billing/status**', async route => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })
  })

  // Also intercept the broader billing settings route
  await page.route('**/api/billing/settings**', async route => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })
  })
}

// ─── Session mock ─────────────────────────────────────────────────────────────

/**
 * Mock GET /api/session so that the auth context picks up a pre-authenticated
 * user without needing a real session cookie validation from the server.
 *
 * @param response Optional override.
 *
 * @example
 * await mockSessionAPI(page)
 */
export async function mockSessionAPI(page: Page, response?: MockOverride): Promise<void> {
  const status = response?.status ?? 200
  const body = response?.body ?? {
    user: {
      id: 'user-001',
      email: TEST_USER.email,
      name: TEST_USER.name,
      role: TEST_USER.role,
      phone: '',
      timezone: 'UTC',
    },
    company: {
      id: 'co-001',
      name: TEST_COMPANY.name,
      slug: 'playwright-test-corp',
      industry: TEST_COMPANY.industry,
      size: TEST_COMPANY.size,
      website: TEST_COMPANY.website,
    },
  }

  await page.route('**/api/session**', async route => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })
  })
}

// ─── Convenience: install all common mocks at once ───────────────────────────

/**
 * Install the minimal set of mocks needed for any authenticated page test:
 *   - Session validation (GET /api/session)
 *   - Jobs listing (GET /api/jobs)
 *   - Subscription status (GET /api/billing/status)
 *
 * Call this in beforeEach for test files that only care about UI behaviour
 * on protected pages.
 *
 * @example
 * test.beforeEach(async ({ page }) => {
 *   await installCommonMocks(page)
 *   await mockAuthSession(page)  // from auth.ts
 * })
 */
export async function installCommonMocks(page: Page): Promise<void> {
  await mockSessionAPI(page)
  await mockJobsAPI(page)
  await mockSubscriptionAPI(page)
}

// ── Aliases used by workflow-generated specs ──────────────────────────────────
export const mockJobsListAPI = mockJobsAPI
export const mockEmailReportAPI = mockEmailSendAPI
export const mockResumeUploadAPI = mockCVScanAPI
export const mockJDGenerationAPI = mockCreateJobAPI
export const mockOTPSendAPI = mockLoginAPI
