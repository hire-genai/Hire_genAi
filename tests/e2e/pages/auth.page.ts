/**
 * tests/e2e/pages/auth.page.ts
 *
 * Playwright Page Object Models for HireGenAI authentication flows.
 *
 * Covers:
 *   - LoginPage  — OTP-based email login (/login)
 *   - SignupPage — 5-step company registration (/signup)
 *
 * Selector strategy (priority order):
 *   1. data-testid  (preferred — stable, intent-revealing)
 *   2. id attribute (the app uses stable HTML ids on all form inputs)
 *   3. ARIA role + accessible name  (robust against markup changes)
 *   4. visible text / label text    (last resort)
 *
 * Both page classes are self-contained: they import only from
 * @playwright/test and expose a clean public API so spec files never
 * reach into the DOM directly.
 */

import { type Page, type Locator, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

/**
 * Minimal data needed to drive the full 5-step signup form.
 * All fields marked optional have sensible defaults applied by
 * SignupPage.fullSignup() so callers only need to provide the essentials.
 */
export interface SignupData {
  // Step 1 — Company Information (all required by server)
  companyName: string;
  industry: string; // must match one of the 8 select options
  companySize: string; // must match one of the 6 select options

  // Step 1 — optional
  website?: string;
  companyDescription?: string;

  // Step 2 — Contact Information (all required by server)
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string; // ISO-2 code, e.g. "US", "IN", "GB"

  // Step 2 — optional
  phone?: string;

  // Step 3 — Legal Information (legalCompanyName required)
  legalCompanyName: string;
  taxId?: string;
  registrationNumber?: string;

  // Step 4 — Manager Account (firstName, lastName, email required)
  firstName: string;
  lastName: string;
  email: string;
  otp: string; // 6-digit code; any 6-digit number accepted in dev/mock mode
  jobTitle?: string;

  // Step 5 — Consent (both required to submit)
  agreeTos?: boolean; // default: true
  agreePrivacy?: boolean; // default: true
  agreeMarketing?: boolean; // default: false
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LOGIN_URL = "/login";
const SIGNUP_URL = "/signup";

/** Shadcn/ui Toaster renders outside the card; match by role + partial text. */
const TOAST_LOCATOR = "[data-testid='toast'], [role='status'], [role='alert']";

/** Inline red error banner on the signup page (not a toast). */
const SIGNUP_ERROR_BANNER =
  "[data-testid='signup-error'], .bg-red-50 .text-red-700";

// ---------------------------------------------------------------------------
// LoginPage
// ---------------------------------------------------------------------------

/**
 * Encapsulates all interactions with the /login page.
 *
 * Flow summary (from login/page.tsx):
 *   Step "email": user fills #email -> clicks "Send OTP"
 *     -> POST /api/otp/send-login (validates user exists)
 *   Step "otp":   user fills #otp  -> clicks "Verify & Sign in"
 *     -> POST /api/otp/verify-login -> session cookie + localStorage set
 *     -> redirect to /dashboard (or localStorage.postLoginRedirect)
 *
 * Errors are surfaced as shadcn toast notifications (role="status" /
 * role="alert") because the login page uses useToast(), not inline banners.
 */
export class LoginPage {
  readonly page: Page;

  // ── Email step ──────────────────────────────────────────────────────────
  readonly emailInput: Locator;
  readonly sendOtpButton: Locator;

  // ── OTP step ────────────────────────────────────────────────────────────
  readonly otpInput: Locator;
  readonly verifyButton: Locator;
  readonly resendButton: Locator;
  readonly backToEmailButton: Locator;

  // ── Toast / error ───────────────────────────────────────────────────────
  readonly toast: Locator;

  constructor(page: Page) {
    this.page = page;

    // Email step — inputs use stable HTML id attributes (login/page.tsx L165, L196)
    this.emailInput = page.locator("#email");
    this.sendOtpButton = page.getByRole("button", { name: /Send OTP/i });

    // OTP step
    this.otpInput = page.locator("#otp");
    this.verifyButton = page.getByRole("button", { name: /Verify & Sign in/i });
    this.resendButton = page.getByRole("button", { name: /Resend OTP|Resend in \d+s/i });
    this.backToEmailButton = page.getByRole("button", {
      name: /Back to email/i,
    });

    // Toasts — shadcn renders them in a portal; target by ARIA role
    this.toast = page.locator(TOAST_LOCATOR);
  }

  // ── Navigation ───────────────────────────────────────────────────────────

  /** Navigate to /login and wait for the page to be interactive. */
  async goto(): Promise<void> {
    await this.page.goto(LOGIN_URL);
    // Wait for the email input to confirm the form is mounted
    await this.emailInput.waitFor({ state: "visible" });
  }

  // ── Email step ───────────────────────────────────────────────────────────

  /** Type the given email address into the email field. */
  async fillEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }

  /**
   * Click "Send OTP".  Does NOT wait for the OTP step to appear —
   * use waitForOtpStep() or fillOTP() (which waits internally) if you
   * need to chain immediately.
   */
  async submitEmail(): Promise<void> {
    await this.sendOtpButton.click();
  }

  /**
   * Wait for the UI to transition to the OTP entry step.
   * The login form swaps between "email" and "otp" states; the OTP input
   * only exists in the DOM after the API call succeeds and step="otp".
   */
  async waitForOtpStep(): Promise<void> {
    await this.otpInput.waitFor({ state: "visible", timeout: 15_000 });
  }

  // ── OTP step ─────────────────────────────────────────────────────────────

  /**
   * Fill the 6-digit OTP field.
   * The input strips non-numeric chars and limits to 6 digits client-side,
   * so passing a numeric string is safest.
   */
  async fillOTP(code: string): Promise<void> {
    // Ensure we are on the OTP step (input may not be mounted yet)
    await this.waitForOtpStep();
    await this.otpInput.fill(code);
  }

  /** Click "Verify & Sign in". */
  async submitOTP(): Promise<void> {
    await this.verifyButton.click();
  }

  /**
   * Click "Resend OTP".  Only available after the 30-second cooldown
   * has elapsed — in tests you can mock /api/otp/send-login so the
   * countdown starts at 0, or simply wait.
   */
  async resendOTP(): Promise<void> {
    await this.resendButton.waitFor({ state: "visible", timeout: 35_000 });
    await this.resendButton.click();
  }

  /** Return to the email step via the ghost "← Back to email" button. */
  async goBackToEmail(): Promise<void> {
    await this.backToEmailButton.click();
    await this.emailInput.waitFor({ state: "visible" });
  }

  // ── Assertions ───────────────────────────────────────────────────────────

  /**
   * Assert the login was successful.
   * A successful login shows a "Welcome back!" toast and then redirects
   * to /dashboard (or a stored postLoginRedirect).
   * We check for the toast first (appears before the navigation) then
   * confirm navigation to a non-/login URL.
   */
  async expectLoginSuccess(): Promise<void> {
    // Toast: "Welcome back!"
    await expect(
      this.page.getByText(/Welcome back!/i).first()
    ).toBeVisible({ timeout: 10_000 });

    // After auth context is set the router redirects away from /login
    await expect(this.page).not.toHaveURL(/\/login/, { timeout: 15_000 });
  }

  /**
   * Assert that an error toast is visible.
   * @param message Partial text to match inside the toast description.
   *   If omitted, just asserts that any error/destructive toast appeared.
   *
   * Common server error strings:
   *   - "User does not exist. Please sign up first before trying to login."
   *   - "Failed to send OTP"
   *   - "Failed to verify OTP"
   */
  async expectLoginError(message?: string): Promise<void> {
    if (message) {
      await expect(
        this.page.getByText(message, { exact: false }).first()
      ).toBeVisible({ timeout: 10_000 });
    } else {
      // Any destructive toast or error text is acceptable
      await expect(
        this.page
          .locator(
            "[data-testid='toast'][data-variant='destructive'], " +
              "[role='alert'], " +
              ".text-destructive, " +
              // shadcn toast title text for login errors
              "text=Login error, text=Error"
          )
          .first()
      ).toBeVisible({ timeout: 10_000 });
    }
  }

  // ── Compound helpers ──────────────────────────────────────────────────────

  /**
   * Execute the complete login flow end-to-end.
   *
   * @param email Valid email address registered in the system.
   * @param otp   6-digit OTP code (use a test interceptor or the mock
   *              dev-mode fallback that accepts any 6-digit number).
   *
   * Navigates to /login, sends OTP, verifies, and asserts success.
   * The page will be on /dashboard (or postLoginRedirect) when this resolves.
   */
  async fullLogin(email: string, otp: string): Promise<void> {
    await this.goto();
    await this.fillEmail(email);
    await this.submitEmail();
    await this.fillOTP(otp);
    await this.submitOTP();
    await this.expectLoginSuccess();
  }
}

// ---------------------------------------------------------------------------
// SignupPage
// ---------------------------------------------------------------------------

/**
 * Encapsulates all interactions with the /signup page.
 *
 * Flow summary (from signup/page.tsx):
 *   Step 1 – Company Information  (/signup?section=company)
 *   Step 2 – Contact Information  (/signup?section=contact)
 *   Step 3 – Legal Information    (/signup?section=legal)
 *   Step 4 – Manager Account      (/signup?section=manager)
 *             └─ OTP sub-flow: Send Code -> enter code -> Verify
 *   Step 5 – Review & Complete    (/signup?section=review)
 *             └─ Submit -> POST /api/signup/complete -> /dashboard
 *
 * URL navigation: the page rewrites ?section= on every step transition.
 * Plan/billing params (?plan=&billing=) must be present in the initial
 * URL because the component captures them on mount before rewriting.
 *
 * Error rendering:
 *   - Step-level validation: browser alert() — not interceptable via
 *     Playwright locators; drive the form so required fields are filled.
 *   - API / server errors: inline red banner (.bg-red-50 .text-red-700)
 *     — matched by SIGNUP_ERROR_BANNER.
 */
export class SignupPage {
  readonly page: Page;

  // ── Step 1 — Company Information ─────────────────────────────────────────
  readonly companyNameInput: Locator;
  readonly industrySelect: Locator;
  readonly companySizeSelect: Locator;
  readonly websiteInput: Locator;
  readonly companyDescriptionTextarea: Locator;

  // ── Step 2 — Contact Information ─────────────────────────────────────────
  readonly streetInput: Locator;
  readonly cityInput: Locator;
  readonly stateInput: Locator;
  readonly postalCodeInput: Locator;
  readonly countrySelect: Locator;
  readonly phoneInput: Locator;

  // ── Step 3 — Legal Information ───────────────────────────────────────────
  readonly legalCompanyNameInput: Locator;
  readonly taxIdInput: Locator;
  readonly registrationNumberInput: Locator;

  // ── Step 4 — Manager Account ─────────────────────────────────────────────
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly emailInput: Locator;
  readonly jobTitleInput: Locator;

  // Step 4 OTP sub-flow
  // Note: the OTP input in signup has no id; it is identified by placeholder
  readonly sendCodeButton: Locator;
  readonly signupOtpInput: Locator;
  readonly verifyOtpButton: Locator;
  readonly emailVerifiedBadge: Locator;

  // ── Step 5 — Review & Complete ───────────────────────────────────────────
  readonly tosCheckbox: Locator;
  readonly privacyCheckbox: Locator;
  readonly marketingCheckbox: Locator;
  readonly completeRegistrationButton: Locator;

  // ── Navigation buttons (present on every step) ───────────────────────────
  readonly nextButton: Locator;
  readonly previousButton: Locator;

  // ── Error banner (inline, not toast) ─────────────────────────────────────
  readonly errorBanner: Locator;

  // ── Step indicator (header badge) ────────────────────────────────────────
  readonly stepBadge: Locator;

  constructor(page: Page) {
    this.page = page;

    // Step 1
    this.companyNameInput = page.locator("#companyName");
    // Shadcn Select renders a button as the trigger; we target by id on the
    // SelectTrigger which the component forwards the id prop to.
    this.industrySelect = page.locator("#industry");
    this.companySizeSelect = page.locator("#companySize");
    this.websiteInput = page.locator("#website");
    this.companyDescriptionTextarea = page.locator("#companyDescription");

    // Step 2
    this.streetInput = page.locator("#street");
    this.cityInput = page.locator("#city");
    this.stateInput = page.locator("#state");
    this.postalCodeInput = page.locator("#postalCode");
    this.countrySelect = page.locator("#country");
    this.phoneInput = page.locator("#phone");

    // Step 3
    this.legalCompanyNameInput = page.locator("#legalCompanyName");
    this.taxIdInput = page.locator("#taxId");
    this.registrationNumberInput = page.locator("#registrationNumber");

    // Step 4
    this.firstNameInput = page.locator("#firstName");
    this.lastNameInput = page.locator("#lastName");
    this.emailInput = page.locator("#email");
    this.jobTitleInput = page.locator("#jobTitle");

    // Step 4 OTP — the OTP input has no id; use placeholder + inputMode
    this.sendCodeButton = page.getByRole("button", { name: /Send Code/i });
    this.signupOtpInput = page.locator(
      'input[placeholder="000000"], input[inputmode="numeric"][maxlength="6"]'
    );
    this.verifyOtpButton = page.getByRole("button", { name: /^Verify$/i });
    this.emailVerifiedBadge = page.getByText(/Email verified successfully/i);

    // Step 5
    this.tosCheckbox = page.locator("#tos");
    this.privacyCheckbox = page.locator("#privacy");
    this.marketingCheckbox = page.locator("#marketing");
    this.completeRegistrationButton = page.getByRole("button", {
      name: /Complete Registration/i,
    });

    // Navigation (visible on every step)
    this.nextButton = page.getByRole("button", { name: /^Next$/i });
    this.previousButton = page.getByRole("button", { name: /Previous/i });

    // Error banner (inline red box — NOT a toast)
    this.errorBanner = page.locator(SIGNUP_ERROR_BANNER);

    // Header step badge: "Step N of 5"
    this.stepBadge = page.locator("header").getByText(/Step \d+ of 5/i);
  }

  // ── Navigation ───────────────────────────────────────────────────────────

  /**
   * Navigate to /signup (Step 1 — Company Information).
   *
   * @param options.plan    Optional plan name from /pricing (e.g. "Starter").
   *                        If provided it is appended as ?plan= so the
   *                        component captures it before URL rewriting.
   * @param options.billing "monthly" | "annual"  (default "annual").
   */
  async goto(options?: {
    plan?: string;
    billing?: "monthly" | "annual";
  }): Promise<void> {
    let url = SIGNUP_URL;
    const params = new URLSearchParams({ section: "company" });
    if (options?.plan) params.set("plan", options.plan);
    if (options?.billing) params.set("billing", options.billing);
    url = `${SIGNUP_URL}?${params.toString()}`;

    await this.page.goto(url);
    // Wait for Step 1 content to mount (companyName is always present on step 1)
    await this.companyNameInput.waitFor({ state: "visible" });
  }

  /**
   * Navigate directly to a specific signup step via its URL section param.
   * Useful when you have already filled earlier steps and want to resume.
   */
  async gotoStep(
    section: "company" | "contact" | "legal" | "manager" | "review"
  ): Promise<void> {
    await this.page.goto(`${SIGNUP_URL}?section=${section}`);
  }

  // ── Step progression helpers ──────────────────────────────────────────────

  /**
   * Click the "Next" button and wait for the URL to update to the new
   * section, confirming the step transition completed.
   */
  async clickNext(): Promise<void> {
    await this.nextButton.click();
    // Wait for URL to reflect the new section (router.replace is async)
    await this.page.waitForURL(/section=/, { timeout: 10_000 });
  }

  /** Click the "Previous" button. */
  async clickPrevious(): Promise<void> {
    await this.previousButton.click();
  }

  /**
   * Assert the progress badge in the header shows the expected step number.
   * @param stepNumber 1–5
   */
  async expectStep(stepNumber: number): Promise<void> {
    await expect(this.stepBadge).toContainText(
      `Step ${stepNumber} of 5`,
      { timeout: 5_000 }
    );
  }

  // ── Step 1 helpers ────────────────────────────────────────────────────────

  /** Fill the Company Name text input. */
  async fillCompanyName(name: string): Promise<void> {
    await this.companyNameInput.fill(name);
  }

  /**
   * Choose an option from the Industry Shadcn Select.
   * Opens the trigger, then clicks the matching SelectItem.
   *
   * Valid values (from signup/page.tsx):
   *   "Technology" | "Healthcare" | "Finance" | "Education" |
   *   "Retail" | "Manufacturing" | "Hospitality" | "Other"
   */
  async selectIndustry(industry: string): Promise<void> {
    await this.industrySelect.click();
    await this.page
      .getByRole("option", { name: industry, exact: true })
      .click();
  }

  /**
   * Choose an option from the Company Size Shadcn Select.
   *
   * Valid values (from signup/page.tsx):
   *   "1-10 employees" | "11-50 employees" | "51-200 employees" |
   *   "201-500 employees" | "501-1000 employees" | "1000+ employees"
   */
  async selectCompanySize(size: string): Promise<void> {
    await this.companySizeSelect.click();
    await this.page.getByRole("option", { name: size, exact: true }).click();
  }

  /** Fill the optional Website field. */
  async fillWebsite(url: string): Promise<void> {
    await this.websiteInput.fill(url);
  }

  /** Fill the optional Company Description textarea. */
  async fillCompanyDescription(description: string): Promise<void> {
    await this.companyDescriptionTextarea.fill(description);
  }

  // ── Step 2 helpers ────────────────────────────────────────────────────────

  async fillStreet(street: string): Promise<void> {
    await this.streetInput.fill(street);
  }

  async fillCity(city: string): Promise<void> {
    await this.cityInput.fill(city);
  }

  async fillState(state: string): Promise<void> {
    await this.stateInput.fill(state);
  }

  async fillPostalCode(postalCode: string): Promise<void> {
    await this.postalCodeInput.fill(postalCode);
  }

  /**
   * Choose the country from the Shadcn Country Select.
   * The value must be an ISO-2 code; the option text is the display name.
   *
   * Available country display names (signup/page.tsx countryOptions):
   *   "United States", "India", "United Kingdom", "Canada", "Australia",
   *   "Germany", "France", "Singapore", "UAE", "Other"
   *
   * @param countryDisplayName The human-readable name shown in the dropdown.
   */
  async selectCountry(countryDisplayName: string): Promise<void> {
    await this.countrySelect.click();
    await this.page
      .getByRole("option", { name: countryDisplayName, exact: true })
      .click();
  }

  async fillPhone(phone: string): Promise<void> {
    await this.phoneInput.fill(phone);
  }

  // ── Step 3 helpers ────────────────────────────────────────────────────────

  async fillLegalCompanyName(name: string): Promise<void> {
    await this.legalCompanyNameInput.fill(name);
  }

  async fillTaxId(taxId: string): Promise<void> {
    await this.taxIdInput.fill(taxId);
  }

  async fillRegistrationNumber(regNum: string): Promise<void> {
    await this.registrationNumberInput.fill(regNum);
  }

  // ── Step 4 helpers ────────────────────────────────────────────────────────

  async fillFirstName(firstName: string): Promise<void> {
    await this.firstNameInput.fill(firstName);
  }

  async fillLastName(lastName: string): Promise<void> {
    await this.lastNameInput.fill(lastName);
  }

  /**
   * Fill the email field on Step 4 (Manager Account).
   * This field is locked after OTP is verified; only call before sending OTP.
   */
  async fillEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }

  async fillJobTitle(title: string): Promise<void> {
    await this.jobTitleInput.fill(title);
  }

  // ── Step 4 OTP sub-flow ───────────────────────────────────────────────────

  /**
   * Click "Send Code" to trigger POST /api/otp/send.
   * firstName, lastName, and email must already be filled.
   * A 30-second resend countdown starts after this call.
   */
  async sendSignupOtp(): Promise<void> {
    await this.sendCodeButton.click();
  }

  /**
   * Fill the 6-digit OTP code.
   * The input has no id; it is matched by placeholder "000000" and
   * inputMode="numeric" (signup/page.tsx L658–660).
   */
  async fillSignupOtp(code: string): Promise<void> {
    // The OTP input only appears after "Send Code" is clicked
    await this.signupOtpInput.waitFor({ state: "visible", timeout: 10_000 });
    await this.signupOtpInput.fill(code);
  }

  /**
   * Click the "Verify" button to POST /api/otp/verify-code.
   * On success, the email field becomes disabled and a green
   * "Email verified successfully." banner appears.
   */
  async verifySignupOtp(): Promise<void> {
    await this.verifyOtpButton.click();
    // Wait for the verified badge to confirm success
    await this.emailVerifiedBadge.waitFor({ state: "visible", timeout: 10_000 });
  }

  /**
   * Complete the OTP sub-flow on Step 4:
   *   fillEmail -> sendSignupOtp -> fillSignupOtp -> verifySignupOtp
   *
   * Call this AFTER fillFirstName/fillLastName so the API receives fullName.
   */
  async completeOtpVerification(email: string, otp: string): Promise<void> {
    await this.fillEmail(email);
    await this.sendSignupOtp();
    await this.fillSignupOtp(otp);
    await this.verifySignupOtp();
  }

  // ── Step 5 helpers ────────────────────────────────────────────────────────

  /**
   * Tick the Terms of Service checkbox (id="tos").
   * Pass false to un-tick (rare in tests).
   */
  async checkTos(checked = true): Promise<void> {
    if ((await this.tosCheckbox.isChecked()) !== checked) {
      await this.tosCheckbox.click();
    }
  }

  /** Tick the Privacy Policy consent checkbox (id="privacy"). */
  async checkPrivacy(checked = true): Promise<void> {
    if ((await this.privacyCheckbox.isChecked()) !== checked) {
      await this.privacyCheckbox.click();
    }
  }

  /** Tick the optional marketing communications checkbox (id="marketing"). */
  async checkMarketing(checked = true): Promise<void> {
    if ((await this.marketingCheckbox.isChecked()) !== checked) {
      await this.marketingCheckbox.click();
    }
  }

  // ── Submit / generic helpers ──────────────────────────────────────────────

  /**
   * Submit the current step's form.
   * On steps 1–4 this clicks "Next"; on step 5 it clicks
   * "Complete Registration".
   *
   * Prefer the step-specific methods (clickNext / completeRegistration)
   * for clearer intent in spec files.
   */
  async submitForm(): Promise<void> {
    const nextVisible = await this.nextButton.isVisible().catch(() => false);
    if (nextVisible) {
      await this.clickNext();
    } else {
      await this.completeRegistrationButton.click();
    }
  }

  /** Alias for fillSignupOtp — satisfies interface naming conventions. */
  async fillOTP(code: string): Promise<void> {
    await this.fillSignupOtp(code);
  }

  /** Alias for verifySignupOtp. */
  async submitOTP(): Promise<void> {
    await this.verifyOtpButton.click();
  }

  /** Click "Complete Registration" on Step 5. */
  async completeRegistration(): Promise<void> {
    await this.completeRegistrationButton.click();
  }

  // ── Assertions ───────────────────────────────────────────────────────────

  /**
   * Assert the signup completed successfully.
   * A successful signup either:
   *   (a) redirects to /dashboard  (no plan selected), or
   *   (b) redirects to Stripe checkout URL (plan pre-selected from /pricing).
   *
   * We verify the user has left /signup and is no longer on the error page.
   */
  async expectSignupSuccess(): Promise<void> {
    await expect(this.page).not.toHaveURL(/\/signup/, { timeout: 20_000 });
    // Should not be on an error page
    await expect(this.page).not.toHaveURL(/\/not-found|\/error/);
  }

  /**
   * Assert the signup completed and the user landed on /dashboard.
   * Use expectSignupSuccess() instead when a Stripe redirect is expected.
   */
  async expectRedirectToDashboard(): Promise<void> {
    await expect(this.page).toHaveURL(/\/dashboard/, { timeout: 20_000 });
  }

  /**
   * Assert an inline error banner is visible on the signup page.
   *
   * @param message Partial text to match in the error banner.
   *   If omitted, just asserts any error banner is visible.
   *
   * Common server error strings:
   *   - "User already exists. Please use login instead."
   *   - "Please verify your email first"
   *   - "Please agree to Terms of Service and Privacy Policy"
   *   - "Signup failed"
   */
  async expectSignupError(message?: string): Promise<void> {
    await this.errorBanner.waitFor({ state: "visible", timeout: 10_000 });
    if (message) {
      await expect(this.errorBanner).toContainText(message);
    }
  }

  /**
   * Dismiss the currently visible inline error banner by clicking the
   * "✕" close button.
   */
  async dismissError(): Promise<void> {
    await this.page
      .locator(".bg-red-50 button")
      .filter({ hasText: "✕" })
      .click();
    await this.errorBanner.waitFor({ state: "hidden", timeout: 5_000 });
  }

  // ── Compound helpers ──────────────────────────────────────────────────────

  /**
   * Execute the complete 5-step signup flow end-to-end.
   *
   * Navigates to /signup, fills all steps with the provided data, verifies
   * the email OTP, accepts required consents, and submits.  Asserts success
   * (navigates away from /signup) when done.
   *
   * Default values applied when optional fields are omitted:
   *   agreeTos     = true
   *   agreePrivacy = true
   *   agreeMarketing = false
   *
   * @example
   * await signupPage.fullSignup({
   *   companyName: "Acme Corp",
   *   industry: "Technology",
   *   companySize: "11-50 employees",
   *   street: "123 Main St",
   *   city: "San Francisco",
   *   state: "CA",
   *   postalCode: "94105",
   *   country: "United States",
   *   legalCompanyName: "Acme Corporation Inc.",
   *   firstName: "Jane",
   *   lastName: "Doe",
   *   email: "jane@acme.com",
   *   otp: "123456",
   * });
   */
  async fullSignup(data: SignupData): Promise<void> {
    // ── Navigate ────────────────────────────────────────────────────────────
    await this.goto();

    // ── Step 1: Company Information ─────────────────────────────────────────
    await this.expectStep(1);
    await this.fillCompanyName(data.companyName);
    await this.selectIndustry(data.industry);
    await this.selectCompanySize(data.companySize);
    if (data.website) await this.fillWebsite(data.website);
    if (data.companyDescription)
      await this.fillCompanyDescription(data.companyDescription);
    await this.clickNext();

    // ── Step 2: Contact Information ─────────────────────────────────────────
    await this.expectStep(2);
    await this.fillStreet(data.street);
    await this.fillCity(data.city);
    await this.fillState(data.state);
    await this.fillPostalCode(data.postalCode);
    await this.selectCountry(data.country);
    if (data.phone) await this.fillPhone(data.phone);
    await this.clickNext();

    // ── Step 3: Legal Information ───────────────────────────────────────────
    await this.expectStep(3);
    await this.fillLegalCompanyName(data.legalCompanyName);
    if (data.taxId) await this.fillTaxId(data.taxId);
    if (data.registrationNumber)
      await this.fillRegistrationNumber(data.registrationNumber);
    await this.clickNext();

    // ── Step 4: Manager Account + OTP ──────────────────────────────────────
    await this.expectStep(4);
    await this.fillFirstName(data.firstName);
    await this.fillLastName(data.lastName);
    if (data.jobTitle) await this.fillJobTitle(data.jobTitle);
    // OTP sub-flow (must happen after firstName/lastName are filled)
    await this.completeOtpVerification(data.email, data.otp);
    await this.clickNext();

    // ── Step 5: Review & Complete ───────────────────────────────────────────
    await this.expectStep(5);
    await this.checkTos(data.agreeTos ?? true);
    await this.checkPrivacy(data.agreePrivacy ?? true);
    if (data.agreeMarketing) await this.checkMarketing(true);
    await this.completeRegistration();

    // ── Assert success ──────────────────────────────────────────────────────
    await this.expectSignupSuccess();
  }
}
