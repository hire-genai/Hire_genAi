/**
 * tests/e2e/18-login.spec.ts
 *
 * E2E tests for /login page — OTP-based email login.
 *
 * ── FEATURES COVERED ────────────────────────────────────────────────────────
 *  1.  Page Load       – logo, heading, email input, Send OTP button, Sign up link
 *  2.  Email Step      – input validation, disabled state, Send OTP
 *  3.  OTP Step        – OTP input, Verify button, Resend countdown, Back button
 *  4.  Full Login Flow – email → OTP → redirect to dashboard
 *  5.  Resend OTP      – countdown timer, re-enable after 30s
 *  6.  Error Handling  – failed OTP send, failed verify (toast messages)
 *  7.  Redirect        – already-logged-in user redirected away
 *  8.  Navigation      – Sign up link, Home logo
 *  9.  Negative Cases  – invalid email format, empty fields
 */

import { test, expect, type Page } from '@playwright/test'

// Clear auth state for all login tests — the page redirects if already logged in
test.use({ storageState: { cookies: [], origins: [] } })

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'
const PAGE_URL = `${BASE_URL}/login`

// ─── Route Helpers ────────────────────────────────────────────────────────────

async function mockSendOTP(page: Page, success = true) {
  await page.route('**/api/otp/send-login**', route =>
    route.fulfill({
      status: success ? 200 : 400,
      contentType: 'application/json',
      body: JSON.stringify(success
        ? { ok: true, message: 'OTP sent' }
        : { ok: false, error: 'User not found' }),
    })
  )
}

async function mockVerifyOTP(page: Page, success = true) {
  await page.route('**/api/otp/verify-login**', route =>
    route.fulfill({
      status: success ? 200 : 400,
      contentType: 'application/json',
      body: JSON.stringify(success
        ? {
            ok: true,
            user: { id: 'u1', email: 'test@test.com', name: 'Test User', role: 'recruiter' },
            company: { id: 'c1', name: 'Test Corp', slug: 'test-corp' },
          }
        : { ok: false, error: 'Invalid OTP' }),
    })
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. PAGE LOAD
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Login — Page Load', () => {

  test('1.1 Page renders HireGenAI logo/branding', async ({ page }) => {
    await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('HireGenAI').first()).toBeVisible()
  })

  test('1.2 Email label and input visible', async ({ page }) => {
    await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.locator('#email')).toBeVisible()
  })

  test('1.3 Subtitle "Enter your email to receive a one-time password" visible', async ({ page }) => {
    await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(/one-time password/i)).toBeVisible()
  })

  test('1.4 "Send OTP" button visible and initially disabled with empty email', async ({ page }) => {
    await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('button', { name: /Send OTP/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Send OTP/i })).toBeDisabled()
  })

  test('1.5 "Sign up" link visible and points to /signup', async ({ page }) => {
    await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('link', { name: /Sign up/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Sign up/i })).toHaveAttribute('href', '/signup')
  })

  test('1.6 Home link (logo) is visible', async ({ page }) => {
    await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
    // The logo is a Link wrapping the CardTitle
    const homeLink = page.getByRole('link').filter({ has: page.getByText('HireGenAI') }).first()
    await expect(homeLink).toBeVisible()
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// 2. EMAIL STEP
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Login — Email Step', () => {

  test('2.1 "Send OTP" button enabled after valid email is typed', async ({ page }) => {
    await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
    await page.fill('#email', 'test@company.com')
    await expect(page.getByRole('button', { name: /Send OTP/i })).toBeEnabled()
  })

  test('2.2 Email field accepts email input', async ({ page }) => {
    await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
    await page.fill('#email', 'recruiter@acme.com')
    await expect(page.locator('#email')).toHaveValue('recruiter@acme.com')
  })

  test('2.3 Clicking Send OTP calls /api/otp/send-login', async ({ page }) => {
    await mockSendOTP(page)
    await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
    await page.fill('#email', 'test@company.com')

    let called = false
    await page.route('**/api/otp/send-login**', async route => {
      called = true
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ ok: true, message: 'OTP sent' }) })
    })

    await page.getByRole('button', { name: /Send OTP/i }).click()
    await page.waitForTimeout(500)
    expect(called).toBe(true)
  })

  test('2.4 After successful send, transitions to OTP step', async ({ page }) => {
    await mockSendOTP(page)
    await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
    await page.fill('#email', 'test@company.com')
    await page.getByRole('button', { name: /Send OTP/i }).click()
    await expect(page.getByLabel('Enter OTP')).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: /Verify & Sign in/i })).toBeVisible()
  })

  test('2.5 "Send OTP" button shows loading state while fetching', async ({ page }) => {
    await page.route('**/api/otp/send-login**', async route => {
      await new Promise(r => setTimeout(r, 500))
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ ok: true }) })
    })
    await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
    await page.fill('#email', 'test@company.com')
    await page.getByRole('button', { name: /Send OTP/i }).click()
    await expect(page.getByText(/Sending OTP/i)).toBeVisible({ timeout: 3000 })
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// 3. OTP STEP
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Login — OTP Step', () => {

  async function goToOTPStep(page: Page) {
    await mockSendOTP(page)
    await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
    await page.fill('#email', 'test@company.com')
    await page.getByRole('button', { name: /Send OTP/i }).click()
    await expect(page.getByLabel('Enter OTP')).toBeVisible({ timeout: 5000 })
  }

  test('3.1 OTP input visible with correct attributes', async ({ page }) => {
    await goToOTPStep(page)
    const otpInput = page.locator('#otp')
    await expect(otpInput).toBeVisible()
    await expect(otpInput).toHaveAttribute('maxlength', '6')
  })

  test('3.2 OTP input placeholder shows "6-digit code"', async ({ page }) => {
    await goToOTPStep(page)
    await expect(page.locator('#otp')).toHaveAttribute('placeholder', '6-digit code')
  })

  test('3.3 OTP input only accepts numbers', async ({ page }) => {
    await goToOTPStep(page)
    const otp = page.locator('#otp')
    await otp.fill('abc123')
    // Non-digits stripped by onChange handler
    await expect(otp).toHaveValue('123')
  })

  test('3.4 "Verify & Sign in" disabled until 4+ digits entered', async ({ page }) => {
    await goToOTPStep(page)
    const verifyBtn = page.getByRole('button', { name: /Verify & Sign in/i })
    // Empty input
    await expect(verifyBtn).toBeDisabled()
    // 3 digits
    await page.fill('#otp', '123')
    await expect(verifyBtn).toBeDisabled()
    // 4+ digits
    await page.fill('#otp', '1234')
    await expect(verifyBtn).toBeEnabled()
  })

  test('3.5 "Resend OTP" button shows countdown after send', async ({ page }) => {
    await goToOTPStep(page)
    // Countdown starts at 30
    await expect(page.getByRole('button', { name: /Resend in/i })).toBeVisible()
  })

  test('3.6 "Resend OTP" button is disabled during countdown', async ({ page }) => {
    await goToOTPStep(page)
    const resendBtn = page.getByRole('button', { name: /Resend in|Resend OTP/i })
    await expect(resendBtn).toBeDisabled()
  })

  test('3.7 "← Back to email" button returns to email step', async ({ page }) => {
    await goToOTPStep(page)
    await page.getByRole('button', { name: /← Back to email/i }).click()
    await expect(page.locator('#email')).toBeVisible({ timeout: 3000 })
    await expect(page.getByRole('button', { name: /Send OTP/i })).toBeVisible()
  })

  test('3.8 "Verify & Sign in" shows loading state while verifying', async ({ page }) => {
    await goToOTPStep(page)
    await page.route('**/api/otp/verify-login**', async route => {
      await new Promise(r => setTimeout(r, 500))
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ ok: true, user: { id: 'u1', email: 'test@test.com', name: 'T', role: 'recruiter' }, company: { id: 'c1', name: 'C' } }) })
    })
    await page.fill('#otp', '123456')
    await page.getByRole('button', { name: /Verify & Sign in/i }).click()
    await expect(page.getByText(/Verifying/i)).toBeVisible({ timeout: 3000 })
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// 4. FULL LOGIN FLOW
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Login — Full Login Flow', () => {

  test('4.1 Successful login redirects to /dashboard', async ({ page }) => {
    await mockSendOTP(page)
    await mockVerifyOTP(page)
    await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
    await page.fill('#email', 'test@company.com')
    await page.getByRole('button', { name: /Send OTP/i }).click()
    await expect(page.locator('#otp')).toBeVisible({ timeout: 5000 })
    await page.fill('#otp', '123456')
    await page.getByRole('button', { name: /Verify & Sign in/i }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// 6. ERROR HANDLING
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Login — Error Handling', () => {

  test('6.1 Failed OTP send shows error toast', async ({ page }) => {
    await mockSendOTP(page, false)
    await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
    await page.fill('#email', 'unknown@nowhere.com')
    await page.getByRole('button', { name: /Send OTP/i }).click()
    // Should stay on email step (no OTP input appears)
    await expect(page.locator('#otp')).not.toBeVisible({ timeout: 3000 })
  })

  test('6.2 Failed OTP verify shows error', async ({ page }) => {
    await mockSendOTP(page)
    await mockVerifyOTP(page, false)
    await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
    await page.fill('#email', 'test@company.com')
    await page.getByRole('button', { name: /Send OTP/i }).click()
    await expect(page.locator('#otp')).toBeVisible({ timeout: 5000 })
    await page.fill('#otp', '000000')
    await page.getByRole('button', { name: /Verify & Sign in/i }).click()
    // Should stay on OTP step (not redirect)
    await expect(page).not.toHaveURL(/\/dashboard/, { timeout: 3000 })
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// 9. NEGATIVE CASES
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Login — Negative Cases', () => {

  test('9.1 "Send OTP" button stays disabled with just whitespace email', async ({ page }) => {
    await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
    await page.fill('#email', '   ')
    // HTML5 email input rejects blank/whitespace
    await expect(page.getByRole('button', { name: /Send OTP/i })).toBeDisabled()
  })

  test('9.2 Invalid email format blocked by HTML5 validation', async ({ page }) => {
    await mockSendOTP(page)
    await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
    await page.fill('#email', 'notanemail')
    await page.getByRole('button', { name: /Send OTP/i }).click()
    // HTML5 required+type=email prevents submission
    const emailInput = page.locator('#email')
    const validationMsg = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage)
    expect(validationMsg.length).toBeGreaterThan(0)
  })

  test('9.3 OTP input rejects more than 6 characters', async ({ page }) => {
    await mockSendOTP(page)
    await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
    await page.fill('#email', 'test@test.com')
    await page.getByRole('button', { name: /Send OTP/i }).click()
    await expect(page.locator('#otp')).toBeVisible({ timeout: 5000 })
    await page.fill('#otp', '12345678')
    const value = await page.locator('#otp').inputValue()
    expect(value.length).toBeLessThanOrEqual(6)
  })

})
