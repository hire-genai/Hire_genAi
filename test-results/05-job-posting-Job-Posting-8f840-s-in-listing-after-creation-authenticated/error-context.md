# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 05-job-posting.spec.ts >> Job Posting — Positive Scenarios >> 4. Job appears in listing after creation
- Location: tests\e2e\05-job-posting.spec.ts:523:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('textarea[placeholder*=\'Provide a detailed description\']').first()

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
              - generic [ref=e56]: "2"
              - generic [ref=e57]: Open Jobs
          - generic [ref=e59] [cursor=pointer]:
            - img [ref=e61]
            - generic [ref=e63]:
              - generic [ref=e64]: "1"
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
              - generic [ref=e92]: "1"
              - generic [ref=e93]: Draft Jobs
          - generic [ref=e95] [cursor=pointer]:
            - img [ref=e97]
            - generic [ref=e101]:
              - generic [ref=e102]: "4"
              - generic [ref=e103]: All Jobs
        - generic [ref=e104]:
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
          - generic [ref=e167]:
            - generic [ref=e168]:
              - generic [ref=e169]:
                - img [ref=e171]
                - generic [ref=e174]:
                  - generic [ref=e175]:
                    - heading "Product Manager" [level=3] [ref=e176]
                    - generic [ref=e177]: Draft
                  - paragraph [ref=e178]: Product
                  - paragraph [ref=e179]: "Recruiter: Jane Recruiter"
              - generic [ref=e180]:
                - generic [ref=e181]:
                  - img [ref=e182]
                  - text: Remote
                - generic [ref=e185]:
                  - img [ref=e186]
                  - text: $100,000 - $140,000
                - generic [ref=e188]:
                  - img [ref=e189]
                  - text: 2 days ago
            - button "Edit" [ref=e193] [cursor=pointer]:
              - img
              - text: Edit
          - generic [ref=e195]:
            - generic [ref=e196]:
              - generic [ref=e197]:
                - generic [ref=e198]:
                  - img [ref=e200]
                  - generic [ref=e203]:
                    - generic [ref=e204]:
                      - heading "UX Designer" [level=3] [ref=e205]
                      - generic [ref=e206]: Closed
                    - paragraph [ref=e207]: Design
                    - paragraph [ref=e208]: "Recruiter: Jane Recruiter"
                - generic [ref=e209]:
                  - generic [ref=e210]:
                    - img [ref=e211]
                    - text: New York, NY
                  - generic [ref=e214]:
                    - img [ref=e215]
                    - text: $90,000 - $120,000
                  - generic [ref=e217]:
                    - img [ref=e218]
                    - text: 1 months ago
              - button "View" [ref=e222] [cursor=pointer]:
                - img
                - text: View
            - generic [ref=e223]:
              - heading "Application Pipeline" [level=4] [ref=e224]
              - generic [ref=e225]:
                - generic [ref=e226]:
                  - generic [ref=e227]: "25"
                  - generic [ref=e228]: Total
                - generic [ref=e229]:
                  - generic [ref=e230]: "20"
                  - generic [ref=e231]: CV Screened
                - generic [ref=e232]:
                  - generic [ref=e233]: "10"
                  - generic [ref=e234]: AI Interview
                - generic [ref=e235]:
                  - generic [ref=e236]: "5"
                  - generic [ref=e237]: Hiring Manager
                - generic [ref=e238]:
                  - generic [ref=e239]: "2"
                  - generic [ref=e240]: Offer Stage
                - generic [ref=e241]:
                  - generic [ref=e242]: "1"
                  - generic [ref=e243]: Hired
                - generic [ref=e244]:
                  - generic [ref=e245]: "4"
                  - generic [ref=e246]: Rejected
          - generic [ref=e248]:
            - generic [ref=e249]:
              - generic [ref=e250]:
                - generic [ref=e251]:
                  - img [ref=e253]
                  - generic [ref=e256]:
                    - generic [ref=e257]:
                      - heading "DevOps Engineer" [level=3] [ref=e258]
                      - generic [ref=e259]: Open
                    - paragraph [ref=e260]: Engineering
                    - paragraph [ref=e261]: "Recruiter: Jane Recruiter"
                - generic [ref=e262]:
                  - generic [ref=e263]:
                    - img [ref=e264]
                    - text: San Francisco, CA
                  - generic [ref=e267]:
                    - img [ref=e268]
                    - text: $120,000 - $160,000
                  - generic [ref=e270]:
                    - img [ref=e271]
                    - text: 1 week ago
                - generic [ref=e274]:
                  - img [ref=e275]
                  - generic [ref=e277] [cursor=pointer]: Auto Interview
                  - switch "Auto Interview" [checked] [ref=e278] [cursor=pointer]
                  - generic [ref=e279]: "ON"
              - generic [ref=e280]:
                - button "Share" [ref=e281] [cursor=pointer]:
                  - img
                  - text: Share
                - button "View" [ref=e282] [cursor=pointer]:
                  - img
                  - text: View
            - generic [ref=e283]:
              - heading "Application Pipeline" [level=4] [ref=e284]
              - generic [ref=e285]:
                - generic [ref=e286]:
                  - generic [ref=e287]: "12"
                  - generic [ref=e288]: Total
                - generic [ref=e289]:
                  - generic [ref=e290]: "8"
                  - generic [ref=e291]: CV Screened
                - generic [ref=e292]:
                  - generic [ref=e293]: "4"
                  - generic [ref=e294]: AI Interview
                - generic [ref=e295]:
                  - generic [ref=e296]: "2"
                  - generic [ref=e297]: Hiring Manager
                - generic [ref=e298]:
                  - generic [ref=e299]: "1"
                  - generic [ref=e300]: Offer Stage
                - generic [ref=e301]:
                  - generic [ref=e302]: "0"
                  - generic [ref=e303]: Hired
                - generic [ref=e304]:
                  - generic [ref=e305]: "3"
                  - generic [ref=e306]: Rejected
        - generic [ref=e308]:
          - generic [ref=e309]:
            - generic [ref=e310]:
              - heading "Post New Job" [level=3] [ref=e311]
              - paragraph [ref=e312]: Capture all details for accurate tracking and reporting
            - generic [ref=e313]:
              - generic [ref=e314]:
                - generic [ref=e315]: Job Status
                - combobox [ref=e316]:
                  - option "Open" [selected]
                  - option "Closed"
                  - option "On Hold"
                  - option "Cancelled"
              - button [ref=e317] [cursor=pointer]:
                - img
          - generic [ref=e319]:
            - generic [ref=e321] [cursor=pointer]:
              - generic [ref=e322]: "1"
              - generic [ref=e323]: Basic Information
            - generic [ref=e326] [cursor=pointer]:
              - generic [ref=e327]: "2"
              - generic [ref=e328]: Job Description
            - generic [ref=e331] [cursor=pointer]:
              - generic [ref=e332]: "3"
              - generic [ref=e333]: Interview Questions
            - generic [ref=e336] [cursor=pointer]:
              - generic [ref=e337]: "4"
              - generic [ref=e338]: Screening Questions
            - generic [ref=e341] [cursor=pointer]:
              - generic [ref=e342]: "5"
              - generic [ref=e343]: Team & Planning
          - group [ref=e345]:
            - generic [ref=e346]:
              - heading "Basic Information" [level=4] [ref=e347]
              - generic [ref=e348]:
                - generic [ref=e349]:
                  - generic [ref=e350]: Job Title *
                  - textbox "e.g. Senior Full Stack Developer" [ref=e351]: DevOps Engineer
                - generic [ref=e352]:
                  - generic [ref=e353]: Department *
                  - combobox [ref=e354]:
                    - option "Select Department" [selected]
                    - option "Engineering"
                    - option "Product"
                    - option "Design"
                    - option "Sales"
                    - option "Marketing"
                    - option "Operations"
                    - option "Human Resources"
                    - option "Finance"
                - generic [ref=e355]:
                  - generic [ref=e356]: Location *
                  - textbox "e.g. San Francisco, CA or Remote" [active] [ref=e357]: Seattle, WA
                - generic [ref=e358]:
                  - generic [ref=e359]: Job Type *
                  - combobox [ref=e360]:
                    - option "Full-time" [selected]
                    - option "Part-time"
                    - option "Contract"
                    - option "Temporary"
                - generic [ref=e361]:
                  - generic [ref=e362]: Work Mode *
                  - combobox [ref=e363]:
                    - option "Remote"
                    - option "Hybrid" [selected]
                    - option "On-site"
                - generic [ref=e364]:
                  - generic [ref=e365]: Currency
                  - combobox [ref=e366]:
                    - option "USD ($)" [selected]
                    - option "EUR (€)"
                    - option "GBP (£)"
                    - option "INR (₹)"
                - generic [ref=e367]:
                  - generic [ref=e368]: Salary Range - Min
                  - spinbutton [ref=e369]
                - generic [ref=e370]:
                  - generic [ref=e371]: Salary Range - Max
                  - spinbutton [ref=e372]
                - generic [ref=e373]:
                  - generic [ref=e374]: Application Deadline
                  - textbox [ref=e375]
                - generic [ref=e376]:
                  - generic [ref=e377]: Expected Start Date
                  - textbox [ref=e378]
          - generic [ref=e379]:
            - generic [ref=e380]: Step 1 of 5
            - generic [ref=e381]:
              - button "Save as Draft" [ref=e382] [cursor=pointer]:
                - img
                - text: Save as Draft
              - button "Next" [disabled]
  - region "Notifications (F8)":
    - list
  - button "Open Next.js Dev Tools" [ref=e388] [cursor=pointer]:
    - img [ref=e389]
  - alert [ref=e392]
```

# Test source

```ts
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
  394 |     await this.createJobButton.click()
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
> 422 |     await this.jobDescriptionTextarea.fill(desc)
      |                                       ^ Error: locator.fill: Test timeout of 30000ms exceeded.
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