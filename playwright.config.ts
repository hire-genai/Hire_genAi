import { defineConfig, devices } from "@playwright/test";
import path from "path";

/**
 * Environment helpers — fall back to sensible local defaults so the config
 * works out-of-the-box without an .env file during local development.
 */
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const TEST_EMAIL = process.env.TEST_EMAIL ?? "test@example.com";
const TEST_COMPANY_DOMAIN = process.env.TEST_COMPANY_DOMAIN ?? "localhost";

/** true when running inside GitHub Actions / any CI environment */
const IS_CI = Boolean(process.env.CI);

/**
 * Absolute path to the storage-state file that the 'setup' project writes.
 * Playwright re-uses these saved cookies + localStorage so individual tests
 * in the 'authenticated' project don't have to log in themselves.
 */
const AUTH_FILE = path.join(__dirname, "tests/e2e/.auth/user.json");

export default defineConfig({
  // ---------------------------------------------------------------------------
  // Discovery
  // ---------------------------------------------------------------------------
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.ts",

  // ---------------------------------------------------------------------------
  // Execution
  // ---------------------------------------------------------------------------
  fullyParallel: true,
  /** Prevent .only() from accidentally silencing other tests on CI. */
  forbidOnly: IS_CI,
  retries: IS_CI ? 2 : 0,
  workers: IS_CI ? 4 : 2,

  // ---------------------------------------------------------------------------
  // Timeouts
  // ---------------------------------------------------------------------------
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },

  // ---------------------------------------------------------------------------
  // Reporting
  // ---------------------------------------------------------------------------
  reporter: [
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["json", { outputFile: "playwright-report/results.json" }],
    ["list"],
  ],

  // ---------------------------------------------------------------------------
  // Shared browser / test settings (applied to every project unless overridden)
  // ---------------------------------------------------------------------------
  use: {
    baseURL: BASE_URL,

    // Capture artifacts on failure.
    screenshot: "only-on-failure",
    video: "on-first-retry",
    trace: "on-first-retry",

    // Extra HTTP headers forwarded with every request.
    extraHTTPHeaders: {
      "x-test-company-domain": TEST_COMPANY_DOMAIN,
    },
  },

  // ---------------------------------------------------------------------------
  // Output directories
  // ---------------------------------------------------------------------------
  outputDir: "test-results",

  // ---------------------------------------------------------------------------
  // Global setup / teardown
  // ---------------------------------------------------------------------------
  globalSetup: "./tests/e2e/global.setup.ts",
  globalTeardown: "./tests/e2e/global.teardown.ts",

  // ---------------------------------------------------------------------------
  // Browser projects
  // ---------------------------------------------------------------------------
  projects: [
    // ── Setup project ────────────────────────────────────────────────────────
    // Runs once before authenticated tests. Performs OTP-based email login and
    // persists the authenticated session to AUTH_FILE.
    {
      name: "setup",
      testMatch: "**/auth.setup.ts",
      use: {
        ...devices["Desktop Chrome"],
      },
    },

    // ── Authenticated project (Chromium) ─────────────────────────────────────
    // Full authenticated test suite. On CI, Firefox and WebKit are added via
    // separate project entries below.
    {
      name: "authenticated",
      testMatch: "**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        storageState: AUTH_FILE,
      },
      dependencies: ["setup"],
    },

    // ── Public project (no auth) ─────────────────────────────────────────────
    // Tests for publicly accessible pages (marketing, pricing, login, etc.)
    // that do not require an authenticated session.
    {
      name: "public",
      testMatch: "**/public/**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
      },
    },

    // ── Firefox (CI only) ────────────────────────────────────────────────────
    ...(IS_CI
      ? [
          {
            name: "firefox",
            testMatch: "**/*.spec.ts",
            use: {
              ...devices["Desktop Firefox"],
              storageState: AUTH_FILE,
            },
            dependencies: ["setup"],
          },
          {
            name: "webkit",
            testMatch: "**/*.spec.ts",
            use: {
              ...devices["Desktop Safari"],
              storageState: AUTH_FILE,
            },
            dependencies: ["setup"],
          },
        ]
      : []),
  ],

  // ---------------------------------------------------------------------------
  // Web server — auto-start `next dev` before the test run and shut it down
  // afterwards. Playwright waits until the server responds on port 3000.
  // ---------------------------------------------------------------------------
  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    /**
     * Re-use a server that is already running locally so you don't pay the
     * Next.js cold-start penalty on every `npx playwright test` invocation.
     * On CI a fresh server is always started.
     */
    reuseExistingServer: !IS_CI,
    /**
     * Next.js dev cold-start can take >30 s on a warm machine and longer on
     * CI — give it up to 120 s before timing out.
     */
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      // Omit NODE_ENV=test so Next.js loads .env.local (it skips .env.local in test mode).
      TEST_EMAIL,
      TEST_COMPANY_DOMAIN,
    },
  },
});
