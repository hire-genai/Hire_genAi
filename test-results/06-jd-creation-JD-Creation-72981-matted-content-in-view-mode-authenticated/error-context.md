# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 06-jd-creation.spec.ts >> JD Creation — Positive Scenarios >> 5. JD preview shows formatted content in view mode
- Location: tests\e2e\06-jd-creation.spec.ts:848:7

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
  795 |     // Navigate through wizard Steps 1 and 2
  796 |     await openWizardAtStep2(page, jobsPage, newJobTitle);
  797 | 
  798 |     const descArea = jdTextarea(page);
  799 |     if (await descArea.isVisible().catch(() => false)) {
  800 |       await descArea.fill(
  801 |         "Conduct user research to inform product decisions. " +
  802 |           "Synthesize findings into actionable insights for the product team."
  803 |       );
  804 |     }
  805 | 
  806 |     const skillsArea = requiredSkillsField(page);
  807 |     if (await skillsArea.isVisible().catch(() => false)) {
  808 |       await skillsArea.fill("User Research\nUsability Testing\nFigma");
  809 |     }
  810 | 
  811 |     const expInput = experienceYearsField(page);
  812 |     if (await expInput.isVisible().catch(() => false)) {
  813 |       await expInput.fill("3+ years");
  814 |     }
  815 | 
  816 |     // Navigate back to Step 1 to confirm the title is still set
  817 |     await page
  818 |       .getByText(/Basic Information/i, { exact: false })
  819 |       .first()
  820 |       .click()
  821 |       .catch(() => {});
  822 |     await page.waitForTimeout(300);
  823 |     await jobsPage.fillJobTitle(newJobTitle);
  824 |     await jobsPage.fillLocation("Chicago, IL");
  825 | 
  826 |     // Publish (or save as draft if Publish button is not yet visible)
  827 |     const pubBtn = publishJobBtn(page);
  828 |     if (await pubBtn.isVisible().catch(() => false)) {
  829 |       await pubBtn.click();
  830 |     } else {
  831 |       await page
  832 |         .getByRole("button", { name: /Save as Draft/i })
  833 |         .first()
  834 |         .click()
  835 |         .catch(() => {});
  836 |     }
  837 | 
  838 |     await page.waitForTimeout(1_500);
  839 | 
  840 |     // The new job title must now appear somewhere in the listing
  841 |     await expect(
  842 |       page.getByText(newJobTitle, { exact: false }).first()
  843 |     ).toBeVisible({ timeout: 15_000 });
  844 |   });
  845 | 
  846 |   // ── 5. JD preview shows formatted content ────────────────────────────────
  847 | 
  848 |   test("5. JD preview shows formatted content in view mode", async ({
  849 |     page,
  850 |   }) => {
  851 |     await mockAllBackground(page);
  852 |     await mockGetJobs(page, [FIXTURE_JOB_OPEN]);
  853 | 
  854 |     // Mock single-job GET used when opening view mode
  855 |     await page.route(
  856 |       `**/api/jobs/**/${FIXTURE_JOB_OPEN.id}`,
  857 |       async (route: Route) => {
  858 |         if (route.request().method() === "GET") {
  859 |           await route.fulfill({
  860 |             status: 200,
  861 |             contentType: "application/json",
  862 |             body: JSON.stringify({ ok: true, data: FIXTURE_JOB_OPEN }),
  863 |           });
  864 |         } else {
  865 |           await route.continue();
  866 |         }
  867 |       }
  868 |     );
  869 | 
  870 |     await page.goto("/");
  871 |     await injectAuthSession(page);
  872 |     const jobsPage = new JobsPage(page);
  873 |     await jobsPage.goto();
  874 | 
  875 |     await jobsPage.expectJobCardVisible(FIXTURE_JOB_OPEN.title);
  876 | 
  877 |     // Locate the open job card and click its View button
  878 |     const openJobCard = page
  879 |       .locator("[data-slot='card']")
  880 |       .filter({ hasText: FIXTURE_JOB_OPEN.title })
  881 |       .first();
  882 | 
  883 |     const viewButton = openJobCard
  884 |       .getByRole("button", { name: /View/i })
  885 |       .first();
  886 |     const viewVisible = await viewButton.isVisible().catch(() => false);
  887 | 
  888 |     if (viewVisible) {
  889 |       await viewButton.click();
  890 |       await page.waitForTimeout(700);
  891 | 
  892 |       // The job description text should render in view mode
  893 |       await expect(
  894 |         page.getByText(/React and TypeScript/i, { exact: false }).first()
> 895 |       ).toBeVisible({ timeout: 10_000 });
      |         ^ Error: expect(locator).toBeVisible() failed
  896 | 
  897 |       // Job title must appear in the modal header
  898 |       await expect(
  899 |         page.getByText(FIXTURE_JOB_OPEN.title, { exact: false }).first()
  900 |       ).toBeVisible({ timeout: 5_000 });
  901 | 
  902 |       // Navigate to the Job Description step to verify the JD textarea content
  903 |       await page
  904 |         .getByText(/Job Description/i, { exact: false })
  905 |         .first()
  906 |         .click()
  907 |         .catch(() => {});
  908 |       await page.waitForTimeout(400);
  909 | 
  910 |       const descArea = jdTextarea(page);
  911 |       if (await descArea.isVisible().catch(() => false)) {
  912 |         const content = await descArea.inputValue();
  913 |         expect(
  914 |           content.length,
  915 |           "Job description textarea must contain formatted content in view mode"
  916 |         ).toBeGreaterThan(20);
  917 |         // Description should reference React/TypeScript from the fixture
  918 |         expect(content).toMatch(/React|TypeScript|frontend|web application/i);
  919 |       }
  920 | 
  921 |       // Close the modal
  922 |       await page.keyboard.press("Escape");
  923 |     } else {
  924 |       // Fallback: description may be rendered inline on the card
  925 |       const inlineDescVisible = await openJobCard
  926 |         .getByText(/React and TypeScript/i, { exact: false })
  927 |         .first()
  928 |         .isVisible()
  929 |         .catch(() => false);
  930 | 
  931 |       test.info().annotations.push({
  932 |         type: "note",
  933 |         description: inlineDescVisible
  934 |           ? "Description rendered inline on card — view modal not triggered via button"
  935 |           : "View button not found; description not visible inline either",
  936 |       });
  937 |     }
  938 |   });
  939 | 
  940 |   // ── 6. Copy JD to clipboard via Share button ─────────────────────────────
  941 | 
  942 |   test("6. Copy JD to clipboard works via Share button", async ({ page }) => {
  943 |     await mockAllBackground(page);
  944 |     await mockGetJobs(page, [FIXTURE_JOB_OPEN]);
  945 | 
  946 |     await page.goto("/");
  947 |     await injectAuthSession(page);
  948 |     const jobsPage = new JobsPage(page);
  949 |     await jobsPage.goto();
  950 | 
  951 |     await jobsPage.expectJobCardVisible(FIXTURE_JOB_OPEN.title);
  952 | 
  953 |     // Grant clipboard permissions
  954 |     await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  955 | 
  956 |     const openJobCard = page
  957 |       .locator("[data-slot='card']")
  958 |       .filter({ hasText: FIXTURE_JOB_OPEN.title })
  959 |       .first();
  960 | 
  961 |     const shareButton = openJobCard
  962 |       .getByRole("button", { name: /Share/i })
  963 |       .first();
  964 |     const shareVisible = await shareButton.isVisible().catch(() => false);
  965 | 
  966 |     if (shareVisible) {
  967 |       await shareButton.click();
  968 | 
  969 |       // A brief "Copied!" feedback label should appear
  970 |       await expect(page.getByText(/Copied!/i).first()).toBeVisible({
  971 |         timeout: 5_000,
  972 |       });
  973 | 
  974 |       // Clipboard should contain a non-empty value (the job public link)
  975 |       const clipboardText = await page
  976 |         .evaluate(() => navigator.clipboard.readText())
  977 |         .catch(() => "");
  978 |       expect(
  979 |         clipboardText.length,
  980 |         "Clipboard must contain a non-empty string after Share click"
  981 |       ).toBeGreaterThan(0);
  982 |     } else {
  983 |       // Share may live inside a dropdown menu
  984 |       const dropdownTrigger = openJobCard
  985 |         .locator("[aria-haspopup='menu'], [aria-haspopup='listbox']")
  986 |         .first();
  987 |       if (await dropdownTrigger.isVisible().catch(() => false)) {
  988 |         await dropdownTrigger.click();
  989 |         await page.waitForTimeout(300);
  990 |         const menuShareItem = page
  991 |           .getByRole("menuitem", { name: /Share/i })
  992 |           .first();
  993 |         await menuShareItem.click().catch(() => {});
  994 |         await expect(page.getByText(/Copied!/i).first()).toBeVisible({
  995 |           timeout: 5_000,
```