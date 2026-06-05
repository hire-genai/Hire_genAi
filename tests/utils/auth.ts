/**
 * tests/utils/auth.ts
 *
 * Authentication helpers for Playwright tests.
 *
 * Three authentication strategies:
 *
 *   1. loginAs(page, email)
 *      Full OTP login flow through the UI with mocked API endpoints.
 *      Use when you are testing the login flow itself or need the
 *      browser to go through the real redirect sequence.
 *
 *   2. createAuthenticatedContext(browser, storagePath?)
 *      Builds a fully authenticated BrowserContext backed by a
 *      storageState file.  Call once in global setup, reuse in tests.
 *      Equivalent to playwright.config.ts storageState option but
 *      usable programmatically inside helper functions.
 *
 *   3. mockAuthSession(page)
 *      Injects a session cookie + localStorage entries directly so tests
 *      that don't care about the login flow can start pre-authenticated
 *      without any network round-trips.
 *
 * All three strategies are compatible with the app's MockAuthService
 * (no-database mode) and with the real database session format.
 *
 * Session shape written by the real app (auth-context.tsx / MockAuthService):
 *   localStorage["mockAuth"]       = JSON { user, company }
 *   localStorage["mockAuth_backup"] = same
 *   localStorage["sessionExpiresAt"] = epoch ms string (+1 h)
 *   localStorage["sessionStartTime"] = epoch ms string
 *   document.cookie["session"]     = url-encoded JSON { userId, companyId,
 *                                      companyName, fullName, email, role }
 */

import { type Page, type Browser, type BrowserContext } from '@playwright/test'
import { TEST_USER, TEST_COMPANY, VALID_OTP } from './test-data'
import path from 'path'
import fs from 'fs'

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? process.env.BASE_URL ?? 'http://localhost:3000'

/** Default path for the storageState JSON produced by createAuthenticatedContext. */
const DEFAULT_AUTH_STATE_PATH = path.join(__dirname, '..', 'e2e', '.auth', 'user.json')

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Build the URL-encoded cookie value matching MockAuthService.syncSessionToCookie. */
function buildSessionCookieValue(
  userId: string,
  companyId: string,
  companyName: string,
  fullName: string,
  email: string,
  role: string,
): string {
  const payload = { userId, companyId, companyName, fullName, email, role }
  return encodeURIComponent(JSON.stringify(payload))
}

/** Build the "mockAuth" localStorage value matching MockAuthService.setSessionFromServer. */
function buildMockAuthStorage(options: {
  userId: string
  email: string
  fullName: string
  role: string
  companyId: string
  companyName: string
  companySlug: string
  industry: string
  size: string
  website: string
}): string {
  return JSON.stringify({
    user: {
      id: options.userId,
      email: options.email,
      name: options.fullName,
      role: options.role,
      phone: '',
      timezone: 'UTC',
    },
    company: {
      id: options.companyId,
      name: options.companyName,
      slug: options.companySlug,
      industry: options.industry,
      size: options.size,
      website: options.website,
    },
  })
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Perform the full OTP login flow through the UI with mocked API endpoints.
 *
 * - Mocks POST /api/otp/send-login  → always returns { ok: true }
 * - Mocks POST /api/otp/verify-login → accepts VALID_OTP, rejects anything else
 * - Navigates to /login, fills email, submits, fills OTP, submits
 * - Waits for the post-login redirect to /dashboard or /jobs
 * - Returns the session cookie value (empty string when the mock does not set one)
 *
 * @param page  The Playwright page to operate on.
 * @param email Email address to log in with (defaults to TEST_USER.email).
 * @returns     The value of the "session" cookie after login, or "" if absent.
 *
 * @example
 * await loginAs(page)
 * await loginAs(page, 'manager@acme.com')
 */
export async function loginAs(page: Page, email: string = TEST_USER.email): Promise<string> {
  // ── Route interception ────────────────────────────────────────────────────

  // OTP send — always succeed; the real server returns { ok: true, otp } in dev
  await page.route('**/api/otp/send-login', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, message: 'OTP sent successfully', otp: VALID_OTP }),
    })
  })

  // OTP verify — accept VALID_OTP, reject everything else
  const sessionCookieValue = buildSessionCookieValue(
    'user-test-001',
    'co-test-001',
    TEST_COMPANY.name,
    TEST_USER.name,
    email,
    TEST_USER.role,
  )

  await page.route('**/api/otp/verify-login', async route => {
    const rawBody = route.request().postData() ?? '{}'
    let body: Record<string, string> = {}
    try {
      body = JSON.parse(rawBody)
    } catch {
      // ignore parse errors — fall through to the rejection branch
    }

    if (body.otp === VALID_OTP) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        // The real server sets the session cookie in the response headers.
        headers: {
          'Set-Cookie': `session=${sessionCookieValue}; Path=/; HttpOnly; SameSite=Lax`,
        },
        body: JSON.stringify({
          ok: true,
          user: {
            id: 'user-test-001',
            email,
            full_name: TEST_USER.name,
            status: 'active',
            role: TEST_USER.role,
          },
          company: {
            id: 'co-test-001',
            name: TEST_COMPANY.name,
            status: 'active',
            verified: false,
          },
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

  // ── UI flow ───────────────────────────────────────────────────────────────

  await page.goto(`${BASE_URL}/login`)

  // Wait for the email input to be ready (the page uses #email)
  await page.locator('#email').waitFor({ state: 'visible', timeout: 15_000 })

  await page.locator('#email').fill(email)
  // The button text is "Send OTP" (see login/page.tsx)
  await page.getByRole('button', { name: /Send OTP/i }).click()

  // Wait for the OTP input to appear (id="#otp")
  await page.locator('#otp').waitFor({ state: 'visible', timeout: 15_000 })
  await page.locator('#otp').fill(VALID_OTP)

  // Click "Verify & Sign in"
  await page.getByRole('button', { name: /Verify & Sign in/i }).click()

  // Wait for redirect away from /login
  await page.waitForURL(/\/(dashboard|jobs|candidates|settings)/, { timeout: 15_000 })

  // Retrieve and return the session cookie value
  const cookies = await page.context().cookies()
  const sessionCookie = cookies.find(c => c.name === 'session')
  return sessionCookie?.value ?? ''
}

/**
 * Create a fully authenticated BrowserContext backed by a persisted storageState.
 *
 * On first call (or when the state file does not exist) it performs the full
 * OTP login flow on a temporary page, saves the resulting storage state, and
 * returns the new context.  Subsequent calls with the same storagePath reuse
 * the saved file.
 *
 * @param browser     The Playwright Browser instance.
 * @param storagePath Path to store / read the storageState JSON.
 *                    Defaults to tests/e2e/.auth/user.json.
 * @returns           A new BrowserContext authenticated as TEST_USER.
 *
 * @example
 * // In global setup:
 * const context = await createAuthenticatedContext(browser, AUTH_STATE_PATH)
 * await context.close()
 *
 * // In playwright.config.ts:
 * use: { storageState: AUTH_STATE_PATH }
 */
export async function createAuthenticatedContext(
  browser: Browser,
  storagePath: string = DEFAULT_AUTH_STATE_PATH,
): Promise<BrowserContext> {
  // Ensure the directory exists
  const dir = path.dirname(storagePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  // If a valid state file already exists, reuse it
  if (fs.existsSync(storagePath)) {
    const context = await browser.newContext({ storageState: storagePath })
    return context
  }

  // Otherwise create a fresh authenticated session
  const context = await browser.newContext({ baseURL: BASE_URL, bypassCSP: true })
  const page = await context.newPage()

  try {
    await loginAs(page, TEST_USER.email)
    // Persist the authenticated storage state for future reuse
    await context.storageState({ path: storagePath })
  } finally {
    await page.close().catch(() => undefined)
  }

  return context
}

/**
 * Inject a complete authenticated session directly into the page without going
 * through the login UI.
 *
 * Writes:
 *   - localStorage["mockAuth"]          — user + company object
 *   - localStorage["mockAuth_backup"]   — same (backup copy the app reads on reload)
 *   - localStorage["sessionExpiresAt"]  — 1 hour from now
 *   - localStorage["sessionStartTime"]  — now
 *   - document.cookie["session"]        — URL-encoded JSON session payload
 *   - Also sets the cookie via Playwright's context API for API-route validation
 *
 * Use this when your test does NOT exercise the login flow and just needs to
 * start pre-authenticated.
 *
 * The page must already be navigated to the app origin (any page under BASE_URL)
 * so that localStorage / cookie writes are scoped to the correct origin.
 * If the page is about:blank this function navigates to BASE_URL first.
 *
 * @param page      The Playwright page to inject the session into.
 * @param overrides Optional overrides for user / company fields.
 *
 * @example
 * await page.goto('/')
 * await mockAuthSession(page)
 * await page.goto('/jobs')  // starts authenticated
 */
export async function mockAuthSession(
  page: Page,
  overrides?: {
    userId?: string
    email?: string
    fullName?: string
    role?: string
    companyId?: string
    companyName?: string
    companySlug?: string
    industry?: string
    size?: string
    website?: string
  },
): Promise<void> {
  const opts = {
    userId: overrides?.userId ?? 'user-test-001',
    email: overrides?.email ?? TEST_USER.email,
    fullName: overrides?.fullName ?? TEST_USER.name,
    role: overrides?.role ?? TEST_USER.role,
    companyId: overrides?.companyId ?? 'co-test-001',
    companyName: overrides?.companyName ?? TEST_COMPANY.name,
    companySlug: overrides?.companySlug ?? TEST_COMPANY.domain.replace(/\./g, '-'),
    industry: overrides?.industry ?? TEST_COMPANY.industry,
    size: overrides?.size ?? TEST_COMPANY.size,
    website: overrides?.website ?? TEST_COMPANY.website,
  }

  // Navigate to origin if on about:blank so storage writes land on the app's origin
  const currentUrl = page.url()
  if (!currentUrl.startsWith('http')) {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
  }

  const mockAuthValue = buildMockAuthStorage(opts)
  const sessionExpiry = (Date.now() + 60 * 60 * 1_000).toString()
  const cookieValue = buildSessionCookieValue(
    opts.userId,
    opts.companyId,
    opts.companyName,
    opts.fullName,
    opts.email,
    opts.role,
  )
  const cookieExpires = new Date(Date.now() + 60 * 60 * 1_000).toUTCString()

  // Write localStorage + document.cookie from inside the page context
  await page.evaluate(
    ({ mockAuthValue, sessionExpiry, cookieValue, cookieExpires }) => {
      localStorage.setItem('mockAuth', mockAuthValue)
      localStorage.setItem('mockAuth_backup', mockAuthValue)
      localStorage.setItem('sessionExpiresAt', sessionExpiry)
      localStorage.setItem('sessionStartTime', Date.now().toString())
      // Clear any "skip restore" flag that would cause the auth context to
      // ignore the session we just wrote
      sessionStorage.removeItem('skipAuthRestore')
      // Write the session cookie read by API route handlers
      document.cookie = `session=${cookieValue}; path=/; expires=${cookieExpires}; SameSite=Lax`
    },
    { mockAuthValue, sessionExpiry, cookieValue, cookieExpires },
  )

  // Also register the cookie via Playwright's context API so it is included
  // in fetch requests made through page.request / route.fetch
  const url = new URL(page.url())
  await page.context().addCookies([
    {
      name: 'session',
      value: cookieValue,
      domain: url.hostname,
      path: '/',
      httpOnly: false, // document.cookie-writable; real server sets httpOnly=true
      secure: url.protocol === 'https:',
      sameSite: 'Lax',
      expires: Math.floor(Date.now() / 1_000) + 60 * 60,
    },
  ])

  // Mock the /api/session endpoint that the auth context polls to validate
  // the session on every page load
  await page.route('**/api/session**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: opts.userId,
          email: opts.email,
          name: opts.fullName,
          role: opts.role,
          phone: '',
          timezone: 'UTC',
        },
        company: {
          id: opts.companyId,
          name: opts.companyName,
          slug: opts.companySlug,
          industry: opts.industry,
          size: opts.size,
          website: opts.website,
        },
      }),
    })
  })
}

/**
 * Clear all session state from the browser (localStorage + session cookie).
 *
 * Mirrors what the real logout handler in auth-context.tsx does.
 * The page must be on the app origin.
 *
 * @param page The page whose session should be cleared.
 */
export async function clearAuthSession(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('mockAuth')
    localStorage.removeItem('mockAuth_backup')
    localStorage.removeItem('sessionExpiresAt')
    localStorage.removeItem('sessionStartTime')
    // Expire the session cookie immediately
    document.cookie = 'session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
  })
  // Also clear via Playwright's context API
  const cookies = await page.context().cookies()
  const sessionCookie = cookies.find(c => c.name === 'session')
  if (sessionCookie) {
    await page.context().clearCookies()
  }
}

/**
 * Assert the session cookie is set with a non-empty value.
 * Throws if the cookie is absent or its value is empty.
 *
 * @param page The page whose context to inspect.
 */
export async function expectSessionCookieSet(page: Page): Promise<void> {
  const cookies = await page.context().cookies()
  const sessionCookie = cookies.find(c => c.name === 'session')
  if (!sessionCookie?.value) {
    throw new Error(
      `Expected "session" cookie to be set but it was ${sessionCookie ? 'empty' : 'absent'}.`,
    )
  }
}

/**
 * Assert the session cookie is absent or has been expired.
 * Useful for verifying that logout cleared the session correctly.
 *
 * @param page The page whose context to inspect.
 */
export async function expectSessionCookieCleared(page: Page): Promise<void> {
  const cookies = await page.context().cookies()
  const sessionCookie = cookies.find(c => c.name === 'session')
  const isCleared =
    !sessionCookie ||
    !sessionCookie.value ||
    sessionCookie.value === '' ||
    sessionCookie.expires === -1 ||
    sessionCookie.expires < Date.now() / 1_000

  if (!isCleared) {
    throw new Error(
      `Expected "session" cookie to be cleared after logout but it still has value: "${sessionCookie?.value}".`,
    )
  }
}
