/**
 * Playwright Global Setup — bypasses OTP and DATABASE completely.
 *
 * Strategy:
 *   1. Launch a browser, navigate to localhost:3000.
 *   2. Write the exact same localStorage keys that MockAuthService writes
 *      (mockAuth, mockAuth_backup, sessionStartTime, sessionExpiresAt).
 *   3. Write the session cookie in the same format syncSessionToCookie uses:
 *      session=<url-encoded-json> with { userId, companyId, companyName, fullName, email, role }.
 *   4. Navigate to /dashboard and confirm no redirect to /login.
 *   5. Save storageState → tests/e2e/.auth/user.json.
 *
 * No DATABASE_URL, no OTP APIs, no email services needed.
 */

import path from 'path'
import fs from 'fs'
import { chromium } from '@playwright/test'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'
const AUTH_FILE = path.join(__dirname, '.auth', 'user.json')

// ── Test credentials ──────────────────────────────────────────────────────────
const USER_ID      = '00000000-0000-4000-a000-000000000099'
const COMPANY_ID   = '00000000-0000-4000-b000-000000000099'
const USER_EMAIL   = process.env.TEST_USER_EMAIL ?? 'e2e-test@playwrightcorp.com'
const USER_NAME    = 'E2E Test User'
const USER_ROLE    = 'manager'
const COMPANY_NAME = 'E2E Test Company'
const COMPANY_SLUG = 'e2e-test-company'

// ── Session objects ───────────────────────────────────────────────────────────

const MOCK_AUTH = {
  user: {
    id: USER_ID,
    email: USER_EMAIL,
    name: USER_NAME,
    role: USER_ROLE,
    phone: '',
    timezone: 'UTC',
  },
  company: {
    id: COMPANY_ID,
    name: COMPANY_NAME,
    slug: COMPANY_SLUG,
    industry: 'Technology',
    size: '1-10',
    website: '',
  },
}

const COOKIE_PAYLOAD = {
  userId: USER_ID,
  companyId: COMPANY_ID,
  companyName: COMPANY_NAME,
  fullName: USER_NAME,
  email: USER_EMAIL,
  role: USER_ROLE,
}

export default async function globalSetup(): Promise<void> {
  console.log('[global.setup] Starting — direct session injection (no OTP, no DB)')
  console.log(`[global.setup] BASE_URL = ${BASE_URL}`)

  // Ensure .auth directory exists
  const authDir = path.dirname(AUTH_FILE)
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true })

  const browser = await chromium.launch()
  const context = await browser.newContext({ baseURL: BASE_URL, bypassCSP: true })
  const page = await context.newPage()

  try {
    // Step 1 — land on the app so localStorage writes go to the correct origin
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 })

    // Step 2 — write localStorage + cookie exactly as MockAuthService does
    const expiresAt = (Date.now() + 60 * 60 * 1000).toString()
    const sessionCookieValue = encodeURIComponent(JSON.stringify(COOKIE_PAYLOAD))
    const cookieExpires = new Date(Date.now() + 60 * 60 * 1000).toUTCString()
    const mockAuthStr = JSON.stringify(MOCK_AUTH)

    await page.evaluate(
      ({ mockAuthStr, expiresAt, sessionCookieValue, cookieExpires }) => {
        // localStorage keys (matches MockAuthService)
        localStorage.setItem('mockAuth', mockAuthStr)
        localStorage.setItem('mockAuth_backup', mockAuthStr)
        localStorage.setItem('sessionStartTime', Date.now().toString())
        localStorage.setItem('sessionExpiresAt', expiresAt)
        // Remove any flag that blocks auth context from restoring the session
        sessionStorage.removeItem('skipAuthRestore')
        // Cookie (matches syncSessionToCookie)
        document.cookie = `session=${sessionCookieValue}; path=/; expires=${cookieExpires}; SameSite=Lax`
      },
      { mockAuthStr, expiresAt, sessionCookieValue, cookieExpires },
    )

    console.log('[global.setup] Session written to localStorage + cookie')

    // Step 3 — verify: navigate to /dashboard — must NOT redirect to /login
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 20_000 })
    const finalUrl = page.url()
    if (finalUrl.includes('/login')) {
      throw new Error(
        `[global.setup] Auth injection failed — /dashboard redirected to /login.\n` +
        `Current URL: ${finalUrl}`,
      )
    }
    console.log(`[global.setup] Dashboard accessible at: ${finalUrl}`)

    // Step 4 — save authenticated storageState
    await context.storageState({ path: AUTH_FILE })
    console.log(`[global.setup] Auth state saved → ${AUTH_FILE}`)
    console.log('[global.setup] Setup complete ✓')
  } catch (err) {
    console.error('[global.setup] FAILED:', err)
    throw err
  } finally {
    await page.close().catch(() => undefined)
    await context.close().catch(() => undefined)
    await browser.close().catch(() => undefined)
  }
}
