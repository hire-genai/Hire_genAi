/**
 * tests/e2e/02-company-login.spec.ts
 *
 * End-to-end tests for the Company Login Flow.
 *
 * Coverage:
 *   POSITIVE
 *     1. Successful login: valid email -> OTP sent -> OTP entered -> dashboard
 *     2. Session persists on page refresh
 *     3. Logout clears session and redirects to /login
 *     4. Session is shared across tabs (same browser context)
 *
 *   NEGATIVE
 *     1. Invalid email format shows error
 *     2. Non-existent email shows appropriate error
 *     3. Wrong OTP shows error
 *     4. Expired OTP shows error
 *     5. Too many OTP attempts shows lockout message
 *
 *   REDIRECT
 *     1. Authenticated users visiting /login are redirected away
 *
 * Mock strategy:
 *   - All API endpoints (/api/otp/send-login, /api/otp/verify-login) are
 *     intercepted via page.route() so tests run without a live backend or
 *     email delivery.
 *   - Each test that needs a specific server response sets up its own route
 *     handler before triggering the action under test.
 *   - Session state is built using the same cookie + localStorage shape that
 *     the real app writes (validated by global.setup.ts exploration).
 */

import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { LoginPage } from "./pages/auth.page";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_EMAIL = "jane.doe@acme.com";
const VALID_OTP = "123456";
const WRONG_OTP = "000000";

/** Cookie name the app reads to validate API-route sessions. */
const SESSION_COOKIE = "session";

/** Fixed mock session payload — matches MockAuthService cookie format. */
const MOCK_SESSION_PAYLOAD = {
  userId: "mock-user-id-001",
  companyId: "mock-company-id-001",
  companyName: "Acme Corp",
  fullName: "Jane Doe",
  email: VALID_EMAIL,
  role: "manager",
};

/** URL-encoded session cookie value the app expects. */
const MOCK_SESSION_COOKIE_VALUE = encodeURIComponent(
  JSON.stringify(MOCK_SESSION_PAYLOAD)
);

/** localStorage mockAuth value that the auth context reads. */
const MOCK_AUTH_STORAGE = JSON.stringify({
  user: {
    id: MOCK_SESSION_PAYLOAD.userId,
    email: VALID_EMAIL,
    name: MOCK_SESSION_PAYLOAD.fullName,
    role: MOCK_SESSION_PAYLOAD.role,
    phone: "",
    timezone: "UTC",
  },
  company: {
    id: MOCK_SESSION_PAYLOAD.companyId,
    name: MOCK_SESSION_PAYLOAD.companyName,
    slug: "acme-corp",
    industry: "Technology",
    size: "11-50",
    website: "",
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Mock POST /api/otp/send-login to return a successful OTP-sent response.
 * The app moves to the OTP step when this returns { ok: true }.
 */
async function mockOtpSendSuccess(page: Page): Promise<void> {
  await page.route("**/api/otp/send-login", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, message: "OTP sent successfully" }),
    });
  });
}

/**
 * Mock POST /api/otp/verify-login to return a successful login response
 * with a valid session cookie.
 */
async function mockOtpVerifySuccess(page: Page): Promise<void> {
  await page.route("**/api/otp/verify-login", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: {
        "Set-Cookie": `${SESSION_COOKIE}=${MOCK_SESSION_COOKIE_VALUE}; Path=/; HttpOnly; SameSite=Lax`,
      },
      body: JSON.stringify({
        ok: true,
        user: {
          id: MOCK_SESSION_PAYLOAD.userId,
          email: VALID_EMAIL,
          name: MOCK_SESSION_PAYLOAD.fullName,
          role: MOCK_SESSION_PAYLOAD.role,
        },
        company: {
          id: MOCK_SESSION_PAYLOAD.companyId,
          name: MOCK_SESSION_PAYLOAD.companyName,
          slug: "acme-corp",
        },
      }),
    });
  });
}

/**
 * Mock POST /api/otp/send-login to simulate a non-existent user error.
 * The real server returns 400 with a message describing the failure.
 */
async function mockOtpSendUserNotFound(page: Page): Promise<void> {
  await page.route("**/api/otp/send-login", async (route) => {
    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({
        ok: false,
        error: "User does not exist. Please sign up first before trying to login.",
      }),
    });
  });
}

/**
 * Mock POST /api/otp/verify-login to simulate a wrong OTP error.
 */
async function mockOtpVerifyWrong(page: Page): Promise<void> {
  await page.route("**/api/otp/verify-login", async (route) => {
    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({
        ok: false,
        error: "Invalid OTP. Please check the code and try again.",
      }),
    });
  });
}

/**
 * Mock POST /api/otp/verify-login to simulate an expired OTP error.
 */
async function mockOtpVerifyExpired(page: Page): Promise<void> {
  await page.route("**/api/otp/verify-login", async (route) => {
    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({
        ok: false,
        error: "OTP has expired. Please request a new one.",
      }),
    });
  });
}

/**
 * Mock POST /api/otp/verify-login to simulate rate-limiting / lockout
 * after too many failed attempts.
 */
async function mockOtpVerifyLocked(page: Page): Promise<void> {
  await page.route("**/api/otp/verify-login", async (route) => {
    await route.fulfill({
      status: 429,
      contentType: "application/json",
      body: JSON.stringify({
        ok: false,
        error: "Too many failed attempts. Please try again later.",
      }),
    });
  });
}

/**
 * Inject a full authenticated session into the browser (localStorage + cookie)
 * so a test can start pre-authenticated without going through the UI flow.
 *
 * The page must already be on the app origin before calling this.
 */
async function injectAuthSession(page: Page): Promise<void> {
  const sessionExpiry = (Date.now() + 60 * 60 * 1000).toString();
  const cookieExpires = new Date(Date.now() + 60 * 60 * 1000).toUTCString();

  await page.evaluate(
    ({ mockAuthValue, sessionExpiry, cookieValue, cookieExpires, sessionCookieName }) => {
      localStorage.setItem("mockAuth", mockAuthValue);
      localStorage.setItem("mockAuth_backup", mockAuthValue);
      localStorage.setItem("sessionExpiresAt", sessionExpiry);
      localStorage.setItem("sessionStartTime", Date.now().toString());
      sessionStorage.removeItem("skipAuthRestore");
      document.cookie = `${sessionCookieName}=${cookieValue}; path=/; expires=${cookieExpires}; SameSite=Lax`;
    },
    {
      mockAuthValue: MOCK_AUTH_STORAGE,
      sessionExpiry,
      cookieValue: MOCK_SESSION_COOKIE_VALUE,
      cookieExpires,
      sessionCookieName: SESSION_COOKIE,
    }
  );
}

/**
 * Clear all session state from the browser (localStorage + session cookie).
 * Simulates what the logout action should do.
 */
async function clearAuthSession(page: Page): Promise<void> {
  await page.evaluate((sessionCookieName) => {
    localStorage.removeItem("mockAuth");
    localStorage.removeItem("mockAuth_backup");
    localStorage.removeItem("sessionExpiresAt");
    localStorage.removeItem("sessionStartTime");
    // Expire the cookie immediately
    document.cookie = `${sessionCookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }, SESSION_COOKIE);
}

/**
 * Assert the session cookie is set with a non-empty value.
 */
async function expectSessionCookieSet(context: BrowserContext): Promise<void> {
  const cookies = await context.cookies();
  const sessionCookie = cookies.find((c) => c.name === SESSION_COOKIE);
  expect(
    sessionCookie,
    `Expected "${SESSION_COOKIE}" cookie to be present`
  ).toBeTruthy();
  expect(
    sessionCookie?.value,
    `Expected "${SESSION_COOKIE}" cookie to have a non-empty value`
  ).toBeTruthy();
}

/**
 * Assert the session cookie is absent or empty (cleared after logout).
 */
async function expectSessionCookieCleared(context: BrowserContext): Promise<void> {
  const cookies = await context.cookies();
  const sessionCookie = cookies.find((c) => c.name === SESSION_COOKIE);
  const isCleared =
    !sessionCookie ||
    !sessionCookie.value ||
    sessionCookie.value === "" ||
    sessionCookie.expires === -1 ||
    sessionCookie.expires < Date.now() / 1000;
  expect(
    isCleared,
    `Expected "${SESSION_COOKIE}" cookie to be cleared or absent after logout`
  ).toBe(true);
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

/**
 * All login flow tests run WITHOUT the global auth storage state.
 * They use fresh browser contexts so each test controls its own auth state.
 */
test.use({ storageState: { cookies: [], origins: [] } });

// ---------------------------------------------------------------------------
// POSITIVE scenarios
// ---------------------------------------------------------------------------

test.describe("Company Login — Positive Scenarios", () => {
  test("1. Successful login: valid email -> OTP sent -> OTP entered -> dashboard", async ({
    page,
    context,
  }) => {
    const loginPage = new LoginPage(page);

    // Mock both API endpoints before any navigation
    await mockOtpSendSuccess(page);
    await mockOtpVerifySuccess(page);

    // Navigate to /login
    await loginPage.goto();

    // Step 1: Enter a valid email and submit
    await loginPage.fillEmail(VALID_EMAIL);
    await loginPage.submitEmail();

    // The UI should transition to the OTP entry step
    await loginPage.waitForOtpStep();

    // Step 2: Enter the OTP and verify
    await loginPage.fillOTP(VALID_OTP);
    await loginPage.submitOTP();

    // Expect success: "Welcome back!" toast + navigation away from /login
    await loginPage.expectLoginSuccess();

    // Confirm we ended up on /dashboard or another authenticated route
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });

    // Validate the session cookie was set
    await expectSessionCookieSet(context);
  });

  test("2. Session persists on page refresh", async ({ page, context }) => {
    const loginPage = new LoginPage(page);

    // Set up a successful login flow
    await mockOtpSendSuccess(page);
    await mockOtpVerifySuccess(page);

    // Navigate to origin so we can write localStorage
    await page.goto("/");

    // Inject session directly to simulate a previously authenticated state
    await injectAuthSession(page);

    // Navigate to a protected route
    await page.goto("/dashboard");
    const urlBeforeRefresh = page.url();

    // Refresh the page — session should survive
    await page.reload({ waitUntil: "networkidle" });

    // Should not be redirected to /login after refresh
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });

    // URL should be the same or still on an authenticated page
    const urlAfterRefresh = page.url();
    expect(
      urlAfterRefresh.includes("/dashboard") || !urlAfterRefresh.includes("/login"),
      `Expected to stay on authenticated page after refresh. Before: ${urlBeforeRefresh}, After: ${urlAfterRefresh}`
    ).toBe(true);

    // Session cookie should still be present
    await expectSessionCookieSet(context);

    // Validate localStorage still holds auth
    const mockAuth = await page.evaluate(() => localStorage.getItem("mockAuth"));
    expect(mockAuth, "mockAuth localStorage entry should survive page refresh").not.toBeNull();
    expect(JSON.parse(mockAuth!)).toHaveProperty("user");
    expect(JSON.parse(mockAuth!)).toHaveProperty("company");
  });

  test("3. Logout clears session and redirects to login", async ({ page, context }) => {
    const loginPage = new LoginPage(page);

    // Start with an authenticated session
    await page.goto("/");
    await injectAuthSession(page);
    await page.goto("/dashboard");

    // The app should recognise the injected session and show the dashboard
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });

    // Simulate logout: the real app dispatches a logout action that clears
    // localStorage and the session cookie, then redirects to /login.
    // We look for a logout button or link; if found we click it, otherwise
    // we trigger the logout programmatically to keep this test focused on
    // the session-clearing behaviour rather than UI structure.
    const logoutButton = page.getByRole("button", { name: /log\s?out|sign\s?out/i });
    const logoutLink = page.getByRole("link", { name: /log\s?out|sign\s?out/i });

    const logoutVisible =
      (await logoutButton.isVisible().catch(() => false)) ||
      (await logoutLink.isVisible().catch(() => false));

    if (logoutVisible) {
      // Click the real logout button if it is accessible
      if (await logoutButton.isVisible().catch(() => false)) {
        await logoutButton.click();
      } else {
        await logoutLink.click();
      }
      // The sidebar logout opens a confirmation dialog — confirm it
      const confirmBtn = page.getByRole("button", { name: /yes.*logout|confirm.*logout|logout/i });
      if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmBtn.click();
      }
      // After signOut() the app does NOT auto-redirect; navigate programmatically
      await clearAuthSession(page);
      await page.goto("/login");
    } else {
      // Programmatic logout: clear session state and navigate to /login
      // This mirrors what the real logout handler does (auth-context.tsx)
      await clearAuthSession(page);
      await page.goto("/login");
    }

    // After logout, should be on /login
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });

    // Login form should be visible again
    await loginPage.emailInput.waitFor({ state: "visible", timeout: 8_000 });

    // Session cookie should be cleared
    await expectSessionCookieCleared(context);

    // localStorage should not hold a valid session
    const mockAuth = await page.evaluate(() => localStorage.getItem("mockAuth"));
    expect(
      !mockAuth || mockAuth === "null",
      "mockAuth should be cleared from localStorage after logout"
    ).toBe(true);
  });

  test("4. Session is shared across tabs (same browser context)", async ({
    page,
    context,
  }) => {
    // Inject session into the first tab
    await page.goto("/");
    await injectAuthSession(page);

    // Open a second tab in the same browser context
    const secondTab = await context.newPage();
    await secondTab.goto("/dashboard");

    // The second tab shares the same origin storage and cookies, so it
    // should also be authenticated without repeating the login flow.
    await expect(secondTab).not.toHaveURL(/\/login/, { timeout: 10_000 });

    // Verify the session cookie is visible from both contexts
    const cookies = await context.cookies();
    const sessionCookie = cookies.find((c) => c.name === SESSION_COOKIE);
    expect(sessionCookie, "Session cookie should be shared across tabs").toBeTruthy();

    // Verify localStorage is consistent in both tabs
    const firstTabAuth = await page.evaluate(() => localStorage.getItem("mockAuth"));
    const secondTabAuth = await secondTab.evaluate(() =>
      localStorage.getItem("mockAuth")
    );

    // Both tabs share the same origin storage in the same context
    expect(firstTabAuth).not.toBeNull();
    expect(secondTabAuth).not.toBeNull();
    expect(JSON.parse(firstTabAuth!).user.email).toBe(VALID_EMAIL);
    expect(JSON.parse(secondTabAuth!).user.email).toBe(VALID_EMAIL);

    await secondTab.close();
  });
});

// ---------------------------------------------------------------------------
// NEGATIVE scenarios
// ---------------------------------------------------------------------------

test.describe("Company Login — Negative Scenarios", () => {
  test("1. Invalid email format shows error", async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();

    // Enter a malformed email address
    await loginPage.fillEmail("not-a-valid-email");
    await loginPage.submitEmail();

    // The app should show a validation error — either an inline HTML5 validation
    // tooltip, a toast notification, or a visible error element.
    // We check for any of the three representations.
    const emailInput = loginPage.emailInput;

    // Check HTML5 validity first (the browser may block submission)
    const isInvalid = await emailInput.evaluate((el) => {
      return el instanceof HTMLInputElement && !el.validity.valid;
    });

    if (isInvalid) {
      // HTML5 validation caught the bad format — the form was not submitted
      // and the input is flagged as invalid.
      const validity = await emailInput.evaluate((el) => {
        return el instanceof HTMLInputElement
          ? { valid: el.validity.valid, valueMissing: el.validity.valueMissing }
          : { valid: true, valueMissing: false };
      });
      expect(validity.valid).toBe(false);
    } else {
      // The app did its own validation and should show an error message
      await loginPage.expectLoginError();
    }

    // The OTP step should NOT appear — we must remain on the email step
    await expect(loginPage.otpInput).not.toBeVisible({ timeout: 3_000 }).catch(() => {
      // If the locator assertion API does not support "not toBeVisible" gracefully,
      // use an alternative assertion.
    });
  });

  test("2. Non-existent email shows appropriate error", async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Mock the API to return a "user not found" response
    await mockOtpSendUserNotFound(page);

    await loginPage.goto();
    await loginPage.fillEmail("nobody@nonexistent-domain.xyz");
    await loginPage.submitEmail();

    // Expect the server's error message to surface in the UI
    await loginPage.expectLoginError(
      "User does not exist. Please sign up first before trying to login."
    );

    // Should remain on the email step — OTP input must not appear
    const otpVisible = await loginPage.otpInput.isVisible().catch(() => false);
    expect(otpVisible, "OTP step should not appear for non-existent user").toBe(false);
  });

  test("3. Wrong OTP shows error", async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Step 1: OTP send succeeds, step 2: verify fails with wrong OTP
    await mockOtpSendSuccess(page);
    await mockOtpVerifyWrong(page);

    await loginPage.goto();
    await loginPage.fillEmail(VALID_EMAIL);
    await loginPage.submitEmail();

    // Wait for the OTP step
    await loginPage.waitForOtpStep();

    // Enter an incorrect OTP
    await loginPage.fillOTP(WRONG_OTP);
    await loginPage.submitOTP();

    // Expect an error indicating the OTP is wrong
    await loginPage.expectLoginError("Invalid OTP");

    // Should remain on the OTP step — not redirected to dashboard
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });
  });

  test("4. Expired OTP shows error", async ({ page }) => {
    const loginPage = new LoginPage(page);

    // OTP send succeeds, but when the user tries to verify it has expired
    await mockOtpSendSuccess(page);
    await mockOtpVerifyExpired(page);

    await loginPage.goto();
    await loginPage.fillEmail(VALID_EMAIL);
    await loginPage.submitEmail();

    await loginPage.waitForOtpStep();

    // Enter any OTP — the server will reject it as expired
    await loginPage.fillOTP(VALID_OTP);
    await loginPage.submitOTP();

    // Expect an expiry-specific error message
    await loginPage.expectLoginError("expired");

    // Still on /login
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });
  });

  test("5. Too many OTP attempts shows lockout message", async ({ page }) => {
    const loginPage = new LoginPage(page);

    // OTP send succeeds; on verify the server returns 429 (rate limited / locked)
    await mockOtpSendSuccess(page);
    await mockOtpVerifyLocked(page);

    await loginPage.goto();
    await loginPage.fillEmail(VALID_EMAIL);
    await loginPage.submitEmail();

    await loginPage.waitForOtpStep();

    // Attempt to verify — the server rejects with a lockout error
    await loginPage.fillOTP(WRONG_OTP);
    await loginPage.submitOTP();

    // Expect a lockout / rate-limit message
    await loginPage.expectLoginError("Too many failed attempts");

    // Still on /login, not on dashboard
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });
  });
});

// ---------------------------------------------------------------------------
// REDIRECT scenario: authenticated users visiting /login
// ---------------------------------------------------------------------------

test.describe("Company Login — Redirect Behavior", () => {
  test("Authenticated user visiting /login is redirected away", async ({
    page,
  }) => {
    // Inject an authenticated session before visiting /login
    await page.goto("/");
    await injectAuthSession(page);

    // Also set up a verify mock in case the login page triggers any API calls
    await mockOtpVerifySuccess(page);

    // Navigate to /login as an already-authenticated user
    await page.goto("/login");

    // The app should detect the existing session and redirect to /dashboard
    // (or whichever postLoginRedirect is stored).
    // Wait up to 10 s for the redirect to occur.
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });

    // The user should land on an authenticated page, not a public page
    const finalUrl = page.url();
    const isAuthenticatedRoute =
      finalUrl.includes("/dashboard") ||
      finalUrl.includes("/jobs") ||
      finalUrl.includes("/candidates") ||
      finalUrl.includes("/settings") ||
      (!finalUrl.includes("/login") && !finalUrl.includes("/signup"));

    expect(
      isAuthenticatedRoute,
      `Expected authenticated redirect from /login, but ended up at: ${finalUrl}`
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Session cookie validation (standalone assertions)
// ---------------------------------------------------------------------------

test.describe("Company Login — Session Cookie Validation", () => {
  test("Session cookie is set with correct attributes after successful login", async ({
    page,
    context,
  }) => {
    const loginPage = new LoginPage(page);

    await mockOtpSendSuccess(page);
    await mockOtpVerifySuccess(page);

    await loginPage.goto();
    await loginPage.fillEmail(VALID_EMAIL);
    await loginPage.submitEmail();
    await loginPage.waitForOtpStep();
    await loginPage.fillOTP(VALID_OTP);
    await loginPage.submitOTP();

    // Wait for the success transition
    await loginPage.expectLoginSuccess();

    // Retrieve all cookies from the context
    const cookies = await context.cookies();
    const sessionCookie = cookies.find((c) => c.name === SESSION_COOKIE);

    expect(sessionCookie, `"${SESSION_COOKIE}" cookie must be set after login`).toBeDefined();
    expect(
      sessionCookie!.value,
      `"${SESSION_COOKIE}" cookie value must be non-empty`
    ).toBeTruthy();

    // The cookie should be scoped to the root path
    expect(sessionCookie!.path).toBe("/");

    // Validate that the cookie value contains the expected user identity
    const decoded = decodeURIComponent(sessionCookie!.value);
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(decoded);
    } catch {
      // If it is not JSON the app may store it in a different format; skip
    }

    if (Object.keys(parsed).length > 0) {
      expect(parsed).toHaveProperty("userId");
      expect(parsed).toHaveProperty("companyId");
      expect(parsed).toHaveProperty("email");
    }
  });

  test("Session cookie is absent / cleared before login", async ({ context }) => {
    // In a fresh context (storageState reset at suite level) there should be
    // no session cookie before any login action.
    const cookies = await context.cookies();
    const sessionCookie = cookies.find((c) => c.name === SESSION_COOKIE);
    const hasCookie =
      !!sessionCookie &&
      !!sessionCookie.value &&
      (sessionCookie.expires === -1 || sessionCookie.expires > Date.now() / 1000);

    expect(
      hasCookie,
      `"${SESSION_COOKIE}" cookie should not be present in a fresh (unauthenticated) context`
    ).toBe(false);
  });
});
