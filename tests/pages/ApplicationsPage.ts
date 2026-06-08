/**
 * tests/pages/ApplicationsPage.ts
 *
 * Playwright Page Object Model for the Applications / Candidates module.
 *
 * This module covers two distinct surfaces:
 *
 * 1. CandidatesPage (/candidate) — the recruiter-side pipeline view.
 *    - Seven pipeline-stage buckets (All, CV Screening, AI Interview,
 *      Hiring Manager, Offer Stage, Hired, Rejected)
 *    - Filter bar (search, position, source, skill, date range)
 *    - Candidate table with per-row action buttons (Settings2 icon = Actions,
 *      FileText icon = Report)
 *    - CandidateActionDialog for moving candidates between stages,
 *      sending interview emails, updating HM review, offer data, etc.
 *
 * 2. ApplicationApplyPage (/apply/[companySlug]/[jobId]) — public-facing
 *    CV upload and application submission form.
 *
 * The "Applications" concept in this codebase maps directly to the
 * CandidatesPage (/candidate route) in the dashboard.
 *
 * Selector strategy:
 *   1. getByRole + accessible name
 *   2. Placeholder text
 *   3. Structural CSS selectors based on source-visible class names
 *   4. Button icon-class presence for action buttons
 */

import { type Page, type Locator, expect } from '@playwright/test'

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export type PipelineBucket =
  | 'all'
  | 'screening'
  | 'interview'
  | 'hiringManager'
  | 'offer'
  | 'hired'
  | 'rejected'

export type ApplicationStatus =
  | 'Qualified'
  | 'Unqualified'
  | 'Pending'
  | 'Scheduled'
  | 'Completed'
  | 'Incomplete'

export interface SelectionCriteria {
  requiredSkills?: string
  preferredSkills?: string
  minExperience?: string
  maxExperience?: string
  requiredEducation?: string
  certifications?: string
  location?: string
}

// ---------------------------------------------------------------------------
// CandidatesPage — dashboard pipeline view (/candidate)
// ---------------------------------------------------------------------------

export class ApplicationsPage {
  readonly page: Page
  readonly url = '/candidate'

  // ── Page heading ──────────────────────────────────────────────────────────
  readonly pageHeading: Locator

  // ── Pipeline bucket cards ─────────────────────────────────────────────────
  readonly bucketAll: Locator
  readonly bucketScreening: Locator
  readonly bucketInterview: Locator
  readonly bucketHiringManager: Locator
  readonly bucketOffer: Locator
  readonly bucketHired: Locator
  readonly bucketRejected: Locator

  // ── Filter bar ────────────────────────────────────────────────────────────
  readonly searchInput: Locator
  readonly positionFilter: Locator
  readonly sourceFilter: Locator
  readonly skillInput: Locator
  readonly dateRangeButton: Locator

  // ── Candidate table ───────────────────────────────────────────────────────
  /** All data rows in the visible candidate table (tr elements, excluding header). */
  readonly candidateRows: Locator

  // ── Action dialog ─────────────────────────────────────────────────────────
  readonly actionDialog: Locator
  readonly actionDialogTitle: Locator
  readonly moveToStageSelect: Locator
  readonly remarksTextarea: Locator
  readonly saveButton: Locator
  readonly closeDialogButton: Locator

  // ── Interview email buttons (inside action dialog, interview bucket) ───────
  readonly sendInterviewEmailButton: Locator
  readonly resendInterviewEmailButton: Locator
  readonly emailPreviewContent: Locator
  readonly sendEmailFinalButton: Locator

  // ── CV / report ───────────────────────────────────────────────────────────
  readonly downloadCVButton: Locator
  readonly viewReportButton: Locator

  // ── Loading / error states ────────────────────────────────────────────────
  readonly loadingSpinner: Locator
  readonly errorState: Locator

  constructor(page: Page) {
    this.page = page

    // Page heading
    this.pageHeading = page.getByRole('heading', { name: /Applications/i })

    // Pipeline bucket cards — identified by label text inside the card
    this.bucketAll = page
      .locator("[data-slot='card']")
      .filter({ hasText: /Total Applicants/i })
    this.bucketScreening = page
      .locator("[data-slot='card']")
      .filter({ hasText: /CV Screening/i })
    this.bucketInterview = page
      .locator("[data-slot='card']")
      .filter({ hasText: /AI Interview/i })
    this.bucketHiringManager = page
      .locator("[data-slot='card']")
      .filter({ hasText: /Hiring Manager/i })
    this.bucketOffer = page
      .locator("[data-slot='card']")
      .filter({ hasText: /Offer Stage/i })
    this.bucketHired = page
      .locator("[data-slot='card']")
      .filter({ hasText: /Hired/i })
    this.bucketRejected = page
      .locator("[data-slot='card']")
      .filter({ hasText: /Rejected/i })

    // Filter bar
    this.searchInput = page.locator(
      "input[placeholder='Search applications...']",
    )
    this.positionFilter = page
      .getByRole('combobox')
      .filter({ hasText: /All Positions/i })
      .first()
    this.sourceFilter = page
      .getByRole('combobox')
      .filter({ hasText: /All Sources/i })
      .first()
    this.skillInput = page.locator("input[placeholder='Skills']")
    this.dateRangeButton = page.getByRole('button').filter({ hasText: /Last|Week|Month|\d+\/\d+/ }).first()

    // Candidate table rows (tbody > tr, skips header)
    this.candidateRows = page.locator('tbody tr')

    // Action dialog
    this.actionDialog = page.locator("[role='dialog']").first()
    this.actionDialogTitle = page
      .locator("[role='dialog'] [class*='DialogTitle'], [role='dialog'] h2")
      .first()
    this.moveToStageSelect = page
      .locator("[role='dialog']")
      .getByRole('combobox')
      .first()
    this.remarksTextarea = page
      .locator("[role='dialog'] textarea")
      .first()
    this.saveButton = page
      .locator("[role='dialog']")
      .getByRole('button', { name: /Save|Move|Update|Confirm/i })
      .first()
    this.closeDialogButton = page
      .locator("[role='dialog']")
      .getByRole('button', { name: /Close|Cancel|✕/i })
      .first()

    // Interview email buttons
    this.sendInterviewEmailButton = page.getByRole('button', {
      name: /Preview Interview Email/i,
    })
    this.resendInterviewEmailButton = page.getByRole('button', {
      name: /Preview & Resend Email/i,
    })
    this.emailPreviewContent = page.locator('textarea[readonly], textarea[disabled]').first()
    this.sendEmailFinalButton = page.getByRole('button', { name: /Send Email/i })

    // CV / report
    this.downloadCVButton = page.getByRole('button', { name: /Download CV/i })
    this.viewReportButton = page.getByRole('button', { name: /View Full Report/i })

    // Loading / error
    this.loadingSpinner = page.locator('.animate-spin').first()
    this.errorState = page.getByText(/failed to load|error loading|Failed/i).first()
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  async navigate(jobId?: string): Promise<void> {
    // The candidates page is /candidate regardless of jobId.
    // jobId is accepted for API compatibility but the page is not job-scoped.
    await this.page.goto(this.url)
    await this.pageHeading.waitFor({ state: 'visible', timeout: 15_000 })
  }

  // ── Pipeline bucket navigation ────────────────────────────────────────────

  private bucketLocator(bucket: PipelineBucket): Locator {
    const map: Record<PipelineBucket, Locator> = {
      all: this.bucketAll,
      screening: this.bucketScreening,
      interview: this.bucketInterview,
      hiringManager: this.bucketHiringManager,
      offer: this.bucketOffer,
      hired: this.bucketHired,
      rejected: this.bucketRejected,
    }
    return map[bucket]
  }

  async filterByStatus(status: PipelineBucket | string): Promise<void> {
    // Accept both typed PipelineBucket values and free-form strings
    const bucket = this.bucketLocator(status as PipelineBucket)
    if (bucket) {
      await bucket.click()
      await this.page.waitForTimeout(300)
    }
  }

  /** Returns the numeric count displayed in a pipeline bucket card. */
  async getBucketCount(bucket: PipelineBucket): Promise<number> {
    const card = this.bucketLocator(bucket)
    // Count is the large bold number inside the bucket card
    const countText = await card
      .locator('div.text-xl, div[class*="text-xl"], span.font-bold')
      .first()
      .textContent()
    return parseInt(countText?.trim() ?? '0', 10) || 0
  }

  /** Returns the count from the CV Screening qualified badge. */
  async getQualifiedCount(): Promise<number> {
    const qualifiedText = await this.page
      .getByText(/Qualified/i)
      .filter({ hasText: /^\d+$/ })
      .first()
      .textContent()
      .catch(() => null)

    if (qualifiedText) return parseInt(qualifiedText, 10) || 0

    // Fallback: count rows with "Qualified" status badge in screening bucket
    return this.candidateRows
      .filter({ hasText: /Qualified/i })
      .count()
  }

  /** Returns the count of candidates with "Unqualified" screening status. */
  async getUnqualifiedCount(): Promise<number> {
    return this.candidateRows
      .filter({ hasText: /Unqualified/i })
      .count()
  }

  // ── CV Upload (public apply page helper) ──────────────────────────────────

  /**
   * Navigate to the public apply page and upload a CV.
   * Wraps ApplicationApplyPage.uploadFile().
   */
  async uploadCV(filePath: string): Promise<void> {
    const fileInput = this.page.locator("input[type='file']").first()
    await fileInput.setInputFiles(filePath)
  }

  // ── Criteria helpers (job posting / CV scan criteria panel) ──────────────

  /**
   * Set CV screening criteria via the criteria panel if available.
   * In this codebase the criteria are configured on the job, not at scan time,
   * so this helper targets any visible required-skills inputs.
   */
  async setCriteria(criteria: SelectionCriteria): Promise<void> {
    if (criteria.requiredSkills) {
      const input = this.page
        .locator(
          "input[name='required_skills'], textarea[name='required_skills'], input[placeholder*='Required Skills' i]",
        )
        .first()
      if (await input.isVisible()) await input.fill(criteria.requiredSkills)
    }
    if (criteria.minExperience) {
      const input = this.page
        .locator("input[name='min_experience'], input[placeholder*='min.*exp' i]")
        .first()
      if (await input.isVisible()) await input.fill(criteria.minExperience)
    }
  }

  /** Click "Run Scan" or equivalent trigger to re-evaluate CVs. */
  async runScan(): Promise<void> {
    const btn = this.page
      .getByRole('button', { name: /Run Scan|Re-scan|Scan CVs/i })
      .first()
    await btn.click()
    await this.page.waitForTimeout(1000)
  }

  // ── Candidate row actions ─────────────────────────────────────────────────

  /**
   * Open the action dialog for a candidate identified by name.
   * Clicks the Settings2-icon button (first action button) in the candidate's row.
   */
  async openCandidateActions(candidateName: string): Promise<void> {
    const row = this.candidateRows.filter({ hasText: candidateName }).first()
    // Settings2 icon button is the first action button in the sticky right cell
    const actionBtn = row
      .getByRole('button')
      .filter({ has: this.page.locator('[class*="Settings"]') })
      .or(row.getByRole('button').nth(0))
    await actionBtn.click()
    await this.actionDialog.waitFor({ state: 'visible', timeout: 5_000 })
  }

  /**
   * Open the CV / interview report for a candidate.
   * Clicks the FileText-icon button (second action button) in the candidate's row.
   */
  async openCandidateReport(candidateName: string): Promise<void> {
    const row = this.candidateRows.filter({ hasText: candidateName }).first()
    const reportBtn = row
      .getByRole('button')
      .filter({ has: this.page.locator('[class*="FileText"]') })
      .or(row.getByRole('button').nth(1))
    await reportBtn.click()
    await this.page.waitForTimeout(500)
  }

  // ── Report download ───────────────────────────────────────────────────────

  /**
   * Trigger a report download.
   * In the current UI this opens a /report/ iframe modal inside the
   * action dialog rather than a file download.
   */
  async downloadReport(): Promise<void> {
    const downloadPromise = this.page.waitForEvent('download').catch(() => null)
    await this.viewReportButton
      .or(this.downloadCVButton)
      .first()
      .click()
    await downloadPromise
  }

  // ── Interview invite (via action dialog) ──────────────────────────────────

  /**
   * Send an interview invite to a candidate.
   * Opens the action dialog for the candidate, clicks "Preview Interview Email".
   */
  async inviteCandidate(candidateName: string): Promise<void> {
    await this.openCandidateActions(candidateName)
    await this.sendInterviewEmailButton.waitFor({ state: 'visible', timeout: 5_000 })
    await this.sendInterviewEmailButton.click()
    await this.page.waitForTimeout(800)
  }

  // ── Assertions ────────────────────────────────────────────────────────────

  async expectCandidateVisible(name: string): Promise<void> {
    await expect(
      this.candidateRows.filter({ hasText: name }).first(),
    ).toBeVisible({ timeout: 10_000 })
  }

  async expectActionDialogVisible(): Promise<void> {
    await expect(this.actionDialog).toBeVisible({ timeout: 8_000 })
  }

  async expectEmailPreviewVisible(): Promise<void> {
    const emailArea = this.page
      .getByText(/Invitation:|Reminder:/i)
      .first()
      .or(this.emailPreviewContent)
    await expect(emailArea).toBeVisible({ timeout: 8_000 })
  }

  async getCandidateCount(): Promise<number> {
    return this.candidateRows.count()
  }
}

// ---------------------------------------------------------------------------
// ApplicationApplyPage — public apply page (/apply/[companySlug]/[jobId])
// ---------------------------------------------------------------------------

export class ApplicationApplyPage {
  readonly page: Page

  // ── Upload zone ───────────────────────────────────────────────────────────
  readonly fileInput: Locator
  readonly uploadDropZone: Locator
  readonly uploadHint: Locator
  readonly removeFileButton: Locator

  // ── Candidate info form ───────────────────────────────────────────────────
  readonly firstNameInput: Locator
  readonly lastNameInput: Locator
  readonly emailInput: Locator
  readonly phoneInput: Locator
  readonly locationInput: Locator
  readonly submitButton: Locator

  // ── Consent / confirmation ────────────────────────────────────────────────
  readonly agreeButton: Locator
  readonly infoCheckbox: Locator

  // ── Success / error ───────────────────────────────────────────────────────
  readonly successState: Locator
  readonly errorState: Locator

  constructor(page: Page) {
    this.page = page

    this.fileInput = page.locator("input[type='file']").first()
    this.uploadDropZone = page.locator('div.border-dashed').first()
    this.uploadHint = page.getByText(/PDF|DOC|DOCX|drop/i).first()
    this.removeFileButton = page
      .locator('button')
      .filter({ has: page.locator('.lucide-x, [class*="lucide-x"]') })
      .first()

    this.firstNameInput = page.locator('#firstName')
    this.lastNameInput = page.locator('#lastName')
    this.emailInput = page.locator('#email')
    this.phoneInput = page.locator('#phone')
    this.locationInput = page.locator('#location')
    this.submitButton = page.getByRole('button', { name: /Submit Application/i })

    this.agreeButton = page.getByRole('button', { name: /^Agree$/i })
    this.infoCheckbox = page.locator("input[type='checkbox']").last()

    this.successState = page.getByText(/Application Submitted/i).first()
    this.errorState = page
      .getByText(/Unable to Load|error|failed/i)
      .first()
  }

  async goto(companySlug: string, jobId: string): Promise<void> {
    await this.page.goto(`/apply/${companySlug}/${jobId}`)
    await this.page.waitForLoadState('domcontentloaded')
  }

  async uploadCV(filePath: string): Promise<void> {
    await this.fileInput.setInputFiles(filePath)
  }

  async fillCandidateInfo(data: {
    firstName: string
    lastName: string
    email: string
    phone: string
    location: string
  }): Promise<void> {
    await this.firstNameInput.fill(data.firstName)
    await this.lastNameInput.fill(data.lastName)
    await this.emailInput.fill(data.email)
    await this.phoneInput.fill(data.phone)
    await this.locationInput.fill(data.location)
  }

  async submitApplication(): Promise<void> {
    await this.submitButton.click()
  }

  async expectSubmittedSuccess(): Promise<void> {
    await expect(this.successState).toBeVisible({ timeout: 15_000 })
  }
}
