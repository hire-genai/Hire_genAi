/**
 * tests/pages/InterviewPage.ts
 *
 * Playwright Page Object Model for the AI Video Interview flow.
 *
 * The interview feature spans several routes:
 *
 *   /interview/[applicationId]/start
 *     — Pre-interview landing page. Shows job title, company, disclaimer
 *       accordion, a checkbox that must be ticked, and "Start Video Interview".
 *
 *   /interview/[applicationId]/verify
 *     — Identity verification step (not covered here; navigated to by start page).
 *
 *   /interview/[applicationId]
 *     — Active video interview page with mic/cam controls, conversation panel,
 *       and an end-call button (PhoneOff icon).
 *
 *   /interview/[applicationId]/post-verify
 *     — Post-interview redirect target. Shown when interview is completed or
 *       already done.
 *
 *   /interview/[applicationId]/success
 *     — Success confirmation page.
 *
 * "Invite candidate" is handled via the CandidateActionDialog inside the
 * /candidate (Applications) page. That dialog calls POST /api/interview/send
 * and renders an email preview before the recruiter sends the actual invite.
 *
 * The InterviewPage POM therefore models:
 *   (a) The start/pre-flight page accessible to candidates
 *   (b) The live interview page
 *   (c) Recruiter-side invite actions (delegated to ApplicationsPage)
 *
 * Selector strategy:
 *   1. getByRole + accessible name
 *   2. getByText for unique text
 *   3. CSS selectors for video elements and icon buttons
 */

import { type Page, type Locator, expect } from '@playwright/test'

// ---------------------------------------------------------------------------
// InterviewStartPage — /interview/[applicationId]/start
// ---------------------------------------------------------------------------

export class InterviewStartPage {
  readonly page: Page

  // ── Job details card ──────────────────────────────────────────────────────
  readonly jobTitle: Locator
  readonly companyName: Locator

  // ── Disclaimer ────────────────────────────────────────────────────────────
  readonly disclaimerAccordion: Locator
  readonly disclaimerCheckbox: Locator
  readonly disclaimerWarning: Locator

  // ── CTA ───────────────────────────────────────────────────────────────────
  readonly startInterviewButton: Locator
  readonly loadingState: Locator

  constructor(page: Page) {
    this.page = page

    this.jobTitle = page.locator('div.text-2xl, div.text-4xl').first()
    this.companyName = page.getByText(/^at /i).first()

    this.disclaimerAccordion = page.locator('[data-radix-accordion-item]').first()
    this.disclaimerCheckbox = page.locator(
      "input[type='checkbox'][class*='h-4']",
    ).first()
    this.disclaimerWarning = page.getByText(/Please tick the disclaimer/i).first()

    this.startInterviewButton = page.getByRole('button', {
      name: /Start Video Interview/i,
    })
    this.loadingState = page.getByText(/Starting Interview/i).first()
  }

  async navigate(applicationId: string): Promise<void> {
    await this.page.goto(`/interview/${encodeURIComponent(applicationId)}/start`)
    await this.page.waitForLoadState('domcontentloaded')
    // Wait for job details to load from API
    await this.startInterviewButton.waitFor({ state: 'visible', timeout: 15_000 })
  }

  async acceptDisclaimer(): Promise<void> {
    if (!(await this.disclaimerCheckbox.isChecked())) {
      await this.disclaimerCheckbox.check()
    }
  }

  async clickStartInterview(): Promise<void> {
    await this.startInterviewButton.click()
  }

  async startInterview(applicationId: string): Promise<void> {
    await this.navigate(applicationId)
    await this.acceptDisclaimer()
    await this.clickStartInterview()
    // Navigates to /interview/[applicationId]/verify
    await this.page.waitForURL(/\/interview\/.*\/verify/, { timeout: 10_000 })
  }

  async expectDisclaimerWarningVisible(): Promise<void> {
    await expect(this.disclaimerWarning).toBeVisible({ timeout: 5_000 })
  }
}

// ---------------------------------------------------------------------------
// InterviewLivePage — /interview/[applicationId]
// ---------------------------------------------------------------------------

export class InterviewLivePage {
  readonly page: Page

  // ── Video elements ────────────────────────────────────────────────────────
  /** User webcam feed (mirrored). */
  readonly userVideo: Locator
  /** Olivia avatar PIP video. */
  readonly avatarVideo: Locator

  // ── Control bar ───────────────────────────────────────────────────────────
  /** Mic toggle button (round button at bottom). */
  readonly micButton: Locator
  /** Camera toggle button. */
  readonly cameraButton: Locator
  /** End call / hang-up button (PhoneOff icon). */
  readonly endCallButton: Locator

  // ── Status indicators ─────────────────────────────────────────────────────
  /** "Connected" badge shown over the avatar PIP when agent is ready. */
  readonly connectedBadge: Locator
  /** Interview timer shown in top-right. */
  readonly interviewTimer: Locator
  /** Closing countdown shown when AI delivers closing message. */
  readonly closingCountdown: Locator

  // ── Instruction modal ─────────────────────────────────────────────────────
  readonly instructionModal: Locator
  readonly instructionModalCloseButton: Locator

  // ── End-interview warning dialog ──────────────────────────────────────────
  readonly endWarningDialog: Locator
  readonly continueInterviewButton: Locator
  readonly endAnywayButton: Locator

  constructor(page: Page) {
    this.page = page

    this.userVideo = page.locator('video').first()
    this.avatarVideo = page
      .locator("video[src*='olivia']")
      .or(page.locator('video').nth(1))

    // Round control buttons at the bottom of the main video area
    this.micButton = page
      .locator('button')
      .filter({ has: page.locator('[class*="lucide-mic"]') })
      .first()
    this.cameraButton = page
      .locator('button')
      .filter({ has: page.locator('[class*="lucide-video"]') })
      .first()
    this.endCallButton = page
      .locator('button')
      .filter({ has: page.locator('[class*="lucide-phone-off"]') })
      .first()

    this.connectedBadge = page.getByText(/Connected/i).first()
    this.interviewTimer = page.locator('div').filter({ hasText: /^\d+:\d{2}$/ }).first()
    this.closingCountdown = page.getByText(/Interview ending in/i).first()

    this.instructionModal = page.getByText(/Interview Instructions/i).first()
    this.instructionModalCloseButton = page.getByRole('button', {
      name: /I Understand|Let'?s Start/i,
    })

    this.endWarningDialog = page.getByText(/Interview Incomplete/i).first()
    this.continueInterviewButton = page.getByRole('button', {
      name: /Continue Interview/i,
    })
    this.endAnywayButton = page.getByRole('button', { name: /End Anyway/i })
  }

  async navigate(applicationId: string): Promise<void> {
    await this.page.goto(`/interview/${encodeURIComponent(applicationId)}`)
    await this.page.waitForLoadState('domcontentloaded')
  }

  async dismissInstructionModal(): Promise<void> {
    try {
      await this.instructionModalCloseButton.waitFor({
        state: 'visible',
        timeout: 5_000,
      })
      await this.instructionModalCloseButton.click()
    } catch {
      // Modal may not appear in all test scenarios
    }
  }

  async toggleMic(): Promise<void> {
    await this.micButton.click()
  }

  async toggleCamera(): Promise<void> {
    await this.cameraButton.click()
  }

  async endInterview(): Promise<void> {
    await this.endCallButton.click()
    await this.page.waitForTimeout(300)
  }

  /** End interview — confirm in the warning dialog if it appears. */
  async endInterviewConfirmed(): Promise<void> {
    await this.endCallButton.click()
    try {
      await this.endWarningDialog.waitFor({ state: 'visible', timeout: 3_000 })
      await this.endAnywayButton.click()
    } catch {
      // Warning dialog did not appear — interview ended cleanly
    }
  }

  async waitForAgentConnected(timeout = 30_000): Promise<void> {
    await this.connectedBadge.waitFor({ state: 'visible', timeout })
  }

  async waitForPostInterviewRedirect(timeout = 30_000): Promise<void> {
    await this.page.waitForURL(/\/interview\/.*\/post-verify/, { timeout })
  }
}

// ---------------------------------------------------------------------------
// InterviewPage — combined POM used by tests (matches requested interface)
// ---------------------------------------------------------------------------

/**
 * InterviewPage — top-level page object that covers both recruiter-side invite
 * actions and the candidate-side interview flow.
 *
 * Recruiter invite flow lives in the CandidateActionDialog (/candidate route):
 *   inviteCandidate(candidateId) → opens Actions dialog
 *   confirmInvite()             → clicks "Preview Interview Email"
 *   getSuccessMessage()         → reads toast or email sent confirmation
 *   getCandidateStatus(id)      → reads status badge from the table row
 *
 * Candidate-side interview flow (start → live interview):
 *   navigate(applicationId)    → /interview/[id]/start
 *
 * Note: interviewPage.navigate(jobId) per the spec maps to the start page.
 * The applicationId is the primary key; jobId is accepted as an alias.
 */
export class InterviewPage {
  readonly page: Page

  // ── Recruiter invite UI (inside /candidate action dialog) ─────────────────
  readonly inviteBtn: Locator
  readonly confirmInviteBtn: Locator
  readonly cancelInviteBtn: Locator
  readonly successToast: Locator
  readonly errorToast: Locator

  // ── Candidate table ───────────────────────────────────────────────────────
  readonly candidateRows: Locator
  readonly statusBadges: Locator

  // ── Nested page helpers ───────────────────────────────────────────────────
  readonly startPage: InterviewStartPage
  readonly livePage: InterviewLivePage

  constructor(page: Page) {
    this.page = page

    // Recruiter-side invite buttons (visible inside the CandidateActionDialog)
    this.inviteBtn = page.getByRole('button', {
      name: /Preview Interview Email|invite/i,
    })
    this.confirmInviteBtn = page.getByRole('button', {
      name: /Send Email|Confirm|Proceed/i,
    })
    this.cancelInviteBtn = page.getByRole('button', { name: /Cancel/i })

    // Success — either a toast or the email sent confirmation message
    this.successToast = page
      .locator('[class*="success"], [data-variant="success"]')
      .or(page.getByText(/Email sent|invited|Invitation sent/i))
      .first()
    this.errorToast = page
      .locator('[class*="destructive"], [data-variant="destructive"]')
      .first()

    // Candidate table rows on the /candidate page
    this.candidateRows = page.locator('tbody tr')
    this.statusBadges = page.locator(
      '[data-slot="badge"], [class*="badge"]',
    )

    // Nested page objects
    this.startPage = new InterviewStartPage(page)
    this.livePage = new InterviewLivePage(page)
  }

  /**
   * Navigate to the interview start page for a given applicationId/jobId.
   * Per spec this navigates to /interview/[jobId] which is the live page.
   * For the start page use startPage.navigate(applicationId) directly.
   */
  async navigate(jobId: string): Promise<void> {
    await this.page.goto(`/interview/${encodeURIComponent(jobId)}`)
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Open the action dialog for a candidate row identified by candidateId
   * (displayed as last 8 chars of the row's App/Cand ID cells) and click
   * the "Preview Interview Email" button.
   */
  async inviteCandidate(candidateId: string): Promise<void> {
    // The candidate table shows truncated IDs; locate row by partial ID match
    const row = this.candidateRows
      .filter({ hasText: candidateId.slice(-8) })
      .first()
    // Click the first (Settings2) action button in the row
    await row.getByRole('button').first().click()

    // Wait for the action dialog to appear
    const dialog = this.page.locator("[role='dialog']").first()
    await dialog.waitFor({ state: 'visible', timeout: 5_000 })

    // Click "Preview Interview Email"
    await this.inviteBtn.waitFor({ state: 'visible', timeout: 5_000 })
    await this.inviteBtn.click()
    await this.page.waitForTimeout(600)
  }

  /**
   * Confirm the invite by clicking the "Send Email" button inside the email
   * preview template that appears after inviteCandidate().
   */
  async confirmInvite(): Promise<void> {
    await this.confirmInviteBtn.waitFor({ state: 'visible', timeout: 5_000 })
    await this.confirmInviteBtn.click()
    await this.page.waitForTimeout(500)
  }

  /**
   * Returns the text of the success notification after sending the invite,
   * or empty string if not visible within the timeout.
   */
  async getSuccessMessage(timeout = 8_000): Promise<string> {
    try {
      await this.successToast.first().waitFor({ state: 'visible', timeout })
      return (await this.successToast.first().textContent()) ?? ''
    } catch {
      return ''
    }
  }

  /**
   * Returns the interview/application status badge text for a candidate
   * identified by their candidateId (partial match on last 8 chars).
   */
  async getCandidateStatus(candidateId: string): Promise<string> {
    const row = this.candidateRows
      .filter({ hasText: candidateId.slice(-8) })
      .first()
    // Status badge is the first badge in the row
    const badge = row
      .locator('[data-slot="badge"], [class*="badge"]')
      .first()
    return (await badge.textContent()) ?? ''
  }

  // ── Assertions ────────────────────────────────────────────────────────────

  async expectSuccessMessageVisible(): Promise<void> {
    await expect(this.successToast.first()).toBeVisible({ timeout: 8_000 })
  }

  async expectErrorMessageVisible(): Promise<void> {
    await expect(this.errorToast.first()).toBeVisible({ timeout: 5_000 })
  }
}
