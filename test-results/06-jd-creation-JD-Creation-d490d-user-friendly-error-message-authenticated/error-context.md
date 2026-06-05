# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 06-jd-creation.spec.ts >> JD Creation — Negative Scenarios >> 2. AI API failure shows a user-friendly error message
- Location: tests\e2e\06-jd-creation.spec.ts:1092:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /Post New Job/i })
    - locator resolved to <button data-slot="button" class="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive cursor-pointer bg-primary text-primary-foregr…>…</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-2 pt-2 overflow-y-auto">…</div> intercepts pointer events
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-2 pt-2 overflow-y-auto">…</div> intercepts pointer events
    - retrying click action
      - waiting 100ms
    46 × waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <div class="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-2 pt-2 overflow-y-auto">…</div> intercepts pointer events
     - retrying click action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - complementary [ref=e3]:
      - generic [ref=e4]:
        - button "Expand Sidebar" [ref=e6] [cursor=pointer]:
          - img
        - generic "Jane Doe" [ref=e7]:
          - generic [ref=e8]: JD
      - navigation [ref=e9]:
        - generic [ref=e11]:
          - link [ref=e12] [cursor=pointer]:
            - /url: /dashboard
            - button "Dashboard" [ref=e13]:
              - img
          - link [ref=e14] [cursor=pointer]:
            - /url: /candidate
            - button "Applications" [ref=e15]:
              - img
          - link [ref=e16] [cursor=pointer]:
            - /url: /jobs
            - button "Job Postings" [ref=e17]:
              - img
          - link [ref=e18] [cursor=pointer]:
            - /url: /talent-pool
            - button "Talent Pool" [ref=e19]:
              - img
        - generic [ref=e21]:
          - link [ref=e22] [cursor=pointer]:
            - /url: /delegation
            - button "Delegation" [ref=e23]:
              - img
          - link [ref=e24] [cursor=pointer]:
            - /url: /support
            - button "Support" [ref=e25]:
              - img
          - link [ref=e26] [cursor=pointer]:
            - /url: /settings
            - button "Settings" [ref=e27]:
              - img
      - button "Logout" [ref=e29] [cursor=pointer]:
        - img
    - main [ref=e30]:
      - generic [ref=e32]:
        - generic [ref=e33]:
          - generic [ref=e34]:
            - heading "Job Openings" [level=1] [ref=e35]
            - paragraph [ref=e36]: Manage and track all your open positions
          - button "Post New Job" [ref=e37] [cursor=pointer]:
            - img
            - text: Post New Job
        - generic [ref=e39]:
          - generic [ref=e40]:
            - img [ref=e41]
            - textbox "Search jobs..." [ref=e44]
          - combobox [ref=e45] [cursor=pointer]:
            - generic: All Departments
            - img
          - combobox [ref=e46] [cursor=pointer]:
            - generic: All Locations
            - img
          - combobox [ref=e47] [cursor=pointer]:
            - generic: All Users
            - img
          - button "Clear" [ref=e48] [cursor=pointer]
        - generic [ref=e49]:
          - generic [ref=e51] [cursor=pointer]:
            - img [ref=e53]
            - generic [ref=e55]:
              - generic [ref=e56]: "1"
              - generic [ref=e57]: Open Jobs
          - generic [ref=e59] [cursor=pointer]:
            - img [ref=e61]
            - generic [ref=e63]:
              - generic [ref=e64]: "0"
              - generic [ref=e65]: Closed Jobs
          - generic [ref=e67] [cursor=pointer]:
            - img [ref=e69]
            - generic [ref=e71]:
              - generic [ref=e72]: "0"
              - generic [ref=e73]: On Hold
          - generic [ref=e75] [cursor=pointer]:
            - img [ref=e77]
            - generic [ref=e81]:
              - generic [ref=e82]: "0"
              - generic [ref=e83]: Cancelled
          - generic [ref=e85] [cursor=pointer]:
            - img [ref=e87]
            - generic [ref=e91]:
              - generic [ref=e92]: "0"
              - generic [ref=e93]: Draft Jobs
          - generic [ref=e95] [cursor=pointer]:
            - img [ref=e97]
            - generic [ref=e101]:
              - generic [ref=e102]: "1"
              - generic [ref=e103]: All Jobs
        - generic [ref=e106]:
          - generic [ref=e107]:
            - generic [ref=e108]:
              - generic [ref=e109]:
                - img [ref=e111]
                - generic [ref=e114]:
                  - generic [ref=e115]:
                    - heading "Senior Frontend Engineer" [level=3] [ref=e116]
                    - generic [ref=e117]: Open
                  - paragraph [ref=e118]: Engineering
                  - paragraph [ref=e119]: "Recruiter: Jane Recruiter"
              - generic [ref=e120]:
                - generic [ref=e121]:
                  - img [ref=e122]
                  - text: San Francisco, CA
                - generic [ref=e125]:
                  - img [ref=e126]
                  - text: $120,000 - $160,000
                - generic [ref=e128]:
                  - img [ref=e129]
                  - text: 1 week ago
              - generic [ref=e132]:
                - img [ref=e133]
                - generic [ref=e135] [cursor=pointer]: Auto Interview
                - switch "Auto Interview" [checked] [ref=e136] [cursor=pointer]
                - generic [ref=e137]: "ON"
            - generic [ref=e138]:
              - button "Share" [ref=e139] [cursor=pointer]:
                - img
                - text: Share
              - button "View" [ref=e140] [cursor=pointer]:
                - img
                - text: View
          - generic [ref=e141]:
            - heading "Application Pipeline" [level=4] [ref=e142]
            - generic [ref=e143]:
              - generic [ref=e144]:
                - generic [ref=e145]: "12"
                - generic [ref=e146]: Total
              - generic [ref=e147]:
                - generic [ref=e148]: "8"
                - generic [ref=e149]: CV Screened
              - generic [ref=e150]:
                - generic [ref=e151]: "4"
                - generic [ref=e152]: AI Interview
              - generic [ref=e153]:
                - generic [ref=e154]: "2"
                - generic [ref=e155]: Hiring Manager
              - generic [ref=e156]:
                - generic [ref=e157]: "1"
                - generic [ref=e158]: Offer Stage
              - generic [ref=e159]:
                - generic [ref=e160]: "0"
                - generic [ref=e161]: Hired
              - generic [ref=e162]:
                - generic [ref=e163]: "3"
                - generic [ref=e164]: Rejected
        - generic [ref=e166]:
          - generic [ref=e167]:
            - generic [ref=e168]:
              - heading "Post New Job" [level=3] [ref=e169]
              - paragraph [ref=e170]: Capture all details for accurate tracking and reporting
            - generic [ref=e171]:
              - generic [ref=e172]:
                - generic [ref=e173]: Job Status
                - combobox [ref=e174]:
                  - option "Open" [selected]
                  - option "Closed"
                  - option "On Hold"
                  - option "Cancelled"
              - button [ref=e175] [cursor=pointer]:
                - img
          - generic [ref=e177]:
            - generic [ref=e179] [cursor=pointer]:
              - generic [ref=e180]: "1"
              - generic [ref=e181]: Basic Information
            - generic [ref=e184] [cursor=pointer]:
              - generic [ref=e185]: "2"
              - generic [ref=e186]: Job Description
            - generic [ref=e189] [cursor=pointer]:
              - generic [ref=e190]: "3"
              - generic [ref=e191]: Interview Questions
            - generic [ref=e194] [cursor=pointer]:
              - generic [ref=e195]: "4"
              - generic [ref=e196]: Screening Questions
            - generic [ref=e199] [cursor=pointer]:
              - generic [ref=e200]: "5"
              - generic [ref=e201]: Team & Planning
          - group [ref=e203]:
            - generic [ref=e204]:
              - heading "Basic Information" [level=4] [ref=e205]
              - generic [ref=e206]:
                - generic [ref=e207]:
                  - generic [ref=e208]: Job Title *
                  - textbox "e.g. Senior Full Stack Developer" [ref=e209]: Backend Developer
                - generic [ref=e210]:
                  - generic [ref=e211]: Department *
                  - combobox [ref=e212]:
                    - option "Select Department" [selected]
                    - option "Engineering"
                    - option "Product"
                    - option "Design"
                    - option "Sales"
                    - option "Marketing"
                    - option "Operations"
                    - option "Human Resources"
                    - option "Finance"
                - generic [ref=e213]:
                  - generic [ref=e214]: Location *
                  - textbox "e.g. San Francisco, CA or Remote" [active] [ref=e215]: New York, NY
                - generic [ref=e216]:
                  - generic [ref=e217]: Job Type *
                  - combobox [ref=e218]:
                    - option "Full-time" [selected]
                    - option "Part-time"
                    - option "Contract"
                    - option "Temporary"
                - generic [ref=e219]:
                  - generic [ref=e220]: Work Mode *
                  - combobox [ref=e221]:
                    - option "Remote"
                    - option "Hybrid" [selected]
                    - option "On-site"
                - generic [ref=e222]:
                  - generic [ref=e223]: Currency
                  - combobox [ref=e224]:
                    - option "USD ($)" [selected]
                    - option "EUR (€)"
                    - option "GBP (£)"
                    - option "INR (₹)"
                - generic [ref=e225]:
                  - generic [ref=e226]: Salary Range - Min
                  - spinbutton [ref=e227]
                - generic [ref=e228]:
                  - generic [ref=e229]: Salary Range - Max
                  - spinbutton [ref=e230]
                - generic [ref=e231]:
                  - generic [ref=e232]: Application Deadline
                  - textbox [ref=e233]
                - generic [ref=e234]:
                  - generic [ref=e235]: Expected Start Date
                  - textbox [ref=e236]
          - generic [ref=e237]:
            - generic [ref=e238]: Step 1 of 5
            - generic [ref=e239]:
              - button "Save as Draft" [ref=e240] [cursor=pointer]:
                - img
                - text: Save as Draft
              - button "Next" [disabled]
  - region "Notifications (F8)":
    - list
  - button "Open Next.js Dev Tools" [ref=e246] [cursor=pointer]:
    - img [ref=e247]
  - alert [ref=e250]
```

# Test source

```ts
  294 |   async clickJob(title: string): Promise<void> {
  295 |     const card = this.jobRows.filter({ hasText: title }).first()
  296 |     const btn = card.getByRole('button', { name: /View|Edit/i }).first()
  297 |     await btn.click()
  298 |     await this.page.waitForTimeout(500)
  299 |   }
  300 | 
  301 |   /**
  302 |    * Click the View/Edit button on the nth job card (0-indexed).
  303 |    */
  304 |   async openJobByIndex(index: number): Promise<void> {
  305 |     const card = this.jobRows.nth(index)
  306 |     const btn = card.getByRole('button', { name: /View|Edit/i }).first()
  307 |     await btn.click()
  308 |     await this.page.waitForTimeout(500)
  309 |   }
  310 | 
  311 |   /**
  312 |    * deleteJob — there is no direct delete button in the listing UI.
  313 |    * Jobs can be cancelled via the job form (change status → Cancelled).
  314 |    * This method opens the form for the matching job and changes status.
  315 |    */
  316 |   async deleteJob(title: string): Promise<void> {
  317 |     await this.clickJob(title)
  318 |     // The job form must be open at this point; status change handled in form
  319 |     const statusSelect = this.page
  320 |       .getByRole('combobox')
  321 |       .filter({ hasText: /open|draft|closed|onhold|cancelled/i })
  322 |       .first()
  323 |     await statusSelect.click()
  324 |     await this.page.getByRole('option', { name: /Cancelled/i }).click()
  325 |     await this.saveAsDraftButton.or(this.publishJobButton).first().click()
  326 |     await this.page.waitForTimeout(500)
  327 |   }
  328 | 
  329 |   // ── Job form ──────────────────────────────────────────────────────────────
  330 | 
  331 |   async fillJobForm(data: JobFormData): Promise<void> {
  332 |     if (data.jobTitle) await this.jobTitleInput.fill(data.jobTitle)
  333 |     if (data.location) await this.locationInput.fill(data.location)
  334 |     if (data.experienceYears)
  335 |       await this.experienceYearsInput.fill(data.experienceYears)
  336 |     if (data.jobDescription)
  337 |       await this.jobDescriptionTextarea.fill(data.jobDescription)
  338 |     if (data.requiredSkills)
  339 |       await this.requiredSkillsTextarea.fill(data.requiredSkills)
  340 |   }
  341 | 
  342 |   async saveAsDraft(): Promise<void> {
  343 |     await this.saveAsDraftButton.click()
  344 |     await this.page.waitForTimeout(500)
  345 |   }
  346 | 
  347 |   async publishJob(): Promise<void> {
  348 |     await this.publishJobButton.click()
  349 |     await this.page.waitForTimeout(500)
  350 |   }
  351 | 
  352 |   async closeJobForm(): Promise<void> {
  353 |     await this.page.keyboard.press('Escape')
  354 |     await this.page.waitForTimeout(300)
  355 |   }
  356 | 
  357 |   // ── Assertions ────────────────────────────────────────────────────────────
  358 | 
  359 |   async expectJobVisible(title: string): Promise<void> {
  360 |     await expect(
  361 |       this.page.getByText(title, { exact: false }).first(),
  362 |     ).toBeVisible({ timeout: 10_000 })
  363 |   }
  364 | 
  365 |   async expectEmptyState(): Promise<void> {
  366 |     await expect(this.emptyState).toBeVisible({ timeout: 10_000 })
  367 |   }
  368 | 
  369 |   async expectFormVisible(): Promise<void> {
  370 |     await expect(this.jobTitleInput).toBeVisible({ timeout: 10_000 })
  371 |   }
  372 | 
  373 |   async expectTrialExpiredPopup(): Promise<void> {
  374 |     await expect(this.trialExpiredPopup).toBeVisible({ timeout: 8_000 })
  375 |   }
  376 | 
  377 |   // ── Aliases used by workflow-generated spec 05 ────────────────────────────
  378 | 
  379 |   get postNewJobButton() { return this.createJobButton }
  380 | 
  381 |   async expectJobsPageLoaded(): Promise<void> {
  382 |     await this.pageHeading.waitFor({ state: 'visible', timeout: 15_000 })
  383 |   }
  384 | 
  385 |   async expectJobCardVisible(title: string): Promise<void> {
  386 |     return this.expectJobVisible(title)
  387 |   }
  388 | 
  389 |   async getJobCardCount(): Promise<number> {
  390 |     return this.getJobCount()
  391 |   }
  392 | 
  393 |   async openNewJobForm(): Promise<void> {
> 394 |     await this.createJobButton.click()
      |                                ^ Error: locator.click: Test timeout of 30000ms exceeded.
  395 |     // Wait for the fixed overlay to appear (contains "Post New Job" heading)
  396 |     await this.page.getByText('Post New Job').first().waitFor({ state: 'visible', timeout: 10_000 })
  397 |     // Wait for the Step 1 job title input to be visible
  398 |     await this.jobTitleInput.waitFor({ state: 'visible', timeout: 10_000 })
  399 |   }
  400 | 
  401 |   /** Advance the multi-step form from Step 1 to Step 2 (Job Description). */
  402 |   async nextStep(): Promise<void> {
  403 |     await this.page.getByRole('button', { name: /^Next$/i }).click()
  404 |     await this.jobDescriptionTextarea.waitFor({ state: 'visible', timeout: 10_000 })
  405 |   }
  406 | 
  407 |   async fillJobTitle(title: string): Promise<void> {
  408 |     await this.jobTitleInput.fill(title)
  409 |   }
  410 | 
  411 |   async fillLocation(location: string): Promise<void> {
  412 |     await this.locationInput.fill(location)
  413 |   }
  414 | 
  415 |   async fillExperienceYears(years: string): Promise<void> {
  416 |     if (await this.experienceYearsInput.isVisible({ timeout: 2000 })) {
  417 |       await this.experienceYearsInput.fill(years)
  418 |     }
  419 |   }
  420 | 
  421 |   async fillJobDescription(desc: string): Promise<void> {
  422 |     await this.jobDescriptionTextarea.fill(desc)
  423 |   }
  424 | 
  425 |   async fillRequiredSkills(skills: string): Promise<void> {
  426 |     if (await this.requiredSkillsTextarea.isVisible({ timeout: 2000 })) {
  427 |       await this.requiredSkillsTextarea.fill(skills)
  428 |     }
  429 |   }
  430 | }
  431 | 
```