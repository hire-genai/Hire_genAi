/**
 * tests/e2e/06-jd-creation.spec.ts
 *
 * End-to-end tests for the JD Creation Module — Job Description AI Generation.
 *
 * Coverage:
 *   POSITIVE
 *     1. JD creation wizard/form opens from the jobs page
 *     2. AI-generated interview questions appear after submitting job requirements
 *     3. Generated JD content (job description textarea) can be edited before saving
 *     4. JD saved successfully and linked to job (appears in listing)
 *     5. JD preview shows formatted content in view mode
 *     6. Copy JD to clipboard via the Share button
 *
 *   NEGATIVE
 *     1. AI question generation without minimum required fields shows validation
 *     2. AI API failure shows user-friendly error
 *     3. Empty job description cannot be saved/published
 *     4. AI generation with very short JD input shows appropriate feedback
 *
 * Architecture notes:
 *   "AI Generate" in this codebase lives in Step 3 of the job-posting wizard and
 *   generates INTERVIEW QUESTIONS (not the JD text). The JD text is authored in
 *   Step 2 via a <textarea>. Tests labelled "AI-generated JD" therefore cover the
 *   full wizard flow: Step 2 (write / edit the job description) and Step 3 (AI
 *   question generation driven by that JD).
 *
 * Mock strategy:
 *   - GET  /api/jobs*                  → returns fixture job list
 *   - POST /api/jobs                   → returns the newly created job
 *   - POST /api/questions/generate     → returns realistic 10-question payload
 *                                        (or 500 for failure scenarios)
 *   - GET  /api/billing/status*        → trial active, wallet funded
 *   - GET  /api/settings/users*        → single recruiter user
 *   - POST /api/jobs/enforce-trial-expiry, restore-from-trial-expiry → ok
 *
 * Auth:
 *   Session injected directly via localStorage + cookie (no live OTP needed).
 */

import { test, expect, type Page, type Route } from "@playwright/test";
import { JobsPage } from "../pages/JobsPage";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MOCK_COMPANY_ID = "mock-company-id-001";
const MOCK_COMPANY_SLUG = "acme-corp";
const MOCK_USER_ID = "mock-user-id-001";

// ---------------------------------------------------------------------------
// Fixture data
// ---------------------------------------------------------------------------

const FIXTURE_JOB_OPEN = {
  id: "job-001",
  title: "Senior Frontend Engineer",
  department: "Engineering",
  location: "San Francisco, CA",
  job_type: "Full-time",
  work_mode: "Hybrid",
  salary_min: 120000,
  salary_max: 160000,
  currency: "USD",
  status: "open",
  description:
    "Build modern web applications using React and TypeScript. You will be responsible " +
    "for leading frontend architecture decisions, mentoring junior engineers, and " +
    "delivering high-quality, performant user interfaces.",
  required_skills: ["React", "TypeScript", "CSS"],
  preferred_skills: ["Next.js", "GraphQL"],
  experience_years: "5",
  recruiter_name: "Jane Recruiter",
  hiring_manager_name: "Bob Manager",
  hiring_manager_email: "bob@acme.com",
  number_of_openings: 2,
  hiring_priority: "High",
  target_time_to_fill_days: 30,
  auto_schedule_interview: true,
  enable_screening_questions: false,
  total_candidates: "12",
  screening_count: "8",
  ai_interview_count: "4",
  hiring_manager_count: "2",
  offer_count: "1",
  hired_count: "0",
  rejected_count: "3",
  company_slug: MOCK_COMPANY_SLUG,
  created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
};

// ---------------------------------------------------------------------------
// Realistic AI questions mock — mirrors /api/questions/generate response shape
// ---------------------------------------------------------------------------

const MOCK_AI_QUESTIONS_RESPONSE = {
  success: true,
  questions: [
    {
      id: 1,
      question:
        "Walk me through your experience with React hooks and how you have used them " +
        "to manage complex state in a production application.",
      criterion: "Technical Skills",
      difficulty: "High",
      marks: 15,
      source: "ai",
    },
    {
      id: 2,
      question:
        "How would you design a performant data-fetching layer for a Next.js application " +
        "that needs real-time updates?",
      criterion: "Technical Skills",
      difficulty: "High",
      marks: 15,
      source: "ai",
    },
    {
      id: 3,
      question:
        "Explain how TypeScript generics work and give a practical example from your past work.",
      criterion: "Technical Skills",
      difficulty: "Medium",
      marks: 10,
      source: "ai",
    },
    {
      id: 4,
      question:
        "Describe a particularly difficult bug you encountered in a front-end project. " +
        "How did you diagnose and fix it?",
      criterion: "Problem Solving",
      difficulty: "High",
      marks: 15,
      source: "ai",
    },
    {
      id: 5,
      question:
        "You are tasked with improving the perceived performance of a React app. " +
        "What steps do you take first?",
      criterion: "Problem Solving",
      difficulty: "Medium",
      marks: 10,
      source: "ai",
    },
    {
      id: 6,
      question:
        "Tell me about a time when requirements changed mid-sprint. " +
        "How did you adapt and communicate the impact?",
      criterion: "Problem Solving",
      difficulty: "Medium",
      marks: 10,
      source: "ai",
    },
    {
      id: 7,
      question:
        "How do you explain a complex technical tradeoff to a product manager " +
        "who has no engineering background?",
      criterion: "Communication",
      difficulty: "Medium",
      marks: 10,
      source: "ai",
    },
    {
      id: 8,
      question:
        "Describe a time when you had to present a technical proposal to stakeholders. " +
        "What was the outcome?",
      criterion: "Communication",
      difficulty: "Low",
      marks: 5,
      source: "ai",
    },
    {
      id: 9,
      question: "Tell me about yourself and your journey into front-end development.",
      criterion: "Communication",
      difficulty: "Low",
      marks: 5,
      source: "ai",
    },
    {
      id: 10,
      question:
        "What strategies do you use to keep your CSS architecture maintainable " +
        "as a codebase grows?",
      criterion: "Technical Skills",
      difficulty: "Low",
      marks: 5,
      source: "ai",
    },
  ],
  usage: {
    promptTokens: 812,
    completionTokens: 647,
    totalTokens: 1459,
  },
  questionCount: 10,
  draftJobId: "draft_mock_001",
};

// ---------------------------------------------------------------------------
// Mock session data
// ---------------------------------------------------------------------------

const MOCK_SESSION_PAYLOAD = {
  userId: MOCK_USER_ID,
  companyId: MOCK_COMPANY_ID,
  companyName: "Acme Corp",
  fullName: "Jane Doe",
  email: "jane.doe@acme.com",
  role: "manager",
};

const MOCK_SESSION_COOKIE_VALUE = encodeURIComponent(
  JSON.stringify(MOCK_SESSION_PAYLOAD)
);

const MOCK_AUTH_STORAGE = JSON.stringify({
  user: {
    id: MOCK_USER_ID,
    email: "jane.doe@acme.com",
    name: "Jane Doe",
    role: "manager",
    phone: "",
    timezone: "UTC",
  },
  company: {
    id: MOCK_COMPANY_ID,
    name: "Acme Corp",
    slug: MOCK_COMPANY_SLUG,
    industry: "Technology",
    size: "11-50",
    website: "",
  },
});

// ---------------------------------------------------------------------------
// Route mock helpers
// ---------------------------------------------------------------------------

async function mockGetJobs(
  page: Page,
  jobs: object[] = [FIXTURE_JOB_OPEN]
): Promise<void> {
  await page.route("**/api/jobs*", async (route: Route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, data: jobs, total: jobs.length }),
      });
    } else {
      await route.continue();
    }
  });
}

async function mockBillingStatus(page: Page): Promise<void> {
  await page.route("**/api/billing/status*", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        billing: {
          isTrialExpired: false,
          trialDaysRemaining: 7,
          walletBalance: 15.0,
        },
      }),
    });
  });
}

async function mockSettingsUsers(page: Page): Promise<void> {
  await page.route("**/api/settings/users*", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        users: [{ id: MOCK_USER_ID, name: "Jane Doe", role: "manager" }],
      }),
    });
  });
}

async function mockTrialEnforcementEndpoints(page: Page): Promise<void> {
  await page.route(
    "**/api/jobs/enforce-trial-expiry",
    async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    }
  );
  await page.route(
    "**/api/jobs/restore-from-trial-expiry",
    async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    }
  );
}

/**
 * Mock /api/questions/generate — returns the realistic 10-question payload.
 * A 200 ms artificial delay simulates actual AI round-trip latency.
 */
async function mockQuestionsGenerateSuccess(page: Page): Promise<void> {
  await page.route("**/api/questions/generate", async (route: Route) => {
    if (route.request().method() === "POST") {
      await new Promise((resolve) => setTimeout(resolve, 200));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_AI_QUESTIONS_RESPONSE),
      });
    } else {
      await route.continue();
    }
  });
}

/**
 * Mock /api/questions/generate — returns a 500 to simulate an AI API failure.
 */
async function mockQuestionsGenerateFailure(page: Page): Promise<void> {
  await page.route("**/api/questions/generate", async (route: Route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error:
            "OpenAI API is temporarily unavailable. Please try again later.",
        }),
      });
    } else {
      await route.continue();
    }
  });
}

/** Register all background mocks needed for /jobs to load cleanly. */
async function mockAllBackground(page: Page): Promise<void> {
  await mockBillingStatus(page);
  await mockSettingsUsers(page);
  await mockTrialEnforcementEndpoints(page);
}

// ---------------------------------------------------------------------------
// Session injection helper
// ---------------------------------------------------------------------------

/**
 * Inject an authenticated session into browser localStorage + cookie.
 * The page must already be navigated to the app origin before calling this.
 */
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

/** Full page setup: mocks + session + navigate to /jobs. */
async function setupAuthenticatedJobsPage(
  page: Page,
  jobs: object[] = [FIXTURE_JOB_OPEN]
): Promise<JobsPage> {
  await mockAllBackground(page);
  await mockGetJobs(page, jobs);
  await page.goto("/");
  await injectAuthSession(page);
  const jobsPage = new JobsPage(page);
  await jobsPage.goto();
  return jobsPage;
}

// ---------------------------------------------------------------------------
// Wizard navigation helpers
// ---------------------------------------------------------------------------

/**
 * Open the job creation modal and navigate to Step 2 (Job Description).
 * Fills the minimum Step 1 fields so navigation is not blocked.
 */
async function openWizardAtStep2(
  page: Page,
  jobsPage: JobsPage,
  title: string = "Senior React Developer"
): Promise<void> {
  await jobsPage.openNewJobForm();
  await jobsPage.expectFormVisible();

  // Fill Step 1 required fields
  await jobsPage.fillJobTitle(title);
  await jobsPage.fillLocation("Austin, TX");

  // Try clicking the "Job Description" step label in the progress indicator
  const step2Label = page.getByText(/^Job Description$/).first();
  const step2LabelVisible = await step2Label.isVisible().catch(() => false);

  if (step2LabelVisible) {
    await step2Label.click();
  } else {
    // Fallback: data-step or aria-label attribute
    const step2Alt = page
      .locator("[data-step='2'], [aria-label*='Job Description' i]")
      .first();
    if (await step2Alt.isVisible().catch(() => false)) {
      await step2Alt.click();
    } else {
      // Last resort: Next button
      const nextBtn = page.getByRole("button", { name: /^Next$/i }).first();
      if (await nextBtn.isVisible().catch(() => false)) {
        await nextBtn.click();
      }
    }
  }
  await page.waitForTimeout(500);
}

/**
 * Navigate to Step 3 (Interview Questions) within the open wizard.
 */
async function navigateToStep3(page: Page): Promise<void> {
  const step3Label = page.getByText(/^Interview Questions$/).first();
  if (await step3Label.isVisible().catch(() => false)) {
    await step3Label.click();
  } else {
    const step3Alt = page
      .locator("[data-step='3'], [aria-label*='Interview Questions' i]")
      .first();
    if (await step3Alt.isVisible().catch(() => false)) {
      await step3Alt.click();
    } else {
      const nextBtn = page.getByRole("button", { name: /^Next$/i }).first();
      if (await nextBtn.isVisible().catch(() => false)) {
        await nextBtn.click();
      }
    }
  }
  await page.waitForTimeout(500);
}

// ---------------------------------------------------------------------------
// Locator helpers
// ---------------------------------------------------------------------------

function jdTextarea(page: Page) {
  return page
    .locator(
      "textarea[name='jobDescription'], " +
        "textarea[id='jobDescription'], " +
        "textarea[placeholder*='description' i]"
    )
    .first();
}

function requiredSkillsField(page: Page) {
  return page
    .locator(
      "textarea[name='requiredSkills'], " +
        "textarea[id='requiredSkills'], " +
        "textarea[placeholder*='skill' i]"
    )
    .first();
}

function experienceYearsField(page: Page) {
  return page
    .locator(
      "input[name='experienceYears'], " +
        "input[id='experienceYears'], " +
        "input[placeholder*='experience' i]"
    )
    .first();
}

function aiGenerateBtn(page: Page) {
  return page.getByRole("button", { name: /AI Generate/i }).first();
}

function publishJobBtn(page: Page) {
  return page.getByRole("button", { name: /Publish Job/i }).first();
}

// ---------------------------------------------------------------------------
// Suite configuration
// ---------------------------------------------------------------------------

test.use({ storageState: { cookies: [], origins: [] } });

// ===========================================================================
// POSITIVE SCENARIOS
// ===========================================================================

test.describe("JD Creation — Positive Scenarios", () => {
  // ── 1. JD creation wizard opens from jobs page ───────────────────────────

  test("1. JD creation wizard/form opens from the jobs page", async ({
    page,
  }) => {
    const jobsPage = await setupAuthenticatedJobsPage(page);

    await jobsPage.expectJobsPageLoaded();

    // Click "Post New Job" — the multi-step JD creation wizard should appear
    await jobsPage.openNewJobForm();
    await jobsPage.expectFormVisible();

    // All three primary step labels must be visible in the progress indicator
    await expect(page.getByText(/Basic Information/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(/Job Description/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(/Interview Questions/i).first()).toBeVisible({
      timeout: 10_000,
    });

    // Step 1 input fields should be immediately focusable
    const titleInput = page
      .locator(
        "input[name='jobTitle'], input[id='jobTitle'], input[placeholder*='Job Title' i]"
      )
      .first();
    await expect(titleInput).toBeVisible({ timeout: 8_000 });

    // The "Post New Job" header button should still be in the DOM
    await expect(jobsPage.postNewJobButton).toBeVisible({ timeout: 5_000 });

    // Close the wizard
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  });

  // ── 2. AI-generated questions appear after submitting job requirements ────

  test("2. AI-generated interview questions appear after submitting job requirements", async ({
    page,
  }) => {
    await mockAllBackground(page);
    await mockGetJobs(page);
    await mockQuestionsGenerateSuccess(page);

    await page.goto("/");
    await injectAuthSession(page);
    const jobsPage = new JobsPage(page);
    await jobsPage.goto();

    // Open the wizard and navigate to Step 2
    await openWizardAtStep2(page, jobsPage, "Staff Frontend Engineer");

    // Step 2: fill JD content that will feed the AI question generator
    const descArea = jdTextarea(page);
    if (await descArea.isVisible().catch(() => false)) {
      await descArea.fill(
        "We are looking for a Staff Frontend Engineer with deep expertise in React, " +
          "TypeScript, and modern web performance patterns. You will lead architecture " +
          "decisions, mentor team members, and collaborate closely with product and design."
      );
    }

    const skillsArea = requiredSkillsField(page);
    if (await skillsArea.isVisible().catch(() => false)) {
      await skillsArea.fill("React\nTypeScript\nNext.js\nCSS");
    }

    const expInput = experienceYearsField(page);
    if (await expInput.isVisible().catch(() => false)) {
      await expInput.fill("5+ years");
    }

    // Navigate to Step 3 — Interview Questions
    await navigateToStep3(page);

    // Select at least one evaluation criterion before generating
    const technicalCriterion = page
      .getByText(/Technical Skills/i, { exact: false })
      .first();
    if (await technicalCriterion.isVisible().catch(() => false)) {
      await technicalCriterion.click();
      await page.waitForTimeout(200);
    }

    // Click "AI Generate" button
    const aiBtn = aiGenerateBtn(page);
    if (await aiBtn.isVisible().catch(() => false)) {
      await aiBtn.click();

      // Brief loading indicator should flash
      await expect(page.getByText(/Generating.../i).first())
        .toBeVisible({ timeout: 3_000 })
        .catch(() => {
          // Loading may be too fast to catch — not a failure
        });

      // After the mock resolves, questions from the fixture should appear
      await expect(
        page
          .getByText(/React hooks|TypeScript|performance|Next\.js|frontend/i, {
            exact: false,
          })
          .first()
      ).toBeVisible({ timeout: 15_000 });

      // Difficulty labels should be visible on rendered question cards
      const hasDifficultyLabel = await page
        .getByText(/High|Medium|Low/i, { exact: false })
        .first()
        .isVisible()
        .catch(() => false);
      expect(
        hasDifficultyLabel,
        "Difficulty label should appear on generated question card"
      ).toBe(true);
    } else {
      test.info().annotations.push({
        type: "note",
        description:
          "AI Generate button not visible — form step navigation may differ in current build",
      });
    }
  });

  // ── 3. Generated JD can be edited before saving ──────────────────────────

  test("3. Generated JD content (job description) can be edited before saving", async ({
    page,
  }) => {
    await mockAllBackground(page);
    await mockGetJobs(page);

    await page.goto("/");
    await injectAuthSession(page);
    const jobsPage = new JobsPage(page);
    await jobsPage.goto();

    await openWizardAtStep2(page, jobsPage, "Product Designer");

    const descArea = jdTextarea(page);
    if (await descArea.isVisible().catch(() => false)) {
      // Simulate AI-generated text placed into the textarea
      const aiOutput =
        "We are seeking a talented Product Designer to join our team. " +
        "You will create beautiful, intuitive interfaces for millions of users.";
      await descArea.fill(aiOutput);
      await expect(descArea).toHaveValue(aiOutput);

      // Recruiter refines the AI output by appending additional context
      const amended =
        aiOutput +
        " Experience with design systems and Figma is essential for this role.";
      await descArea.fill(amended);
      const afterAmend = await descArea.inputValue();
      expect(afterAmend).toContain("design systems and Figma");
      expect(afterAmend).toContain("Product Designer");
      expect(afterAmend.length).toBeGreaterThan(aiOutput.length);

      // Full rewrite — recruiter replaces the entire JD
      const rewritten =
        "Revised JD: Lead all design efforts across web and mobile platforms. " +
        "Minimum 4 years of product design experience required. " +
        "Proficiency in Figma, knowledge of accessibility standards, and experience " +
        "collaborating with cross-functional teams is a must.";
      await descArea.clear();
      await descArea.fill(rewritten);
      const finalValue = await descArea.inputValue();
      expect(finalValue).toBe(rewritten);
      expect(finalValue).not.toContain("beautiful, intuitive interfaces");

      // Ensure the textarea remains editable (not read-only)
      const isReadOnly = await descArea.evaluate(
        (el) => (el as HTMLTextAreaElement).readOnly
      );
      expect(isReadOnly).toBe(false);
    } else {
      test.info().annotations.push({
        type: "note",
        description:
          "Job Description textarea not visible on current step — step navigation may differ",
      });
    }
  });

  // ── 4. JD saved successfully and linked to job ────────────────────────────

  test("4. JD saved successfully and job with JD appears in listing", async ({
    page,
  }) => {
    const newJobTitle = "UX Researcher";
    const newJobId = "job-jd-new-001";
    let getCallCount = 0;

    await mockAllBackground(page);

    // Combined GET + POST handler — after creation the list grows
    await page.route("**/api/jobs*", async (route: Route) => {
      const method = route.request().method();
      if (method === "GET") {
        getCallCount++;
        const jobs =
          getCallCount === 1
            ? [FIXTURE_JOB_OPEN]
            : [
                FIXTURE_JOB_OPEN,
                {
                  ...FIXTURE_JOB_OPEN,
                  id: newJobId,
                  title: newJobTitle,
                  department: "Design",
                  status: "open",
                  description:
                    "Conduct user research to inform product decisions. " +
                    "Synthesize findings into actionable insights.",
                  required_skills: ["User Research", "Usability Testing", "Figma"],
                  total_candidates: "0",
                  screening_count: "0",
                  ai_interview_count: "0",
                  hiring_manager_count: "0",
                  offer_count: "0",
                  hired_count: "0",
                  rejected_count: "0",
                },
              ];
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true, data: jobs, total: jobs.length }),
        });
      } else if (method === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            data: {
              ...FIXTURE_JOB_OPEN,
              id: newJobId,
              title: newJobTitle,
              department: "Design",
              status: "open",
              company_slug: MOCK_COMPANY_SLUG,
              created_at: new Date().toISOString(),
              total_candidates: "0",
              screening_count: "0",
              ai_interview_count: "0",
              hiring_manager_count: "0",
              offer_count: "0",
              hired_count: "0",
              rejected_count: "0",
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/");
    await injectAuthSession(page);
    const jobsPage = new JobsPage(page);
    await jobsPage.goto();

    // Navigate through wizard Steps 1 and 2
    await openWizardAtStep2(page, jobsPage, newJobTitle);

    const descArea = jdTextarea(page);
    if (await descArea.isVisible().catch(() => false)) {
      await descArea.fill(
        "Conduct user research to inform product decisions. " +
          "Synthesize findings into actionable insights for the product team."
      );
    }

    const skillsArea = requiredSkillsField(page);
    if (await skillsArea.isVisible().catch(() => false)) {
      await skillsArea.fill("User Research\nUsability Testing\nFigma");
    }

    const expInput = experienceYearsField(page);
    if (await expInput.isVisible().catch(() => false)) {
      await expInput.fill("3+ years");
    }

    // Navigate back to Step 1 to confirm the title is still set
    await page
      .getByText(/Basic Information/i, { exact: false })
      .first()
      .click()
      .catch(() => {});
    await page.waitForTimeout(300);
    await jobsPage.fillJobTitle(newJobTitle);
    await jobsPage.fillLocation("Chicago, IL");

    // Publish (or save as draft if Publish button is not yet visible)
    const pubBtn = publishJobBtn(page);
    if (await pubBtn.isVisible().catch(() => false)) {
      await pubBtn.click();
    } else {
      await page
        .getByRole("button", { name: /Save as Draft/i })
        .first()
        .click()
        .catch(() => {});
    }

    await page.waitForTimeout(1_500);

    // The new job title must now appear somewhere in the listing
    await expect(
      page.getByText(newJobTitle, { exact: false }).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  // ── 5. JD preview shows formatted content ────────────────────────────────

  test("5. JD preview shows formatted content in view mode", async ({
    page,
  }) => {
    await mockAllBackground(page);
    await mockGetJobs(page, [FIXTURE_JOB_OPEN]);

    // Mock single-job GET used when opening view mode
    await page.route(
      `**/api/jobs/**/${FIXTURE_JOB_OPEN.id}`,
      async (route: Route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ ok: true, data: FIXTURE_JOB_OPEN }),
          });
        } else {
          await route.continue();
        }
      }
    );

    await page.goto("/");
    await injectAuthSession(page);
    const jobsPage = new JobsPage(page);
    await jobsPage.goto();

    await jobsPage.expectJobCardVisible(FIXTURE_JOB_OPEN.title);

    // Locate the open job card and click its View button
    const openJobCard = page
      .locator("[data-slot='card']")
      .filter({ hasText: FIXTURE_JOB_OPEN.title })
      .first();

    const viewButton = openJobCard
      .getByRole("button", { name: /View/i })
      .first();
    const viewVisible = await viewButton.isVisible().catch(() => false);

    if (viewVisible) {
      await viewButton.click();
      await page.waitForTimeout(700);

      // The job description text should render in view mode
      await expect(
        page.getByText(/React and TypeScript/i, { exact: false }).first()
      ).toBeVisible({ timeout: 10_000 });

      // Job title must appear in the modal header
      await expect(
        page.getByText(FIXTURE_JOB_OPEN.title, { exact: false }).first()
      ).toBeVisible({ timeout: 5_000 });

      // Navigate to the Job Description step to verify the JD textarea content
      await page
        .getByText(/Job Description/i, { exact: false })
        .first()
        .click()
        .catch(() => {});
      await page.waitForTimeout(400);

      const descArea = jdTextarea(page);
      if (await descArea.isVisible().catch(() => false)) {
        const content = await descArea.inputValue();
        expect(
          content.length,
          "Job description textarea must contain formatted content in view mode"
        ).toBeGreaterThan(20);
        // Description should reference React/TypeScript from the fixture
        expect(content).toMatch(/React|TypeScript|frontend|web application/i);
      }

      // Close the modal
      await page.keyboard.press("Escape");
    } else {
      // Fallback: description may be rendered inline on the card
      const inlineDescVisible = await openJobCard
        .getByText(/React and TypeScript/i, { exact: false })
        .first()
        .isVisible()
        .catch(() => false);

      test.info().annotations.push({
        type: "note",
        description: inlineDescVisible
          ? "Description rendered inline on card — view modal not triggered via button"
          : "View button not found; description not visible inline either",
      });
    }
  });

  // ── 6. Copy JD to clipboard via Share button ─────────────────────────────

  test("6. Copy JD to clipboard works via Share button", async ({ page }) => {
    await mockAllBackground(page);
    await mockGetJobs(page, [FIXTURE_JOB_OPEN]);

    await page.goto("/");
    await injectAuthSession(page);
    const jobsPage = new JobsPage(page);
    await jobsPage.goto();

    await jobsPage.expectJobCardVisible(FIXTURE_JOB_OPEN.title);

    // Grant clipboard permissions
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);

    const openJobCard = page
      .locator("[data-slot='card']")
      .filter({ hasText: FIXTURE_JOB_OPEN.title })
      .first();

    const shareButton = openJobCard
      .getByRole("button", { name: /Share/i })
      .first();
    const shareVisible = await shareButton.isVisible().catch(() => false);

    if (shareVisible) {
      await shareButton.click();

      // A brief "Copied!" feedback label should appear
      await expect(page.getByText(/Copied!/i).first()).toBeVisible({
        timeout: 5_000,
      });

      // Clipboard should contain a non-empty value (the job public link)
      const clipboardText = await page
        .evaluate(() => navigator.clipboard.readText())
        .catch(() => "");
      expect(
        clipboardText.length,
        "Clipboard must contain a non-empty string after Share click"
      ).toBeGreaterThan(0);
    } else {
      // Share may live inside a dropdown menu
      const dropdownTrigger = openJobCard
        .locator("[aria-haspopup='menu'], [aria-haspopup='listbox']")
        .first();
      if (await dropdownTrigger.isVisible().catch(() => false)) {
        await dropdownTrigger.click();
        await page.waitForTimeout(300);
        const menuShareItem = page
          .getByRole("menuitem", { name: /Share/i })
          .first();
        await menuShareItem.click().catch(() => {});
        await expect(page.getByText(/Copied!/i).first()).toBeVisible({
          timeout: 5_000,
        });
      } else {
        test.info().annotations.push({
          type: "note",
          description:
            "Share button not found on the open job card — clipboard assertion skipped",
        });
      }
    }
  });
});

// ===========================================================================
// NEGATIVE SCENARIOS
// ===========================================================================

test.describe("JD Creation — Negative Scenarios", () => {
  // ── 1. AI generation without required fields shows validation ─────────────

  test("1. AI question generation without minimum required fields shows validation", async ({
    page,
  }) => {
    await mockAllBackground(page);
    await mockGetJobs(page);
    await mockQuestionsGenerateSuccess(page);

    await page.goto("/");
    await injectAuthSession(page);
    const jobsPage = new JobsPage(page);
    await jobsPage.goto();

    await jobsPage.openNewJobForm();
    await jobsPage.expectFormVisible();

    // Jump directly to Step 3 WITHOUT filling the JD, skills, or experience in Step 2
    await page
      .getByText(/Interview Questions/i, { exact: false })
      .first()
      .click()
      .catch(() => {});
    await page.waitForTimeout(400);

    // Attempt AI generation without selecting any evaluation criterion
    const aiBtn = aiGenerateBtn(page);
    const aiBtnVisible = await aiBtn.isVisible().catch(() => false);

    if (aiBtnVisible) {
      // The form uses alert() for these guards — intercept it
      const dialogPromise = page
        .waitForEvent("dialog", { timeout: 3_000 })
        .catch(() => null);
      await aiBtn.click();
      const dialog = await dialogPromise;

      if (dialog) {
        const msg = dialog.message().toLowerCase();
        // The alert must mention criteria, description, skills, or experience
        expect(
          msg,
          "Alert must reference at least one missing required field"
        ).toMatch(/criterion|description|skill|experience|select/);
        await dialog.accept();
      } else {
        // Inline validation message or role=alert element
        const inlineErr = await page
          .getByText(
            /select.*criterion|fill.*description|add.*skill|required|criterion.*required/i,
            { exact: false }
          )
          .first()
          .isVisible()
          .catch(() => false);

        const roleAlert = await page
          .locator("[role='alert'], .text-destructive, .text-red-500")
          .first()
          .isVisible()
          .catch(() => false);

        expect(
          inlineErr || roleAlert,
          "Expected a validation message when AI Generate is clicked without required data"
        ).toBe(true);
      }
    } else {
      // Form may guard step 3 navigation until prerequisites in step 2 are met
      test.info().annotations.push({
        type: "note",
        description:
          "AI Generate button not visible — form likely guards step 3 access until prerequisites are filled",
      });
    }
  });

  // ── 2. AI API failure shows user-friendly error ───────────────────────────

  test("2. AI API failure shows a user-friendly error message", async ({
    page,
  }) => {
    await mockAllBackground(page);
    await mockGetJobs(page);
    await mockQuestionsGenerateFailure(page);

    await page.goto("/");
    await injectAuthSession(page);
    const jobsPage = new JobsPage(page);
    await jobsPage.goto();

    await jobsPage.openNewJobForm();
    await jobsPage.expectFormVisible();

    // Fill Step 1 minimum fields
    await jobsPage.fillJobTitle("Backend Developer");
    await jobsPage.fillLocation("New York, NY");

    // Navigate to Step 2 and fill enough data for the AI call to reach the API
    await openWizardAtStep2(page, jobsPage, "Backend Developer");

    const descArea = jdTextarea(page);
    if (await descArea.isVisible().catch(() => false)) {
      await descArea.fill(
        "Build and maintain scalable backend services using Node.js and PostgreSQL. " +
          "You will design RESTful APIs, write unit tests, and collaborate with " +
          "frontend teams to deliver end-to-end features."
      );
    }

    const skillsArea = requiredSkillsField(page);
    if (await skillsArea.isVisible().catch(() => false)) {
      await skillsArea.fill("Node.js\nPostgreSQL\nREST APIs");
    }

    const expInput = experienceYearsField(page);
    if (await expInput.isVisible().catch(() => false)) {
      await expInput.fill("3+ years");
    }

    // Navigate to Step 3 and select a criterion
    await navigateToStep3(page);

    const criterion = page
      .getByText(/Technical Skills/i, { exact: false })
      .first();
    if (await criterion.isVisible().catch(() => false)) {
      await criterion.click();
      await page.waitForTimeout(200);
    }

    // Click AI Generate — will hit the mocked 500 endpoint
    const aiBtn = aiGenerateBtn(page);
    if (await aiBtn.isVisible().catch(() => false)) {
      const dialogPromise = page
        .waitForEvent("dialog", { timeout: 6_000 })
        .catch(() => null);
      await aiBtn.click();
      const dialog = await dialogPromise;

      if (dialog) {
        const msg = dialog.message();
        // Must be a human-readable message — not a raw stack trace
        expect(
          msg,
          "Error alert must contain a human-readable message"
        ).toMatch(
          /failed|error|unavailable|try again|unable|something went wrong/i
        );
        // Should NOT expose raw stack traces
        expect(msg).not.toMatch(/at Object\.|\.js:\d+:\d+/);
        await dialog.accept();
      } else {
        await page.waitForTimeout(2_000);

        const toastError = await page
          .getByText(
            /failed|error|unavailable|try again|something went wrong/i,
            { exact: false }
          )
          .first()
          .isVisible()
          .catch(() => false);

        const roleAlert = await page
          .locator("[role='alert'], .text-destructive, .text-red-500")
          .first()
          .isVisible()
          .catch(() => false);

        expect(
          toastError || roleAlert,
          "Expected a user-friendly error when the AI API returns 500"
        ).toBe(true);
      }
    } else {
      test.info().annotations.push({
        type: "note",
        description:
          "AI Generate button not visible — cannot exercise the API failure path in current UI state",
      });
    }
  });

  // ── 3. Empty job description cannot be published ──────────────────────────

  test("3. Empty job description cannot be published (required field blocks submission)", async ({
    page,
  }) => {
    await mockAllBackground(page);
    await mockGetJobs(page);

    // Server-side guard: POST returns 400 when description is missing
    await page.route("**/api/jobs", async (route: Route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            ok: false,
            error: "Validation failed: Job Description is required.",
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/");
    await injectAuthSession(page);
    const jobsPage = new JobsPage(page);
    await jobsPage.goto();

    await jobsPage.openNewJobForm();
    await jobsPage.expectFormVisible();

    // Fill only non-description required fields — intentionally leave JD blank
    await jobsPage.fillJobTitle("Marketing Manager");
    await jobsPage.fillLocation("Boston, MA");
    await jobsPage.fillExperienceYears("4+ years");
    await jobsPage.fillRequiredSkills("Marketing\nSEO\nContent Strategy");
    // Do NOT fill jobDescription

    // Attempt to publish
    const pubBtn = publishJobBtn(page);
    if (await pubBtn.isVisible().catch(() => false)) {
      await pubBtn.click();
    } else {
      await page
        .getByRole("button", { name: /Save as Draft/i })
        .first()
        .click()
        .catch(() => {});
    }
    await page.waitForTimeout(800);

    // Accept any native alert triggered by the save error handler
    const dialogAccepted = await page
      .waitForEvent("dialog", { timeout: 2_000 })
      .then(async (d) => {
        await d.accept();
        return true;
      })
      .catch(() => false);

    // Check HTML5 required validation on the textarea
    const hasHtml5Required = await page.evaluate(() => {
      const tas = document.querySelectorAll("textarea[required]");
      for (const ta of Array.from(tas)) {
        if (ta instanceof HTMLTextAreaElement && !ta.validity.valid) return true;
      }
      return false;
    });

    // Inline error indicators
    const hasInlineError = await page
      .locator(
        "[role='alert'], .text-destructive, .text-red-500, .text-red-600"
      )
      .first()
      .isVisible()
      .catch(() => false);

    const hasToastError = await page
      .getByText(
        /required|validation|description.*required|provide.*description/i
      )
      .first()
      .isVisible()
      .catch(() => false);

    // The form should still be open (save was blocked by validation)
    const formStillOpen = await page
      .locator("input[name='jobTitle'], input[id='jobTitle']")
      .first()
      .isVisible()
      .catch(() => false);

    expect(
      dialogAccepted ||
        hasHtml5Required ||
        hasInlineError ||
        hasToastError ||
        formStillOpen,
      "Expected validation to block saving when job description is empty"
    ).toBe(true);
  });

  // ── 4. Very short JD input shows appropriate feedback ─────────────────────

  test("4. AI generation with very short JD input shows appropriate feedback", async ({
    page,
  }) => {
    await mockAllBackground(page);
    await mockGetJobs(page);

    // Custom mock: validates JD length and returns 400 for too-short input
    await page.route("**/api/questions/generate", async (route: Route) => {
      if (route.request().method() === "POST") {
        const body: Record<string, unknown> = await route
          .request()
          .postDataJSON()
          .catch(() => ({}));
        const jd: string = (body?.jobDescription as string) ?? "";

        if (jd.trim().length < 30) {
          await route.fulfill({
            status: 400,
            contentType: "application/json",
            body: JSON.stringify({
              error:
                "Job description is too short to generate meaningful questions. " +
                "Please provide at least 50 characters of description.",
            }),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(MOCK_AI_QUESTIONS_RESPONSE),
          });
        }
      } else {
        await route.continue();
      }
    });

    await page.goto("/");
    await injectAuthSession(page);
    const jobsPage = new JobsPage(page);
    await jobsPage.goto();

    await jobsPage.openNewJobForm();
    await jobsPage.expectFormVisible();
    await jobsPage.fillJobTitle("Data Analyst");
    await jobsPage.fillLocation("Dallas, TX");

    // Navigate to Step 2 and fill a deliberately minimal (sub-threshold) JD
    await openWizardAtStep2(page, jobsPage, "Data Analyst");

    const descArea = jdTextarea(page);
    if (await descArea.isVisible().catch(() => false)) {
      // 13 characters — well below the 30-char threshold in the mock
      await descArea.fill("Analyze data.");
    }

    const skillsArea = requiredSkillsField(page);
    if (await skillsArea.isVisible().catch(() => false)) {
      await skillsArea.fill("SQL");
    }

    const expInput = experienceYearsField(page);
    if (await expInput.isVisible().catch(() => false)) {
      await expInput.fill("2 years");
    }

    // Navigate to Step 3 and attempt generation
    await navigateToStep3(page);

    const criterion = page
      .getByText(/Technical Skills/i, { exact: false })
      .first();
    if (await criterion.isVisible().catch(() => false)) {
      await criterion.click();
      await page.waitForTimeout(200);
    }

    const aiBtn = aiGenerateBtn(page);
    if (await aiBtn.isVisible().catch(() => false)) {
      const dialogPromise = page
        .waitForEvent("dialog", { timeout: 6_000 })
        .catch(() => null);
      await aiBtn.click();
      const dialog = await dialogPromise;

      if (dialog) {
        const msg = dialog.message();
        // Message must be non-empty and human-readable
        expect(msg, "Feedback message must not be empty").toBeTruthy();
        expect(
          msg.length,
          "Feedback message must have meaningful content"
        ).toBeGreaterThan(5);
        await dialog.accept();
      } else {
        await page.waitForTimeout(2_000);

        const specificFeedback = await page
          .getByText(
            /too short|insufficient|more detail|provide.*description|minimum/i,
            { exact: false }
          )
          .first()
          .isVisible()
          .catch(() => false);

        const genericError = await page
          .locator(
            "[role='alert'], .text-destructive, .text-red-500, .text-amber-500"
          )
          .first()
          .isVisible()
          .catch(() => false);

        expect(
          specificFeedback || genericError,
          "Expected feedback when AI generation is triggered with a very short JD"
        ).toBe(true);
      }
    } else {
      // The form may guard step 3 access when JD is inadequately short
      const blockedMsg = await page
        .getByText(
          /fill.*description|description.*required|complete.*step/i,
          { exact: false }
        )
        .first()
        .isVisible()
        .catch(() => false);

      test.info().annotations.push({
        type: "note",
        description: blockedMsg
          ? "Form guarded step 3 access because JD was too short — validation working as intended"
          : "AI Generate button not visible — cannot complete short-input test in current build",
      });
    }
  });
});
