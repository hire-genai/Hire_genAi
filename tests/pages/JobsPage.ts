/**
 * tests/pages/JobsPage.ts
 *
 * Playwright Page Object Model for the Jobs Module (/jobs).
 *
 * Covers:
 *   - Jobs listing page interactions (search, filter, status buckets)
 *   - Job card interactions (view, edit, share, auto-schedule toggle)
 *   - Job posting form interactions (create, edit, save as draft, publish)
 *   - Trial-expired popup handling
 *
 * UI structure (from source):
 *   - Header:         "Job Openings" heading + "Post New Job" button
 *   - Filter bar:     search input (placeholder "Search jobs…"),
 *                     Department select, Location select, Clear button
 *   - Status buckets: 6 clickable cards (All Jobs / Open Jobs / Closed Jobs /
 *                     On Hold / Cancelled / Draft Jobs)
 *   - Job list:       <Card> per job with title (h3), status badge, pipeline
 *                     stats, View/Edit button, Share button (open jobs only)
 *   - Job form:       rendered as a full-page overlay / dialog
 *
 * Selector strategy (priority):
 *   1. getByRole + accessible name
 *   2. Stable placeholder text
 *   3. shadcn data-slot="card" + hasText filter for status buckets
 *   4. Structural selectors with explicit comments
 */

import { type Page, type Locator, expect } from '@playwright/test'

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export type JobStatus =
  | 'all'
  | 'open'
  | 'closed'
  | 'onhold'
  | 'cancelled'
  | 'draft'

export interface JobFormData {
  jobTitle: string
  department?: string
  location?: string
  jobType?: string
  workMode?: string
  currency?: string
  salaryMin?: string
  salaryMax?: string
  applicationDeadline?: string
  expectedStartDate?: string
  jobDescription?: string
  responsibilities?: string
  requiredSkills?: string
  preferredSkills?: string
  experienceYears?: string
  requiredEducation?: string
  certificationsRequired?: string
  languagesRequired?: string
  autoScheduleInterview?: boolean
  enableScreeningQuestions?: boolean
  numberOfOpenings?: string
  hiringPriority?: string
  targetTimeToFill?: string
  recruiterAssigned?: string
  hiringManager?: string
  hiringManagerEmail?: string
  jobStatus?: string
}

// ---------------------------------------------------------------------------
// JobsPage
// ---------------------------------------------------------------------------

export class JobsPage {
  readonly page: Page
  readonly url = '/jobs'

  // ── Header ────────────────────────────────────────────────────────────────
  readonly pageHeading: Locator
  readonly createJobButton: Locator

  // ── Filter bar ────────────────────────────────────────────────────────────
  readonly searchInput: Locator
  readonly departmentFilter: Locator
  readonly locationFilter: Locator
  readonly clearFiltersButton: Locator

  // ── Status bucket cards (shadcn <Card> identified by label text) ──────────
  readonly statusBucketAll: Locator
  readonly statusBucketOpen: Locator
  readonly statusBucketClosed: Locator
  readonly statusBucketOnHold: Locator
  readonly statusBucketCancelled: Locator
  readonly statusBucketDraft: Locator

  // ── Job list ──────────────────────────────────────────────────────────────
  /**
   * All job cards in the scrollable listing area below the status buckets.
   * Each card is a shadcn <Card> containing the job title in an <h3>.
   */
  readonly jobRows: Locator

  // ── Empty state ───────────────────────────────────────────────────────────
  readonly emptyState: Locator

  // ── Job posting form ──────────────────────────────────────────────────────
  /** The job form dialog/overlay — present when showJobPostingDialog=true. */
  readonly jobForm: Locator
  readonly jobTitleInput: Locator
  readonly jobDescriptionTextarea: Locator
  readonly requiredSkillsTextarea: Locator
  readonly locationInput: Locator
  readonly experienceYearsInput: Locator
  readonly saveAsDraftButton: Locator
  readonly publishJobButton: Locator
  readonly closeFormButton: Locator

  // ── Trial expired popup ───────────────────────────────────────────────────
  readonly trialExpiredPopup: Locator
  readonly rechargeWalletButton: Locator

  constructor(page: Page) {
    this.page = page

    // Header
    this.pageHeading = page.getByRole('heading', { name: /Job Openings/i })
    this.createJobButton = page.getByRole('button', { name: /Post New Job/i })

    // Filter bar
    this.searchInput = page.locator("input[placeholder='Search jobs...']")
    // Department / Location are shadcn Select components — locate via trigger text
    this.departmentFilter = page
      .getByRole('combobox')
      .filter({ hasText: /All Departments|Select department/i })
      .first()
    this.locationFilter = page
      .getByRole('combobox')
      .filter({ hasText: /All Locations|Select location/i })
      .first()
    this.clearFiltersButton = page.getByRole('button', { name: /^Clear$/i })

    // Status buckets — cards in the count-display grid (flex-col items-center inner div)
    // Scoped to avoid matching job cards which also contain status text
    const bucketCard = (text: RegExp) =>
      page
        .locator("[data-slot='card']")
        .filter({ has: page.locator('div[class*="flex-col"][class*="items-center"]') })
        .filter({ hasText: text })
        .first()

    this.statusBucketAll = bucketCard(/All Jobs/i)
    this.statusBucketOpen = bucketCard(/Open Jobs/i)
    this.statusBucketClosed = bucketCard(/Closed Jobs/i)
    this.statusBucketOnHold = bucketCard(/On Hold/i)
    this.statusBucketCancelled = bucketCard(/Cancelled/i)
    this.statusBucketDraft = bucketCard(/Draft Jobs/i)

    // Job list — cards in the space-y-2 list container below the buckets
    // Each job card contains an h3 with the job title
    this.jobRows = page
      .locator("[data-slot='card']")
      .filter({ has: page.locator('h3') })

    this.emptyState = page.getByText(/No jobs yet|No jobs found/i).first()

    // Job form — rendered as fixed full-page overlay (no role=dialog in DOM)
    // Inputs use placeholders only; no name/id attributes on any field.
    this.jobForm = page.locator('div.fixed.inset-0').filter({ hasText: /Post New Job/i }).first()
    this.jobTitleInput = page
      .locator("input[placeholder='e.g. Senior Full Stack Developer']")
      .first()
    this.jobDescriptionTextarea = page
      .locator("textarea[placeholder*='Provide a detailed description']")
      .first()
    this.requiredSkillsTextarea = page
      .locator("textarea[placeholder*='Enter each skill on a new line']")
      .first()
    this.locationInput = page
      .locator("input[placeholder='e.g. San Francisco, CA or Remote']")
      .first()
    this.experienceYearsInput = page
      .locator("input[placeholder*='0-2 years']")
      .first()
    this.saveAsDraftButton = page.getByRole('button', { name: /Save as Draft/i })
    this.publishJobButton = page.getByRole('button', { name: /Publish Job/i })
    this.closeFormButton = page.getByRole('button', { name: /Close|Cancel/i }).first()

    // Trial popup
    this.trialExpiredPopup = page.getByText(/Trial Period Expired/i)
    this.rechargeWalletButton = page.getByRole('button', { name: /Recharge Wallet/i })
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  async navigate(): Promise<void> {
    await this.page.goto(this.url)
    await this.pageHeading.waitFor({ state: 'visible', timeout: 15_000 })
  }

  /** Alias for navigate() — some specs call goto() */
  async goto(): Promise<void> {
    return this.navigate()
  }

  // ── Create job ────────────────────────────────────────────────────────────

  async clickCreateJob(): Promise<void> {
    await this.createJobButton.click()
    // Wait for the trial check API call to resolve and for the form / popup to appear
    await this.page.waitForTimeout(800)
  }

  // ── Search and filter ─────────────────────────────────────────────────────

  async searchJobs(query: string): Promise<void> {
    await this.searchInput.fill(query)
    // Allow debounce to fire
    await this.page.waitForTimeout(300)
  }

  async clearSearch(): Promise<void> {
    await this.searchInput.clear()
    await this.page.waitForTimeout(300)
  }

  async filterByDepartment(department: string): Promise<void> {
    await this.departmentFilter.click()
    await this.page.getByRole('option', { name: department, exact: true }).click()
    await this.page.waitForTimeout(200)
  }

  async filterByLocation(location: string): Promise<void> {
    await this.locationFilter.click()
    await this.page.getByRole('option', { name: location, exact: true }).click()
    await this.page.waitForTimeout(200)
  }

  async clearFilters(): Promise<void> {
    await this.clearFiltersButton.click()
    await this.page.waitForTimeout(200)
  }

  // ── Status buckets ────────────────────────────────────────────────────────

  private statusBucketLocator(status: JobStatus): Locator {
    const map: Record<JobStatus, Locator> = {
      all: this.statusBucketAll,
      open: this.statusBucketOpen,
      closed: this.statusBucketClosed,
      onhold: this.statusBucketOnHold,
      cancelled: this.statusBucketCancelled,
      draft: this.statusBucketDraft,
    }
    return map[status]
  }

  async clickStatusBucket(status: JobStatus): Promise<void> {
    await this.statusBucketLocator(status).click()
    await this.page.waitForTimeout(200)
  }

  /** Returns the numeric count shown inside a status bucket card. */
  async getStatusBucketCount(status: JobStatus): Promise<number> {
    const bucket = this.statusBucketLocator(status)
    // The count is the large bold number (text-xl font-bold) inside the card
    const countText = await bucket
      .locator('div.text-xl, div[class*="text-xl"]')
      .first()
      .textContent()
    return parseInt(countText?.trim() ?? '0', 10) || 0
  }

  // ── Job cards ─────────────────────────────────────────────────────────────

  /** Returns the count of currently visible job cards. */
  async getJobCount(): Promise<number> {
    await this.page.waitForTimeout(300)
    return this.jobRows.count()
  }

  /** Get the title text of a specific job card (0-indexed). */
  async getJobCardTitle(index: number): Promise<string> {
    const card = this.jobRows.nth(index)
    return (await card.locator('h3').first().textContent()) ?? ''
  }

  /**
   * Click View/Edit on the job card whose title matches the given text.
   * Opens the job form dialog.
   */
  async clickJob(title: string): Promise<void> {
    const card = this.jobRows.filter({ hasText: title }).first()
    const btn = card.getByRole('button', { name: /View|Edit/i }).first()
    await btn.click()
    await this.page.waitForTimeout(500)
  }

  /**
   * Click the View/Edit button on the nth job card (0-indexed).
   */
  async openJobByIndex(index: number): Promise<void> {
    const card = this.jobRows.nth(index)
    const btn = card.getByRole('button', { name: /View|Edit/i }).first()
    await btn.click()
    await this.page.waitForTimeout(500)
  }

  /**
   * deleteJob — there is no direct delete button in the listing UI.
   * Jobs can be cancelled via the job form (change status → Cancelled).
   * This method opens the form for the matching job and changes status.
   */
  async deleteJob(title: string): Promise<void> {
    await this.clickJob(title)
    // The job form must be open at this point; status change handled in form
    const statusSelect = this.page
      .getByRole('combobox')
      .filter({ hasText: /open|draft|closed|onhold|cancelled/i })
      .first()
    await statusSelect.click()
    await this.page.getByRole('option', { name: /Cancelled/i }).click()
    await this.saveAsDraftButton.or(this.publishJobButton).first().click()
    await this.page.waitForTimeout(500)
  }

  // ── Job form ──────────────────────────────────────────────────────────────

  async fillJobForm(data: JobFormData): Promise<void> {
    if (data.jobTitle) await this.jobTitleInput.fill(data.jobTitle)
    if (data.location) await this.locationInput.fill(data.location)
    if (data.experienceYears)
      await this.experienceYearsInput.fill(data.experienceYears)
    if (data.jobDescription)
      await this.jobDescriptionTextarea.fill(data.jobDescription)
    if (data.requiredSkills)
      await this.requiredSkillsTextarea.fill(data.requiredSkills)
  }

  async saveAsDraft(): Promise<void> {
    await this.saveAsDraftButton.click()
    await this.page.waitForTimeout(500)
  }

  async publishJob(): Promise<void> {
    await this.publishJobButton.click()
    await this.page.waitForTimeout(500)
  }

  async closeJobForm(): Promise<void> {
    await this.page.keyboard.press('Escape')
    await this.page.waitForTimeout(300)
  }

  // ── Assertions ────────────────────────────────────────────────────────────

  async expectJobVisible(title: string): Promise<void> {
    await expect(
      this.page.getByText(title, { exact: false }).first(),
    ).toBeVisible({ timeout: 10_000 })
  }

  async expectEmptyState(): Promise<void> {
    await expect(this.emptyState).toBeVisible({ timeout: 10_000 })
  }

  async expectFormVisible(): Promise<void> {
    await expect(this.jobTitleInput).toBeVisible({ timeout: 10_000 })
  }

  async expectTrialExpiredPopup(): Promise<void> {
    await expect(this.trialExpiredPopup).toBeVisible({ timeout: 8_000 })
  }

  // ── Aliases used by workflow-generated spec 05 ────────────────────────────

  get postNewJobButton() { return this.createJobButton }

  async expectJobsPageLoaded(): Promise<void> {
    await this.pageHeading.waitFor({ state: 'visible', timeout: 15_000 })
  }

  async expectJobCardVisible(title: string): Promise<void> {
    return this.expectJobVisible(title)
  }

  async getJobCardCount(): Promise<number> {
    return this.getJobCount()
  }

  async openNewJobForm(): Promise<void> {
    await this.createJobButton.click()
    // Wait for the fixed overlay to appear (contains "Post New Job" heading)
    await this.page.getByText('Post New Job').first().waitFor({ state: 'visible', timeout: 10_000 })
    // Wait for the Step 1 job title input to be visible
    await this.jobTitleInput.waitFor({ state: 'visible', timeout: 10_000 })
  }

  /** Advance the multi-step form from Step 1 to Step 2 (Job Description). */
  async nextStep(): Promise<void> {
    await this.page.getByRole('button', { name: /^Next$/i }).click()
    await this.jobDescriptionTextarea.waitFor({ state: 'visible', timeout: 10_000 })
  }

  async fillJobTitle(title: string): Promise<void> {
    await this.jobTitleInput.fill(title)
  }

  async fillLocation(location: string): Promise<void> {
    await this.locationInput.fill(location)
  }

  async fillExperienceYears(years: string): Promise<void> {
    if (await this.experienceYearsInput.isVisible({ timeout: 2000 })) {
      await this.experienceYearsInput.fill(years)
    }
  }

  async fillJobDescription(desc: string): Promise<void> {
    await this.jobDescriptionTextarea.fill(desc)
  }

  async fillRequiredSkills(skills: string): Promise<void> {
    if (await this.requiredSkillsTextarea.isVisible({ timeout: 2000 })) {
      await this.requiredSkillsTextarea.fill(skills)
    }
  }
}
