# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 06-jd-creation.spec.ts >> JD Creation — Positive Scenarios >> 1. JD creation wizard/form opens from the jobs page
- Location: tests\e2e\06-jd-creation.spec.ts:529:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('input[name=\'jobTitle\'], input[id=\'jobTitle\'], input[placeholder*=\'Job Title\' i]').first()
Expected: visible
Timeout: 8000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 8000ms
  - waiting for locator('input[name=\'jobTitle\'], input[id=\'jobTitle\'], input[placeholder*=\'Job Title\' i]').first()

```

```yaml
- complementary:
  - button "Expand Sidebar":
    - img
  - text: JD
  - navigation:
    - link:
      - /url: /dashboard
      - button "Dashboard":
        - img
    - link:
      - /url: /candidate
      - button "Applications":
        - img
    - link:
      - /url: /jobs
      - button "Job Postings":
        - img
    - link:
      - /url: /talent-pool
      - button "Talent Pool":
        - img
    - link:
      - /url: /delegation
      - button "Delegation":
        - img
    - link:
      - /url: /support
      - button "Support":
        - img
    - link:
      - /url: /settings
      - button "Settings":
        - img
  - button "Logout":
    - img
- main:
  - heading "Job Openings" [level=1]
  - paragraph: Manage and track all your open positions
  - button "Post New Job":
    - img
    - text: Post New Job
  - img
  - textbox "Search jobs..."
  - combobox: All Departments
  - combobox: All Locations
  - combobox: All Users
  - button "Clear"
  - img
  - text: 1 Open Jobs
  - img
  - text: 0 Closed Jobs
  - img
  - text: 0 On Hold
  - img
  - text: 0 Cancelled
  - img
  - text: 0 Draft Jobs
  - img
  - text: 1 All Jobs
  - img
  - heading "Senior Frontend Engineer" [level=3]
  - text: Open
  - paragraph: Engineering
  - paragraph: "Recruiter: Jane Recruiter"
  - img
  - text: San Francisco, CA
  - img
  - text: $120,000 - $160,000
  - img
  - text: 1 week ago
  - img
  - text: Auto Interview
  - switch "Auto Interview" [checked]
  - text: "ON"
  - button "Share":
    - img
    - text: Share
  - button "View":
    - img
    - text: View
  - heading "Application Pipeline" [level=4]
  - text: 12 Total 8 CV Screened 4 AI Interview 2 Hiring Manager 1 Offer Stage 0 Hired 3 Rejected
  - heading "Post New Job" [level=3]
  - paragraph: Capture all details for accurate tracking and reporting
  - text: Job Status
  - combobox:
    - option "Open" [selected]
    - option "Closed"
    - option "On Hold"
    - option "Cancelled"
  - button:
    - img
  - text: 1 Basic Information 2 Job Description 3 Interview Questions 4 Screening Questions 5 Team & Planning
  - group:
    - heading "Basic Information" [level=4]
    - text: Job Title *
    - textbox "e.g. Senior Full Stack Developer"
    - text: Department *
    - combobox:
      - option "Select Department" [selected]
      - option "Engineering"
      - option "Product"
      - option "Design"
      - option "Sales"
      - option "Marketing"
      - option "Operations"
      - option "Human Resources"
      - option "Finance"
    - text: Location *
    - textbox "e.g. San Francisco, CA or Remote"
    - text: Job Type *
    - combobox:
      - option "Full-time" [selected]
      - option "Part-time"
      - option "Contract"
      - option "Temporary"
    - text: Work Mode *
    - combobox:
      - option "Remote"
      - option "Hybrid" [selected]
      - option "On-site"
    - text: Currency
    - combobox:
      - option "USD ($)" [selected]
      - option "EUR (€)"
      - option "GBP (£)"
      - option "INR (₹)"
    - text: Salary Range - Min
    - spinbutton
    - text: Salary Range - Max
    - spinbutton
    - text: Application Deadline
    - textbox
    - text: Expected Start Date
    - textbox
  - text: Step 1 of 5
  - button "Save as Draft":
    - img
    - text: Save as Draft
  - button "Next" [disabled]
- region "Notifications (F8)":
  - list
- alert
```

# Test source

```ts
  457 |     await step3Label.click();
  458 |   } else {
  459 |     const step3Alt = page
  460 |       .locator("[data-step='3'], [aria-label*='Interview Questions' i]")
  461 |       .first();
  462 |     if (await step3Alt.isVisible().catch(() => false)) {
  463 |       await step3Alt.click();
  464 |     } else {
  465 |       const nextBtn = page.getByRole("button", { name: /^Next$/i }).first();
  466 |       if (await nextBtn.isVisible().catch(() => false)) {
  467 |         await nextBtn.click();
  468 |       }
  469 |     }
  470 |   }
  471 |   await page.waitForTimeout(500);
  472 | }
  473 | 
  474 | // ---------------------------------------------------------------------------
  475 | // Locator helpers
  476 | // ---------------------------------------------------------------------------
  477 | 
  478 | function jdTextarea(page: Page) {
  479 |   return page
  480 |     .locator(
  481 |       "textarea[name='jobDescription'], " +
  482 |         "textarea[id='jobDescription'], " +
  483 |         "textarea[placeholder*='description' i]"
  484 |     )
  485 |     .first();
  486 | }
  487 | 
  488 | function requiredSkillsField(page: Page) {
  489 |   return page
  490 |     .locator(
  491 |       "textarea[name='requiredSkills'], " +
  492 |         "textarea[id='requiredSkills'], " +
  493 |         "textarea[placeholder*='skill' i]"
  494 |     )
  495 |     .first();
  496 | }
  497 | 
  498 | function experienceYearsField(page: Page) {
  499 |   return page
  500 |     .locator(
  501 |       "input[name='experienceYears'], " +
  502 |         "input[id='experienceYears'], " +
  503 |         "input[placeholder*='experience' i]"
  504 |     )
  505 |     .first();
  506 | }
  507 | 
  508 | function aiGenerateBtn(page: Page) {
  509 |   return page.getByRole("button", { name: /AI Generate/i }).first();
  510 | }
  511 | 
  512 | function publishJobBtn(page: Page) {
  513 |   return page.getByRole("button", { name: /Publish Job/i }).first();
  514 | }
  515 | 
  516 | // ---------------------------------------------------------------------------
  517 | // Suite configuration
  518 | // ---------------------------------------------------------------------------
  519 | 
  520 | test.use({ storageState: { cookies: [], origins: [] } });
  521 | 
  522 | // ===========================================================================
  523 | // POSITIVE SCENARIOS
  524 | // ===========================================================================
  525 | 
  526 | test.describe("JD Creation — Positive Scenarios", () => {
  527 |   // ── 1. JD creation wizard opens from jobs page ───────────────────────────
  528 | 
  529 |   test("1. JD creation wizard/form opens from the jobs page", async ({
  530 |     page,
  531 |   }) => {
  532 |     const jobsPage = await setupAuthenticatedJobsPage(page);
  533 | 
  534 |     await jobsPage.expectJobsPageLoaded();
  535 | 
  536 |     // Click "Post New Job" — the multi-step JD creation wizard should appear
  537 |     await jobsPage.openNewJobForm();
  538 |     await jobsPage.expectFormVisible();
  539 | 
  540 |     // All three primary step labels must be visible in the progress indicator
  541 |     await expect(page.getByText(/Basic Information/i).first()).toBeVisible({
  542 |       timeout: 10_000,
  543 |     });
  544 |     await expect(page.getByText(/Job Description/i).first()).toBeVisible({
  545 |       timeout: 10_000,
  546 |     });
  547 |     await expect(page.getByText(/Interview Questions/i).first()).toBeVisible({
  548 |       timeout: 10_000,
  549 |     });
  550 | 
  551 |     // Step 1 input fields should be immediately focusable
  552 |     const titleInput = page
  553 |       .locator(
  554 |         "input[name='jobTitle'], input[id='jobTitle'], input[placeholder*='Job Title' i]"
  555 |       )
  556 |       .first();
> 557 |     await expect(titleInput).toBeVisible({ timeout: 8_000 });
      |                              ^ Error: expect(locator).toBeVisible() failed
  558 | 
  559 |     // The "Post New Job" header button should still be in the DOM
  560 |     await expect(jobsPage.postNewJobButton).toBeVisible({ timeout: 5_000 });
  561 | 
  562 |     // Close the wizard
  563 |     await page.keyboard.press("Escape");
  564 |     await page.waitForTimeout(300);
  565 |   });
  566 | 
  567 |   // ── 2. AI-generated questions appear after submitting job requirements ────
  568 | 
  569 |   test("2. AI-generated interview questions appear after submitting job requirements", async ({
  570 |     page,
  571 |   }) => {
  572 |     await mockAllBackground(page);
  573 |     await mockGetJobs(page);
  574 |     await mockQuestionsGenerateSuccess(page);
  575 | 
  576 |     await page.goto("/");
  577 |     await injectAuthSession(page);
  578 |     const jobsPage = new JobsPage(page);
  579 |     await jobsPage.goto();
  580 | 
  581 |     // Open the wizard and navigate to Step 2
  582 |     await openWizardAtStep2(page, jobsPage, "Staff Frontend Engineer");
  583 | 
  584 |     // Step 2: fill JD content that will feed the AI question generator
  585 |     const descArea = jdTextarea(page);
  586 |     if (await descArea.isVisible().catch(() => false)) {
  587 |       await descArea.fill(
  588 |         "We are looking for a Staff Frontend Engineer with deep expertise in React, " +
  589 |           "TypeScript, and modern web performance patterns. You will lead architecture " +
  590 |           "decisions, mentor team members, and collaborate closely with product and design."
  591 |       );
  592 |     }
  593 | 
  594 |     const skillsArea = requiredSkillsField(page);
  595 |     if (await skillsArea.isVisible().catch(() => false)) {
  596 |       await skillsArea.fill("React\nTypeScript\nNext.js\nCSS");
  597 |     }
  598 | 
  599 |     const expInput = experienceYearsField(page);
  600 |     if (await expInput.isVisible().catch(() => false)) {
  601 |       await expInput.fill("5+ years");
  602 |     }
  603 | 
  604 |     // Navigate to Step 3 — Interview Questions
  605 |     await navigateToStep3(page);
  606 | 
  607 |     // Select at least one evaluation criterion before generating
  608 |     const technicalCriterion = page
  609 |       .getByText(/Technical Skills/i, { exact: false })
  610 |       .first();
  611 |     if (await technicalCriterion.isVisible().catch(() => false)) {
  612 |       await technicalCriterion.click();
  613 |       await page.waitForTimeout(200);
  614 |     }
  615 | 
  616 |     // Click "AI Generate" button
  617 |     const aiBtn = aiGenerateBtn(page);
  618 |     if (await aiBtn.isVisible().catch(() => false)) {
  619 |       await aiBtn.click();
  620 | 
  621 |       // Brief loading indicator should flash
  622 |       await expect(page.getByText(/Generating.../i).first())
  623 |         .toBeVisible({ timeout: 3_000 })
  624 |         .catch(() => {
  625 |           // Loading may be too fast to catch — not a failure
  626 |         });
  627 | 
  628 |       // After the mock resolves, questions from the fixture should appear
  629 |       await expect(
  630 |         page
  631 |           .getByText(/React hooks|TypeScript|performance|Next\.js|frontend/i, {
  632 |             exact: false,
  633 |           })
  634 |           .first()
  635 |       ).toBeVisible({ timeout: 15_000 });
  636 | 
  637 |       // Difficulty labels should be visible on rendered question cards
  638 |       const hasDifficultyLabel = await page
  639 |         .getByText(/High|Medium|Low/i, { exact: false })
  640 |         .first()
  641 |         .isVisible()
  642 |         .catch(() => false);
  643 |       expect(
  644 |         hasDifficultyLabel,
  645 |         "Difficulty label should appear on generated question card"
  646 |       ).toBe(true);
  647 |     } else {
  648 |       test.info().annotations.push({
  649 |         type: "note",
  650 |         description:
  651 |           "AI Generate button not visible — form step navigation may differ in current build",
  652 |       });
  653 |     }
  654 |   });
  655 | 
  656 |   // ── 3. Generated JD can be edited before saving ──────────────────────────
  657 | 
```