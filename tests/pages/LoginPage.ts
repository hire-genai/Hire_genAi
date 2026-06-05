/**
 * tests/pages/LoginPage.ts
 *
 * Playwright Page Object Model for the Login flow (/login).
 *
 * The login page is a two-step OTP flow:
 *   Step 1 — Email entry: fill email → click "Send OTP" → POST /api/otp/send-login
 *   Step 2 — OTP entry:  fill 6-digit code → click "Verify & Sign in" → POST /api/otp/verify-login
 *
 * On success the user is redirected to /dashboard (or a post-login redirect
 * stored in localStorage under 'postLoginRedirect').
 *
 * Logout lives inside the dashboard sidebar:
 *   - A "Logout" button triggers a <LogoutDialog> (Radix Dialog)
 *   - Confirming clicks "Yes, Logout" → calls /api/auth/logout and redirects to /login
 *
 * Errors are surfaced via shadcn <Toaster> with variant="destructive".
 *
 * Selector strategy:
 *   1. Stable HTML id attributes (#email, #otp) — both inputs have explicit ids
 *   2. getByRole with accessible name for buttons
 *   3. getByText for toast messages (destructive variant)
 */

import { type Page, type Locator, expect } from '@playwright/test'

export class LoginPage {
  readonly page: Page
  readonly url = '/login'

  // ── Email step ────────────────────────────────────────────────────────────
  /** The email address text input (id="email"). */
  readonly emailInput: Locator

  /** "Send OTP" submit button for the email step. */
  readonly sendOtpButton: Locator

  // ── OTP step ──────────────────────────────────────────────────────────────
  /** 6-digit OTP text input (id="otp"). Only visible after email is submitted. */
  readonly otpInput: Locator

  /** "Verify & Sign in" submit button for the OTP step. */
  readonly verifyButton: Locator

  /** "Resend OTP" button — enabled after the 30-second countdown expires. */
  readonly resendButton: Locator

  /** "← Back to email" ghost button that resets to the email step. */
  readonly backToEmailButton: Locator

  // ── Error feedback ────────────────────────────────────────────────────────
  /**
   * Destructive toast message rendered by shadcn <Toaster>.
   * The component adds class `destructive` to the toast wrapper element.
   */
  readonly errorToast: Locator

  // ── Navigation ────────────────────────────────────────────────────────────
  /** "Sign up" link in the footer of the card. */
  readonly signUpLink: Locator

  constructor(page: Page) {
    this.page = page

    // Email step
    this.emailInput = page.locator('#email')
    this.sendOtpButton = page.getByRole('button', { name: /Send OTP/i })

    // OTP step
    this.otpInput = page.locator('#otp')
    this.verifyButton = page.getByRole('button', { name: /Verify & Sign in/i })
    this.resendButton = page.getByRole('button', { name: /Resend OTP|Resend in/i })
    this.backToEmailButton = page.getByRole('button', { name: /Back to email/i })

    // Errors — shadcn toast with destructive variant
    this.errorToast = page
      .locator('[class*="destructive"]')
      .or(page.locator('[data-variant="destructive"]'))

    // Links
    this.signUpLink = page.getByRole('link', { name: /Sign up/i })
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  async navigate(): Promise<void> {
    await this.page.goto(this.url)
    await this.page.waitForLoadState('domcontentloaded')
    // Wait for the card to be visible (not the "Redirecting…" spinner)
    await this.emailInput.waitFor({ state: 'visible', timeout: 10_000 })
  }

  // ── Email step ────────────────────────────────────────────────────────────

  async fillEmail(email: string): Promise<void> {
    await this.emailInput.fill(email)
  }

  /**
   * Submit the email to trigger OTP delivery.
   * After calling this, wait for the OTP input to appear before filling it.
   */
  async submitEmail(): Promise<void> {
    await this.sendOtpButton.click()
  }

  // ── OTP step ──────────────────────────────────────────────────────────────

  /**
   * Fill the 6-digit OTP. The input strips non-numeric characters and
   * enforces a 6-character maximum.
   */
  async fillOTP(otp: string): Promise<void> {
    await this.otpInput.waitFor({ state: 'visible', timeout: 10_000 })
    await this.otpInput.fill(otp)
  }

  async submitOTP(): Promise<void> {
    await this.verifyButton.click()
  }

  // ── Combined helpers ──────────────────────────────────────────────────────

  /**
   * Complete the full email → OTP login flow.
   * Waits for the OTP input to become visible between steps.
   */
  async login(email: string, otp: string): Promise<void> {
    await this.fillEmail(email)
    await this.submitEmail()
    await this.otpInput.waitFor({ state: 'visible', timeout: 10_000 })
    await this.fillOTP(otp)
    await this.submitOTP()
  }

  // ── Error feedback ────────────────────────────────────────────────────────

  /**
   * Returns the text of the first visible destructive toast, or empty string
   * if no error is displayed within the timeout.
   */
  async getErrorMessage(timeout = 5_000): Promise<string> {
    try {
      await this.errorToast.first().waitFor({ state: 'visible', timeout })
      return (await this.errorToast.first().textContent()) ?? ''
    } catch {
      return ''
    }
  }

  // ── Logout (dashboard sidebar) ────────────────────────────────────────────

  /**
   * Logout via the sidebar Logout button + confirmation dialog.
   * The caller must already be on a dashboard page for the sidebar to be present.
   *
   * Flow:
   *   1. Click "Logout" button in sidebar
   *   2. Click "Yes, Logout" in the confirmation dialog
   *   3. Wait for redirect to /login
   */
  async logout(): Promise<void> {
    // The sidebar renders both a text "Logout" label and an icon-only button;
    // we match the button that contains the text "Logout".
    const logoutButton = this.page
      .getByRole('button', { name: /^Logout$/i })
      .or(this.page.locator('button').filter({ hasText: /^Logout$/ }))

    await logoutButton.first().click()

    // Confirmation dialog — "Yes, Logout" button (styled with bg-emerald-600)
    const confirmButton = this.page.getByRole('button', { name: /Yes, Logout/i })
    await confirmButton.waitFor({ state: 'visible', timeout: 5_000 })
    await confirmButton.click()

    // Wait for redirect back to login
    await this.page.waitForURL(/\/login/, { timeout: 10_000 })
  }

  // ── Assertions ────────────────────────────────────────────────────────────

  async expectOnLoginPage(): Promise<void> {
    await expect(this.emailInput).toBeVisible({ timeout: 10_000 })
  }

  async expectOTPStepVisible(): Promise<void> {
    await expect(this.otpInput).toBeVisible({ timeout: 10_000 })
    await expect(this.verifyButton).toBeVisible({ timeout: 5_000 })
  }

  async expectRedirectedToDashboard(): Promise<void> {
    await this.page.waitForURL(/\/dashboard/, { timeout: 15_000 })
  }
}
