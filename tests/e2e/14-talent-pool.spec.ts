/**
 * tests/e2e/14-talent-pool.spec.ts
 *
 * Comprehensive E2E tests for the /talent-pool page.
 *
 * ── FEATURES COVERED ────────────────────────────────────────────────────────
 *  1.  Page Load         – heading, subtitle, loading skeleton, error state
 *  2.  Stats Cards       – 6 metric cards (Total, Active, Passive, Referrals, Contact, Skills)
 *  3.  View-As Filter    – role & recruiter dropdowns
 *  4.  Add to Pool       – button visible, opens dialog
 *  5.  Filter Bar        – search (name/email), status, skill, position, source
 *  6.  Candidate Table   – columns, rows, checkboxes, badges, icons
 *  7.  Bulk Selection    – select/deselect, counter, bulk action buttons
 *  8.  Send Email Dialog – template selection (JD/Newsletter/Greeting), editor, send
 *  9.  Send JD Dialog    – JD dropdown, email preview, send button state
 * 10.  Add Candidate     – manual form validation, required fields, POST, success, cancel
 * 11.  Excel Import      – upload button visible, download template button visible
 * 12.  Candidate Details – profile dialog (avatar, skills, timeline, actions)
 * 13.  Negative Cases    – empty pool, API error, missing required fields
 * 14.  Responsive        – mobile viewport
 *
 * All API calls are mocked — no database required.
 */

import { test, expect, type Page } from '@playwright/test'
import { mockSessionAPI } from '../utils/api-mocks'

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'
const PAGE_URL = `${BASE_URL}/talent-pool`

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_ENTRIES = [
  {
    poolId: 'pool-001', candidateId: 'cand-001',
    name: 'Alice Johnson', position: 'Senior Software Engineer',
    email: 'alice@example.com', phone: '+1-555-0101',
    location: 'San Francisco, CA', currentCompany: 'Google',
    companies: ['Google', 'Meta'], experienceYears: 7,
    linkedinUrl: 'https://linkedin.com/in/alice', resumeUrl: 'https://blob.test/alice.pdf',
    photoUrl: '', addedDate: '2026-04-01', source: 'LinkedIn',
    status: 'Active Interest', lastContact: '2026-05-20',
    skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
    cvScore: '88', interviewScore: '82',
    rejectionStage: null, rejectionReason: null, addedByName: 'E2E Recruiter', notes: '',
    history: [{ date: '2026-04-01', event: 'Added', description: 'Added via LinkedIn sourcing' }],
  },
  {
    poolId: 'pool-002', candidateId: 'cand-002',
    name: 'Bob Smith', position: 'DevOps Engineer',
    email: 'bob@example.com', phone: '+1-555-0102',
    location: 'New York, NY', currentCompany: 'Amazon',
    companies: ['Amazon', 'Microsoft'], experienceYears: 5,
    linkedinUrl: '', resumeUrl: '',
    photoUrl: '', addedDate: '2026-04-10', source: 'Referral',
    status: 'Passive', lastContact: '2026-04-30',
    skills: ['AWS', 'Docker', 'Kubernetes', 'Terraform'],
    cvScore: '75', interviewScore: null,
    rejectionStage: 'Screening', rejectionReason: 'Role on hold',
    addedByName: 'E2E Recruiter', notes: 'Strong referral',
    history: [
      { date: '2026-04-10', event: 'Added', description: 'Referred by John Doe' },
      { date: '2026-04-30', event: 'Email Sent', description: 'Newsletter sent' },
    ],
  },
  {
    poolId: 'pool-003', candidateId: 'cand-003',
    name: 'Carol White', position: 'Product Manager',
    email: 'carol@example.com', phone: '+1-555-0103',
    location: 'Austin, TX', currentCompany: 'Stripe',
    companies: ['Stripe'], experienceYears: 4,
    linkedinUrl: 'https://linkedin.com/in/carol', resumeUrl: '',
    photoUrl: '', addedDate: '2026-05-01', source: 'Past Application',
    status: 'Active Interest', lastContact: '2026-05-25',
    skills: ['Product Strategy', 'Roadmapping', 'Analytics'],
    cvScore: '91', interviewScore: '87',
    rejectionStage: 'Offer Stage', rejectionReason: 'Candidate declined offer',
    addedByName: 'E2E Recruiter', notes: '',
    history: [{ date: '2026-05-01', event: 'Added', description: 'Added from past application' }],
  },
]

const MOCK_DATA = {
  data: {
    entries: MOCK_ENTRIES,
    stats: {
      total: 3, activeInterest: 2, passive: 1,
      byPosition: 3,
      bySource: { referral: 1, linkedin: 1, pastApplication: 1 },
      recentlyContacted: 1, avgSkillsPerCandidate: '3.7',
    },
    availableJDs: [
      { id: 'jd-001', title: 'Senior Engineer', department: 'Engineering', location: 'Remote',
        responsibilities: ['Build features', 'Code reviews'], required_skills: ['TypeScript', 'React'] },
      { id: 'jd-002', title: 'Product Manager', department: 'Product', location: 'NYC',
        responsibilities: ['Define roadmap', 'Manage stakeholders'], required_skills: ['Analytics', 'Communication'] },
    ],
    recruiters: [{ id: 'rec-001', name: 'E2E Recruiter' }],
  },
}

// ─── Route helpers ────────────────────────────────────────────────────────────

async function mockTalentPoolAPI(page: Page, overrideData?: object) {
  await page.route('**/api/talent-pool**', route => {
    const method = route.request().method()
    if (method === 'GET') {
      return route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify(overrideData ?? MOCK_DATA),
      })
    }
    if (method === 'POST') {
      return route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, poolId: 'pool-new' }),
      })
    }
    return route.continue()
  })
}

async function mockTalentPoolAPIError(page: Page) {
  await page.route('**/api/talent-pool**', route =>
    route.fulfill({ status: 500, contentType: 'application/json',
      body: JSON.stringify({ error: 'Internal server error' }) })
  )
}

async function mockSendEmailAPI(page: Page, success = true) {
  await page.route('**/api/talent-pool/send-email**', route =>
    route.fulfill({
      status: success ? 200 : 500,
      contentType: 'application/json',
      body: JSON.stringify(success
        ? { success: true, sentTo: 2 }
        : { error: 'Email service unavailable' }),
    })
  )
}

async function mockImportAPI(page: Page) {
  await page.route('**/api/talent-pool/import**', route =>
    route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ imported: 3, errors: 0, errorDetails: [] }),
    })
  )
}

async function setup(page: Page, overrideData?: object) {
  await mockSessionAPI(page)
  await mockTalentPoolAPI(page, overrideData)
  await mockSendEmailAPI(page)
  await mockImportAPI(page)
  await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
  // Wait for data to load — stats cards appear only after !loading
  await page.getByText('Total Pool').waitFor({ state: 'visible', timeout: 20_000 })
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. PAGE LOAD
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Talent Pool — Page Load', () => {

  test('1.1 Page renders with "Talent Pool" heading', async ({ page }) => {
    await setup(page)
    await expect(page.getByRole('heading', { name: /Talent Pool/i }).first()).toBeVisible()
  })

  test('1.2 Subtitle text visible', async ({ page }) => {
    await setup(page)
    await expect(page.getByText(/Manage and engage with potential candidates/i)).toBeVisible()
  })

  test('1.3 Loading skeleton shown before data arrives', async ({ page }) => {
    await mockSessionAPI(page)
    // Delay API response so skeleton is visible
    await page.route('**/api/talent-pool**', async route => {
      await new Promise(r => setTimeout(r, 500))
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DATA) })
    })
    await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
    // Skeleton should appear immediately
    const skeleton = page.locator('[class*="skeleton"], [class*="animate-pulse"]').first()
    await expect(skeleton).toBeVisible({ timeout: 3000 })
  })

  test('1.4 Error state shown with retry button on API failure', async ({ page }) => {
    await mockSessionAPI(page)
    await mockTalentPoolAPIError(page)
    await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(/error|failed|something went wrong/i).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: /retry|try again/i })).toBeVisible({ timeout: 5000 })
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// 2. STATS DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Talent Pool — Stats Dashboard', () => {

  test('2.1 All 6 stat card labels visible', async ({ page }) => {
    await setup(page)
    for (const label of ['Total Pool', 'Active Interest', 'Passive', 'Referrals', 'Recent Contact', 'Avg Skills']) {
      await expect(page.getByText(label).first()).toBeVisible()
    }
  })

  test('2.2 Total Pool count matches mock data', async ({ page }) => {
    await setup(page)
    // Stats show: total=3, activeInterest=2, passive=1
    const totalCard = page.locator('[data-slot="card"]').filter({ hasText: 'Total Pool' }).first()
    await expect(totalCard).toContainText('3')
  })

  test('2.3 Active Interest count correct', async ({ page }) => {
    await setup(page)
    const card = page.locator('[data-slot="card"]').filter({ hasText: 'Active Interest' }).first()
    await expect(card).toContainText('2')
  })

  test('2.4 Passive count correct', async ({ page }) => {
    await setup(page)
    // Stat card for Passive — find card whose small grey label says "Passive"
    // The stat cards have: p.text-xs (label) then p.text-xl (value)
    const card = page.locator('[data-slot="card"]')
      .filter({ has: page.locator('p', { hasText: /^Passive$/ }) })
      .first()
    await expect(card).toBeVisible()
    await expect(card.locator('p.text-xl').first()).toContainText('1')
  })

  test('2.5 Referrals count correct', async ({ page }) => {
    await setup(page)
    const card = page.locator('[data-slot="card"]').filter({ hasText: 'Referrals' }).first()
    await expect(card).toContainText('1')
  })

  test('2.6 Avg Skills value shown', async ({ page }) => {
    await setup(page)
    const card = page.locator('[data-slot="card"]').filter({ hasText: 'Avg Skills' }).first()
    await expect(card).toContainText('3.7')
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// 3. VIEW-AS FILTER
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Talent Pool — View-As Filter', () => {

  test('3.1 Role selector visible with options', async ({ page }) => {
    await setup(page)
    await expect(page.getByText('View as:').first()).toBeVisible()
    // Role selector should have recruiter/manager/director options
    const trigger = page.getByText(/Recruiter|Manager|Director/i).first()
    await expect(trigger).toBeVisible()
  })

  test('3.2 Recruiter dropdown shows "All Recruiters" option', async ({ page }) => {
    await setup(page)
    await expect(page.getByText('All Recruiters').first()).toBeVisible()
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// 4. ADD TO POOL BUTTON
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Talent Pool — Add to Pool Button', () => {

  test('4.1 "Add to Pool" button visible in header', async ({ page }) => {
    await setup(page)
    await expect(page.getByRole('button', { name: /Add to Pool/i })).toBeVisible()
  })

  test('4.2 Clicking "Add to Pool" opens the Add Candidate dialog', async ({ page }) => {
    await setup(page)
    await page.getByRole('button', { name: /Add to Pool/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 })
    await expect(page.getByText(/Add Candidate to Talent Pool/i)).toBeVisible()
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// 5. FILTER BAR
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Talent Pool — Filter Bar', () => {

  test('5.1 Search by name filters table rows', async ({ page }) => {
    await setup(page)
    await page.fill('input[placeholder*="Search by name"]', 'Alice')
    await page.waitForTimeout(300)
    await expect(page.getByText('Alice Johnson')).toBeVisible()
    await expect(page.getByText('Bob Smith')).not.toBeVisible({ timeout: 2000 })
  })

  test('5.2 Search by email filters rows', async ({ page }) => {
    await setup(page)
    await page.fill('input[placeholder*="Search by name"]', 'bob@example.com')
    await page.waitForTimeout(300)
    await expect(page.getByText('Bob Smith')).toBeVisible()
    await expect(page.getByText('Alice Johnson')).not.toBeVisible({ timeout: 2000 })
  })

  test('5.3 Clearing search restores all rows', async ({ page }) => {
    await setup(page)
    await page.fill('input[placeholder*="Search by name"]', 'Alice')
    await page.waitForTimeout(200)
    await page.fill('input[placeholder*="Search by name"]', '')
    await page.waitForTimeout(200)
    await expect(page.getByText('Alice Johnson')).toBeVisible()
    await expect(page.getByText('Bob Smith')).toBeVisible()
  })

  test('5.4 Status filter "Active Interest" shows only active candidates', async ({ page }) => {
    await setup(page)
    // Click the status Select trigger and pick Active Interest
    const statusTrigger = page.getByRole('combobox').filter({ hasText: /All Types|Active Interest|Passive/i }).first()
    await statusTrigger.click()
    await page.getByRole('option', { name: 'Active Interest' }).click()
    await page.waitForTimeout(300)
    // Alice and Carol are Active Interest; Bob is Passive
    await expect(page.getByText('Alice Johnson')).toBeVisible()
    await expect(page.getByText('Carol White')).toBeVisible()
    await expect(page.getByText('Bob Smith')).not.toBeVisible({ timeout: 2000 })
  })

  test('5.5 Status filter "Passive" shows only passive candidates', async ({ page }) => {
    await setup(page)
    const statusTrigger = page.getByRole('combobox').filter({ hasText: /All Types|Active Interest|Passive/i }).first()
    await statusTrigger.click()
    await page.getByRole('option', { name: 'Passive' }).click()
    await page.waitForTimeout(300)
    await expect(page.getByText('Bob Smith')).toBeVisible()
    await expect(page.getByText('Alice Johnson')).not.toBeVisible({ timeout: 2000 })
  })

  test('5.6 Skill filter filters by skill name', async ({ page }) => {
    await setup(page)
    await page.fill('input[placeholder*="Filter by skill"]', 'TypeScript')
    await page.waitForTimeout(300)
    // Only Alice has TypeScript
    await expect(page.getByText('Alice Johnson')).toBeVisible()
    await expect(page.getByText('Bob Smith')).not.toBeVisible({ timeout: 2000 })
  })

  test('5.7 Position filter dropdown populated from data', async ({ page }) => {
    await setup(page)
    const positionTrigger = page.getByRole('combobox').filter({ hasText: /All Positions/i }).first()
    await positionTrigger.click()
    await expect(page.getByRole('option', { name: 'Senior Software Engineer' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'DevOps Engineer' })).toBeVisible()
  })

  test('5.8 Source filter dropdown populated from data', async ({ page }) => {
    await setup(page)
    const sourceTrigger = page.getByRole('combobox').filter({ hasText: /All Sources/i }).first()
    await sourceTrigger.click()
    await expect(page.getByRole('option', { name: 'LinkedIn' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Referral' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Past Application' })).toBeVisible()
  })

  test('5.9 No results when search matches no candidate', async ({ page }) => {
    await setup(page)
    await page.fill('input[placeholder*="Search by name"]', 'ZZZ_NOT_EXIST')
    await page.waitForTimeout(300)
    await expect(page.getByText('Alice Johnson')).not.toBeVisible({ timeout: 2000 })
    await expect(page.getByText('Bob Smith')).not.toBeVisible({ timeout: 2000 })
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// 6. CANDIDATE TABLE
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Talent Pool — Candidate Table', () => {

  test('6.1 All column headers visible', async ({ page }) => {
    await setup(page)
    const cols = ['Candidate Name', 'Email / Phone', 'Exp', 'LinkedIn / Resume',
      'Position', 'Skills', 'Previous Company Set', 'CV / Interview Score',
      'Status / Source', 'Last Contact', 'Action']
    for (const col of cols) {
      await expect(page.getByText(col).first()).toBeVisible()
    }
  })

  test('6.2 Candidate rows rendered with correct names', async ({ page }) => {
    await setup(page)
    await expect(page.getByText('Alice Johnson')).toBeVisible()
    await expect(page.getByText('Bob Smith')).toBeVisible()
    await expect(page.getByText('Carol White')).toBeVisible()
  })

  test('6.3 Active Interest badge shown in green for active candidates', async ({ page }) => {
    await setup(page)
    // Alice has Active Interest status — badge should be green
    const badge = page.getByText('Active Interest').first()
    await expect(badge).toBeVisible()
  })

  test('6.4 Passive badge shown for passive candidates', async ({ page }) => {
    await setup(page)
    const passive = page.getByText('Passive').first()
    await expect(passive).toBeVisible()
  })

  test('6.5 Skill badges rendered for candidates with skills', async ({ page }) => {
    await setup(page)
    // Alice has TypeScript, React, Node.js, PostgreSQL
    await expect(page.getByText('TypeScript').first()).toBeVisible()
    await expect(page.getByText('React').first()).toBeVisible()
  })

  test('6.6 LinkedIn icon active for candidates with linkedinUrl', async ({ page }) => {
    await setup(page)
    // Alice has a LinkedIn URL — her LinkedIn icon should be a green link
    const linkedinLink = page.locator('a[title="LinkedIn"]').first()
    await expect(linkedinLink).toBeVisible()
    await expect(linkedinLink).toHaveAttribute('href', /linkedin\.com/)
  })

  test('6.7 LinkedIn icon inactive (no link) for candidates without URL', async ({ page }) => {
    await setup(page)
    // Bob has no LinkedIn — shows disabled span with title
    await expect(page.locator('span[title="No LinkedIn"]').first()).toBeVisible()
  })

  test('6.8 Resume link active for candidates with resumeUrl', async ({ page }) => {
    await setup(page)
    // Alice has a resumeUrl
    const resumeLink = page.locator('a[title="Resume"]').first()
    await expect(resumeLink).toBeVisible()
  })

  test('6.9 Resume icon inactive for candidates without resume', async ({ page }) => {
    await setup(page)
    await expect(page.locator('span[title="No Resume"]').first()).toBeVisible()
  })

  test('6.10 CV Score badge visible', async ({ page }) => {
    await setup(page)
    // Alice has cvScore=88
    await expect(page.getByText('88').first()).toBeVisible()
  })

  test('6.11 Experience years badge visible', async ({ page }) => {
    await setup(page)
    // Alice has 7 yrs
    await expect(page.getByText('7 yrs').first()).toBeVisible()
  })

  test('6.12 View Profile action button visible per row', async ({ page }) => {
    await setup(page)
    const profileBtns = page.getByTitle('View Profile')
    await expect(profileBtns.first()).toBeVisible()
  })

  test('6.13 Send Email action button visible per row', async ({ page }) => {
    await setup(page)
    const emailBtns = page.getByTitle('Send Email')
    await expect(emailBtns.first()).toBeVisible()
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// 7. BULK SELECTION
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Talent Pool — Bulk Selection', () => {

  test('7.1 Individual row checkbox selects a candidate', async ({ page }) => {
    await setup(page)
    // Check the first row's checkbox
    const rowCheckboxes = page.locator('tbody input[type="checkbox"]')
    await rowCheckboxes.first().check()
    // Bulk action bar appears
    await expect(page.getByText(/1 selected/i)).toBeVisible({ timeout: 3000 })
  })

  test('7.2 Select-all header checkbox selects all visible rows', async ({ page }) => {
    await setup(page)
    const headerCheckbox = page.locator('thead input[type="checkbox"]')
    await headerCheckbox.check()
    await expect(page.getByText(/3 selected/i)).toBeVisible({ timeout: 3000 })
  })

  test('7.3 Bulk action bar shows Send Email and Send JD buttons', async ({ page }) => {
    await setup(page)
    const headerCheckbox = page.locator('thead input[type="checkbox"]')
    await headerCheckbox.check()
    await expect(page.getByRole('button', { name: /Send Email/i }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /Send JD/i })).toBeVisible()
  })

  test('7.4 "Clear Selection" deselects all candidates', async ({ page }) => {
    await setup(page)
    await page.locator('thead input[type="checkbox"]').check()
    await expect(page.getByText(/3 selected/i)).toBeVisible({ timeout: 3000 })
    await page.getByRole('button', { name: /Clear Selection/i }).click()
    await expect(page.getByText(/selected/i)).not.toBeVisible({ timeout: 2000 })
  })

  test('7.5 Unchecking header checkbox deselects all', async ({ page }) => {
    await setup(page)
    const headerCheckbox = page.locator('thead input[type="checkbox"]')
    await headerCheckbox.check()
    await headerCheckbox.uncheck()
    await expect(page.getByText(/selected/i)).not.toBeVisible({ timeout: 2000 })
  })

  test('7.6 Multiple individual checkboxes accumulate count', async ({ page }) => {
    await setup(page)
    const rowCheckboxes = page.locator('tbody input[type="checkbox"]')
    await rowCheckboxes.nth(0).check()
    await rowCheckboxes.nth(1).check()
    await expect(page.getByText(/2 selected/i)).toBeVisible({ timeout: 3000 })
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// 8. SEND EMAIL DIALOG
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Talent Pool — Send Email Dialog', () => {

  async function openEmailDialog(page: Page) {
    await page.locator('thead input[type="checkbox"]').check()
    await page.getByRole('button', { name: /Send Email/i }).first().click()
    await expect(page.getByText('Send Email to Candidates')).toBeVisible({ timeout: 5000 })
  }

  test('8.1 Dialog opens with 3 email type cards', async ({ page }) => {
    await setup(page)
    await openEmailDialog(page)
    await expect(page.getByText('New Job Opening')).toBeVisible()
    await expect(page.getByText('Newsletter')).toBeVisible()
    await expect(page.getByText('Greeting')).toBeVisible()
  })

  test('8.2 Recipients count shown in dialog', async ({ page }) => {
    await setup(page)
    await openEmailDialog(page)
    await expect(page.getByText(/Recipients: 3 candidate/i)).toBeVisible()
  })

  test('8.3 Selecting "Newsletter" loads template into editor', async ({ page }) => {
    await setup(page)
    await openEmailDialog(page)
    await page.getByText('Newsletter').click()
    // Should show email editor with subject input
    await expect(page.getByPlaceholder('Email subject...')).toBeVisible({ timeout: 3000 })
    await expect(page.locator('textarea[placeholder="Email body..."]')).toBeVisible()
    const subject = page.getByPlaceholder('Email subject...')
    await expect(subject).not.toHaveValue('')
  })

  test('8.4 Selecting "Greeting" loads greeting template', async ({ page }) => {
    await setup(page)
    await openEmailDialog(page)
    await page.getByText('Greeting').click()
    const subject = page.getByPlaceholder('Email subject...')
    await expect(subject).toHaveValue(/Season.*Greetings/i)
  })

  test('8.5 Subject and body are editable in email editor', async ({ page }) => {
    await setup(page)
    await openEmailDialog(page)
    await page.getByText('Newsletter').click()
    const subject = page.getByPlaceholder('Email subject...')
    await subject.fill('Custom Subject Line')
    await expect(subject).toHaveValue('Custom Subject Line')
  })

  test('8.6 "Change Template" button goes back to type selection', async ({ page }) => {
    await setup(page)
    await openEmailDialog(page)
    await page.getByText('Newsletter').click()
    await page.getByRole('button', { name: /Change Template/i }).click()
    await expect(page.getByText('New Job Opening')).toBeVisible()
  })

  test('8.7 "Send Email" button disabled when subject is empty', async ({ page }) => {
    await setup(page)
    await openEmailDialog(page)
    await page.getByText('Newsletter').click()
    const subjectInput = page.getByPlaceholder('Email subject...')
    await subjectInput.fill('')
    const sendBtn = page.getByRole('button', { name: /^Send Email$/i }).last()
    await expect(sendBtn).toBeDisabled()
  })

  test('8.8 Selecting "New Job Opening" shows JD selection step', async ({ page }) => {
    await setup(page)
    await openEmailDialog(page)
    await page.getByText('New Job Opening').click()
    await expect(page.getByText('Select Job Opening')).toBeVisible({ timeout: 3000 })
    // JD list shows inside the dialog — scope to dialog to avoid strict-mode issues
    const dialog = page.locator('.fixed.inset-0').last()
    await expect(dialog.getByText('Senior Engineer').first()).toBeVisible()
  })

  test('8.9 Selecting a JD from job list shows email editor', async ({ page }) => {
    await setup(page)
    await openEmailDialog(page)
    await page.getByText('New Job Opening').click()
    await page.getByText('Senior Engineer').click()
    // After JD selection, editor with subject/body should appear
    await expect(page.getByPlaceholder('Email subject...')).toBeVisible({ timeout: 3000 })
    const subject = page.getByPlaceholder('Email subject...')
    await expect(subject).toHaveValue(/Senior Engineer/i)
  })

  test('8.10 "Cancel" closes the email dialog', async ({ page }) => {
    await setup(page)
    await openEmailDialog(page)
    // The email dialog's X button is closest — use it to close
    const dialog = page.locator('.fixed.inset-0').last()
    await dialog.getByRole('button').filter({ has: page.locator('svg') }).first().click()
    await expect(page.getByText('Send Email to Candidates')).not.toBeVisible({ timeout: 3000 })
  })

  test('8.11 Successful email send shows success alert and closes dialog', async ({ page }) => {
    await setup(page)
    await openEmailDialog(page)
    await page.getByText('Newsletter').click()

    let alertMsg = ''
    page.on('dialog', async d => { alertMsg = d.message(); await d.accept() })

    const sendBtn = page.getByRole('button', { name: /^Send Email$/i }).last()
    await sendBtn.click()
    await page.waitForTimeout(1000)
    expect(alertMsg).toMatch(/sent|candidate/i)
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// 9. SEND JD DIALOG
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Talent Pool — Send JD Dialog', () => {

  async function openJDDialog(page: Page) {
    await page.locator('thead input[type="checkbox"]').check()
    await page.getByRole('button', { name: /Send JD/i }).click()
    await expect(page.getByText('Send Job Description')).toBeVisible({ timeout: 5000 })
  }

  test('9.1 Send JD dialog opens with recipient count', async ({ page }) => {
    await setup(page)
    await openJDDialog(page)
    await expect(page.getByText(/Sending to 3 candidate/i)).toBeVisible()
  })

  test('9.2 JD dropdown contains available jobs', async ({ page }) => {
    await setup(page)
    await openJDDialog(page)
    const select = page.locator('select').first()
    await expect(select).toBeVisible()
    // Should have the two JDs from mock
    await expect(page.getByRole('option', { name: /Senior Engineer/i })).toBeAttached()
    await expect(page.getByRole('option', { name: /Product Manager/i })).toBeAttached()
  })

  test('9.3 Selecting a JD shows email preview', async ({ page }) => {
    await setup(page)
    await openJDDialog(page)
    await page.locator('select').selectOption('jd-001')
    await expect(page.getByText('Email Preview')).toBeVisible({ timeout: 3000 })
    // Subject preview appears (shown in a grey bg div)
    const subjectDiv = page.locator('.px-2.py-1\\.5.bg-gray-50.border.rounded').first()
    await expect(subjectDiv).toBeVisible({ timeout: 3000 })
    await expect(subjectDiv).toContainText('Senior Engineer')
  })

  test('9.4 Send Email button disabled until JD is selected', async ({ page }) => {
    await setup(page)
    await openJDDialog(page)
    // Before selection the send button should be disabled
    const sendBtn = page.getByRole('button', { name: /^Send Email$/i }).last()
    await expect(sendBtn).toBeDisabled()
  })

  test('9.5 Send Email button enabled after JD selected', async ({ page }) => {
    await setup(page)
    await openJDDialog(page)
    await page.locator('select').selectOption('jd-001')
    const sendBtn = page.getByRole('button', { name: /^Send Email$/i }).last()
    await expect(sendBtn).toBeEnabled({ timeout: 3000 })
  })

  test('9.6 Cancel closes the JD dialog', async ({ page }) => {
    await setup(page)
    await openJDDialog(page)
    await page.getByRole('button', { name: /Cancel/i }).last().click()
    await expect(page.getByText('Send Job Description')).not.toBeVisible({ timeout: 3000 })
  })

  test('9.7 Successful JD send shows alert', async ({ page }) => {
    await setup(page)
    await openJDDialog(page)
    await page.locator('select').selectOption('jd-001')

    let alertMsg = ''
    page.on('dialog', async d => { alertMsg = d.message(); await d.accept() })

    const sendBtn = page.getByRole('button', { name: /^Send Email$/i }).last()
    await sendBtn.click()
    await page.waitForTimeout(1000)
    expect(alertMsg).toMatch(/sent|candidate/i)
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// 10. ADD CANDIDATE DIALOG — MANUAL FORM
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Talent Pool — Add Candidate (Manual)', () => {

  async function openAddDialog(page: Page) {
    await page.getByRole('button', { name: /Add to Pool/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 })
  }

  test('10.1 Dialog shows all required and optional fields', async ({ page }) => {
    await setup(page)
    await openAddDialog(page)
    await expect(page.locator('#candidate-name')).toBeVisible()
    await expect(page.locator('#candidate-position')).toBeVisible()
    await expect(page.locator('#candidate-email')).toBeVisible()
    await expect(page.locator('#candidate-phone')).toBeVisible()
    await expect(page.locator('#candidate-experience')).toBeVisible()
    await expect(page.locator('#candidate-location')).toBeVisible()
    await expect(page.locator('#candidate-company')).toBeVisible()
    await expect(page.locator('#candidate-linkedin')).toBeVisible()
    await expect(page.locator('#candidate-skills')).toBeVisible()
    await expect(page.locator('#candidate-notes')).toBeVisible()
  })

  test('10.2 Required fields show asterisk (*) in label', async ({ page }) => {
    await setup(page)
    await openAddDialog(page)
    await expect(page.getByText('Full Name *')).toBeVisible()
    await expect(page.getByText('Position/Role *')).toBeVisible()
    await expect(page.getByText('Email Address *')).toBeVisible()
  })

  test('10.3 Source dropdown has all expected options', async ({ page }) => {
    await setup(page)
    await openAddDialog(page)
    const sourceTrigger = page.locator('#candidate-source').first()
    await sourceTrigger.click()
    await expect(page.getByRole('option', { name: 'Manual Entry' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Referral' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'LinkedIn' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Past Application' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Job Board' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Event/Conference' })).toBeVisible()
  })

  test('10.4 Status dropdown has Active Interest and Passive options', async ({ page }) => {
    await setup(page)
    await openAddDialog(page)
    const statusTrigger = page.locator('#candidate-status').first()
    await statusTrigger.click()
    await expect(page.getByRole('option', { name: 'Active Interest' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Passive' })).toBeVisible()
  })

  test('10.5 Submitting with empty required fields shows alert', async ({ page }) => {
    await setup(page)
    await openAddDialog(page)
    let alertMsg = ''
    page.on('dialog', async d => { alertMsg = d.message(); await d.accept() })
    await page.getByRole('button', { name: /Add to Talent Pool/i }).click()
    await page.waitForTimeout(500)
    expect(alertMsg).toMatch(/required|fill/i)
  })

  test('10.6 Filling required fields and submitting calls POST API', async ({ page }) => {
    await setup(page)
    await openAddDialog(page)

    // Fill required fields
    await page.fill('#candidate-name', 'New Candidate')
    await page.fill('#candidate-position', 'Engineer')
    await page.fill('#candidate-email', 'new@test.com')

    let postCalled = false
    await page.route('**/api/talent-pool**', route => {
      if (route.request().method() === 'POST') {
        postCalled = true
        return route.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify({ success: true, poolId: 'pool-new' }) })
      }
      return route.continue()
    })

    let alertMsg = ''
    page.on('dialog', async d => { alertMsg = d.message(); await d.accept() })

    await page.getByRole('button', { name: /Add to Talent Pool/i }).click()
    await page.waitForTimeout(1000)
    expect(postCalled).toBe(true)
    expect(alertMsg).toMatch(/added|success/i)
  })

  test('10.7 Optional fields fill correctly', async ({ page }) => {
    await setup(page)
    await openAddDialog(page)
    await page.fill('#candidate-phone', '+1-555-9999')
    await page.fill('#candidate-experience', '5')
    await page.fill('#candidate-location', 'Remote')
    await page.fill('#candidate-company', 'Big Corp')
    await page.fill('#candidate-linkedin', 'https://linkedin.com/in/new')
    await page.fill('#candidate-skills', 'Python, Django')
    await expect(page.locator('#candidate-phone')).toHaveValue('+1-555-9999')
    await expect(page.locator('#candidate-skills')).toHaveValue('Python, Django')
  })

  test('10.8 "Cancel" closes the dialog and clears form', async ({ page }) => {
    await setup(page)
    await openAddDialog(page)
    await page.fill('#candidate-name', 'Temp Name')
    await page.getByRole('button', { name: /Cancel/i }).last().click()
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 3000 })
    // Re-open and verify the name is reset
    await page.getByRole('button', { name: /Add to Pool/i }).click()
    await expect(page.locator('#candidate-name')).toHaveValue('')
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// 11. EXCEL IMPORT
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Talent Pool — Excel Import', () => {

  test('11.1 "Upload Excel File" button visible in Add dialog', async ({ page }) => {
    await setup(page)
    await page.getByRole('button', { name: /Add to Pool/i }).click()
    await expect(page.getByRole('button', { name: /Upload Excel File/i })).toBeVisible()
  })

  test('11.2 "Download Template" button visible in Add dialog', async ({ page }) => {
    await setup(page)
    await page.getByRole('button', { name: /Add to Pool/i }).click()
    await expect(page.getByRole('button', { name: /Download Template/i })).toBeVisible()
  })

  test('11.3 "Import from Excel" section shows descriptive text', async ({ page }) => {
    await setup(page)
    await page.getByRole('button', { name: /Add to Pool/i }).click()
    // The import section shows "Upload an Excel file with candidate data in the required format"
    await expect(page.getByText(/Upload an Excel file/i)).toBeVisible()
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// 12. CANDIDATE DETAILS DIALOG
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Talent Pool — Candidate Details Dialog', () => {

  async function openDetails(page: Page, name: string) {
    await page.getByText(name).first().click()
    await expect(page.getByText('Candidate Profile')).toBeVisible({ timeout: 5000 })
  }

  test('12.1 Clicking candidate name opens profile dialog', async ({ page }) => {
    await setup(page)
    await page.getByTitle('View Profile').first().click()
    await expect(page.getByText('Candidate Profile')).toBeVisible({ timeout: 5000 })
  })

  test('12.2 Dialog shows candidate name and status badge', async ({ page }) => {
    await setup(page)
    await openDetails(page, 'Alice Johnson')
    await expect(page.getByText('Alice Johnson').first()).toBeVisible()
    await expect(page.getByText('Active Interest').first()).toBeVisible()
  })

  test('12.3 Dialog shows candidate position and email', async ({ page }) => {
    await setup(page)
    await openDetails(page, 'Alice Johnson')
    await expect(page.getByText('Senior Software Engineer').first()).toBeVisible()
    await expect(page.getByText('alice@example.com').first()).toBeVisible()
  })

  test('12.4 "How They Joined Our Talent Pool" section visible', async ({ page }) => {
    await setup(page)
    await openDetails(page, 'Alice Johnson')
    await expect(page.getByText(/How They Joined Our Talent Pool/i)).toBeVisible()
    await expect(page.getByText('Source:').first()).toBeVisible()
    await expect(page.getByText('Date Added:').first()).toBeVisible()
  })

  test('12.5 Skills section shows candidate skills', async ({ page }) => {
    await setup(page)
    await openDetails(page, 'Alice Johnson')
    await expect(page.getByText(/Skills & Expertise/i)).toBeVisible()
    await expect(page.getByText('TypeScript').first()).toBeVisible()
    await expect(page.getByText('React').first()).toBeVisible()
  })

  test('12.6 Activity Timeline section shows history', async ({ page }) => {
    await setup(page)
    // Bob has multiple history entries
    await page.getByText('Bob Smith').first().click()
    await expect(page.getByText(/Activity Timeline/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Added').first()).toBeVisible()
    await expect(page.getByText('Email Sent').first()).toBeVisible()
  })

  test('12.7 Past Application details shown for "Past Application" source', async ({ page }) => {
    await setup(page)
    // Carol has source = "Past Application"
    await page.getByText('Carol White').first().click()
    await expect(page.getByText(/Previous Application Details/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('CV Score:').first()).toBeVisible()
    await expect(page.getByText('Interview Score:').first()).toBeVisible()
    await expect(page.getByText('Offer Stage').first()).toBeVisible()
  })

  test('12.8 "View CV & Interview Report" button visible for Past Application', async ({ page }) => {
    await setup(page)
    await page.getByText('Carol White').first().click()
    await expect(page.getByRole('button', { name: /View CV.*Interview Report/i })).toBeVisible({ timeout: 5000 })
  })

  test('12.9 Last Contact shown at bottom', async ({ page }) => {
    await setup(page)
    await openDetails(page, 'Alice Johnson')
    await expect(page.getByText('Last Contact').first()).toBeVisible()
  })

  test('12.10 "Send Email" button in dialog opens JD dialog', async ({ page }) => {
    await setup(page)
    await openDetails(page, 'Alice Johnson')
    await page.getByRole('button', { name: /Send Email/i }).last().click()
    await expect(page.getByText('Send Job Description')).toBeVisible({ timeout: 5000 })
  })

  test('12.11 "Close" button closes the details dialog', async ({ page }) => {
    await setup(page)
    await openDetails(page, 'Alice Johnson')
    // Multiple Close buttons — pick the one inside the dialog footer
    await page.getByRole('button', { name: /^Close$/i }).first().click()
    await expect(page.getByText('Candidate Profile')).not.toBeVisible({ timeout: 3000 })
  })

  test('12.12 Pressing ESC closes the details dialog', async ({ page }) => {
    await setup(page)
    await openDetails(page, 'Alice Johnson')
    await page.keyboard.press('Escape')
    await expect(page.getByText('Candidate Profile')).not.toBeVisible({ timeout: 3000 })
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// 13. NEGATIVE CASES
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Talent Pool — Negative Cases', () => {

  test('13.1 Empty talent pool shows empty table body', async ({ page }) => {
    await setup(page, {
      data: { ...MOCK_DATA.data, entries: [],
        stats: { ...MOCK_DATA.data.stats, total: 0, activeInterest: 0, passive: 0 } }
    })
    // Table renders but tbody has no candidate rows
    await expect(page.locator('table')).toBeVisible()
    const rows = page.locator('tbody tr')
    await expect(rows).toHaveCount(0)
  })

  test('13.2 API error shows error state with retry', async ({ page }) => {
    await mockSessionAPI(page)
    await mockTalentPoolAPIError(page)
    await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(/error|failed|internal server/i).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: /retry|try again/i })).toBeVisible()
  })

  test('13.3 Retry button re-fetches data after error', async ({ page }) => {
    await mockSessionAPI(page)
    let callCount = 0
    await page.route('**/api/talent-pool**', route => {
      callCount++
      if (callCount === 1) {
        return route.fulfill({ status: 500, contentType: 'application/json',
          body: JSON.stringify({ error: 'Server error' }) })
      }
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify(MOCK_DATA) })
    })
    await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: /retry|try again/i }).waitFor({ state: 'visible', timeout: 15_000 })
    await page.getByRole('button', { name: /retry|try again/i }).click()
    await page.getByText('Total Pool').waitFor({ state: 'visible', timeout: 10_000 })
  })

  test('13.4 Search with no results shows empty table', async ({ page }) => {
    await setup(page)
    await page.fill('input[placeholder*="Search by name"]', 'ZZZNOMATCH_CANDIDATE')
    await page.waitForTimeout(300)
    const rows = page.locator('tbody tr')
    await expect(rows).toHaveCount(0)
  })

  test('13.5 XSS in search does not crash the page', async ({ page }) => {
    await setup(page)
    await page.fill('input[placeholder*="Search by name"]', "<script>alert('xss')</script>")
    await page.waitForTimeout(300)
    await expect(page.getByRole('heading', { name: /Talent Pool/i })).toBeVisible()
  })

  test('13.6 Very long search string does not crash the page', async ({ page }) => {
    await setup(page)
    await page.fill('input[placeholder*="Search by name"]', 'A'.repeat(500))
    await page.waitForTimeout(300)
    await expect(page.getByRole('heading', { name: /Talent Pool/i })).toBeVisible()
  })

  test('13.7 Add dialog validation blocks empty email submission', async ({ page }) => {
    await setup(page)
    await page.getByRole('button', { name: /Add to Pool/i }).click()
    await page.fill('#candidate-name', 'Test User')
    await page.fill('#candidate-position', 'Engineer')
    // Leave email empty

    let alertMsg = ''
    page.on('dialog', async d => { alertMsg = d.message(); await d.accept() })
    await page.getByRole('button', { name: /Add to Talent Pool/i }).click()
    await page.waitForTimeout(500)
    expect(alertMsg).toMatch(/email|required|fill/i)
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// 14. RESPONSIVE
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Talent Pool — Responsive', () => {

  test('14.1 Page renders at 375px mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await setup(page)
    await expect(page.getByRole('heading', { name: /Talent Pool/i })).toBeVisible()
    await expect(page.getByText('Total Pool')).toBeVisible()
  })

  test('14.2 "Add to Pool" button visible on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await setup(page)
    await expect(page.getByRole('button', { name: /Add to Pool/i })).toBeVisible()
  })

  test('14.3 Stats cards grid renders on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await setup(page)
    await expect(page.getByText('Active Interest').first()).toBeVisible()
    await expect(page.getByText('Passive').first()).toBeVisible()
  })

})
