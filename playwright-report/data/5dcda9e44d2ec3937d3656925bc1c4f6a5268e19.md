# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 06-jd-creation.spec.ts >> JD Creation — Positive Scenarios >> 5. JD preview shows formatted content in view mode
- Location: tests\e2e\06-jd-creation.spec.ts:857:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/React and TypeScript/i).first()
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByText(/React and TypeScript/i).first()

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
  - heading "View Job" [level=3]
  - paragraph: Only status can be changed in this mode
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
    - textbox "e.g. Senior Full Stack Developer" [disabled]: Senior Frontend Engineer
    - text: Department *
    - combobox [disabled]:
      - option "Select Department" [disabled]
      - option "Engineering" [disabled] [selected]
      - option "Product" [disabled]
      - option "Design" [disabled]
      - option "Sales" [disabled]
      - option "Marketing" [disabled]
      - option "Operations" [disabled]
      - option "Human Resources" [disabled]
      - option "Finance" [disabled]
    - text: Location *
    - textbox "e.g. San Francisco, CA or Remote" [disabled]: San Francisco, CA
    - text: Job Type *
    - combobox [disabled]:
      - option "Full-time" [disabled] [selected]
      - option "Part-time" [disabled]
      - option "Contract" [disabled]
      - option "Temporary" [disabled]
    - text: Work Mode *
    - combobox [disabled]:
      - option "Remote" [disabled]
      - option "Hybrid" [disabled] [selected]
      - option "On-site" [disabled]
    - text: Currency
    - combobox [disabled]:
      - option "USD ($)" [disabled] [selected]
      - option "EUR (€)" [disabled]
      - option "GBP (£)" [disabled]
      - option "INR (₹)" [disabled]
    - text: Salary Range - Min
    - spinbutton [disabled]: "120000"
    - text: Salary Range - Max
    - spinbutton [disabled]: "160000"
    - text: Application Deadline
    - textbox [disabled]
    - text: Expected Start Date
    - textbox [disabled]
  - text: Step 1 of 5
  - button "Next"
  - button "Save Status":
    - img
    - text: Save Status
- region "Notifications (F8)":
  - list
- alert
```

# Test source

```ts
  804  |     // Navigate through wizard Steps 1 and 2
  805  |     await openWizardAtStep2(page, jobsPage, newJobTitle);
  806  | 
  807  |     const descArea = jdTextarea(page);
  808  |     if (await descArea.isVisible().catch(() => false)) {
  809  |       await descArea.fill(
  810  |         "Conduct user research to inform product decisions. " +
  811  |           "Synthesize findings into actionable insights for the product team."
  812  |       );
  813  |     }
  814  | 
  815  |     const skillsArea = requiredSkillsField(page);
  816  |     if (await skillsArea.isVisible().catch(() => false)) {
  817  |       await skillsArea.fill("User Research\nUsability Testing\nFigma");
  818  |     }
  819  | 
  820  |     const expInput = experienceYearsField(page);
  821  |     if (await expInput.isVisible().catch(() => false)) {
  822  |       await expInput.fill("3+ years");
  823  |     }
  824  | 
  825  |     // Navigate back to Step 1 to confirm the title is still set
  826  |     await page
  827  |       .getByText(/Basic Information/i, { exact: false })
  828  |       .first()
  829  |       .click()
  830  |       .catch(() => {});
  831  |     await page.waitForTimeout(300);
  832  |     await jobsPage.fillJobTitle(newJobTitle);
  833  |     await jobsPage.fillLocation("Chicago, IL");
  834  | 
  835  |     // Publish (or save as draft if Publish button is not yet visible)
  836  |     const pubBtn = publishJobBtn(page);
  837  |     if (await pubBtn.isVisible().catch(() => false)) {
  838  |       await pubBtn.click();
  839  |     } else {
  840  |       await page
  841  |         .getByRole("button", { name: /Save as Draft/i })
  842  |         .first()
  843  |         .click()
  844  |         .catch(() => {});
  845  |     }
  846  | 
  847  |     await page.waitForTimeout(1_500);
  848  | 
  849  |     // The new job title must now appear somewhere in the listing
  850  |     await expect(
  851  |       page.getByText(newJobTitle, { exact: false }).first()
  852  |     ).toBeVisible({ timeout: 15_000 });
  853  |   });
  854  | 
  855  |   // ── 5. JD preview shows formatted content ────────────────────────────────
  856  | 
  857  |   test("5. JD preview shows formatted content in view mode", async ({
  858  |     page,
  859  |   }) => {
  860  |     await mockAllBackground(page);
  861  |     await mockGetJobs(page, [FIXTURE_JOB_OPEN]);
  862  | 
  863  |     // Mock single-job GET used when opening view mode
  864  |     await page.route(
  865  |       `**/api/jobs/**/${FIXTURE_JOB_OPEN.id}`,
  866  |       async (route: Route) => {
  867  |         if (route.request().method() === "GET") {
  868  |           await route.fulfill({
  869  |             status: 200,
  870  |             contentType: "application/json",
  871  |             body: JSON.stringify({ ok: true, data: FIXTURE_JOB_OPEN }),
  872  |           });
  873  |         } else {
  874  |           await route.continue();
  875  |         }
  876  |       }
  877  |     );
  878  | 
  879  |     await page.goto("/");
  880  |     await injectAuthSession(page);
  881  |     const jobsPage = new JobsPage(page);
  882  |     await jobsPage.goto();
  883  | 
  884  |     await jobsPage.expectJobCardVisible(FIXTURE_JOB_OPEN.title);
  885  | 
  886  |     // Locate the open job card and click its View button
  887  |     const openJobCard = page
  888  |       .locator("[data-slot='card']")
  889  |       .filter({ hasText: FIXTURE_JOB_OPEN.title })
  890  |       .first();
  891  | 
  892  |     const viewButton = openJobCard
  893  |       .getByRole("button", { name: /View/i })
  894  |       .first();
  895  |     const viewVisible = await viewButton.isVisible().catch(() => false);
  896  | 
  897  |     if (viewVisible) {
  898  |       await viewButton.click();
  899  |       await page.waitForTimeout(700);
  900  | 
  901  |       // The job description text should render in view mode
  902  |       await expect(
  903  |         page.getByText(/React and TypeScript/i, { exact: false }).first()
> 904  |       ).toBeVisible({ timeout: 10_000 });
       |         ^ Error: expect(locator).toBeVisible() failed
  905  | 
  906  |       // Job title must appear in the modal header
  907  |       await expect(
  908  |         page.getByText(FIXTURE_JOB_OPEN.title, { exact: false }).first()
  909  |       ).toBeVisible({ timeout: 5_000 });
  910  | 
  911  |       // Navigate to the Job Description step to verify the JD textarea content
  912  |       await page
  913  |         .getByText(/Job Description/i, { exact: false })
  914  |         .first()
  915  |         .click()
  916  |         .catch(() => {});
  917  |       await page.waitForTimeout(400);
  918  | 
  919  |       const descArea = jdTextarea(page);
  920  |       if (await descArea.isVisible().catch(() => false)) {
  921  |         const content = await descArea.inputValue();
  922  |         expect(
  923  |           content.length,
  924  |           "Job description textarea must contain formatted content in view mode"
  925  |         ).toBeGreaterThan(20);
  926  |         // Description should reference React/TypeScript from the fixture
  927  |         expect(content).toMatch(/React|TypeScript|frontend|web application/i);
  928  |       }
  929  | 
  930  |       // Close the modal
  931  |       await page.keyboard.press("Escape");
  932  |     } else {
  933  |       // Fallback: description may be rendered inline on the card
  934  |       const inlineDescVisible = await openJobCard
  935  |         .getByText(/React and TypeScript/i, { exact: false })
  936  |         .first()
  937  |         .isVisible()
  938  |         .catch(() => false);
  939  | 
  940  |       test.info().annotations.push({
  941  |         type: "note",
  942  |         description: inlineDescVisible
  943  |           ? "Description rendered inline on card — view modal not triggered via button"
  944  |           : "View button not found; description not visible inline either",
  945  |       });
  946  |     }
  947  |   });
  948  | 
  949  |   // ── 6. Copy JD to clipboard via Share button ─────────────────────────────
  950  | 
  951  |   test("6. Copy JD to clipboard works via Share button", async ({ page }) => {
  952  |     await mockAllBackground(page);
  953  |     await mockGetJobs(page, [FIXTURE_JOB_OPEN]);
  954  | 
  955  |     await page.goto("/");
  956  |     await injectAuthSession(page);
  957  |     const jobsPage = new JobsPage(page);
  958  |     await jobsPage.goto();
  959  | 
  960  |     await jobsPage.expectJobCardVisible(FIXTURE_JOB_OPEN.title);
  961  | 
  962  |     // Grant clipboard permissions
  963  |     await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  964  | 
  965  |     const openJobCard = page
  966  |       .locator("[data-slot='card']")
  967  |       .filter({ hasText: FIXTURE_JOB_OPEN.title })
  968  |       .first();
  969  | 
  970  |     const shareButton = openJobCard
  971  |       .getByRole("button", { name: /Share/i })
  972  |       .first();
  973  |     const shareVisible = await shareButton.isVisible().catch(() => false);
  974  | 
  975  |     if (shareVisible) {
  976  |       await shareButton.click();
  977  | 
  978  |       // A brief "Copied!" feedback label should appear
  979  |       await expect(page.getByText(/Copied!/i).first()).toBeVisible({
  980  |         timeout: 5_000,
  981  |       });
  982  | 
  983  |       // Clipboard should contain a non-empty value (the job public link)
  984  |       const clipboardText = await page
  985  |         .evaluate(() => navigator.clipboard.readText())
  986  |         .catch(() => "");
  987  |       expect(
  988  |         clipboardText.length,
  989  |         "Clipboard must contain a non-empty string after Share click"
  990  |       ).toBeGreaterThan(0);
  991  |     } else {
  992  |       // Share may live inside a dropdown menu
  993  |       const dropdownTrigger = openJobCard
  994  |         .locator("[aria-haspopup='menu'], [aria-haspopup='listbox']")
  995  |         .first();
  996  |       if (await dropdownTrigger.isVisible().catch(() => false)) {
  997  |         await dropdownTrigger.click();
  998  |         await page.waitForTimeout(300);
  999  |         const menuShareItem = page
  1000 |           .getByRole("menuitem", { name: /Share/i })
  1001 |           .first();
  1002 |         await menuShareItem.click().catch(() => {});
  1003 |         await expect(page.getByText(/Copied!/i).first()).toBeVisible({
  1004 |           timeout: 5_000,
```