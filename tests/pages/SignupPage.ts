/**
 * tests/pages/SignupPage.ts
 *
 * Playwright Page Object Model for the Company Registration flow (/signup).
 *
 * The signup page is a 5-step wizard:
 *   Step 1 — Company Information  (companyName, industry, companySize, website, description)
 *   Step 2 — Contact Information  (street, city, state, postalCode, country, phone)
 *   Step 3 — Legal Information    (legalCompanyName, taxId, registrationNumber)
 *   Step 4 — Manager Account      (firstName, lastName, email + OTP, jobTitle)
 *   Step 5 — Review & Complete    (agreeTos, agreePrivacy, agreeMarketing + submit)
 *
 * OTP flow (step 4):
 *   - "Send Code" button POSTs to /api/otp/send
 *   - OTP input (no label, just placeholder "000000")
 *   - "Verify" button POSTs to /api/otp/verify-code
 *   - On success emailVerified indicator appears
 *   - Final submit POSTs to /api/signup/complete
 *
 * Selector strategy (in priority order):
 *   1. getByLabel — matches <label htmlFor="id"> associations
 *   2. getByRole + accessible name
 *   3. getByPlaceholder
 *   4. CSS id selector (#id) — ids are stable in this codebase
 */

import { type Page, type Locator, expect } from '@playwright/test'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SignupFormData {
  // Step 1 — Company Information
  companyName: string
  industry: string
  companySize: string
  website?: string
  companyDescription?: string
  // Step 2 — Contact Information
  street: string
  city: string
  state: string
  postalCode: string
  country: string
  phone?: string
  // Step 3 — Legal Information
  legalCompanyName: string
  taxId?: string
  registrationNumber?: string
  // Step 4 — Manager Account
  firstName: string
  lastName: string
  email: string
  jobTitle?: string
  // Step 5 — Consent
  agreeTos?: boolean
  agreePrivacy?: boolean
  agreeMarketing?: boolean
}

// ---------------------------------------------------------------------------
// SignupPage
// ---------------------------------------------------------------------------

export class SignupPage {
  readonly page: Page
  readonly url = '/signup'

  // ── Step progress indicator ───────────────────────────────────────────────
  readonly stepBadge: Locator

  // ── Step 1 — Company Information ─────────────────────────────────────────
  readonly companyNameInput: Locator
  readonly industrySelect: Locator
  readonly companySizeSelect: Locator
  readonly websiteInput: Locator
  readonly companyDescriptionTextarea: Locator

  // ── Step 2 — Contact Information ─────────────────────────────────────────
  readonly streetInput: Locator
  readonly cityInput: Locator
  readonly stateInput: Locator
  readonly postalCodeInput: Locator
  readonly countrySelect: Locator
  readonly phoneInput: Locator

  // ── Step 3 — Legal Information ────────────────────────────────────────────
  readonly legalCompanyNameInput: Locator
  readonly taxIdInput: Locator
  readonly registrationNumberInput: Locator

  // ── Step 4 — Manager Account ──────────────────────────────────────────────
  readonly firstNameInput: Locator
  readonly lastNameInput: Locator
  readonly emailInput: Locator
  readonly jobTitleInput: Locator
  readonly sendCodeButton: Locator
  readonly otpInput: Locator
  readonly verifyOtpButton: Locator
  readonly emailVerifiedIndicator: Locator

  // ── Step 5 — Review & Consent ─────────────────────────────────────────────
  readonly tosCheckbox: Locator
  readonly privacyCheckbox: Locator
  readonly marketingCheckbox: Locator

  // ── Navigation buttons ────────────────────────────────────────────────────
  readonly nextButton: Locator
  readonly previousButton: Locator
  readonly completeRegistrationButton: Locator

  // ── Error display ─────────────────────────────────────────────────────────
  /** Red error banner rendered above the form when API or validation fails. */
  readonly errorBanner: Locator

  constructor(page: Page) {
    this.page = page

    // Step badge — "Step N of 5" badge in the header
    this.stepBadge = page.getByText(/Step \d of 5/i)

    // Step 1
    this.companyNameInput = page.locator('#companyName')
    this.industrySelect = page.locator('#industry')
    this.companySizeSelect = page.locator('#companySize')
    this.websiteInput = page.locator('#website')
    this.companyDescriptionTextarea = page.locator('#companyDescription')

    // Step 2
    this.streetInput = page.locator('#street')
    this.cityInput = page.locator('#city')
    this.stateInput = page.locator('#state')
    this.postalCodeInput = page.locator('#postalCode')
    this.countrySelect = page.locator('#country')
    this.phoneInput = page.locator('#phone')

    // Step 3
    this.legalCompanyNameInput = page.locator('#legalCompanyName')
    this.taxIdInput = page.locator('#taxId')
    this.registrationNumberInput = page.locator('#registrationNumber')

    // Step 4
    this.firstNameInput = page.locator('#firstName')
    this.lastNameInput = page.locator('#lastName')
    this.emailInput = page.locator('#email')
    this.jobTitleInput = page.locator('#jobTitle')
    // "Send Code" button — rendered next to the email field when OTP not yet sent
    this.sendCodeButton = page.getByRole('button', { name: /Send Code|Resend/i })
    // OTP input — no id, identified by placeholder
    this.otpInput = page.getByPlaceholder('000000')
    this.verifyOtpButton = page.getByRole('button', { name: /^Verify$/i })
    this.emailVerifiedIndicator = page.getByText(/Email verified successfully/i)

    // Step 5
    this.tosCheckbox = page.locator('#tos')
    this.privacyCheckbox = page.locator('#privacy')
    this.marketingCheckbox = page.locator('#marketing')

    // Navigation
    this.nextButton = page.getByRole('button', { name: /^Next$/i })
    this.previousButton = page.getByRole('button', { name: /Previous/i })
    this.completeRegistrationButton = page.getByRole('button', {
      name: /Complete Registration/i,
    })

    // Error banner
    this.errorBanner = page.locator(
      'div.bg-red-50, div[class*="bg-red-50"]',
    ).filter({ hasText: /./})
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  async navigate(): Promise<void> {
    await this.page.goto(this.url)
    await this.page.waitForLoadState('domcontentloaded')
  }

  // ── Step helpers ──────────────────────────────────────────────────────────

  /** Click the "Next" button to advance to the next step. */
  async clickNext(): Promise<void> {
    await this.nextButton.click()
    // Small pause to let URL/state update settle
    await this.page.waitForTimeout(300)
  }

  /** Click the "Previous" button to go back one step. */
  async clickPrevious(): Promise<void> {
    await this.previousButton.click()
    await this.page.waitForTimeout(300)
  }

  /** Wait for the progress badge to reflect a given step number (1-5). */
  async waitForStep(stepNumber: number): Promise<void> {
    await expect(
      this.page.getByText(new RegExp(`Step ${stepNumber} of 5`, 'i')),
    ).toBeVisible({ timeout: 8_000 })
  }

  // ── Step 1 — Company Information ─────────────────────────────────────────

  /** Fill all Step 1 fields. Advances Select dropdowns via Radix UI option click. */
  async fillCompanyInfo(data: {
    companyName: string
    industry: string
    companySize: string
    website?: string
    companyDescription?: string
  }): Promise<void> {
    await this.companyNameInput.fill(data.companyName)
    // Radix Select trigger — click the trigger then click the option
    await this.industrySelect.click()
    await this.page.getByRole('option', { name: data.industry, exact: true }).click()
    await this.companySizeSelect.click()
    await this.page
      .getByRole('option', { name: new RegExp(data.companySize, 'i') })
      .first()
      .click()
    if (data.website) await this.websiteInput.fill(data.website)
    if (data.companyDescription)
      await this.companyDescriptionTextarea.fill(data.companyDescription)
  }

  // ── Step 2 — Contact Information ─────────────────────────────────────────

  async fillContactInfo(data: {
    street: string
    city: string
    state: string
    postalCode: string
    country: string
    phone?: string
  }): Promise<void> {
    await this.streetInput.fill(data.street)
    await this.cityInput.fill(data.city)
    await this.stateInput.fill(data.state)
    await this.postalCodeInput.fill(data.postalCode)
    // Country select (Radix UI)
    await this.countrySelect.click()
    await this.page.getByRole('option', { name: data.country, exact: true }).click()
    if (data.phone) await this.phoneInput.fill(data.phone)
  }

  // ── Step 3 — Legal Information ────────────────────────────────────────────

  async fillLegalInfo(data: {
    legalCompanyName: string
    taxId?: string
    registrationNumber?: string
  }): Promise<void> {
    await this.legalCompanyNameInput.fill(data.legalCompanyName)
    if (data.taxId) await this.taxIdInput.fill(data.taxId)
    if (data.registrationNumber)
      await this.registrationNumberInput.fill(data.registrationNumber)
  }

  // ── Step 4 — Manager Account + OTP ────────────────────────────────────────

  async fillManagerInfo(data: {
    firstName: string
    lastName: string
    email: string
    jobTitle?: string
  }): Promise<void> {
    await this.firstNameInput.fill(data.firstName)
    await this.lastNameInput.fill(data.lastName)
    await this.emailInput.fill(data.email)
    if (data.jobTitle) await this.jobTitleInput.fill(data.jobTitle)
  }

  /** Click "Send Code" to trigger OTP delivery. */
  async sendOTP(): Promise<void> {
    await this.sendCodeButton.click()
    // Wait for the OTP input to become interactable
    await this.otpInput.waitFor({ state: 'visible', timeout: 8_000 })
  }

  /** Wait for OTP input to appear and fill it, then click Verify. */
  async fillOTP(otp: string): Promise<void> {
    await this.otpInput.waitFor({ state: 'visible', timeout: 8_000 })
    await this.otpInput.fill(otp)
  }

  async verifyOTP(): Promise<void> {
    await this.verifyOtpButton.click()
    // Wait for verified indicator
    await this.emailVerifiedIndicator.waitFor({ state: 'visible', timeout: 10_000 })
  }

  async waitForOTPInput(): Promise<void> {
    await this.otpInput.waitFor({ state: 'visible', timeout: 10_000 })
  }

  // ── Step 5 — Review & Consent ─────────────────────────────────────────────

  async acceptConsent(opts: {
    tos?: boolean
    privacy?: boolean
    marketing?: boolean
  } = {}): Promise<void> {
    const { tos = true, privacy = true, marketing = false } = opts
    if (tos && !(await this.tosCheckbox.isChecked()))
      await this.tosCheckbox.check()
    if (privacy && !(await this.privacyCheckbox.isChecked()))
      await this.privacyCheckbox.check()
    if (marketing && !(await this.marketingCheckbox.isChecked()))
      await this.marketingCheckbox.check()
  }

  // ── Full form helpers ─────────────────────────────────────────────────────

  /**
   * fillForm() — convenience wrapper that fills all fields across all steps
   * and advances through each step in sequence.
   *
   * IMPORTANT: does NOT submit — call submit() separately after
   * providing consent checkboxes in step 5.
   */
  async fillForm(data: SignupFormData): Promise<void> {
    // Step 1
    await this.waitForStep(1)
    await this.fillCompanyInfo({
      companyName: data.companyName,
      industry: data.industry,
      companySize: data.companySize,
      website: data.website,
      companyDescription: data.companyDescription,
    })
    await this.clickNext()

    // Step 2
    await this.waitForStep(2)
    await this.fillContactInfo({
      street: data.street,
      city: data.city,
      state: data.state,
      postalCode: data.postalCode,
      country: data.country,
      phone: data.phone,
    })
    await this.clickNext()

    // Step 3
    await this.waitForStep(3)
    await this.fillLegalInfo({
      legalCompanyName: data.legalCompanyName,
      taxId: data.taxId,
      registrationNumber: data.registrationNumber,
    })
    await this.clickNext()

    // Step 4
    await this.waitForStep(4)
    await this.fillManagerInfo({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      jobTitle: data.jobTitle,
    })
    // OTP must be triggered and verified by the caller via sendOTP()/fillOTP()/verifyOTP()
    await this.clickNext()

    // Step 5 — consent
    await this.waitForStep(5)
    await this.acceptConsent({
      tos: data.agreeTos ?? true,
      privacy: data.agreePrivacy ?? true,
      marketing: data.agreeMarketing ?? false,
    })
  }

  /** Click the final "Complete Registration" submit button. */
  async submit(): Promise<void> {
    await this.completeRegistrationButton.click()
  }

  // ── Error handling ────────────────────────────────────────────────────────

  /** Returns the text content of the error banner, or empty string if not visible. */
  async getError(): Promise<string> {
    try {
      await this.errorBanner.waitFor({ state: 'visible', timeout: 4_000 })
      return (await this.errorBanner.textContent()) ?? ''
    } catch {
      return ''
    }
  }

  // ── Redirect helper ───────────────────────────────────────────────────────

  /** Wait for the post-signup redirect (dashboard or Stripe checkout). */
  async waitForRedirect(timeout = 15_000): Promise<void> {
    await this.page.waitForURL(
      (url) => {
        const path = url.pathname
        // Dashboard redirect or Stripe checkout
        return (
          path === '/dashboard' ||
          path.startsWith('/dashboard') ||
          url.hostname.includes('checkout.stripe.com')
        )
      },
      { timeout },
    )
  }
}
