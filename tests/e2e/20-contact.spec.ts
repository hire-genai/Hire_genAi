/**
 * tests/e2e/20-contact.spec.ts
 *
 * E2E tests for /contact page.
 *
 * ── FEATURES COVERED ────────────────────────────────────────────────────────
 *  1.  Page Load          – heading, branding, Navbar
 *  2.  Contact Info       – Email, Live Chat sections
 *  3.  Form Fields        – Full Name, Work Email, Company Name, Phone,
 *                           Subject, Message, Terms checkbox
 *  4.  Form Validation    – required fields, checkbox required, button state
 *  5.  Form Submission    – POST /api/contact → success state
 *  6.  Success State      – "Message Sent!", Return to Home button
 *  7.  Negative Cases     – submit without checkbox, API error, empty fields
 *  8.  Footer             – links, social icons, GDPR badge
 *  9.  Responsive         – mobile 375px renders
 */

import { test, expect, type Page } from '@playwright/test'

// Contact is a public (www) page — no auth needed
test.use({ storageState: { cookies: [], origins: [] } })

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'
const PAGE_URL = `${BASE_URL}/contact`

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function mockContactAPI(page: Page, success = true) {
  await page.route('**/api/contact**', route =>
    route.fulfill({
      status: success ? 200 : 500,
      contentType: 'application/json',
      body: JSON.stringify(success
        ? { success: true, message: 'Message sent' }
        : { error: 'Failed to send' }),
    })
  )
}

async function fillForm(page: Page) {
  // Wait for the form to be interactive before filling
  await page.locator('#fullName').waitFor({ state: 'visible', timeout: 10_000 })
  await page.fill('#fullName', 'Jane Smith')
  await page.fill('#workEmail', 'jane@company.com')
  await page.fill('#companyName', 'Acme Corp')
  await page.fill('#subject', 'Pricing inquiry')
  await page.fill('#message', 'I would like to know more about your pricing plans.')
}

/** Check the native terms checkbox — React is hydrated when using networkidle */
async function checkTerms(page: Page) {
  const checkbox = page.locator('#terms')
  await checkbox.waitFor({ state: 'visible', timeout: 5000 })
  if (!(await checkbox.isChecked())) {
    await checkbox.click()
    await page.waitForTimeout(200)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. PAGE LOAD
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Contact — Page Load', () => {

  test('1.1 Page renders "Get in Touch" heading', async ({ page }) => {
    await mockContactAPI(page)
    await page.goto(PAGE_URL, { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: /Get in Touch/i })).toBeVisible()
  })

  test('1.2 HireGenAI Navbar visible', async ({ page }) => {
    await mockContactAPI(page)
    await page.goto(PAGE_URL, { waitUntil: 'networkidle' })
    await expect(page.getByText('HireGenAI').first()).toBeVisible()
  })

  test('1.3 Page subtitle "Have questions about HireGenAI?" visible', async ({ page }) => {
    await mockContactAPI(page)
    await page.goto(PAGE_URL, { waitUntil: 'networkidle' })
    await expect(page.getByText(/Have questions about HireGenAI/i)).toBeVisible()
  })

  test('1.4 Announcement banner visible', async ({ page }) => {
    await mockContactAPI(page)
    await page.goto(PAGE_URL, { waitUntil: 'networkidle' })
    await expect(page.getByText(/AI-Powered Recruitment Suite/i)).toBeVisible()
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// 2. CONTACT INFO
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Contact — Contact Info', () => {

  test('2.1 "Email Us" section visible', async ({ page }) => {
    await mockContactAPI(page)
    await page.goto(PAGE_URL, { waitUntil: 'networkidle' })
    await expect(page.getByText('Email Us')).toBeVisible()
    await expect(page.getByText('support@hire-genai.com').first()).toBeVisible()
  })

  test('2.2 "Live Chat" section visible', async ({ page }) => {
    await mockContactAPI(page)
    await page.goto(PAGE_URL, { waitUntil: 'networkidle' })
    await expect(page.getByText('Live Chat')).toBeVisible()
    await expect(page.getByText(/Mon-Fri, 9am-6pm IST/i)).toBeVisible()
  })

  test('2.3 "Leave a Message" form heading visible', async ({ page }) => {
    await mockContactAPI(page)
    await page.goto(PAGE_URL, { waitUntil: 'networkidle' })
    await expect(page.getByText('Leave a Message')).toBeVisible()
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// 3. FORM FIELDS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Contact — Form Fields', () => {

  test('3.1 Full Name, Work Email, Company Name fields visible', async ({ page }) => {
    await mockContactAPI(page)
    await page.goto(PAGE_URL, { waitUntil: 'networkidle' })
    await expect(page.locator('#fullName')).toBeVisible()
    await expect(page.locator('#workEmail')).toBeVisible()
    await expect(page.locator('#companyName')).toBeVisible()
  })

  test('3.2 Phone Number, Subject, Message fields visible', async ({ page }) => {
    await mockContactAPI(page)
    await page.goto(PAGE_URL, { waitUntil: 'networkidle' })
    await expect(page.locator('#phoneNumber')).toBeVisible()
    await expect(page.locator('#subject')).toBeVisible()
    await expect(page.locator('#message')).toBeVisible()
  })

  test('3.3 Terms & Conditions checkbox visible', async ({ page }) => {
    await mockContactAPI(page)
    await page.goto(PAGE_URL, { waitUntil: 'networkidle' })
    await expect(page.locator('#terms')).toBeVisible()
  })

  test('3.4 "Terms & Conditions" link visible', async ({ page }) => {
    await mockContactAPI(page)
    await page.goto(PAGE_URL, { waitUntil: 'networkidle' })
    await expect(page.getByRole('link', { name: /Terms & Conditions/i })).toBeVisible()
  })

  test('3.5 "Privacy Policy" link visible', async ({ page }) => {
    await mockContactAPI(page)
    await page.goto(PAGE_URL, { waitUntil: 'networkidle' })
    await expect(page.getByRole('link', { name: /Privacy Policy/i }).first()).toBeVisible()
  })

  test('3.6 All fields accept text input', async ({ page }) => {
    await mockContactAPI(page)
    await page.goto(PAGE_URL, { waitUntil: 'networkidle' })
    await fillForm(page)
    await expect(page.locator('#fullName')).toHaveValue('Jane Smith')
    await expect(page.locator('#workEmail')).toHaveValue('jane@company.com')
    await expect(page.locator('#companyName')).toHaveValue('Acme Corp')
    await expect(page.locator('#subject')).toHaveValue('Pricing inquiry')
    await expect(page.locator('#message')).toHaveValue('I would like to know more about your pricing plans.')
  })

  test('3.7 Phone number field is optional and accepts input', async ({ page }) => {
    await mockContactAPI(page)
    await page.goto(PAGE_URL, { waitUntil: 'networkidle' })
    await page.fill('#phoneNumber', '+1 555 000 1234')
    await expect(page.locator('#phoneNumber')).toHaveValue('+1 555 000 1234')
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// 4. FORM VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Contact — Form Validation', () => {

  test('4.1 "Send Message" button disabled until checkbox checked', async ({ page }) => {
    await mockContactAPI(page)
    await page.goto(PAGE_URL, { waitUntil: 'networkidle' })
    await fillForm(page)
    // Checkbox not checked → button disabled
    await expect(page.getByRole('button', { name: /Send Message/i })).toBeDisabled()
  })

  test('4.2 "Send Message" button enabled after checkbox checked + fields filled', async ({ page }) => {
    await mockContactAPI(page)
    await page.goto(PAGE_URL, { waitUntil: 'networkidle' })
    await fillForm(page)
    await checkTerms(page)
    await expect(page.getByRole('button', { name: /Send Message/i })).toBeEnabled()
  })

  test('4.3 Submit button disabled initially', async ({ page }) => {
    await mockContactAPI(page)
    await page.goto(PAGE_URL, { waitUntil: 'networkidle' })
    await expect(page.getByRole('button', { name: /Send Message/i })).toBeDisabled()
  })

  test('4.4 Button shows "Sending..." loading state while submitting', async ({ page }) => {
    await page.route('**/api/contact**', async route => {
      await new Promise(r => setTimeout(r, 500))
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true }) })
    })
    await page.goto(PAGE_URL, { waitUntil: 'networkidle' })
    await fillForm(page)
    await checkTerms(page)
    await page.getByRole('button', { name: /Send Message/i }).click()
    await expect(page.getByText(/Sending/i)).toBeVisible({ timeout: 3000 })
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// 5. FORM SUBMISSION
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Contact — Form Submission', () => {

  test('5.1 Successful submission calls POST /api/contact', async ({ page }) => {
    let postCalled = false
    await page.route('**/api/contact**', route => {
      postCalled = true
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true }) })
    })
    await page.goto(PAGE_URL, { waitUntil: 'networkidle' })
    await fillForm(page)
    await checkTerms(page)
    await page.getByRole('button', { name: /Send Message/i }).click()
    await page.waitForTimeout(1000)
    expect(postCalled).toBe(true)
  })

  test('5.2 Successful submission POSTs all form data', async ({ page }) => {
    let requestBody: any = {}
    await page.route('**/api/contact**', async route => {
      try { requestBody = JSON.parse(route.request().postData() ?? '{}') } catch {}
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true }) })
    })
    await page.goto(PAGE_URL, { waitUntil: 'networkidle' })
    await fillForm(page)
    await checkTerms(page)
    await page.getByRole('button', { name: /Send Message/i }).click()
    await page.getByText(/Message Sent!/i).waitFor({ state: 'visible', timeout: 10_000 })
    expect(requestBody.fullName).toBe('Jane Smith')
    expect(requestBody.workEmail).toBe('jane@company.com')
    expect(requestBody.agreedToTerms).toBe(true)
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// 6. SUCCESS STATE
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Contact — Success State', () => {

  async function submitForm(page: Page) {
    await mockContactAPI(page)
    await page.goto(PAGE_URL, { waitUntil: 'networkidle' })
    await fillForm(page)
    await checkTerms(page)
    await page.getByRole('button', { name: /Send Message/i }).click()
    await expect(page.getByText(/Message Sent!/i)).toBeVisible({ timeout: 10_000 })
  }

  test('6.1 "Message Sent!" heading shown after successful submit', async ({ page }) => {
    await submitForm(page)
    await expect(page.getByText(/Message Sent!/i)).toBeVisible()
  })

  test('6.2 Success message "Thank you for reaching out" visible', async ({ page }) => {
    await submitForm(page)
    await expect(page.getByText(/Thank you for reaching out/i)).toBeVisible()
  })

  test('6.3 "Return to Home" button visible', async ({ page }) => {
    await submitForm(page)
    await expect(page.getByRole('button', { name: /Return to Home/i })).toBeVisible()
  })

  test('6.4 "Return to Home" navigates to /', async ({ page }) => {
    await submitForm(page)
    await page.getByRole('link', { name: /Return to Home/i }).click()
    await expect(page).toHaveURL(`${BASE_URL}/`, { timeout: 10_000 })
  })

  test('6.5 Form is hidden on success state', async ({ page }) => {
    await submitForm(page)
    // The form should not be visible on success state
    await expect(page.locator('#fullName')).not.toBeVisible({ timeout: 3000 })
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// 7. NEGATIVE CASES
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Contact — Negative Cases', () => {

  test('7.1 Submitting without agreeing to terms — button stays disabled', async ({ page }) => {
    await mockContactAPI(page)
    await page.goto(PAGE_URL, { waitUntil: 'networkidle' })
    await fillForm(page)
    // Don't check terms
    await expect(page.getByRole('button', { name: /Send Message/i })).toBeDisabled()
  })

  test('7.2 API error shows alert', async ({ page }) => {
    await mockContactAPI(page, false)
    await page.goto(PAGE_URL, { waitUntil: 'networkidle' })
    await fillForm(page)
    await checkTerms(page)

    let alertMsg = ''
    page.on('dialog', async d => { alertMsg = d.message(); await d.accept() })
    await page.getByRole('button', { name: /Send Message/i }).click()
    await page.waitForTimeout(1000)
    expect(alertMsg).toMatch(/failed|try again/i)
  })

  test('7.3 XSS in message field does not break page', async ({ page }) => {
    await mockContactAPI(page)
    await page.goto(PAGE_URL, { waitUntil: 'networkidle' })
    await page.fill('#message', "<script>alert('xss')</script>")
    await expect(page.getByRole('heading', { name: /Get in Touch/i })).toBeVisible()
  })

  test('7.4 Invalid email format blocked by HTML5 validation', async ({ page }) => {
    await mockContactAPI(page)
    await page.goto(PAGE_URL, { waitUntil: 'networkidle' })
    await page.fill('#fullName', 'Test')
    await page.fill('#workEmail', 'not-an-email')
    await page.fill('#companyName', 'Corp')
    await page.fill('#subject', 'Test')
    await page.fill('#message', 'Test message')
    await checkTerms(page)
    await page.getByRole('button', { name: /Send Message/i }).click()
    const emailInput = page.locator('#workEmail')
    const validationMsg = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage)
    expect(validationMsg.length).toBeGreaterThan(0)
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// 8. FOOTER
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Contact — Footer', () => {

  test('8.1 Footer is visible', async ({ page }) => {
    await mockContactAPI(page)
    await page.goto(PAGE_URL, { waitUntil: 'networkidle' })
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await expect(page.locator('footer')).toBeVisible()
  })

  test('8.2 Footer shows "© 2025 HireGenAI"', async ({ page }) => {
    await mockContactAPI(page)
    await page.goto(PAGE_URL, { waitUntil: 'networkidle' })
    await expect(page.getByText(/© 2025 HireGenAI/i)).toBeVisible()
  })

  test('8.3 "GDPR COMPLIANT" badge shown in footer', async ({ page }) => {
    await mockContactAPI(page)
    await page.goto(PAGE_URL, { waitUntil: 'networkidle' })
    await expect(page.getByText(/GDPR COMPLIANT/i)).toBeVisible()
  })

  test('8.4 TrustScore badge shown', async ({ page }) => {
    await mockContactAPI(page)
    await page.goto(PAGE_URL, { waitUntil: 'networkidle' })
    await expect(page.getByText(/TrustScore/i)).toBeVisible()
  })

  test('8.5 LinkedIn social link in footer', async ({ page }) => {
    await mockContactAPI(page)
    await page.goto(PAGE_URL, { waitUntil: 'networkidle' })
    // LinkedIn link in footer — use href attribute selector to be precise
    await expect(page.locator('a[href*="linkedin.com"]').last()).toBeVisible()
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// 9. RESPONSIVE
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Contact — Responsive', () => {

  test('9.1 Page renders at 375px mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await mockContactAPI(page)
    await page.goto(PAGE_URL, { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: /Get in Touch/i })).toBeVisible()
  })

  test('9.2 Form fields visible on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await mockContactAPI(page)
    await page.goto(PAGE_URL, { waitUntil: 'networkidle' })
    await expect(page.locator('#fullName')).toBeVisible()
    await expect(page.locator('#message')).toBeVisible()
  })

  test('9.3 Submit button visible on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await mockContactAPI(page)
    await page.goto(PAGE_URL, { waitUntil: 'networkidle' })
    await expect(page.getByRole('button', { name: /Send Message/i })).toBeVisible()
  })

})
