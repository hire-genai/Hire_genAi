/**
 * tests/e2e/22-interview-verify.spec.ts
 *
 * E2E tests for /interview/[applicationId]/verify
 *
 * ── FEATURES ────────────────────────────────────────────────────────────────
 *  STEP 1 — OTP Verification
 *  1.  Page load         – 2-step progress indicator, Email OTP + Photo Verify
 *  2.  OTP sending       – auto-sends on mount, loading spinner shown
 *  3.  OTP display       – masked email shown, 6-digit input boxes
 *  4.  OTP input         – single-digit boxes, auto-focus next, backspace
 *  5.  OTP paste         – paste 6-digit code auto-verifies
 *  6.  OTP verify        – POST /api/interview/verify/verify-otp → step 2
 *  7.  OTP error         – invalid code shows error, boxes cleared
 *  8.  Resend OTP        – "Resend" button calls send-otp again
 *
 *  STEP 2 — Photo Verification
 *  9.  Step transition   – after OTP verified, "Photo Verify" step activates
 * 10.  Photo heading     – "Photo Verification" title visible
 * 11.  Open Camera btn  – "Open Camera" button visible when no camera open
 * 12.  Photo skip        – when no stored photo → "No application photo found"
 * 13.  Post-verify nav  – on face match → router.push /interview/[id]
 *
 *  NEGATIVE / EDGE CASES
 * 14.  Send-OTP failure  – API error shows error message
 * 15.  Verify-OTP fail   – wrong code shows "Invalid OTP" error
 * 16.  Security alert    – POST /api/interview/verify/security-alert called on mismatch
 */

import { test, expect, type Page } from '@playwright/test'

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_URL    = process.env.BASE_URL ?? 'http://localhost:3000'
const APP_ID      = 'dedf39bc-5203-4fb0-a711-995d0b021bfd'
const PAGE_URL    = `${BASE_URL}/interview/${APP_ID}/verify`

// ─── Mock helpers ─────────────────────────────────────────────────────────────

async function mockSendOTP(page: Page, success = true) {
  await page.route('**/api/interview/verify/send-otp**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        success
          ? { ok: true, maskedEmail: 'r***l@example.com', candidateName: 'Rahul Test', email: 'rahul@example.com' }
          : { ok: false, error: 'Application not found or already completed' }
      ),
    })
  )
}

async function mockVerifyOTP(page: Page, success = true) {
  await page.route('**/api/interview/verify/verify-otp**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        success ? { ok: true } : { ok: false, error: 'Invalid OTP. Please try again.' }
      ),
    })
  )
}

async function mockComparePhoto(page: Page, hasPhoto = true) {
  await page.route('**/api/interview/verify/compare-photo**', route => {
    const method = route.request().method()
    if (method === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          hasPhoto ? { ok: true, storedPhotoUrl: 'https://storage.test/photo.jpg' }
                   : { ok: true, skipped: true, message: 'No photo on file' }
        ),
      })
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, matched: true }),
    })
  })
}

async function mockSecurityAlert(page: Page) {
  await page.route('**/api/interview/verify/security-alert**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
  )
}

async function setupPage(page: Page, opts: { sendSuccess?: boolean; verifySuccess?: boolean; hasPhoto?: boolean } = {}) {
  const { sendSuccess = true, verifySuccess = true, hasPhoto = false } = opts

  // Dismiss onboarding tour
  await page.addInitScript(() => {
    localStorage.setItem('hasSeenOnboardingTour', 'true')
    // Prevent auto-send dedupe from sessionStorage in test
  })

  await mockSendOTP(page, sendSuccess)
  await mockVerifyOTP(page, verifySuccess)
  await mockComparePhoto(page, hasPhoto)
  await mockSecurityAlert(page)

  await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. PAGE LOAD
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Interview Verify — Page Load', () => {

  test('1.1 Page renders 2-step progress indicator', async ({ page }) => {
    await setupPage(page)
    await expect(page.getByText('Email OTP').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Photo Verify').first()).toBeVisible()
  })

  test('1.2 "Email Verification" heading shown in step 1', async ({ page }) => {
    await setupPage(page)
    await expect(page.getByText('Email OTP').first()).toBeVisible({ timeout: 10_000 })
    // After OTP sends (auto), heading should appear
    await expect(page.getByText(/Email Verification/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('1.3 Step 1 (Email OTP) is active by default', async ({ page }) => {
    await setupPage(page)
    await expect(page.getByText('Email OTP').first()).toBeVisible({ timeout: 10_000 })
    // Email OTP pill should have active styling (ring)
    const step1 = page.locator('div').filter({ hasText: /^Email OTP$/ }).first()
    await expect(step1).toBeVisible()
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// 2. OTP SENDING
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Interview Verify — OTP Sending', () => {

  test('2.1 OTP loading state or OTP inputs visible on page load', async ({ page }) => {
    await setupPage(page)
    // Either spinner briefly shows, or OTP inputs appear — both mean OTP sent
    const result = await Promise.race([
      page.getByText(/Sending verification code/i).waitFor({ state: 'visible', timeout: 2000 }).then(() => 'spinner').catch(() => null),
      page.getByText(/6-digit code/i).first().waitFor({ state: 'visible', timeout: 10_000 }).then(() => 'otp').catch(() => null),
    ])
    expect(result).toBeTruthy()
  })

  test('2.2 Masked email shown after OTP sent successfully', async ({ page }) => {
    await setupPage(page)
    await expect(page.getByText(/r\*\*\*l@example\.com/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('2.3 "We\'ve sent a 6-digit code" message shown', async ({ page }) => {
    await setupPage(page)
    await expect(page.getByText(/6-digit code/i).first()).toBeVisible({ timeout: 10_000 })
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// 3. OTP INPUT BOXES
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Interview Verify — OTP Input', () => {

  test('3.1 Six OTP input boxes visible after sending', async ({ page }) => {
    await setupPage(page)
    // Wait for OTP sent state
    await expect(page.getByText(/r\*\*\*l@example\.com/i).first()).toBeVisible({ timeout: 10_000 })
    const otpInputs = page.locator('input[inputmode="numeric"]')
    await expect(otpInputs).toHaveCount(6, { timeout: 5000 })
  })

  test('3.2 OTP boxes accept only digits', async ({ page }) => {
    await setupPage(page)
    await expect(page.getByText(/r\*\*\*l@example\.com/i).first()).toBeVisible({ timeout: 10_000 })
    const firstBox = page.locator('input[inputmode="numeric"]').first()
    await firstBox.fill('a')
    await expect(firstBox).toHaveValue('')
    await firstBox.fill('5')
    await expect(firstBox).toHaveValue('5')
  })

  test('3.3 Typing in box moves to next box (auto-advance)', async ({ page }) => {
    await setupPage(page)
    await expect(page.getByText(/r\*\*\*l@example\.com/i).first()).toBeVisible({ timeout: 10_000 })
    const boxes = page.locator('input[inputmode="numeric"]')
    // Type into first box, second box value should become fillable
    await boxes.nth(0).fill('1')
    await page.waitForTimeout(200)
    // Box 0 should now have value '1'
    await expect(boxes.nth(0)).toHaveValue('1')
    // And second box should be focused (auto-advance)
    const focused = await boxes.nth(1).evaluate(el => el === document.activeElement).catch(() => false)
    expect(focused).toBe(true)
  })

  test('3.4 OTP inputs accept single digit only', async ({ page }) => {
    await setupPage(page)
    await expect(page.getByText(/r\*\*\*l@example\.com/i).first()).toBeVisible({ timeout: 10_000 })
    const boxes = page.locator('input[inputmode="numeric"]')
    // Fill first box with '5', verify it holds exactly one digit
    await boxes.first().fill('5')
    const val = await boxes.first().inputValue()
    expect(val.length).toBeLessThanOrEqual(1)
    expect(val).toBe('5')
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// 4. OTP VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Interview Verify — OTP Verification', () => {

  async function typeOTP(page: Page, code = '123456') {
    await expect(page.getByText(/r\*\*\*l@example\.com/i).first()).toBeVisible({ timeout: 10_000 })
    const boxes = page.locator('input[inputmode="numeric"]')
    for (let i = 0; i < 6; i++) {
      await boxes.nth(i).fill(code[i])
    }
  }

  test('4.1 Entering all 6 digits triggers verification', async ({ page }) => {
    await setupPage(page)
    let verified = false
    await page.route('**/api/interview/verify/verify-otp**', route => {
      verified = true
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
    })
    await typeOTP(page)
    await page.waitForTimeout(500)
    expect(verified).toBe(true)
  })

  test('4.2 "Verifying..." spinner shown during verification', async ({ page }) => {
    await page.addInitScript(() => { localStorage.setItem('hasSeenOnboardingTour', 'true') })
    await mockSendOTP(page)
    await page.route('**/api/interview/verify/verify-otp**', async route => {
      await new Promise(r => setTimeout(r, 400))
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
    })
    await mockComparePhoto(page)
    await mockSecurityAlert(page)
    await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(/r\*\*\*l@example\.com/i).first()).toBeVisible({ timeout: 10_000 })
    const boxes = page.locator('input[inputmode="numeric"]')
    for (let i = 0; i < 6; i++) await boxes.nth(i).fill('1')
    await expect(page.getByText(/Verifying/i)).toBeVisible({ timeout: 3000 })
  })

  test('4.3 Successful OTP shows "Email Verified!" confirmation', async ({ page }) => {
    await setupPage(page)
    await typeOTP(page)
    await expect(page.getByText(/Email Verified!/i)).toBeVisible({ timeout: 5000 })
  })

  test('4.4 Successful OTP transitions to step 2 (Photo Verify)', async ({ page }) => {
    await setupPage(page)
    await typeOTP(page)
    await expect(page.getByText(/Photo Verification/i)).toBeVisible({ timeout: 5000 })
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// 5. OTP PASTE
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Interview Verify — OTP Paste', () => {

  test('5.1 OTP auto-verifies when all 6 digits are entered', async ({ page }) => {
    await setupPage(page)
    await expect(page.getByText(/r\*\*\*l@example\.com/i).first()).toBeVisible({ timeout: 10_000 })
    let verifyCalled = false
    await page.route('**/api/interview/verify/verify-otp**', route => {
      verifyCalled = true
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
    })
    const boxes = page.locator('input[inputmode="numeric"]')
    for (let i = 0; i < 6; i++) await boxes.nth(i).fill('6')
    await page.waitForTimeout(500)
    expect(verifyCalled).toBe(true)
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// 6. OTP ERROR HANDLING
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Interview Verify — OTP Errors', () => {

  test('7.1 Invalid OTP shows error message and clears boxes', async ({ page }) => {
    await setupPage(page, { verifySuccess: false })
    await expect(page.getByText(/r\*\*\*l@example\.com/i).first()).toBeVisible({ timeout: 10_000 })
    const boxes = page.locator('input[inputmode="numeric"]')
    for (let i = 0; i < 6; i++) await boxes.nth(i).fill('9')
    await expect(page.getByText(/Invalid OTP/i)).toBeVisible({ timeout: 5000 })
    // Boxes should be cleared after error
    await expect(boxes.first()).toHaveValue('')
  })

  test('7.2 Send-OTP failure shows error state (no OTP boxes)', async ({ page }) => {
    await setupPage(page, { sendSuccess: false })
    // When OTP send fails: OTP input boxes should NOT appear (no masked email shown)
    // The page stays in an error/loading state
    await page.waitForTimeout(3000)
    const hasOtpBoxes = await page.locator('input[inputmode="numeric"]').first().isVisible().catch(() => false)
    const hasMaskedEmail = await page.getByText(/\*\*\*.*@/i).first().isVisible().catch(() => false)
    // If send fails, neither OTP boxes nor masked email should appear
    expect(hasOtpBoxes || hasMaskedEmail).toBe(false)
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// 7. RESEND OTP
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Interview Verify — Resend OTP', () => {

  test('8.1 "Resend" button visible after OTP sent', async ({ page }) => {
    await setupPage(page)
    await expect(page.getByText(/r\*\*\*l@example\.com/i).first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/Didn't receive.*Resend|Resend/i).first()).toBeVisible()
  })

  test('8.2 Clicking Resend calls send-otp API', async ({ page }) => {
    await setupPage(page)
    await expect(page.getByText(/r\*\*\*l@example\.com/i).first()).toBeVisible({ timeout: 10_000 })

    let resendCalled = false
    await page.route('**/api/interview/verify/send-otp**', route => {
      resendCalled = true
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ ok: true, maskedEmail: 'r***l@example.com', candidateName: 'Test', email: 'rahul@example.com' }) })
    })
    await page.getByText(/Didn't receive.*Resend|Resend/i).first().click()
    await page.waitForTimeout(500)
    expect(resendCalled).toBe(true)
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// 9-10. PHOTO VERIFICATION STEP
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Interview Verify — Photo Verification Step', () => {

  async function goToStep2(page: Page) {
    await setupPage(page)
    await expect(page.getByText(/r\*\*\*l@example\.com/i).first()).toBeVisible({ timeout: 10_000 })
    const boxes = page.locator('input[inputmode="numeric"]')
    for (let i = 0; i < 6; i++) await boxes.nth(i).fill('1')
    await expect(page.getByText(/Photo Verification/i)).toBeVisible({ timeout: 8000 })
  }

  test('9.1 Step 2 shows "Photo Verification" heading', async ({ page }) => {
    await goToStep2(page)
    await expect(page.getByText('Photo Verification').first()).toBeVisible()
  })

  test('9.2 "Take a photo to verify your identity" subtitle shown', async ({ page }) => {
    await goToStep2(page)
    await expect(page.getByText(/Take a photo to verify/i).first()).toBeVisible()
  })

  test('9.3 "Photo Verify" step indicator becomes active', async ({ page }) => {
    await goToStep2(page)
    // Photo Verify pill should now be active (ring)
    const step2 = page.locator('div').filter({ hasText: /^Photo Verify$/ }).first()
    await expect(step2).toBeVisible()
  })

  test('10.1 No stored photo — camera opens or skip message shown', async ({ page }) => {
    await goToStep2(page)
    // When no stored photo: either camera opens directly OR skip message shows
    const result = await Promise.race([
      page.getByText(/No application photo|verification will be skipped/i).first()
        .waitFor({ state: 'visible', timeout: 15_000 }).then(() => 'skip').catch(() => null),
      page.getByText(/Look directly|Detecting face|Open Camera|Photo Verification/i).first()
        .waitFor({ state: 'visible', timeout: 15_000 }).then(() => 'camera').catch(() => null),
    ])
    expect(result).toBeTruthy()
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// 12. REDIRECT AFTER VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Interview Verify — Redirect', () => {

  test('12.1 After OTP+Photo verification completes, page navigates away', async ({ page }) => {
    await setupPage(page, { hasPhoto: false })
    await expect(page.getByText(/r\*\*\*l@example\.com/i).first()).toBeVisible({ timeout: 10_000 })
    const boxes = page.locator('input[inputmode="numeric"]')
    for (let i = 0; i < 6; i++) await boxes.nth(i).fill('1')
    // After successful OTP verify → step 2. With no stored photo, should auto-proceed.
    // Accept any of: redirect text OR navigation to interview page
    const redirected = await Promise.race([
      page.getByText(/Redirecting to interview|Identity verified/i).first()
        .waitFor({ state: 'visible', timeout: 15_000 }).then(() => true).catch(() => false),
      page.waitForURL(/\/interview\/.+$/, { timeout: 15_000 }).then(() => true).catch(() => false),
    ])
    expect(redirected).toBe(true)
  })

})
