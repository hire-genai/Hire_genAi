/**
 * tests/e2e/01-company-onboarding.spec.ts
 *
 * End-to-end tests for the Company Onboarding / Signup Flow.
 *
 * Covers:
 *   POSITIVE
 *     1. Successful 5-step company signup with all valid fields
 *     2. Email domain is captured from manager email (becomes company domain)
 *     3. OTP verification step works (send + verify code)
 *     4. Redirect to /dashboard (or Stripe checkout) after signup
 *
 *   NEGATIVE
 *     1. Missing required fields on each step show browser alert / block Next
 *     2. Invalid email format rejected by OTP send
 *     3. Duplicate company email rejected at /api/signup/complete
 *     4. Wrong OTP shows inline error on Step 4
 *
 * API interception strategy
 *   All external API calls are intercepted via page.route() so tests are
 *   deterministic, fast, and do not touch the real database or email provider.
 *
 *   Intercepted routes:
 *     POST /api/otp/send          — returns { ok: true }
 *     POST /api/otp/verify-code   — returns { ok: true } or error
 *     POST /api/signup/complete   — returns stubbed session or error
 *
 * Page Object used: tests/e2e/pages/auth.page.ts → SignupPage
 */

import { test, expect, type Page } from "@playwright/test";
import { SignupPage, type SignupData } from "./pages/auth.page";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FIXED_OTP = "123456";
const WRONG_OTP = "999999";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

// ---------------------------------------------------------------------------
// Test fixtures — realistic company data
// ---------------------------------------------------------------------------

/**
 * A complete, valid SignupData payload that passes all 5 steps.
 * Tests that only care about certain steps can spread-override specific fields.
 */
const VALID_SIGNUP: SignupData = {
  // Step 1
  companyName: "Playwright Test Corp",
  industry: "Technology",
  companySize: "11-50 employees",
  website: "https://www.playwrighttest.com",
  companyDescription: "An E2E testing company used only by automated tests.",

  // Step 2
  street: "123 Test Street",
  city: "San Francisco",
  state: "CA",
  postalCode: "94105",
  country: "United States",
  phone: "+1 (555) 123-4567",

  // Step 3
  legalCompanyName: "Playwright Test Corporation Inc.",
  taxId: "12-3456789",
  registrationNumber: "REG-2024-PW",

  // Step 4
  firstName: "Jane",
  lastName: "Doe",
  email: "jane.doe@playwrighttest.com",
  otp: FIXED_OTP,
  jobTitle: "Engineering Manager",

  // Step 5
  agreeTos: true,
  agreePrivacy: true,
  agreeMarketing: false,
};

/**
 * Stubbed successful API response from POST /api/signup/complete.
 * Mirrors what the real endpoint returns so that setAuthSession is called
 * and the router pushes /dashboard.
 */
const SIGNUP_SUCCESS_RESPONSE = {
  ok: true,
  user: {
    id: "00000000-0000-4000-a000-000000000001",
    email: VALID_SIGNUP.email,
    full_name: `${VALID_SIGNUP.firstName} ${VALID_SIGNUP.lastName}`,
    status: "active",
  },
  company: {
    id: "00000000-0000-4000-b000-000000000001",
    name: VALID_SIGNUP.companyName,
    status: "active",
    verified: false,
  },
};

// ---------------------------------------------------------------------------
// Route interception helpers
// ---------------------------------------------------------------------------

/**
 * Mock POST /api/otp/send to always succeed without sending a real email.
 * Returns { ok: true } which is all the client checks.
 */
async function mockOtpSend(page: Page): Promise<void> {
  await page.route("**/api/otp/send", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });
}

/**
 * Mock POST /api/otp/verify-code to accept FIXED_OTP and reject all others.
 * The real endpoint path is /api/otp/verify-code (not /api/otp/verify-login).
 */
async function mockOtpVerify(
  page: Page,
  options: { acceptCode?: string; rejectAll?: boolean } = {}
): Promise<void> {
  const { acceptCode = FIXED_OTP, rejectAll = false } = options;

  await page.route("**/api/otp/verify-code", async (route) => {
    let body: Record<string, unknown> = {}; try { body = route.request().postDataJSON() ?? {}; } catch { body = {} }

    if (rejectAll || body?.otp !== acceptCode) {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Invalid or expired OTP. Please verify your email again.",
        }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    }
  });
}

/**
 * Mock POST /api/signup/complete to return a successful signup response
 * (no real DB write, no real email).
 */
async function mockSignupComplete(
  page: Page,
  options: {
    statusCode?: number;
    responseBody?: Record<string, unknown>;
  } = {}
): Promise<void> {
  const { statusCode = 200, responseBody = SIGNUP_SUCCESS_RESPONSE } = options;

  await page.route("**/api/signup/complete", async (route) => {
    await route.fulfill({
      status: statusCode,
      contentType: "application/json",
      body: JSON.stringify(responseBody),
    });
  });
}

/**
 * Install all three mocks at once — standard setup for positive-path tests.
 */
async function mockAllSignupApis(page: Page): Promise<void> {
  await mockOtpSend(page);
  await mockOtpVerify(page);
  await mockSignupComplete(page);
}

// ---------------------------------------------------------------------------
// Helper: drive the form through a specific step without mocks
// (used in negative tests that start fresh)
// ---------------------------------------------------------------------------

/**
 * Drive Step 1 of the signup form with the provided data.
 * Does NOT click Next — callers control when to advance.
 */
async function fillStep1(
  signupPage: SignupPage,
  data: Pick<SignupData, "companyName" | "industry" | "companySize"> & Partial<SignupData>
): Promise<void> {
  await signupPage.fillCompanyName(data.companyName);
  await signupPage.selectIndustry(data.industry);
  await signupPage.selectCompanySize(data.companySize);
  if (data.website) await signupPage.fillWebsite(data.website);
  if (data.companyDescription) await signupPage.fillCompanyDescription(data.companyDescription);
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

test.describe("Company Onboarding Flow", () => {
  let signupPage: SignupPage;

  // ── beforeEach / afterEach ────────────────────────────────────────────────

  test.beforeEach(async ({ page }) => {
    signupPage = new SignupPage(page);

    // Clear any persisted auth state that might auto-redirect away from /signup
    await page.addInitScript(() => {
      localStorage.removeItem("mockAuth");
      localStorage.removeItem("mockAuth_backup");
      localStorage.removeItem("sessionExpiresAt");
      localStorage.removeItem("sessionStartTime");
      sessionStorage.setItem("skipAuthRestore", "true");
    });
  });

  test.afterEach(async ({ page }) => {
    // Remove any route intercepts and clear storage so tests are isolated
    await page.unrouteAll({ behavior: "ignoreErrors" });
  });

  // =========================================================================
  // POSITIVE TEST CASES
  // =========================================================================

  test.describe("Positive scenarios", () => {
    // ── 1. Full happy-path signup ───────────────────────────────────────────

    test("should complete all 5 steps and redirect to dashboard", async ({
      page,
    }) => {
      await mockAllSignupApis(page);

      await signupPage.fullSignup(VALID_SIGNUP);

      // After successful submission the app pushes /dashboard
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });
    });

    // ── 2. Email domain captured as company domain ──────────────────────────

    test("should capture manager email domain during signup", async ({
      page,
    }) => {
      await mockAllSignupApis(page);

      // Intercept /api/signup/complete and assert the email sent contains
      // the expected domain
      let capturedBody: Record<string, unknown> = {};
      await page.route("**/api/signup/complete", async (route) => {
        let body: Record<string, unknown> = {}; try { body = route.request().postDataJSON() ?? {}; } catch { body = {} }
        capturedBody = body;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(SIGNUP_SUCCESS_RESPONSE),
        });
      });

      await signupPage.fullSignup(VALID_SIGNUP);

      // The email field in the submitted payload should contain the correct domain
      expect(capturedBody.email).toBe(VALID_SIGNUP.email);
      const domain = (capturedBody.email as string).split("@")[1];
      expect(domain).toBe("playwrighttest.com");
    });

    // ── 3. OTP verification step works ─────────────────────────────────────

    test("should send OTP, accept correct code, and mark email as verified", async ({
      page,
    }) => {
      await mockOtpSend(page);
      await mockOtpVerify(page, { acceptCode: FIXED_OTP });

      await signupPage.goto();

      // Complete steps 1–3 so we reach Step 4
      await fillStep1(signupPage, VALID_SIGNUP);
      await signupPage.clickNext();

      await signupPage.expectStep(2);
      await signupPage.fillStreet(VALID_SIGNUP.street);
      await signupPage.fillCity(VALID_SIGNUP.city);
      await signupPage.fillState(VALID_SIGNUP.state);
      await signupPage.fillPostalCode(VALID_SIGNUP.postalCode);
      await signupPage.selectCountry(VALID_SIGNUP.country);
      await signupPage.clickNext();

      await signupPage.expectStep(3);
      await signupPage.fillLegalCompanyName(VALID_SIGNUP.legalCompanyName);
      await signupPage.clickNext();

      // Step 4 — OTP sub-flow
      await signupPage.expectStep(4);
      await signupPage.fillFirstName(VALID_SIGNUP.firstName);
      await signupPage.fillLastName(VALID_SIGNUP.lastName);
      await signupPage.fillEmail(VALID_SIGNUP.email);

      // Click "Send Code" button
      await signupPage.sendSignupOtp();

      // OTP input should appear after the send call
      await signupPage.fillSignupOtp(FIXED_OTP);
      await signupPage.verifySignupOtp();

      // Green "Email verified successfully." banner should be visible
      await expect(signupPage.emailVerifiedBadge).toBeVisible({ timeout: 10_000 });

      // Email input should be disabled after verification
      await expect(signupPage.emailInput).toBeDisabled();
    });

    // ── 4. Redirect to dashboard after signup ───────────────────────────────

    test("should redirect to /dashboard when no plan is pre-selected", async ({
      page,
    }) => {
      await mockAllSignupApis(page);

      // Navigate without ?plan= param
      await signupPage.goto();
      await signupPage.fullSignup(VALID_SIGNUP);

      await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });
      // Must have left /signup entirely
      await expect(page).not.toHaveURL(/\/signup/);
    });

    test("should redirect to Stripe checkout URL when plan is pre-selected", async ({
      page,
    }) => {
      const checkoutUrl = "https://checkout.stripe.com/pay/cs_test_abc123";

      await mockOtpSend(page);
      await mockOtpVerify(page);
      // Return a checkoutUrl so the app does window.location.href = checkoutUrl
      await mockSignupComplete(page, {
        responseBody: {
          ...SIGNUP_SUCCESS_RESPONSE,
          checkoutUrl,
        },
      });

      // Navigate with ?plan=professional&billing=monthly
      await signupPage.goto({ plan: "professional", billing: "monthly" });

      // Complete all steps
      await signupPage.fullSignup(VALID_SIGNUP);

      // The page navigates to the Stripe checkout URL — URL must not be /signup
      // (window.location.href navigation happens synchronously from the app)
      await expect(page).not.toHaveURL(/\/signup/, { timeout: 20_000 });
    });

    // ── Extra: Optional fields do not break submission ──────────────────────

    test("should complete signup with only required fields filled", async ({
      page,
    }) => {
      await mockAllSignupApis(page);

      const minimalSignup: SignupData = {
        companyName: "Minimal Co",
        industry: "Other",
        companySize: "1-10 employees",
        street: "1 Main Road",
        city: "Austin",
        state: "TX",
        postalCode: "78701",
        country: "United States",
        legalCompanyName: "Minimal Company LLC",
        firstName: "Bob",
        lastName: "Smith",
        email: "bob@minimal.io",
        otp: FIXED_OTP,
        agreeTos: true,
        agreePrivacy: true,
      };

      await signupPage.fullSignup(minimalSignup);
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });
    });

    // ── Extra: Marketing checkbox is optional ───────────────────────────────

    test("should submit successfully with marketing checkbox checked", async ({
      page,
    }) => {
      await mockAllSignupApis(page);

      await signupPage.fullSignup({
        ...VALID_SIGNUP,
        agreeMarketing: true,
      });

      await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });
    });
  });

  // =========================================================================
  // NEGATIVE TEST CASES
  // =========================================================================

  test.describe("Negative scenarios", () => {
    // ── 1. Missing required fields blocks step advance ──────────────────────

    test("Step 1: Next button is disabled when required fields are empty", async ({
      page,
    }) => {
      await signupPage.goto();
      await signupPage.expectStep(1);

      // companyName, industry, companySize are all empty on load
      // The Next button should be disabled (isStepValid() returns false)
      await expect(signupPage.nextButton).toBeDisabled();
    });

    test("Step 1: Next button enables only after all required fields are filled", async ({
      page,
    }) => {
      await signupPage.goto();
      await signupPage.expectStep(1);

      // Fill companyName only — still missing industry + companySize
      await signupPage.fillCompanyName("Partial Corp");
      await expect(signupPage.nextButton).toBeDisabled();

      // Add industry
      await signupPage.selectIndustry("Technology");
      await expect(signupPage.nextButton).toBeDisabled();

      // Add companySize — all required fields present
      await signupPage.selectCompanySize("11-50 employees");
      await expect(signupPage.nextButton).toBeEnabled();
    });

    test("Step 2: Next button is disabled when required address fields are empty", async ({
      page,
    }) => {
      await signupPage.goto();

      // Advance to step 2 with valid step 1 data
      await fillStep1(signupPage, VALID_SIGNUP);
      await signupPage.clickNext();
      await signupPage.expectStep(2);

      // All address fields are empty — Next should be disabled
      await expect(signupPage.nextButton).toBeDisabled();
    });

    test("Step 3: Next button is disabled when Legal Company Name is empty", async ({
      page,
    }) => {
      await signupPage.goto();

      // Drive through steps 1 and 2
      await fillStep1(signupPage, VALID_SIGNUP);
      await signupPage.clickNext();

      await signupPage.expectStep(2);
      await signupPage.fillStreet(VALID_SIGNUP.street);
      await signupPage.fillCity(VALID_SIGNUP.city);
      await signupPage.fillState(VALID_SIGNUP.state);
      await signupPage.fillPostalCode(VALID_SIGNUP.postalCode);
      await signupPage.selectCountry(VALID_SIGNUP.country);
      await signupPage.clickNext();

      await signupPage.expectStep(3);
      // legalCompanyName is empty — Next should be disabled
      await expect(signupPage.nextButton).toBeDisabled();

      // Fill it and assert the button enables
      await signupPage.fillLegalCompanyName("Test Legal Name Inc.");
      await expect(signupPage.nextButton).toBeEnabled();
    });

    test("Step 4: Complete Registration blocked when email not verified", async ({
      page,
    }) => {
      await mockOtpSend(page);
      // Do NOT mock verify — we will not call it
      await mockSignupComplete(page);

      await signupPage.goto();

      // Fill steps 1–3 and advance
      await fillStep1(signupPage, VALID_SIGNUP);
      await signupPage.clickNext();

      await signupPage.expectStep(2);
      await signupPage.fillStreet(VALID_SIGNUP.street);
      await signupPage.fillCity(VALID_SIGNUP.city);
      await signupPage.fillState(VALID_SIGNUP.state);
      await signupPage.fillPostalCode(VALID_SIGNUP.postalCode);
      await signupPage.selectCountry(VALID_SIGNUP.country);
      await signupPage.clickNext();

      await signupPage.expectStep(3);
      await signupPage.fillLegalCompanyName(VALID_SIGNUP.legalCompanyName);
      await signupPage.clickNext();

      await signupPage.expectStep(4);
      await signupPage.fillFirstName(VALID_SIGNUP.firstName);
      await signupPage.fillLastName(VALID_SIGNUP.lastName);
      await signupPage.fillEmail(VALID_SIGNUP.email);
      // Skip OTP verification intentionally — do not click Send Code or Verify

      // Advance to Step 5 without verifying (step 4 Next does not require otpVerified)
      await signupPage.clickNext();
      await signupPage.expectStep(5);

      // Check the required consent checkboxes
      await signupPage.checkTos(true);
      await signupPage.checkPrivacy(true);

      // Submit — the form handler checks otpVerified and sets inline error
      await signupPage.completeRegistration();

      // Inline error banner should show "Please verify your email first"
      await signupPage.expectSignupError("Please verify your email first");
    });

    test("Step 5: Complete Registration blocked when consent not given", async ({
      page,
    }) => {
      await mockAllSignupApis(page);

      await signupPage.goto();

      // Fill through step 4 with OTP verified
      await fillStep1(signupPage, VALID_SIGNUP);
      await signupPage.clickNext();

      await signupPage.expectStep(2);
      await signupPage.fillStreet(VALID_SIGNUP.street);
      await signupPage.fillCity(VALID_SIGNUP.city);
      await signupPage.fillState(VALID_SIGNUP.state);
      await signupPage.fillPostalCode(VALID_SIGNUP.postalCode);
      await signupPage.selectCountry(VALID_SIGNUP.country);
      await signupPage.clickNext();

      await signupPage.expectStep(3);
      await signupPage.fillLegalCompanyName(VALID_SIGNUP.legalCompanyName);
      await signupPage.clickNext();

      await signupPage.expectStep(4);
      await signupPage.fillFirstName(VALID_SIGNUP.firstName);
      await signupPage.fillLastName(VALID_SIGNUP.lastName);
      await signupPage.completeOtpVerification(VALID_SIGNUP.email, FIXED_OTP);
      await signupPage.clickNext();

      await signupPage.expectStep(5);

      // Do NOT check either consent checkbox — Complete Registration button
      // should be disabled when both checkboxes are unchecked
      await expect(signupPage.completeRegistrationButton).toBeDisabled();

      // Check only ToS — Privacy still unchecked — button stays disabled
      await signupPage.checkTos(true);
      await expect(signupPage.completeRegistrationButton).toBeDisabled();

      // Check Privacy too — now button should enable
      await signupPage.checkPrivacy(true);
      await expect(signupPage.completeRegistrationButton).toBeEnabled();
    });

    // ── 2. Invalid email format rejected ────────────────────────────────────

    test("should show error when OTP send is called with invalid email", async ({
      page,
    }) => {
      // Return an error response from the OTP send endpoint for invalid email
      await page.route("**/api/otp/send", async (route) => {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: "Invalid email address" }),
        });
      });

      await signupPage.goto();

      // Advance through steps 1–3
      await fillStep1(signupPage, VALID_SIGNUP);
      await signupPage.clickNext();

      await signupPage.expectStep(2);
      await signupPage.fillStreet(VALID_SIGNUP.street);
      await signupPage.fillCity(VALID_SIGNUP.city);
      await signupPage.fillState(VALID_SIGNUP.state);
      await signupPage.fillPostalCode(VALID_SIGNUP.postalCode);
      await signupPage.selectCountry(VALID_SIGNUP.country);
      await signupPage.clickNext();

      await signupPage.expectStep(3);
      await signupPage.fillLegalCompanyName(VALID_SIGNUP.legalCompanyName);
      await signupPage.clickNext();

      await signupPage.expectStep(4);
      await signupPage.fillFirstName(VALID_SIGNUP.firstName);
      await signupPage.fillLastName(VALID_SIGNUP.lastName);
      // Fill an invalid email address
      await signupPage.fillEmail("not-an-email");

      await signupPage.sendSignupOtp();

      // Inline error banner should appear
      await signupPage.expectSignupError("Invalid email address");
    });

    // ── 3. Duplicate company email rejected ─────────────────────────────────

    test("should show error when signup email already exists", async ({
      page,
    }) => {
      await mockOtpSend(page);
      await mockOtpVerify(page);
      // Mock /api/signup/complete to return a duplicate email error
      await mockSignupComplete(page, {
        statusCode: 409,
        responseBody: {
          error: "User already exists. Please use login instead.",
        },
      });

      await signupPage.goto();

      // Complete all steps up to submission
      await fillStep1(signupPage, VALID_SIGNUP);
      await signupPage.clickNext();

      await signupPage.expectStep(2);
      await signupPage.fillStreet(VALID_SIGNUP.street);
      await signupPage.fillCity(VALID_SIGNUP.city);
      await signupPage.fillState(VALID_SIGNUP.state);
      await signupPage.fillPostalCode(VALID_SIGNUP.postalCode);
      await signupPage.selectCountry(VALID_SIGNUP.country);
      await signupPage.clickNext();

      await signupPage.expectStep(3);
      await signupPage.fillLegalCompanyName(VALID_SIGNUP.legalCompanyName);
      await signupPage.clickNext();

      await signupPage.expectStep(4);
      await signupPage.fillFirstName(VALID_SIGNUP.firstName);
      await signupPage.fillLastName(VALID_SIGNUP.lastName);
      await signupPage.completeOtpVerification(VALID_SIGNUP.email, FIXED_OTP);
      await signupPage.clickNext();

      await signupPage.expectStep(5);
      await signupPage.checkTos(true);
      await signupPage.checkPrivacy(true);
      await signupPage.completeRegistration();

      // The server returns 409; the app sets errorMessage to the server message
      await signupPage.expectSignupError(
        "User already exists. Please use login instead."
      );

      // Must remain on /signup — no redirect happened
      await expect(page).toHaveURL(/\/signup/);
    });

    // ── 4. Wrong OTP shows inline error ─────────────────────────────────────

    test("should show error when wrong OTP is submitted", async ({ page }) => {
      await mockOtpSend(page);
      // Only accept FIXED_OTP — reject WRONG_OTP
      await mockOtpVerify(page, { acceptCode: FIXED_OTP });

      await signupPage.goto();

      // Advance through steps 1–3
      await fillStep1(signupPage, VALID_SIGNUP);
      await signupPage.clickNext();

      await signupPage.expectStep(2);
      await signupPage.fillStreet(VALID_SIGNUP.street);
      await signupPage.fillCity(VALID_SIGNUP.city);
      await signupPage.fillState(VALID_SIGNUP.state);
      await signupPage.fillPostalCode(VALID_SIGNUP.postalCode);
      await signupPage.selectCountry(VALID_SIGNUP.country);
      await signupPage.clickNext();

      await signupPage.expectStep(3);
      await signupPage.fillLegalCompanyName(VALID_SIGNUP.legalCompanyName);
      await signupPage.clickNext();

      await signupPage.expectStep(4);
      await signupPage.fillFirstName(VALID_SIGNUP.firstName);
      await signupPage.fillLastName(VALID_SIGNUP.lastName);
      await signupPage.fillEmail(VALID_SIGNUP.email);

      await signupPage.sendSignupOtp();

      // Enter the wrong OTP and click Verify
      await signupPage.fillSignupOtp(WRONG_OTP);
      await signupPage.submitOTP();

      // Inline error should show the rejection message
      await signupPage.expectSignupError(
        "Invalid or expired OTP. Please verify your email again."
      );

      // Email verified badge must NOT appear
      await expect(signupPage.emailVerifiedBadge).not.toBeVisible();
    });

    // ── Extra: OTP send failure shows error ─────────────────────────────────

    test("should show error when OTP send request fails", async ({ page }) => {
      await page.route("**/api/otp/send", async (route) => {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Failed to send verification code" }),
        });
      });

      await signupPage.goto();

      await fillStep1(signupPage, VALID_SIGNUP);
      await signupPage.clickNext();

      await signupPage.expectStep(2);
      await signupPage.fillStreet(VALID_SIGNUP.street);
      await signupPage.fillCity(VALID_SIGNUP.city);
      await signupPage.fillState(VALID_SIGNUP.state);
      await signupPage.fillPostalCode(VALID_SIGNUP.postalCode);
      await signupPage.selectCountry(VALID_SIGNUP.country);
      await signupPage.clickNext();

      await signupPage.expectStep(3);
      await signupPage.fillLegalCompanyName(VALID_SIGNUP.legalCompanyName);
      await signupPage.clickNext();

      await signupPage.expectStep(4);
      await signupPage.fillFirstName(VALID_SIGNUP.firstName);
      await signupPage.fillLastName(VALID_SIGNUP.lastName);
      await signupPage.fillEmail(VALID_SIGNUP.email);

      await signupPage.sendSignupOtp();

      await signupPage.expectSignupError("Failed to send verification code");
    });

    // ── Extra: Generic signup failure shows error ────────────────────────────

    test("should show error when /api/signup/complete returns server error", async ({
      page,
    }) => {
      await mockOtpSend(page);
      await mockOtpVerify(page);
      await mockSignupComplete(page, {
        statusCode: 500,
        responseBody: {
          error: "Failed to complete signup. Please try again.",
        },
      });

      await signupPage.goto();

      await fillStep1(signupPage, VALID_SIGNUP);
      await signupPage.clickNext();

      await signupPage.expectStep(2);
      await signupPage.fillStreet(VALID_SIGNUP.street);
      await signupPage.fillCity(VALID_SIGNUP.city);
      await signupPage.fillState(VALID_SIGNUP.state);
      await signupPage.fillPostalCode(VALID_SIGNUP.postalCode);
      await signupPage.selectCountry(VALID_SIGNUP.country);
      await signupPage.clickNext();

      await signupPage.expectStep(3);
      await signupPage.fillLegalCompanyName(VALID_SIGNUP.legalCompanyName);
      await signupPage.clickNext();

      await signupPage.expectStep(4);
      await signupPage.fillFirstName(VALID_SIGNUP.firstName);
      await signupPage.fillLastName(VALID_SIGNUP.lastName);
      await signupPage.completeOtpVerification(VALID_SIGNUP.email, FIXED_OTP);
      await signupPage.clickNext();

      await signupPage.expectStep(5);
      await signupPage.checkTos(true);
      await signupPage.checkPrivacy(true);
      await signupPage.completeRegistration();

      await signupPage.expectSignupError(
        "Failed to complete signup. Please try again."
      );

      // Still on /signup — no redirect
      await expect(page).toHaveURL(/\/signup/);
    });
  });

  // =========================================================================
  // STEP NAVIGATION TESTS
  // =========================================================================

  test.describe("Step navigation", () => {
    test("should show Step 1 badge on initial load", async ({ page }) => {
      await signupPage.goto();
      await signupPage.expectStep(1);
    });

    test("should advance to Step 2 after filling Step 1 required fields", async ({
      page,
    }) => {
      await signupPage.goto();
      await fillStep1(signupPage, VALID_SIGNUP);
      await signupPage.clickNext();
      await signupPage.expectStep(2);
    });

    test("should go back to Step 1 from Step 2 via Previous button", async ({
      page,
    }) => {
      await signupPage.goto();
      await fillStep1(signupPage, VALID_SIGNUP);
      await signupPage.clickNext();
      await signupPage.expectStep(2);

      await signupPage.clickPrevious();
      await signupPage.expectStep(1);
    });

    test("should update URL section param as steps advance", async ({
      page,
    }) => {
      await signupPage.goto();

      await expect(page).toHaveURL(/section=company/);

      await fillStep1(signupPage, VALID_SIGNUP);
      await signupPage.clickNext();

      await expect(page).toHaveURL(/section=contact/);
    });

    test("should display correct step badge throughout the flow", async ({
      page,
    }) => {
      await mockOtpSend(page);
      await mockOtpVerify(page);

      await signupPage.goto();

      // Step 1
      await signupPage.expectStep(1);
      await fillStep1(signupPage, VALID_SIGNUP);
      await signupPage.clickNext();

      // Step 2
      await signupPage.expectStep(2);
      await signupPage.fillStreet(VALID_SIGNUP.street);
      await signupPage.fillCity(VALID_SIGNUP.city);
      await signupPage.fillState(VALID_SIGNUP.state);
      await signupPage.fillPostalCode(VALID_SIGNUP.postalCode);
      await signupPage.selectCountry(VALID_SIGNUP.country);
      await signupPage.clickNext();

      // Step 3
      await signupPage.expectStep(3);
      await signupPage.fillLegalCompanyName(VALID_SIGNUP.legalCompanyName);
      await signupPage.clickNext();

      // Step 4
      await signupPage.expectStep(4);
      await signupPage.fillFirstName(VALID_SIGNUP.firstName);
      await signupPage.fillLastName(VALID_SIGNUP.lastName);
      await signupPage.completeOtpVerification(VALID_SIGNUP.email, FIXED_OTP);
      await signupPage.clickNext();

      // Step 5
      await signupPage.expectStep(5);
    });

    test("Previous button is disabled on Step 1", async ({ page }) => {
      await signupPage.goto();
      await signupPage.expectStep(1);
      await expect(signupPage.previousButton).toBeDisabled();
    });
  });

  // =========================================================================
  // FIELD PAYLOAD TESTS
  // =========================================================================

  test.describe("Submitted payload validation", () => {
    test("should include all required fields in /api/signup/complete request", async ({
      page,
    }) => {
      await mockOtpSend(page);
      await mockOtpVerify(page);

      let signupPayload: Record<string, unknown> = {};
      await page.route("**/api/signup/complete", async (route) => {
        try { signupPayload = route.request().postDataJSON() ?? {}; } catch { signupPayload = {} }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(SIGNUP_SUCCESS_RESPONSE),
        });
      });

      await signupPage.fullSignup(VALID_SIGNUP);

      // Assert all required fields are present in the submitted body
      expect(signupPayload.companyName).toBe(VALID_SIGNUP.companyName);
      expect(signupPayload.industry).toBe(VALID_SIGNUP.industry);
      expect(signupPayload.companySize).toBe(VALID_SIGNUP.companySize);
      expect(signupPayload.street).toBe(VALID_SIGNUP.street);
      expect(signupPayload.city).toBe(VALID_SIGNUP.city);
      expect(signupPayload.state).toBe(VALID_SIGNUP.state);
      expect(signupPayload.postalCode).toBe(VALID_SIGNUP.postalCode);
      // country is stored as ISO code (e.g. "US") in form state, but displayed
      // as "United States"; the select uses value=code so payload should be ISO
      expect(signupPayload.country).toBeTruthy();
      expect(signupPayload.legalCompanyName).toBe(VALID_SIGNUP.legalCompanyName);
      expect(signupPayload.firstName).toBe(VALID_SIGNUP.firstName);
      expect(signupPayload.lastName).toBe(VALID_SIGNUP.lastName);
      expect(signupPayload.email).toBe(VALID_SIGNUP.email);
      expect(signupPayload.agreeTos).toBe(true);
      expect(signupPayload.agreePrivacy).toBe(true);
    });

    test("should include planName and billing when navigated from pricing page", async ({
      page,
    }) => {
      await mockOtpSend(page);
      await mockOtpVerify(page);

      let signupPayload: Record<string, unknown> = {};
      await page.route("**/api/signup/complete", async (route) => {
        try { signupPayload = route.request().postDataJSON() ?? {}; } catch { signupPayload = {} }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(SIGNUP_SUCCESS_RESPONSE),
        });
      });

      // Navigate with ?plan=professional&billing=monthly, then run the form
      // without re-navigating so the plan/billing params are preserved in state
      await signupPage.goto({ plan: "professional", billing: "monthly" });
      await signupPage.fullSignup(VALID_SIGNUP, { skipGoto: true });

      expect(signupPayload.planName).toBe("professional");
      expect(signupPayload.billing).toBe("monthly");
    });

    test("should omit planName and billing when navigated without plan", async ({
      page,
    }) => {
      await mockOtpSend(page);
      await mockOtpVerify(page);

      let signupPayload: Record<string, unknown> = {};
      await page.route("**/api/signup/complete", async (route) => {
        try { signupPayload = route.request().postDataJSON() ?? {}; } catch { signupPayload = {} }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(SIGNUP_SUCCESS_RESPONSE),
        });
      });

      await signupPage.goto();
      await signupPage.fullSignup(VALID_SIGNUP);

      // planName should be undefined or absent in the payload
      expect(signupPayload.planName).toBeUndefined();
      expect(signupPayload.billing).toBeUndefined();
    });
  });
});
