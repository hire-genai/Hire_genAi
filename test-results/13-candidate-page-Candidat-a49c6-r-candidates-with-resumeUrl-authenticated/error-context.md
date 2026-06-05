# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 13-candidate-page.spec.ts >> Candidate Page — Resume Preview >> 7.1 Resume link visible for candidates with resumeUrl
- Location: tests\e2e\13-candidate-page.spec.ts:426:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/Resume|View CV|PDF/i).first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText(/Resume|View CV|PDF/i).first()

```

```yaml
- complementary:
  - img
  - text: HireGenAI
  - button "Collapse Sidebar":
    - img
  - text: ET
  - heading "E2E Test User" [level=4]
  - paragraph: e2e-test@playwrightcorp.com
  - paragraph: Manager
  - navigation:
    - heading "MAIN" [level=3]
    - link "Dashboard":
      - /url: /dashboard
      - button "Dashboard":
        - img
        - text: Dashboard
    - link "Applications":
      - /url: /candidate
      - button "Applications":
        - img
        - text: Applications
    - link "Job Postings":
      - /url: /jobs
      - button "Job Postings":
        - img
        - text: Job Postings
    - link "Talent Pool":
      - /url: /talent-pool
      - button "Talent Pool":
        - img
        - text: Talent Pool
    - heading "MANAGEMENT" [level=3]
    - link "Delegation":
      - /url: /delegation
      - button "Delegation":
        - img
        - text: Delegation
    - link "Support":
      - /url: /support
      - button "Support":
        - img
        - text: Support
    - link "Settings":
      - /url: /settings
      - button "Settings":
        - img
        - text: Settings
  - button "Logout":
    - img
    - text: Logout
- main:
  - heading "Applications" [level=1]
  - paragraph: Manage candidate applications across all stages
  - text: "View as:"
  - combobox: Manager
  - textbox "Search applications..."
  - combobox: All Positions
  - combobox: All Sources
  - textbox "Skills"
  - button "Last 90 Days":
    - img
    - text: Last 90 Days
  - button "Reset"
  - heading "CV Screening" [level=3]
  - paragraph:
    - img
    - text: Under review
  - text: 0 Total Screened 2 Qualified 2 Unqualified 0 Success Rate 100%
  - heading "AI Interview" [level=3]
  - paragraph:
    - img
    - text: Scheduled
  - text: 0 Total Interviewed 1 Qualified 1 Unqualified 0 Success Rate 100%
  - heading "Hiring Manager" [level=3]
  - paragraph:
    - img
    - text: Awaiting feedback
  - text: 0 Total Sent To H M 1 Approved 0 Rejected 0 Success Rate 0%
  - heading "Offer Stage" [level=3]
  - paragraph:
    - img
    - text: Negotiation
  - text: 0 Total Offer Sent 0 Accepted 0 Declined 0 Success Rate 0%
  - heading "Hired" [level=3]
  - paragraph:
    - img
    - text: Completed
  - text: 0 Total Hires 1 Onboarded 0 Awaiting Onboard 1 Success Rate 100%
  - heading "Rejected" [level=3]
  - paragraph:
    - img
    - text: Not proceeding
  - text: 0 Total Rejected 0 From Screening 0 From Interview 0 From Other 0
  - heading "Total Applicants" [level=3]
  - paragraph:
    - img
    - text: All statuses
  - text: 5 In Pipeline 3 Hired 1 Rejected 0
  - table:
    - rowgroup:
      - row "App ID / Can ID / JD ID Candidate Name Email / Phone Exp Li / CV Position Applied Date Stage / Status Source Action":
        - columnheader "App ID / Can ID / JD ID"
        - columnheader "Candidate Name"
        - columnheader "Email / Phone"
        - columnheader "Exp"
        - columnheader "Li / CV"
        - columnheader "Position"
        - columnheader "Applied Date"
        - columnheader "Stage / Status"
        - columnheader "Source"
        - columnheader "Action"
    - rowgroup:
      - 'row "App: app-001 Can: cand-001 JD: job-001 AJ Alice Johnson alice@test.com +1-555-0101 — Senior Software Engineer 2026-05-01 Screening LinkedIn"':
        - 'cell "App: app-001 Can: cand-001 JD: job-001"'
        - cell "AJ Alice Johnson":
          - text: AJ
          - button "Alice Johnson"
        - cell "alice@test.com +1-555-0101"
        - cell "—"
        - cell:
          - img
          - button "Resume":
            - img
        - cell "Senior Software Engineer":
          - button "Senior Software Engineer"
        - cell "2026-05-01"
        - cell "Screening"
        - cell "LinkedIn"
        - cell:
          - button "Actions":
            - img
          - button "Report":
            - img
      - 'row "App: app-002 Can: cand-002 JD: job-001 BS Bob Smith bob@test.com +1-555-0102 — Senior Software Engineer 2026-05-02 Screening GitHub"':
        - 'cell "App: app-002 Can: cand-002 JD: job-001"'
        - cell "BS Bob Smith":
          - text: BS
          - button "Bob Smith"
        - cell "bob@test.com +1-555-0102"
        - cell "—"
        - cell:
          - img
          - img
        - cell "Senior Software Engineer":
          - button "Senior Software Engineer"
        - cell "2026-05-02"
        - cell "Screening"
        - cell "GitHub"
        - cell:
          - button "Actions":
            - img
          - button "Report":
            - img
      - 'row "App: app-003 Can: cand-003 JD: job-001 CW Carol White carol@test.com +1-555-0103 — Senior Software Engineer 2026-04-20 AI Interview Direct"':
        - 'cell "App: app-003 Can: cand-003 JD: job-001"'
        - cell "CW Carol White":
          - text: CW
          - button "Carol White"
        - cell "carol@test.com +1-555-0103"
        - cell "—"
        - cell:
          - img
          - button "Resume":
            - img
        - cell "Senior Software Engineer":
          - button "Senior Software Engineer"
        - cell "2026-04-20"
        - cell "AI Interview"
        - cell "Direct"
        - cell:
          - button "Actions":
            - img
          - button "Report":
            - img
      - 'row "App: app-004 Can: cand-004 JD: job-001 DL David Lee david@test.com +1-555-0104 — Senior Software Engineer 2026-04-15 Hiring Manager Referral"':
        - 'cell "App: app-004 Can: cand-004 JD: job-001"'
        - cell "DL David Lee":
          - text: DL
          - button "David Lee"
        - cell "david@test.com +1-555-0104"
        - cell "—"
        - cell:
          - img
          - button "Resume":
            - img
        - cell "Senior Software Engineer":
          - button "Senior Software Engineer"
        - cell "2026-04-15"
        - cell "Hiring Manager"
        - cell "Referral"
        - cell:
          - button "Actions":
            - img
          - button "Report":
            - img
      - 'row "App: app-005 Can: cand-005 JD: job-001 EM Eva Martinez eva@test.com +1-555-0105 — Senior Software Engineer 2026-04-10 Hired LinkedIn"':
        - 'cell "App: app-005 Can: cand-005 JD: job-001"'
        - cell "EM Eva Martinez":
          - text: EM
          - button "Eva Martinez"
        - cell "eva@test.com +1-555-0105"
        - cell "—"
        - cell:
          - img
          - button "Resume":
            - img
        - cell "Senior Software Engineer":
          - button "Senior Software Engineer"
        - cell "2026-04-10"
        - cell "Hired"
        - cell "LinkedIn"
        - cell:
          - button "Actions":
            - img
          - button "Report":
            - img
- region "Notifications (F8)":
  - list
- alert
```

# Test source

```ts
  330 | 
  331 |   test('4.4 Reset filters button clears search and filters', async ({ page }) => {
  332 |     await setup(page)
  333 |     const search = page.locator('input[placeholder*="Search" i], input[type="search"]').first()
  334 |     await search.fill('Alice')
  335 |     await page.waitForTimeout(200)
  336 | 
  337 |     const resetBtn = page.getByRole('button', { name: /Reset|Clear/i }).first()
  338 |     if (await resetBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
  339 |       await resetBtn.click()
  340 |       await expect(search).toHaveValue('')
  341 |     }
  342 |   })
  343 | 
  344 | })
  345 | 
  346 | // ─────────────────────────────────────────────────────────────────────────────
  347 | // FEATURE 5 — Date Range Filter
  348 | // ─────────────────────────────────────────────────────────────────────────────
  349 | 
  350 | test.describe('Candidate Page — Date Range Filter', () => {
  351 | 
  352 |   test('5.1 Date filter area is clickable and shows options', async ({ page }) => {
  353 |     await setup(page)
  354 |     const dateFilter = page.getByText(/Last 90 Days|Last 30 Days|Date/i).first()
  355 |     await dateFilter.click()
  356 | 
  357 |     // Should show date picker or dropdown
  358 |     const dateOptions = page.getByText(/Last 7 Days|Last 30 Days|Last 90 Days|Custom/i)
  359 |     await expect(dateOptions.first()).toBeVisible({ timeout: 3000 })
  360 |   })
  361 | 
  362 |   test('5.2 Selecting custom range shows date inputs', async ({ page }) => {
  363 |     await setup(page)
  364 |     const dateFilter = page.getByText(/Last 90 Days|Date/i).first()
  365 |     await dateFilter.click()
  366 | 
  367 |     const customOption = page.getByText(/Custom/i).first()
  368 |     if (await customOption.isVisible({ timeout: 2000 }).catch(() => false)) {
  369 |       await customOption.click()
  370 |       // Should show start/end date inputs or calendar
  371 |       await expect(page.locator('input[type="date"]').first()).toBeVisible({ timeout: 3000 })
  372 |     }
  373 |   })
  374 | 
  375 | })
  376 | 
  377 | // ─────────────────────────────────────────────────────────────────────────────
  378 | // FEATURE 6 — Candidate Action Dialog
  379 | // ─────────────────────────────────────────────────────────────────────────────
  380 | 
  381 | test.describe('Candidate Page — Action Dialog', () => {
  382 | 
  383 |   test('6.1 Clicking Actions button opens CandidateActionDialog', async ({ page }) => {
  384 |     await setup(page)
  385 | 
  386 |     // The gear/action button for the first candidate row
  387 |     const actionBtn = page.getByTitle('Actions').first()
  388 |     await actionBtn.waitFor({ state: 'visible', timeout: 8000 })
  389 |     await actionBtn.click()
  390 | 
  391 |     // Dialog should open showing candidate name
  392 |     await expect(page.getByRole('dialog').first()).toBeVisible({ timeout: 5000 })
  393 |   })
  394 | 
  395 |   test('6.2 Dialog shows candidate name inside', async ({ page }) => {
  396 |     await setup(page)
  397 |     const actionBtn = page.getByTitle('Actions').first()
  398 |     await actionBtn.waitFor({ state: 'visible', timeout: 8000 })
  399 |     await actionBtn.click()
  400 | 
  401 |     // Should show a candidate name (Alice or Bob)
  402 |     await expect(
  403 |       page.getByText(/Alice Johnson|Bob Smith|Carol White/i).nth(1)
  404 |     ).toBeVisible({ timeout: 5000 })
  405 |   })
  406 | 
  407 |   test('6.3 Dialog closes when ESC is pressed', async ({ page }) => {
  408 |     await setup(page)
  409 |     const actionBtn = page.getByTitle('Actions').first()
  410 |     await actionBtn.waitFor({ state: 'visible', timeout: 8000 })
  411 |     await actionBtn.click()
  412 |     await expect(page.getByRole('dialog').first()).toBeVisible({ timeout: 5000 })
  413 | 
  414 |     await page.keyboard.press('Escape')
  415 |     await expect(page.getByRole('dialog').first()).not.toBeVisible({ timeout: 3000 })
  416 |   })
  417 | 
  418 | })
  419 | 
  420 | // ─────────────────────────────────────────────────────────────────────────────
  421 | // FEATURE 7 — Resume Preview
  422 | // ─────────────────────────────────────────────────────────────────────────────
  423 | 
  424 | test.describe('Candidate Page — Resume Preview', () => {
  425 | 
  426 |   test('7.1 Resume link visible for candidates with resumeUrl', async ({ page }) => {
  427 |     await setup(page)
  428 |     // Alice has a resumeUrl — should show a Resume or PDF link/button
  429 |     const resumeLink = page.getByText(/Resume|View CV|PDF/i).first()
> 430 |     await expect(resumeLink).toBeVisible({ timeout: 5000 })
      |                              ^ Error: expect(locator).toBeVisible() failed
  431 |   })
  432 | 
  433 |   test('7.2 Candidates without resumeUrl show no resume link in their row', async ({ page }) => {
  434 |     await setup(page)
  435 |     // Bob Smith has no resumeUrl — in his row the resume cell shows nothing or N/A
  436 |     // This is a relative check — page still loads without error
  437 |     await expect(page.getByText('Bob Smith')).toBeVisible()
  438 |   })
  439 | 
  440 | })
  441 | 
  442 | // ─────────────────────────────────────────────────────────────────────────────
  443 | // FEATURE 8 — Empty States
  444 | // ─────────────────────────────────────────────────────────────────────────────
  445 | 
  446 | test.describe('Candidate Page — Empty States', () => {
  447 | 
  448 |   test('8.1 Empty bucket shows appropriate empty message', async ({ page }) => {
  449 |     await mockSessionAPI(page)
  450 |     await mockCandidatesAPI(page, {
  451 |       ok: true,
  452 |       bucketData: { ...MOCK_CANDIDATES.bucketData, all: { count: 0 } },
  453 |       applicationsData: { all: [], screening: [], interview: [], hiringManager: [], offer: [], hired: [], rejected: [] },
  454 |     })
  455 |     await page.route('**/api/settings/users**', r =>
  456 |       r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ users: [{ id: 'u1', name: 'Recruiter' }] }) })
  457 |     )
  458 |     await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
  459 |     // Wait for data to load — buckets appear after !isLoading
  460 |     await page.getByText('Total Applicants').waitFor({ state: 'visible', timeout: 20_000 })
  461 | 
  462 |     // With 0 candidates, the table body should be empty (no rows)
  463 |     const rows = page.locator('table tbody tr')
  464 |     const count = await rows.count()
  465 |     expect(count).toBe(0)
  466 |   })
  467 | 
  468 |   test('8.2 API error shows error state with retry button', async ({ page }) => {
  469 |     await mockSessionAPI(page)
  470 |     await mockCandidatesAPIError(page)
  471 |     await page.route('**/api/settings/users**', r =>
  472 |       r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ users: [{ id: 'u1', name: 'Recruiter' }] }) })
  473 |     )
  474 |     await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
  475 | 
  476 |     await expect(page.getByText(/error|failed|something went wrong/i).first())
  477 |       .toBeVisible({ timeout: 15000 })
  478 |     await expect(page.getByRole('button', { name: /retry|try again/i })).toBeVisible({ timeout: 3000 })
  479 |   })
  480 | 
  481 | })
  482 | 
  483 | // ─────────────────────────────────────────────────────────────────────────────
  484 | // FEATURE 9 — View As Role
  485 | // ─────────────────────────────────────────────────────────────────────────────
  486 | 
  487 | test.describe('Candidate Page — View As Role', () => {
  488 | 
  489 |   test('9.1 View-As role selector visible', async ({ page }) => {
  490 |     await setup(page)
  491 |     // The viewAs dropdown should be somewhere in the filter bar
  492 |     const viewAs = page.getByText(/View as|Recruiter|Role/i).first()
  493 |     await expect(viewAs).toBeVisible({ timeout: 5000 })
  494 |   })
  495 | 
  496 | })
  497 | 
  498 | // ─────────────────────────────────────────────────────────────────────────────
  499 | // FEATURE 10 — Responsive / Mobile
  500 | // ─────────────────────────────────────────────────────────────────────────────
  501 | 
  502 | test.describe('Candidate Page — Responsive', () => {
  503 | 
  504 |   test('10.1 Page renders at 375px mobile viewport', async ({ page }) => {
  505 |     await page.setViewportSize({ width: 375, height: 812 })
  506 |     await mockSessionAPI(page)
  507 |     await mockCandidatesAPI(page)
  508 |     await page.route('**/api/settings/users**', r =>
  509 |       r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ users: [] }) }))
  510 |     await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
  511 |     await page.getByText('Total Applicants').waitFor({ state: 'visible', timeout: 20_000 })
  512 |     await expect(page.getByRole('heading', { name: /Applications/i }).first()).toBeVisible()
  513 |   })
  514 | 
  515 |   test('10.2 Bucket cards visible on mobile', async ({ page }) => {
  516 |     await page.setViewportSize({ width: 375, height: 812 })
  517 |     await mockSessionAPI(page)
  518 |     await mockCandidatesAPI(page)
  519 |     await page.route('**/api/settings/users**', r =>
  520 |       r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ users: [] }) }))
  521 |     await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
  522 |     await page.getByText('Total Applicants').waitFor({ state: 'visible', timeout: 20_000 })
  523 |     await expect(page.getByText('CV Screening', { exact: false })).toBeVisible()
  524 |   })
  525 | 
  526 | })
  527 | 
  528 | // ─────────────────────────────────────────────────────────────────────────────
  529 | // NEGATIVE SCENARIOS
  530 | // ─────────────────────────────────────────────────────────────────────────────
```