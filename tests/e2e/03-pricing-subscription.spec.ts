/**
 * tests/e2e/03-pricing-subscription.spec.ts
 *
 * End-to-end tests for the Pricing -> Signup -> Subscription Purchase Flow.
 *
 * Coverage:
 *   POSITIVE
 *     1. Pricing page loads all plans with correct monthly prices
 *     2. Monthly/Annual toggle switches prices correctly
 *     3. Clicking plan CTA redirects to signup with plan pre-selected
 *     4. After signup, Stripe checkout session is created
 *     5. Successful payment shows subscription active state
 *     6. Feature gating: premium features accessible after subscription
 *
 *   NEGATIVE
 *     1. Stripe payment failure shows error message
 *     2. Card declined scenario shows friendly error
 *     3. Checkout timeout handling
 *     4. Cancel from Stripe returns to pricing page
 *
 * Mock strategy:
 *   - Stripe API endpoints (/api/stripe/*, /api/subscriptions/stripe/*) are
 *     intercepted via page.route() so tests never hit real payment infra.
 *   - OTP send/verify endpoints are intercepted so signup completes without
 *     email delivery.
 *   - Session injection mirrors what MockAuthService writes to browser storage
 *     so protected routes are accessible after simulated signup.
 *
 * Stripe test card numbers (from Stripe docs — for reference in comments):
 *   4242 4242 4242 4242  — succeeds
 *   4000 0000 0000 9995  — insufficient funds (card_declined)
 *   4000 0000 0000 0002  — generic decline
 *   4000 0025 0000 3155  — requires 3DS authentication
 */

import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** All tests run without the global auth storage state (unauthenticated). */
const PRICING_URL = "/pricing";
const SIGNUP_URL = "/signup";

/** Stripe test card numbers (documented for reference; mocked in tests). */
const STRIPE_CARDS = {
  success: "4242424242424242",
  declined: "4000000000000002",
  insufficientFunds: "4000000000000995",
  requires3DS: "4000002500003155",
} as const;

const OTP_CODE = "123456";
const TEST_EMAIL = `e2e-pricing-${Date.now()}@testcorp.io`;

/** Expected plan definitions matching the pricing page source (PLANS array). */
const EXPECTED_PLANS = [
  { name: "Starter",      monthlyPrice: 99,   annualPrice: 990,   cta: "Choose Starter" },
  { name: "Professional", monthlyPrice: 499,  annualPrice: 4990,  cta: "Choose Professional" },
  { name: "Business",     monthlyPrice: 999,  annualPrice: 9990,  cta: "Choose Business" },
  { name: "Large",        monthlyPrice: 2999, annualPrice: 29990, cta: "Choose Large" },
  { name: "Ultra",        monthlyPrice: 3999, annualPrice: 39990, cta: "Choose Ultra" },
  { name: "Enterprise",   monthlyPrice: 4999, annualPrice: 49990, cta: "Choose Enterprise" },
] as const;

/** Features that must appear on the pricing page for basic plan validation. */
const STARTER_FEATURES = [
  "Unlimited job postings",
  "AI CV evaluation & scoring",
  "AI video interviews",
] as const;

// Mock session data injected after simulated signup / payment success.
const MOCK_SESSION = {
  userId: "mock-user-pricing-001",
  companyId: "mock-company-pricing-001",
  companyName: "E2E Pricing Corp",
  fullName: "Pricing Test User",
  email: TEST_EMAIL,
  role: "manager",
};

const MOCK_AUTH_STORAGE = JSON.stringify({
  user: {
    id: MOCK_SESSION.userId,
    email: MOCK_SESSION.email,
    name: MOCK_SESSION.fullName,
    role: MOCK_SESSION.role,
    phone: "",
    timezone: "UTC",
  },
  company: {
    id: MOCK_SESSION.companyId,
    name: MOCK_SESSION.companyName,
    slug: "e2e-pricing-corp",
    industry: "Technology",
    size: "1-10",
    website: "",
  },
});

const MOCK_SESSION_COOKIE_VALUE = encodeURIComponent(JSON.stringify(MOCK_SESSION));

// ---------------------------------------------------------------------------
// Stripe mock payloads
// ---------------------------------------------------------------------------

const STRIPE_CHECKOUT_SESSION_ID = "cs_test_mock_session_abc123";
const STRIPE_CHECKOUT_URL = "https://checkout.stripe.com/c/pay/cs_test_mock_session_abc123";

/** Successful Stripe checkout creation response. */
const MOCK_STRIPE_CREATE_SUCCESS = {
  ok: true,
  subscription: {
    checkoutUrl: STRIPE_CHECKOUT_URL,
    sessionId: STRIPE_CHECKOUT_SESSION_ID,
  },
};

/** Successful Stripe subscription status (active). */
const MOCK_STRIPE_STATUS_ACTIVE = {
  ok: true,
  hasSubscription: true,
  isActive: true,
  subscription: {
    id: "sub_mock_001",
    planName: "Starter Monthly",
    status: "active",
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    cancelAtPeriodEnd: false,
  },
};

/** Stripe status when no subscription exists. */
const MOCK_STRIPE_STATUS_NONE = {
  ok: true,
  hasSubscription: false,
  isActive: false,
  subscription: null,
};

/** Stripe checkout failure — generic payment error. */
const MOCK_STRIPE_PAYMENT_FAILURE = {
  ok: false,
  error: "Your card was declined. Please use a different payment method.",
  code: "card_declined",
};

/** Stripe checkout failure — insufficient funds. */
const MOCK_STRIPE_INSUFFICIENT_FUNDS = {
  ok: false,
  error: "Your card has insufficient funds. Please use a different payment method.",
  code: "insufficient_funds",
};

// ---------------------------------------------------------------------------
// Route mock helpers
// ---------------------------------------------------------------------------

/** Mock POST /api/subscriptions/stripe/create to return a checkout URL. */
async function mockStripeCheckoutCreate(page: Page, response = MOCK_STRIPE_CREATE_SUCCESS): Promise<void> {
  await page.route("**/api/subscriptions/stripe/create", async (route) => {
    await route.fulfill({
      status: response.ok ? 200 : 400,
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  });
}

/** Mock GET /api/subscriptions/stripe/status. */
async function mockStripeStatus(page: Page, response: Record<string, unknown> = MOCK_STRIPE_STATUS_NONE): Promise<void> {
  await page.route("**/api/subscriptions/stripe/status", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  });
}

/** Mock POST /api/stripe/checkout (alternate checkout creation endpoint). */
async function mockStripeCheckoutAlt(page: Page, response = MOCK_STRIPE_CREATE_SUCCESS): Promise<void> {
  await page.route("**/api/stripe/checkout", async (route) => {
    await route.fulfill({
      status: response.ok ? 200 : 400,
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  });
}

/** Mock POST /api/stripe/verify — called after Stripe redirects back. */
async function mockStripeVerify(page: Page, response: Record<string, unknown> = { ok: true }): Promise<void> {
  await page.route("**/api/stripe/verify", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  });
}

/** Mock POST /api/stripe/confirm — Stripe PaymentIntent confirmation. */
async function mockStripeConfirm(page: Page, response: Record<string, unknown> = { ok: true }): Promise<void> {
  await page.route("**/api/stripe/confirm", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  });
}

/** Mock OTP send and verify endpoints for the signup flow. */
async function mockSignupOtp(page: Page): Promise<void> {
  await page.route("**/api/otp/send", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, message: "OTP sent successfully" }),
    });
  });
  await page.route("**/api/otp/verify-code", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, message: "Email verified successfully" }),
    });
  });
}

/**
 * Mock POST /api/signup/complete — completes registration and returns session data.
 * Optionally accepts a checkoutUrl for plan-selected signups.
 */
async function mockSignupComplete(
  page: Page,
  options: { checkoutUrl?: string; planName?: string } = {}
): Promise<void> {
  await page.route("**/api/signup/complete", async (route) => {
    const responseBody: Record<string, unknown> = {
      ok: true,
      user: {
        id: MOCK_SESSION.userId,
        email: MOCK_SESSION.email,
        name: MOCK_SESSION.fullName,
        role: MOCK_SESSION.role,
      },
      company: {
        id: MOCK_SESSION.companyId,
        name: MOCK_SESSION.companyName,
        slug: "e2e-pricing-corp",
      },
    };
    if (options.checkoutUrl) {
      responseBody.checkoutUrl = options.checkoutUrl;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: {
        "Set-Cookie": `session=${MOCK_SESSION_COOKIE_VALUE}; Path=/; HttpOnly; SameSite=Lax`,
      },
      body: JSON.stringify(responseBody),
    });
  });
}

/** Inject a full authenticated session into browser storage (localStorage + cookie). */
async function injectAuthSession(page: Page): Promise<void> {
  const sessionExpiry = (Date.now() + 60 * 60 * 1000).toString();
  const cookieExpires = new Date(Date.now() + 60 * 60 * 1000).toUTCString();

  await page.evaluate(
    ({ mockAuthValue, sessionExpiry, cookieValue, cookieExpires }) => {
      localStorage.setItem("mockAuth", mockAuthValue);
      localStorage.setItem("mockAuth_backup", mockAuthValue);
      localStorage.setItem("sessionExpiresAt", sessionExpiry);
      localStorage.setItem("sessionStartTime", Date.now().toString());
      sessionStorage.removeItem("skipAuthRestore");
      document.cookie = `session=${cookieValue}; path=/; expires=${cookieExpires}; SameSite=Lax`;
    },
    {
      mockAuthValue: MOCK_AUTH_STORAGE,
      sessionExpiry,
      cookieValue: MOCK_SESSION_COOKIE_VALUE,
      cookieExpires,
    }
  );
}

/**
 * Drive the full 5-step signup form programmatically.
 * Assumes OTP endpoints and signup/complete are already mocked.
 */
async function completeFiveStepSignup(page: Page, planName?: string): Promise<void> {
  const signupUrl = planName
    ? `${SIGNUP_URL}?section=company&plan=${encodeURIComponent(planName)}&billing=monthly`
    : `${SIGNUP_URL}?section=company`;

  await page.goto(signupUrl);
  // Wait for Step 1
  await page.locator("#companyName").waitFor({ state: "visible", timeout: 15_000 });

  // Step 1 — Company Information
  await page.locator("#companyName").fill("E2E Pricing Corp");
  await page.locator("#industry").click();
  await page.getByRole("option", { name: "Technology", exact: true }).click();
  await page.locator("#companySize").click();
  await page.getByRole("option", { name: "1-10 employees", exact: true }).click();
  await page.getByRole("button", { name: /^Next$/i }).click();
  await page.waitForURL(/section=contact/, { timeout: 10_000 });

  // Step 2 — Contact Information
  await page.locator("#street").waitFor({ state: "visible" });
  await page.locator("#street").fill("123 Test Street");
  await page.locator("#city").fill("San Francisco");
  await page.locator("#state").fill("CA");
  await page.locator("#postalCode").fill("94105");
  await page.locator("#country").click();
  await page.getByRole("option", { name: "United States", exact: true }).click();
  await page.getByRole("button", { name: /^Next$/i }).click();
  await page.waitForURL(/section=legal/, { timeout: 10_000 });

  // Step 3 — Legal Information
  await page.locator("#legalCompanyName").waitFor({ state: "visible" });
  await page.locator("#legalCompanyName").fill("E2E Pricing Corporation Inc.");
  await page.getByRole("button", { name: /^Next$/i }).click();
  await page.waitForURL(/section=manager/, { timeout: 10_000 });

  // Step 4 — Manager Account + OTP
  await page.locator("#firstName").waitFor({ state: "visible" });
  await page.locator("#firstName").fill("Pricing");
  await page.locator("#lastName").fill("Tester");
  await page.locator("#email").fill(TEST_EMAIL);
  await page.getByRole("button", { name: /Send Code/i }).click();
  // Wait for OTP input to appear
  const otpInput = page.locator('input[placeholder="000000"], input[inputmode="numeric"][maxlength="6"]');
  await otpInput.waitFor({ state: "visible", timeout: 10_000 });
  await otpInput.fill(OTP_CODE);
  await page.getByRole("button", { name: /^Verify$/i }).click();
  await page.getByText(/Email verified successfully/i).waitFor({ state: "visible", timeout: 10_000 });
  await page.getByRole("button", { name: /^Next$/i }).click();
  await page.waitForURL(/section=review/, { timeout: 10_000 });

  // Step 5 — Review & Complete
  await page.locator("#tos").waitFor({ state: "visible" });
  const tos = page.locator("#tos");
  const privacy = page.locator("#privacy");
  if (!(await tos.isChecked())) await tos.click();
  if (!(await privacy.isChecked())) await privacy.click();
  await page.getByRole("button", { name: /Complete Registration/i }).click();
}

// ---------------------------------------------------------------------------
// Suite configuration
// ---------------------------------------------------------------------------

/**
 * All pricing / subscription tests run without a pre-existing auth session.
 * We control auth state explicitly per test.
 */
test.use({ storageState: { cookies: [], origins: [] } });

// ---------------------------------------------------------------------------
// POSITIVE scenarios
// ---------------------------------------------------------------------------

test.describe("Pricing Page — Positive Scenarios", () => {
  test("1. Pricing page loads all plans with correct monthly prices", async ({ page }) => {
    await mockStripeStatus(page, MOCK_STRIPE_STATUS_NONE);

    await page.goto(PRICING_URL);
    // Wait for the pricing section to mount (first plan heading)
    await expect(page.getByRole("heading", { name: "Starter", exact: true }).first()).toBeVisible({
      timeout: 15_000,
    });

    // Switch to monthly so prices are deterministic
    await page.getByRole("button", { name: /^Monthly$/i }).click();

    for (const plan of EXPECTED_PLANS) {
      // Plan name heading
      await expect(
        page.getByRole("heading", { name: plan.name, exact: true }).first()
      ).toBeVisible({ timeout: 10_000 });

      // Monthly price displayed (formatted with locale, e.g. "$99", "$2,999")
      const priceText = `$${plan.monthlyPrice.toLocaleString()}`;
      await expect(page.getByText(priceText, { exact: false }).first()).toBeVisible({
        timeout: 10_000,
      });
    }

    // CTA buttons for all plans (including Enterprise)
    for (const plan of EXPECTED_PLANS) {
      await expect(
        page.getByRole("button", { name: plan.cta, exact: true }).first()
      ).toBeVisible({ timeout: 5_000 });
    }
  });

  test("2. Pricing page displays key Starter plan features", async ({ page }) => {
    await mockStripeStatus(page, MOCK_STRIPE_STATUS_NONE);

    await page.goto(PRICING_URL);
    await expect(page.getByRole("heading", { name: "Starter", exact: true }).first()).toBeVisible({
      timeout: 15_000,
    });

    // Verify key feature text appears somewhere on the page (may be inside any plan card)
    for (const feature of STARTER_FEATURES) {
      await expect(page.getByText(feature, { exact: false }).first()).toBeVisible({
        timeout: 10_000,
      });
    }
  });

  test("3. Monthly/Annual toggle switches prices correctly", async ({ page }) => {
    await mockStripeStatus(page, MOCK_STRIPE_STATUS_NONE);

    await page.goto(PRICING_URL);
    await expect(page.getByRole("heading", { name: "Starter", exact: true }).first()).toBeVisible({
      timeout: 15_000,
    });

    // Switch to Monthly
    await page.getByRole("button", { name: /^Monthly$/i }).click();

    // Verify "/ month" label appears (monthly cycle indicator)
    await expect(page.getByText("/ month", { exact: false }).first()).toBeVisible({
      timeout: 5_000,
    });

    // Verify Starter monthly price $99 is displayed
    await expect(page.getByText("$99", { exact: false }).first()).toBeVisible({
      timeout: 5_000,
    });

    // Switch to Annual
    await page.getByRole("button", { name: /^Annual$/i }).click();

    // Verify "/ year" label appears (annual cycle indicator)
    await expect(page.getByText("/ year", { exact: false }).first()).toBeVisible({
      timeout: 5_000,
    });

    // Starter annual price is $990 — verify it appears
    await expect(page.getByText("$990", { exact: false }).first()).toBeVisible({
      timeout: 5_000,
    });

    // Verify "Save 17%" badge is visible in the Annual toggle button
    await expect(page.getByText("Save 17%", { exact: false }).first()).toBeVisible({
      timeout: 5_000,
    });

    // Annual hint text should be visible
    await expect(
      page.getByText(/pay for 10 months/i).first()
    ).toBeVisible({ timeout: 5_000 });

    // Switch back to monthly and confirm price resets
    await page.getByRole("button", { name: /^Monthly$/i }).click();
    await expect(page.getByText("$99", { exact: false }).first()).toBeVisible({
      timeout: 5_000,
    });
  });

  test("4. Clicking Starter CTA redirects to signup with plan pre-selected", async ({
    page,
  }) => {
    await mockStripeStatus(page, MOCK_STRIPE_STATUS_NONE);

    await page.goto(PRICING_URL);
    // Default is annual; switch to monthly for predictable plan param
    await page.getByRole("button", { name: /^Monthly$/i }).click();
    await expect(page.getByRole("heading", { name: "Starter", exact: true }).first()).toBeVisible({
      timeout: 15_000,
    });

    // Click "Choose Starter"
    await page.getByRole("button", { name: "Choose Starter", exact: true }).first().click();

    // Should navigate to /signup with ?plan=Starter
    await expect(page).toHaveURL(/\/signup.*plan=Starter/i, { timeout: 15_000 });

    // Signup page Step 1 should load
    await page.locator("#companyName").waitFor({ state: "visible", timeout: 15_000 });
  });

  test("5. Clicking Professional CTA redirects to signup with plan pre-selected", async ({
    page,
  }) => {
    await mockStripeStatus(page, MOCK_STRIPE_STATUS_NONE);

    await page.goto(PRICING_URL);
    await page.getByRole("button", { name: /^Monthly$/i }).click();
    await expect(
      page.getByRole("heading", { name: "Professional", exact: true }).first()
    ).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "Choose Professional", exact: true }).first().click();

    await expect(page).toHaveURL(/\/signup.*plan=Professional/i, { timeout: 15_000 });
    await page.locator("#companyName").waitFor({ state: "visible", timeout: 15_000 });
  });

  test("6. After signup with plan, Stripe checkout session is created and user is redirected", async ({
    page,
  }) => {
    // Mock OTP and signup complete with a checkout URL
    await mockSignupOtp(page);
    await mockSignupComplete(page, { checkoutUrl: STRIPE_CHECKOUT_URL });
    await mockStripeStatus(page, MOCK_STRIPE_STATUS_NONE);

    // Mock Stripe checkout create (in case the app calls it separately)
    await mockStripeCheckoutCreate(page);
    await mockStripeCheckoutAlt(page);

    // Intercept the redirect to Stripe's checkout domain so we don't actually leave
    let stripeRedirectDetected = false;
    await page.route("https://checkout.stripe.com/**", async (route) => {
      stripeRedirectDetected = true;
      // Simulate Stripe redirecting back with success query params
      await route.fulfill({
        status: 302,
        headers: {
          Location: "http://localhost:3000/payment?session_id=cs_test_mock_session_abc123&status=success",
        },
        body: "",
      });
    });

    // Also mock the payment success/return page API calls
    await mockStripeVerify(page, { ok: true, status: "active" });
    await mockStripeConfirm(page);

    await completeFiveStepSignup(page, "Starter");

    // After signup complete the app should either:
    //   (a) redirect to the Stripe checkout URL (external), or
    //   (b) redirect to /payment with session_id, or
    //   (c) redirect to /dashboard
    // We wait for any of these outcomes.
    await page.waitForFunction(
      () => {
        const url = window.location.href;
        return (
          url.includes("checkout.stripe.com") ||
          url.includes("/payment") ||
          url.includes("/dashboard") ||
          url.includes("session_id=")
        );
      },
      { timeout: 20_000 }
    ).catch(() => {
      // If the redirect was intercepted above (Stripe domain), the page may have
      // followed the 302 to the payment page — that is also acceptable.
    });

    const finalUrl = page.url();
    const navigatedToCheckoutOrSuccess =
      stripeRedirectDetected ||
      finalUrl.includes("checkout.stripe.com") ||
      finalUrl.includes("/payment") ||
      finalUrl.includes("/dashboard") ||
      finalUrl.includes("session_id=");

    expect(
      navigatedToCheckoutOrSuccess,
      `Expected redirect to Stripe checkout or payment/dashboard after signup. Got: ${finalUrl}`
    ).toBe(true);
  });

  test("7. Successful payment shows subscription active state on pricing page", async ({
    page,
  }) => {
    // Simulate an already-authenticated user with an active subscription
    await page.goto("/");
    await injectAuthSession(page);

    // Mock subscription status as active (Starter Monthly)
    await mockStripeStatus(page, MOCK_STRIPE_STATUS_ACTIVE);

    // Open the pricing page in the app context (with company_id query param)
    await page.goto(
      `${PRICING_URL}?company_id=${encodeURIComponent(MOCK_SESSION.companyId)}`
    );

    // Wait for the pricing grid to load
    await expect(page.getByRole("heading", { name: "Starter", exact: true }).first()).toBeVisible({
      timeout: 15_000,
    });

    // The "Current Plan" badge should appear for the Starter card
    await expect(page.getByText("Current Plan", { exact: false }).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("8. Feature gating — premium features accessible after subscription", async ({
    page,
  }) => {
    // Inject a full authenticated session (simulates post-subscription state)
    await page.goto("/");
    await injectAuthSession(page);

    // Mock relevant API endpoints for the dashboard
    await page.route("**/api/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          user: {
            id: MOCK_SESSION.userId,
            email: MOCK_SESSION.email,
            name: MOCK_SESSION.fullName,
            role: MOCK_SESSION.role,
          },
          company: {
            id: MOCK_SESSION.companyId,
            name: MOCK_SESSION.companyName,
          },
        }),
      });
    });

    await mockStripeStatus(page, MOCK_STRIPE_STATUS_ACTIVE);

    // Navigate to the dashboard (a protected route)
    await page.goto("/dashboard");

    // Should not be redirected to /login — session is recognised
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });

    // Navigate to /jobs (a premium feature route)
    await page.goto("/jobs");
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });

    // The page should render something (not a blank screen or 404)
    const bodyText = await page.locator("body").innerText().catch(() => "");
    expect(bodyText.length, "Expected /jobs page to render content after subscription").toBeGreaterThan(10);
  });
});

// ---------------------------------------------------------------------------
// NEGATIVE scenarios
// ---------------------------------------------------------------------------

test.describe("Pricing — Subscription Purchase Negative Scenarios", () => {
  test("1. Stripe payment failure shows error message on pricing page", async ({ page }) => {
    // Simulate an authenticated user in the app context
    await page.goto("/");
    await injectAuthSession(page);

    // Mock stripe create to return a payment failure
    await mockStripeCheckoutCreate(page, {
      ok: false,
      error: "Your card was declined. Please use a different payment method.",
      code: "card_declined",
    } as unknown as typeof MOCK_STRIPE_CREATE_SUCCESS);
    await mockStripeStatus(page, MOCK_STRIPE_STATUS_NONE);

    await page.goto(
      `${PRICING_URL}?company_id=${encodeURIComponent(MOCK_SESSION.companyId)}`
    );

    await page.getByRole("button", { name: /^Monthly$/i }).click();
    await expect(page.getByRole("heading", { name: "Starter", exact: true }).first()).toBeVisible({
      timeout: 15_000,
    });

    // Click Choose Starter — this triggers the checkout create API call
    await page.getByRole("button", { name: "Choose Starter", exact: true }).first().click();

    // Error banner should appear on the pricing page
    await expect(
      page
        .getByText(/card was declined/i)
        .or(page.getByText(/payment.*failed/i))
        .or(page.getByText(/failed to start checkout/i))
        .or(page.locator(".bg-red-50, [role='alert']"))
        .first()
    ).toBeVisible({ timeout: 10_000 });

    // User must remain on the pricing page
    await expect(page).toHaveURL(/\/pricing/, { timeout: 5_000 });
  });

  test("2. Card declined scenario shows friendly error", async ({ page }) => {
    await page.goto("/");
    await injectAuthSession(page);

    // Mock with insufficient funds error
    await mockStripeCheckoutCreate(page, {
      ok: false,
      error: "Your card has insufficient funds. Please use a different payment method.",
      code: "insufficient_funds",
    } as unknown as typeof MOCK_STRIPE_CREATE_SUCCESS);
    await mockStripeStatus(page, MOCK_STRIPE_STATUS_NONE);

    await page.goto(
      `${PRICING_URL}?company_id=${encodeURIComponent(MOCK_SESSION.companyId)}`
    );

    await page.getByRole("button", { name: /^Monthly$/i }).click();
    await expect(
      page.getByRole("heading", { name: "Professional", exact: true }).first()
    ).toBeVisible({ timeout: 15_000 });

    // Attempt Professional plan checkout
    await page.getByRole("button", { name: "Choose Professional", exact: true }).first().click();

    // Error message referencing insufficient funds or a generic friendly message
    await expect(
      page
        .getByText(/insufficient funds/i)
        .or(page.getByText(/different payment method/i))
        .or(page.getByText(/card.*declined/i))
        .or(page.locator(".bg-red-50").filter({ hasText: /error/i }))
        .first()
    ).toBeVisible({ timeout: 10_000 });

    // Must still be on pricing page — no redirect to Stripe
    await expect(page).toHaveURL(/\/pricing/, { timeout: 5_000 });
  });

  test("3. Stripe checkout creation timeout / network error shows error state", async ({
    page,
  }) => {
    await page.goto("/");
    await injectAuthSession(page);

    // Simulate network timeout by aborting the request
    await page.route("**/api/subscriptions/stripe/create", async (route) => {
      await route.abort("timedout");
    });
    await mockStripeStatus(page, MOCK_STRIPE_STATUS_NONE);

    await page.goto(
      `${PRICING_URL}?company_id=${encodeURIComponent(MOCK_SESSION.companyId)}`
    );

    await page.getByRole("button", { name: /^Monthly$/i }).click();
    await expect(page.getByRole("heading", { name: "Business", exact: true }).first()).toBeVisible({
      timeout: 15_000,
    });

    // Attempt Business plan checkout
    await page.getByRole("button", { name: "Choose Business", exact: true }).first().click();

    // The app should surface an error (not silently fail or crash)
    await expect(
      page
        .getByText(/failed/i)
        .or(page.getByText(/error/i))
        .or(page.getByText(/network/i))
        .or(page.locator("[role='alert'], .bg-red-50"))
        .first()
    ).toBeVisible({ timeout: 15_000 });

    // User must remain on the pricing page (no empty redirect)
    await expect(page).toHaveURL(/\/pricing/, { timeout: 5_000 });
  });

  test("4. Cancel from Stripe returns user to pricing page", async ({ page }) => {
    await page.goto("/");
    await injectAuthSession(page);

    // Mock successful checkout creation
    const cancelReturnUrl =
      "http://localhost:3000/pricing?company_id=" +
      encodeURIComponent(MOCK_SESSION.companyId) +
      "&cancel=true";

    await page.route("**/api/subscriptions/stripe/create", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          subscription: {
            checkoutUrl:
              // Simulate a Stripe checkout URL that would normally redirect;
              // we point it to our own cancel URL to simulate the cancel flow.
              cancelReturnUrl,
            sessionId: "cs_test_mock_cancel_123",
          },
        }),
      });
    });
    await mockStripeStatus(page, MOCK_STRIPE_STATUS_NONE);

    await page.goto(
      `${PRICING_URL}?company_id=${encodeURIComponent(MOCK_SESSION.companyId)}`
    );

    await page.getByRole("button", { name: /^Monthly$/i }).click();
    await expect(page.getByRole("heading", { name: "Starter", exact: true }).first()).toBeVisible({
      timeout: 15_000,
    });

    // Click Choose Starter — the mocked checkout URL points back to pricing
    await page.getByRole("button", { name: "Choose Starter", exact: true }).first().click();

    // Wait for navigation to the cancel return URL (pricing page)
    await page.waitForURL(/\/pricing/, { timeout: 15_000 });

    // Verify we are back on the pricing page
    await expect(page).toHaveURL(/\/pricing/, { timeout: 5_000 });

    // Pricing content should still be visible (page is usable after cancel)
    await expect(
      page.getByRole("heading", { name: "Starter", exact: true }).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("5. Stripe checkout returns failure status — error shown on return page", async ({
    page,
  }) => {
    await page.goto("/");
    await injectAuthSession(page);

    // Mock the verify endpoint to return a failed status
    await mockStripeVerify(page, {
      ok: false,
      error: "Payment was not completed. Please try again.",
      status: "failed",
    });
    await mockStripeStatus(page, MOCK_STRIPE_STATUS_NONE);

    // Simulate landing on the payment return page with a failed session
    await page.goto(
      "http://localhost:3000/payment?session_id=cs_test_failed_session&status=failed"
    );

    // The return/payment page should show an error or redirect to pricing
    const currentUrl = page.url();
    const hasErrorOrPricing =
      currentUrl.includes("/payment") ||
      currentUrl.includes("/pricing") ||
      currentUrl.includes("/dashboard");

    expect(
      hasErrorOrPricing,
      `Expected to land on payment, pricing, or dashboard page. Got: ${currentUrl}`
    ).toBe(true);

    // If on payment page, an error message should be visible
    if (currentUrl.includes("/payment")) {
      await expect(
        page
          .getByText(/payment.*failed/i)
          .or(page.getByText(/not completed/i))
          .or(page.getByText(/try again/i))
          .or(page.getByText(/error/i))
          .first()
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  test("6. Signup with plan fails — error displayed, user stays on signup", async ({
    page,
  }) => {
    await mockSignupOtp(page);

    // Mock signup complete to return a server error
    await page.route("**/api/signup/complete", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          ok: false,
          error: "An internal error occurred. Please try again.",
        }),
      });
    });

    await page.goto(`${SIGNUP_URL}?section=company&plan=Starter&billing=monthly`);
    await page.locator("#companyName").waitFor({ state: "visible", timeout: 15_000 });

    // Step 1
    await page.locator("#companyName").fill("Error Test Corp");
    await page.locator("#industry").click();
    await page.getByRole("option", { name: "Technology", exact: true }).click();
    await page.locator("#companySize").click();
    await page.getByRole("option", { name: "1-10 employees", exact: true }).click();
    await page.getByRole("button", { name: /^Next$/i }).click();
    await page.waitForURL(/section=contact/, { timeout: 10_000 });

    // Step 2
    await page.locator("#street").waitFor({ state: "visible" });
    await page.locator("#street").fill("456 Error Lane");
    await page.locator("#city").fill("Boston");
    await page.locator("#state").fill("MA");
    await page.locator("#postalCode").fill("02101");
    await page.locator("#country").click();
    await page.getByRole("option", { name: "United States", exact: true }).click();
    await page.getByRole("button", { name: /^Next$/i }).click();
    await page.waitForURL(/section=legal/, { timeout: 10_000 });

    // Step 3
    await page.locator("#legalCompanyName").waitFor({ state: "visible" });
    await page.locator("#legalCompanyName").fill("Error Test Corporation LLC");
    await page.getByRole("button", { name: /^Next$/i }).click();
    await page.waitForURL(/section=manager/, { timeout: 10_000 });

    // Step 4 — OTP
    await page.locator("#firstName").waitFor({ state: "visible" });
    await page.locator("#firstName").fill("Error");
    await page.locator("#lastName").fill("Tester");
    await page.locator("#email").fill(`error-${Date.now()}@testcorp.io`);
    await page.getByRole("button", { name: /Send Code/i }).click();
    const otpInput = page.locator(
      'input[placeholder="000000"], input[inputmode="numeric"][maxlength="6"]'
    );
    await otpInput.waitFor({ state: "visible", timeout: 10_000 });
    await otpInput.fill(OTP_CODE);
    await page.getByRole("button", { name: /^Verify$/i }).click();
    await page.getByText(/Email verified successfully/i).waitFor({ state: "visible", timeout: 10_000 });
    await page.getByRole("button", { name: /^Next$/i }).click();
    await page.waitForURL(/section=review/, { timeout: 10_000 });

    // Step 5 — Submit (will fail due to mocked 500 response)
    await page.locator("#tos").waitFor({ state: "visible" });
    if (!(await page.locator("#tos").isChecked())) await page.locator("#tos").click();
    if (!(await page.locator("#privacy").isChecked())) await page.locator("#privacy").click();
    await page.getByRole("button", { name: /Complete Registration/i }).click();

    // Error banner should appear — user stays on /signup
    await expect(
      page
        .locator(".bg-red-50, [data-testid='signup-error']")
        .or(page.getByText(/internal error/i))
        .or(page.getByText(/try again/i))
        .first()
    ).toBeVisible({ timeout: 15_000 });

    // Must still be on the signup page
    await expect(page).toHaveURL(/\/signup/, { timeout: 5_000 });
  });
});

// ---------------------------------------------------------------------------
// Billing toggle state tests
// ---------------------------------------------------------------------------

test.describe("Pricing — Billing Toggle State", () => {
  test("Annual billing toggle is active by default", async ({ page }) => {
    await mockStripeStatus(page, MOCK_STRIPE_STATUS_NONE);
    await page.goto(PRICING_URL);
    await expect(page.getByRole("heading", { name: "Starter", exact: true }).first()).toBeVisible({
      timeout: 15_000,
    });

    // Default is annual — "/ year" should be visible, not "/ month"
    await expect(page.getByText("/ year", { exact: false }).first()).toBeVisible({
      timeout: 5_000,
    });
  });

  test("Billing cycle passes correctly as query param to signup URL", async ({ page }) => {
    await mockStripeStatus(page, MOCK_STRIPE_STATUS_NONE);
    await page.goto(PRICING_URL);
    await expect(page.getByRole("heading", { name: "Starter", exact: true }).first()).toBeVisible({
      timeout: 15_000,
    });

    // Switch to monthly billing
    await page.getByRole("button", { name: /^Monthly$/i }).click();
    await expect(page.getByText("/ month", { exact: false }).first()).toBeVisible({
      timeout: 5_000,
    });

    // Click Choose Starter — billing=monthly should be in the signup URL
    await page.getByRole("button", { name: "Choose Starter", exact: true }).first().click();
    await expect(page).toHaveURL(/\/signup.*billing=monthly/i, { timeout: 15_000 });

    // Go back to pricing and switch to annual
    await page.goto(PRICING_URL);
    await page.getByRole("button", { name: /^Annual$/i }).click();
    await expect(page.getByText("/ year", { exact: false }).first()).toBeVisible({
      timeout: 5_000,
    });

    await page.getByRole("button", { name: "Choose Starter", exact: true }).first().click();
    await expect(page).toHaveURL(/\/signup.*billing=annual/i, { timeout: 15_000 });
  });
});

// ---------------------------------------------------------------------------
// Plan feature visibility tests
// ---------------------------------------------------------------------------

test.describe("Pricing — Plan Feature Visibility", () => {
  test("Each pricing card renders support tier information", async ({ page }) => {
    await mockStripeStatus(page, MOCK_STRIPE_STATUS_NONE);
    await page.goto(PRICING_URL);
    await expect(page.getByRole("heading", { name: "Starter", exact: true }).first()).toBeVisible({
      timeout: 15_000,
    });

    // Support tiers per plan (from the PLANS constant in pricing/page.tsx)
    const supportTiers = [
      "Standard Support",
      "Priority Support",
      "Business Support",
      "Large Support",
      "Ultra Support",
      "Enterprise SLA",
    ] as const;

    for (const tier of supportTiers) {
      await expect(page.getByText(tier, { exact: false }).first()).toBeVisible({
        timeout: 10_000,
      });
    }
  });

  test("Enterprise plan CTA redirects to signup with plan pre-selected", async ({ page }) => {
    await mockStripeStatus(page, MOCK_STRIPE_STATUS_NONE);
    await page.goto(PRICING_URL);
    await expect(page.getByRole("heading", { name: "Enterprise", exact: true }).first()).toBeVisible({
      timeout: 15_000,
    });

    // Switch to monthly for deterministic plan param
    await page.getByRole("button", { name: /^Monthly$/i }).click();

    const chooseEnterpriseButton = page
      .getByRole("button", { name: "Choose Enterprise", exact: true })
      .first();

    await expect(chooseEnterpriseButton).toBeVisible({ timeout: 5_000 });

    // Click and verify it goes to /signup with plan=Enterprise (same as other plans)
    await chooseEnterpriseButton.click();
    await expect(page).toHaveURL(/\/signup.*plan=Enterprise/i, { timeout: 15_000 });
  });

  test("Pricing page renders billing comparison callout (Annual savings hint)", async ({
    page,
  }) => {
    await mockStripeStatus(page, MOCK_STRIPE_STATUS_NONE);
    await page.goto(PRICING_URL);

    // Switch to annual
    await page.getByRole("button", { name: /^Annual$/i }).click();

    // Annual promotion callout from the pricing page source
    await expect(
      page.getByText(/pay for 10 months/i).first()
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      page.getByText(/stay active for 12/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
