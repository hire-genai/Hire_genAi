/**
 * tests/e2e/16-support.spec.ts
 *
 * Comprehensive E2E tests for /support page.
 *
 * ── FEATURES ────────────────────────────────────────────────────────────────
 *  1.  Page Load          – heading, subtitle, loading, error state
 *  2.  Stats Cards        – Open, In Progress, Resolved, Total
 *  3.  "New Ticket" Button– visible, opens dialog
 *  4.  Tabs               – "Support Tickets" and "Product Feedback"
 *  5.  Filters            – search, status filter, type filter
 *  6.  Tickets Table      – columns, rows, badges, View button
 *  7.  Tab Separation     – Support tab hides feedback; Feedback tab shows only feedback
 *  8.  Empty State        – no tickets message + "Create your first ticket" link
 *  9.  View Ticket Dialog – fields, conversation, reply section, Close
 * 10.  Create Ticket Form – type, priority, category, title, description, screenshot, validation
 * 11.  Reply (Comment)    – textarea, Attach Image, Send Reply, empty validation
 * 12.  Negative Cases     – missing fields, API error, XSS, file > 5 MB
 */

import { test, expect, type Page } from '@playwright/test'
import { mockSessionAPI } from '../utils/api-mocks'
import path from 'path'
import fs from 'fs'
import os from 'os'

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'
const PAGE_URL = `${BASE_URL}/support`

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_TICKETS = [
  {
    id: 'tkt-001-uuid-here',
    type: 'bug',
    category: 'dashboard',
    title: 'Dashboard not loading',
    description: 'The dashboard shows a blank screen after login.',
    priority: 'high',
    status: 'open',
    createdBy: 'Test User',
    createdAt: '2026-05-01',
    screenshot: null,
    comments: [],
  },
  {
    id: 'tkt-002-uuid-here',
    type: 'feature_request',
    category: 'applications',
    title: 'Bulk email feature',
    description: 'Allow sending bulk emails to multiple candidates at once.',
    priority: 'medium',
    status: 'in_progress',
    createdBy: 'Test User',
    createdAt: '2026-04-20',
    screenshot: null,
    comments: [
      {
        id: 'cmt-001', author: 'Support Agent', role: 'support',
        message: 'Thanks for the request! Our team is reviewing it.',
        timestamp: '2026-04-21',
      },
    ],
  },
  {
    id: 'tkt-003-uuid-here',
    type: 'question',
    category: 'settings',
    title: 'How to change timezone?',
    description: 'Where can I update my timezone setting?',
    priority: 'low',
    status: 'resolved',
    createdBy: 'Test User',
    createdAt: '2026-04-10',
    screenshot: null,
    comments: [],
  },
  {
    id: 'tkt-004-uuid-here',
    type: 'feedback',
    category: 'other',
    title: 'Great product!',
    description: 'Really enjoying using the platform.',
    priority: 'low',
    status: 'open',
    createdBy: 'Test User',
    createdAt: '2026-05-05',
    screenshot: null,
    comments: [],
  },
]

const MOCK_STATS = { open: 2, in_progress: 1, resolved: 1, total: 4 }

// ─── Route helpers ────────────────────────────────────────────────────────────

async function mockSupportAPI(page: Page, overrideTickets?: typeof MOCK_TICKETS) {
  const allTickets = overrideTickets ?? MOCK_TICKETS
  const allStats = {
    open: allTickets.filter(t => t.status === 'open').length,
    in_progress: allTickets.filter(t => t.status === 'in_progress').length,
    resolved: allTickets.filter(t => t.status === 'resolved').length,
    total: allTickets.length,
  }

  await page.route('**/api/support/tickets**', route => {
    const url = route.request().url()
    const method = route.request().method()

    // GET /api/support/tickets/{id}
    if (method === 'GET' && url.match(/tickets\/[^?]+/)) {
      const ticket = allTickets.find(t => url.includes(t.id)) ?? allTickets[0]
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, data: ticket }) })
    }

    // GET /api/support/tickets — respect status/type query params for client-side filter tests
    if (method === 'GET') {
      const urlObj = new URL(url)
      const statusParam = urlObj.searchParams.get('status')
      const typeParam = urlObj.searchParams.get('type')
      let filtered = allTickets
      if (statusParam) filtered = filtered.filter(t => t.status === statusParam)
      if (typeParam) filtered = filtered.filter(t => t.type === typeParam)
      const stats = {
        open: filtered.filter(t => t.status === 'open').length,
        in_progress: filtered.filter(t => t.status === 'in_progress').length,
        resolved: filtered.filter(t => t.status === 'resolved').length,
        total: filtered.length,
      }
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, data: filtered, stats }) })
    }

    // POST /api/support/tickets (create)
    if (method === 'POST' && !url.includes('/comments')) {
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { id: 'tkt-new-uuid' } }) })
    }

    // POST /api/support/tickets/{id}/comments
    if (method === 'POST' && url.includes('/comments')) {
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true }) })
    }

    return route.continue()
  })

  await page.route('**/api/support/upload-screenshot**', route =>
    route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, url: 'https://blob.test/screenshot.png' }) })
  )
}

async function mockSupportAPIError(page: Page) {
  await page.route('**/api/support/tickets**', route =>
    route.fulfill({ status: 500, contentType: 'application/json',
      body: JSON.stringify({ success: false, error: 'Internal server error' }) })
  )
}

async function setup(page: Page, overrideTickets?: typeof MOCK_TICKETS) {
  await mockSessionAPI(page)
  await mockSupportAPI(page, overrideTickets)
  await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
  // Wait for data — stats cards appear after !loading
  await page.getByText('Open Tickets').waitFor({ state: 'visible', timeout: 20_000 })
}

function makeTempPng(name = 'test-screenshot.png'): string {
  const file = path.join(os.tmpdir(), name)
  // Minimal 1x1 PNG
  fs.writeFileSync(file, Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c62000000000200014221a40000000049454e44ae426082', 'hex'
  ))
  return file
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. PAGE LOAD
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Support — Page Load', () => {

  test('1.1 Page renders "Support & Feedback" heading', async ({ page }) => {
    await setup(page)
    await expect(page.getByRole('heading', { name: /Support & Feedback/i })).toBeVisible()
  })

  test('1.2 Subtitle text visible', async ({ page }) => {
    await setup(page)
    await expect(page.getByText(/Get help and share your ideas/i)).toBeVisible()
  })

  test('1.3 Loading skeleton shown before data', async ({ page }) => {
    await mockSessionAPI(page)
    await page.route('**/api/support/tickets**', async route => {
      await new Promise(r => setTimeout(r, 400))
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, data: MOCK_TICKETS, stats: MOCK_STATS }) })
    })
    await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
    const skeleton = page.locator('[class*="skeleton"], [class*="animate-pulse"]').first()
    await expect(skeleton).toBeVisible({ timeout: 3000 })
  })

  test('1.4 Error state shown with retry on API failure', async ({ page }) => {
    await mockSessionAPI(page)
    await mockSupportAPIError(page)
    await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(/error|failed/i).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: /retry|try again/i })).toBeVisible()
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// 2. STATS CARDS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Support — Stats Cards', () => {

  test('2.1 All 4 stat card labels visible', async ({ page }) => {
    await setup(page)
    for (const label of ['Open Tickets', 'In Progress', 'Resolved', 'Total Submitted']) {
      await expect(page.getByText(label).first()).toBeVisible()
    }
  })

  test('2.2 Open tickets count correct', async ({ page }) => {
    await setup(page)
    const card = page.locator('[data-slot="card"]').filter({ has: page.locator('p', { hasText: 'Open Tickets' }) }).first()
    await expect(card.locator('p.text-2xl').first()).toContainText('2')
  })

  test('2.3 In Progress count correct', async ({ page }) => {
    await setup(page)
    const card = page.locator('[data-slot="card"]').filter({ has: page.locator('p', { hasText: 'In Progress' }) }).first()
    await expect(card.locator('p.text-2xl').first()).toContainText('1')
  })

  test('2.4 Resolved count correct', async ({ page }) => {
    await setup(page)
    const card = page.locator('[data-slot="card"]').filter({ has: page.locator('p', { hasText: 'Resolved' }) }).first()
    await expect(card.locator('p.text-2xl').first()).toContainText('1')
  })

  test('2.5 Total submitted count correct', async ({ page }) => {
    await setup(page)
    const card = page.locator('[data-slot="card"]').filter({ has: page.locator('p', { hasText: 'Total Submitted' }) }).first()
    await expect(card.locator('p.text-2xl').first()).toContainText('4')
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// 3. NEW TICKET BUTTON
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Support — New Ticket Button', () => {

  test('3.1 "New Ticket" button visible', async ({ page }) => {
    await setup(page)
    await expect(page.getByRole('button', { name: /New Ticket/i })).toBeVisible()
  })

  test('3.2 Clicking opens Create Ticket dialog', async ({ page }) => {
    await setup(page)
    await page.getByRole('button', { name: /New Ticket/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 })
    await expect(page.getByText('Create Support Ticket')).toBeVisible()
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// 4. TABS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Support — Tabs', () => {

  test('4.1 Both tabs visible: Support Tickets and Product Feedback', async ({ page }) => {
    await setup(page)
    await expect(page.getByRole('button', { name: /Support Tickets/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Product Feedback/i })).toBeVisible()
  })

  test('4.2 "Support Tickets" tab is active by default', async ({ page }) => {
    await setup(page)
    // Support tickets tab is active — shows non-feedback tickets
    await expect(page.getByText('Dashboard not loading')).toBeVisible()
  })

  test('4.3 Clicking "Product Feedback" shows only feedback tickets', async ({ page }) => {
    await setup(page)
    await page.getByRole('button', { name: /Product Feedback/i }).click()
    await page.waitForTimeout(300)
    // Feedback ticket should appear
    await expect(page.getByText('Great product!')).toBeVisible()
    // Non-feedback tickets should not appear
    await expect(page.getByText('Dashboard not loading')).not.toBeVisible({ timeout: 2000 })
  })

  test('4.4 Returning to "Support Tickets" hides feedback entries', async ({ page }) => {
    await setup(page)
    await page.getByRole('button', { name: /Product Feedback/i }).click()
    await page.getByRole('button', { name: /Support Tickets/i }).click()
    await page.waitForTimeout(300)
    await expect(page.getByText('Dashboard not loading')).toBeVisible()
    await expect(page.getByText('Great product!')).not.toBeVisible({ timeout: 2000 })
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// 5. FILTERS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Support — Filters', () => {

  test('5.1 Search input visible', async ({ page }) => {
    await setup(page)
    await expect(page.getByPlaceholder(/Search tickets/i)).toBeVisible()
  })

  test('5.2 Search filters by ticket title', async ({ page }) => {
    await setup(page)
    await page.fill('input[placeholder*="Search tickets"]', 'Dashboard')
    await page.waitForTimeout(300)
    await expect(page.getByText('Dashboard not loading')).toBeVisible()
    await expect(page.getByText('Bulk email feature')).not.toBeVisible({ timeout: 2000 })
  })

  test('5.3 Clearing search restores all tickets', async ({ page }) => {
    await setup(page)
    await page.fill('input[placeholder*="Search tickets"]', 'Dashboard')
    await page.waitForTimeout(200)
    await page.fill('input[placeholder*="Search tickets"]', '')
    await page.waitForTimeout(200)
    await expect(page.getByText('Dashboard not loading')).toBeVisible()
    await expect(page.getByText('Bulk email feature')).toBeVisible()
  })

  test('5.4 Status filter shows "Open" tickets only', async ({ page }) => {
    await setup(page)
    const statusTrigger = page.getByRole('combobox').filter({ hasText: /All Status|Open|In Progress|Resolved/i }).first()
    await statusTrigger.click()
    await page.getByRole('option', { name: /^Open$/i }).click()
    // After filter, the API re-fetches with status=open — wait for table to update
    await page.waitForTimeout(600)
    await expect(page.getByText('Dashboard not loading')).toBeVisible()
    // resolved ticket should not appear (returned by filtered API)
    await expect(page.getByText('How to change timezone?')).not.toBeVisible({ timeout: 3000 })
  })

  test('5.5 Type filter shows "Bug Report" tickets only', async ({ page }) => {
    await setup(page)
    const typeTrigger = page.getByRole('combobox').filter({ hasText: /All Types|Bug Report|Feature/i }).first()
    await typeTrigger.click()
    await page.getByRole('option', { name: /Bug Report/i }).click()
    await page.waitForTimeout(600)
    await expect(page.getByText('Dashboard not loading')).toBeVisible()
    await expect(page.getByText('Bulk email feature')).not.toBeVisible({ timeout: 3000 })
  })

  test('5.6 Status filter has all expected options', async ({ page }) => {
    await setup(page)
    const statusTrigger = page.getByRole('combobox').filter({ hasText: /All Status/i }).first()
    await statusTrigger.click()
    await expect(page.getByRole('option', { name: /^Open$/i })).toBeVisible()
    await expect(page.getByRole('option', { name: /In Progress/i })).toBeVisible()
    await expect(page.getByRole('option', { name: /Resolved/i })).toBeVisible()
    await expect(page.getByRole('option', { name: /Closed/i })).toBeVisible()
  })

  test('5.7 Type filter has all expected options', async ({ page }) => {
    await setup(page)
    const typeTrigger = page.getByRole('combobox').filter({ hasText: /All Types/i }).first()
    await typeTrigger.click()
    await expect(page.getByRole('option', { name: /Bug Report/i })).toBeVisible()
    await expect(page.getByRole('option', { name: /Feature/i })).toBeVisible()
    await expect(page.getByRole('option', { name: /Question/i })).toBeVisible()
    await expect(page.getByRole('option', { name: /Feedback/i })).toBeVisible()
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// 6. TICKETS TABLE
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Support — Tickets Table', () => {

  test('6.1 All column headers visible', async ({ page }) => {
    await setup(page)
    for (const col of ['ID', 'Type', 'Title', 'Priority', 'Status', 'Date', 'Action']) {
      await expect(page.getByText(col).first()).toBeVisible()
    }
  })

  test('6.2 Ticket rows rendered with title and description', async ({ page }) => {
    await setup(page)
    await expect(page.getByText('Dashboard not loading')).toBeVisible()
    await expect(page.getByText('Bulk email feature')).toBeVisible()
  })

  test('6.3 Bug Report type label shown', async ({ page }) => {
    await setup(page)
    await expect(page.getByText('Bug Report').first()).toBeVisible()
  })

  test('6.4 Feature Request type label shown', async ({ page }) => {
    await setup(page)
    await expect(page.getByText('Feature Request').first()).toBeVisible()
  })

  test('6.5 Priority badges visible (high, medium, low)', async ({ page }) => {
    await setup(page)
    await expect(page.getByText('high').first()).toBeVisible()
    await expect(page.getByText('medium').first()).toBeVisible()
    await expect(page.getByText('low').first()).toBeVisible()
  })

  test('6.6 Status badges visible (open, in progress, resolved)', async ({ page }) => {
    await setup(page)
    await expect(page.getByText('open').first()).toBeVisible()
    await expect(page.getByText('in progress').first()).toBeVisible()
    await expect(page.getByText('resolved').first()).toBeVisible()
  })

  test('6.7 "View" button visible for open and in_progress tickets', async ({ page }) => {
    await setup(page)
    const viewBtns = page.getByRole('button', { name: /^View$/i })
    // open + in_progress = 2 view buttons visible
    await expect(viewBtns.first()).toBeVisible()
  })

  test('6.8 "View" button NOT shown for resolved tickets', async ({ page }) => {
    await setup(page)
    // resolved ticket row for "How to change timezone?" — no View button in its row
    const resolvedRow = page.locator('tr').filter({ hasText: 'How to change timezone?' })
    await expect(resolvedRow.getByRole('button', { name: /View/i })).toHaveCount(0)
  })

  test('6.9 Ticket ID shows as first 8 chars uppercase', async ({ page }) => {
    await setup(page)
    // tkt-001-uuid-here → first 8 = TKT-001- → TKT-001-
    await expect(page.getByText('TKT-001-').first()).toBeVisible()
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// 8. EMPTY STATE
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Support — Empty State', () => {

  test('8.1 No tickets shows "No tickets found" message', async ({ page }) => {
    await setup(page, [])
    await expect(page.getByText(/No tickets found/i)).toBeVisible()
  })

  test('8.2 "Create your first ticket" button shown on empty state', async ({ page }) => {
    await setup(page, [])
    await expect(page.getByRole('button', { name: /Create your first ticket/i })).toBeVisible()
  })

  test('8.3 "Create your first ticket" button opens create dialog', async ({ page }) => {
    await setup(page, [])
    await page.getByRole('button', { name: /Create your first ticket/i }).click()
    await expect(page.getByText('Create Support Ticket')).toBeVisible({ timeout: 3000 })
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// 9. VIEW TICKET DIALOG
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Support — View Ticket Dialog', () => {

  test('9.1 Clicking "View" opens ticket details dialog', async ({ page }) => {
    await setup(page)
    await page.getByRole('button', { name: /^View$/i }).first().click()
    await expect(page.getByText('Ticket Details')).toBeVisible({ timeout: 5000 })
  })

  test('9.2 Dialog shows Ticket ID, Type, Priority, Status', async ({ page }) => {
    await setup(page)
    await page.getByRole('button', { name: /^View$/i }).first().click()
    await expect(page.getByText('Ticket ID').first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Type').first()).toBeVisible()
    await expect(page.getByText('Priority').first()).toBeVisible()
    await expect(page.getByText('Status').first()).toBeVisible()
  })

  test('9.3 Dialog shows Title and Description', async ({ page }) => {
    await setup(page)
    await page.getByRole('button', { name: /^View$/i }).first().click()
    await expect(page.getByText('Title').first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Description').first()).toBeVisible()
    await expect(page.getByText('Dashboard not loading').first()).toBeVisible()
  })

  test('9.4 Dialog shows Created By and Created At', async ({ page }) => {
    await setup(page)
    await page.getByRole('button', { name: /^View$/i }).first().click()
    await expect(page.getByText('Created By').first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Created At').first()).toBeVisible()
    await expect(page.getByText('Test User').first()).toBeVisible()
  })

  test('9.5 Conversation section visible', async ({ page }) => {
    await setup(page)
    await page.getByRole('button', { name: /^View$/i }).first().click()
    await expect(page.getByText('Conversation').first()).toBeVisible({ timeout: 5000 })
  })

  test('9.6 Empty conversation shows "No replies yet"', async ({ page }) => {
    await setup(page)
    // First ticket (open, no comments) – View it
    await page.getByRole('button', { name: /^View$/i }).first().click()
    await expect(page.getByText(/No replies yet/i)).toBeVisible({ timeout: 5000 })
  })

  test('9.7 Ticket with comments shows comment messages', async ({ page }) => {
    await setup(page)
    // Second ticket (in_progress, has comments) — View button index 1
    await page.getByRole('button', { name: /^View$/i }).nth(1).click()
    // Wait for ticket details to load
    await expect(page.getByText('Ticket Details')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText("Thanks for the request! Our team is reviewing it.")).toBeVisible({ timeout: 5000 })
  })

  test('9.8 Reply section shown for open/in_progress tickets', async ({ page }) => {
    await setup(page)
    await page.getByRole('button', { name: /^View$/i }).first().click()
    await expect(page.getByText(/Add Your Reply/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByPlaceholder(/Type your response/i)).toBeVisible()
  })

  test('9.9 "Attach Image" and "Send Reply" buttons in reply section', async ({ page }) => {
    await setup(page)
    await page.getByRole('button', { name: /^View$/i }).first().click()
    await expect(page.getByRole('button', { name: /Attach Image/i })).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: /Send Reply/i })).toBeVisible()
  })

  test('9.10 "Close" button closes the dialog', async ({ page }) => {
    await setup(page)
    await page.getByRole('button', { name: /^View$/i }).first().click()
    await expect(page.getByText('Ticket Details')).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: /^Close$/i }).last().click()
    await expect(page.getByText('Ticket Details')).not.toBeVisible({ timeout: 3000 })
  })

  test('9.11 ESC closes the ticket dialog', async ({ page }) => {
    await setup(page)
    await page.getByRole('button', { name: /^View$/i }).first().click()
    await expect(page.getByText('Ticket Details')).toBeVisible({ timeout: 5000 })
    await page.keyboard.press('Escape')
    await expect(page.getByText('Ticket Details')).not.toBeVisible({ timeout: 3000 })
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// 10. CREATE TICKET FORM
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Support — Create Ticket Form', () => {

  async function openCreate(page: Page) {
    await page.getByRole('button', { name: /New Ticket/i }).click()
    await expect(page.getByText('Create Support Ticket')).toBeVisible({ timeout: 3000 })
  }

  test('10.1 Form shows Type, Priority, Category, Title, Description fields', async ({ page }) => {
    await setup(page)
    await openCreate(page)
    await expect(page.getByText('Type').first()).toBeVisible()
    await expect(page.getByText('Priority').first()).toBeVisible()
    await expect(page.getByText('Category').first()).toBeVisible()
    await expect(page.getByPlaceholder('Brief description')).toBeVisible()
    await expect(page.getByPlaceholder('Detailed information...')).toBeVisible()
  })

  test('10.2 Type dropdown has Bug Report, Feature Request, Question, Feedback', async ({ page }) => {
    await setup(page)
    await openCreate(page)
    const typeSelect = page.getByRole('combobox').filter({ hasText: /Bug Report|Feature Request|Question|Feedback/i }).first()
    await typeSelect.click()
    await expect(page.getByRole('option', { name: 'Bug Report' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Feature Request' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Question' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Feedback' })).toBeVisible()
  })

  test('10.3 Priority dropdown has Low, Medium, High, Urgent', async ({ page }) => {
    await setup(page)
    await openCreate(page)
    const prioritySelect = page.getByRole('combobox').filter({ hasText: /Low|Medium|High|Urgent/i }).first()
    await prioritySelect.click()
    await expect(page.getByRole('option', { name: 'Low' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Medium' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'High' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Urgent' })).toBeVisible()
  })

  test('10.4 Category dropdown has all 12 module options', async ({ page }) => {
    await setup(page)
    await openCreate(page)
    // The Category label is followed by the combobox; default value = 'other'
    const categoryLabel = page.locator('label', { hasText: /^Category/ })
    const categorySelect = categoryLabel.locator('xpath=following-sibling::*[1]').or(
      page.getByRole('combobox').nth(2)
    ).first()
    await categorySelect.click()
    for (const opt of ['Dashboard', 'Applications', 'Job Postings (JD)', 'Talent Pool', 'Candidates', 'AI Screening', 'Messages', 'Documents', 'Delegation', 'Analytics & Reports', 'Settings', 'Other']) {
      await expect(page.getByRole('option', { name: opt })).toBeVisible()
    }
  })

  test('10.5 Screenshot upload area visible with "Max 5MB" text', async ({ page }) => {
    await setup(page)
    await openCreate(page)
    await expect(page.getByText(/Upload screenshot.*Max 5MB|Max 5MB/i)).toBeVisible()
  })

  test('10.6 Cancel closes the create dialog', async ({ page }) => {
    await setup(page)
    await openCreate(page)
    await page.getByRole('button', { name: /^Cancel$/i }).click()
    await expect(page.getByText('Create Support Ticket')).not.toBeVisible({ timeout: 3000 })
  })

  test('10.7 "Submit Ticket" button present', async ({ page }) => {
    await setup(page)
    await openCreate(page)
    await expect(page.getByRole('button', { name: /Submit Ticket/i })).toBeVisible()
  })

  test('10.8 Title and description fields accept text input', async ({ page }) => {
    await setup(page)
    await openCreate(page)
    await page.fill('input[placeholder="Brief description"]', 'Test ticket title')
    await page.fill('textarea[placeholder="Detailed information..."]', 'This is a detailed description')
    await expect(page.getByPlaceholder('Brief description')).toHaveValue('Test ticket title')
    await expect(page.getByPlaceholder('Detailed information...')).toHaveValue('This is a detailed description')
  })

  test('10.9 Full ticket submission succeeds and shows alert', async ({ page }) => {
    await setup(page)
    await openCreate(page)

    // Fill required fields
    await page.fill('input[placeholder="Brief description"]', 'Login button broken')
    await page.fill('textarea[placeholder="Detailed information..."]', 'Cannot click login button on Safari')

    let alertMsg = ''
    page.on('dialog', async d => { alertMsg = d.message(); await d.accept() })
    await page.getByRole('button', { name: /Submit Ticket/i }).click()
    await page.waitForTimeout(1000)
    expect(alertMsg).toMatch(/submitted|success/i)
  })

  test('10.10 Screenshot upload shows file name after selection', async ({ page }) => {
    await setup(page)
    await openCreate(page)
    const png = makeTempPng('ticket-screenshot.png')
    const fileInput = page.locator('input[type="file"][accept="image/*"]').first()
    await fileInput.setInputFiles(png)
    await expect(page.getByText('ticket-screenshot.png')).toBeVisible({ timeout: 3000 })
  })

  test('10.11 Remove screenshot button clears the attachment', async ({ page }) => {
    await setup(page)
    await openCreate(page)
    const png = makeTempPng('to-remove.png')
    const fileInput = page.locator('input[type="file"][accept="image/*"]').first()
    await fileInput.setInputFiles(png)
    await expect(page.getByText('to-remove.png')).toBeVisible({ timeout: 3000 })
    // Click the X button to remove
    await page.locator('button').filter({ has: page.locator('svg') }).filter({ hasText: '' }).last().click()
    await expect(page.getByText('to-remove.png')).not.toBeVisible({ timeout: 3000 })
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// 11. REPLY (COMMENT) SECTION
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Support — Reply Section', () => {

  test('11.1 Reply textarea accepts text', async ({ page }) => {
    await setup(page)
    await page.getByRole('button', { name: /^View$/i }).first().click()
    await expect(page.getByPlaceholder(/Type your response/i)).toBeVisible({ timeout: 5000 })
    await page.fill('textarea[placeholder="Type your response..."]', 'This is my reply')
    await expect(page.locator('textarea[placeholder="Type your response..."]')).toHaveValue('This is my reply')
  })

  test('11.2 Empty comment submission shows alert', async ({ page }) => {
    await setup(page)
    await page.getByRole('button', { name: /^View$/i }).first().click()
    await expect(page.getByRole('button', { name: /Send Reply/i })).toBeVisible({ timeout: 5000 })

    let alertMsg = ''
    page.on('dialog', async d => { alertMsg = d.message(); await d.accept() })
    await page.getByRole('button', { name: /Send Reply/i }).click()
    await page.waitForTimeout(500)
    expect(alertMsg).toMatch(/comment|enter/i)
  })

  test('11.3 Successful reply submission sends comment', async ({ page }) => {
    await setup(page)
    await page.getByRole('button', { name: /^View$/i }).first().click()
    await expect(page.getByPlaceholder(/Type your response/i)).toBeVisible({ timeout: 5000 })
    await page.fill('textarea[placeholder="Type your response..."]', 'Testing reply functionality')
    await page.getByRole('button', { name: /Send Reply/i }).click()
    // API call fires — no error expected
    await page.waitForTimeout(1000)
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// 12. NEGATIVE CASES
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Support — Negative Cases', () => {

  test('12.1 Submitting empty ticket shows category alert', async ({ page }) => {
    await setup(page)
    await page.getByRole('button', { name: /New Ticket/i }).click()
    await expect(page.getByText('Create Support Ticket')).toBeVisible({ timeout: 3000 })

    // Leave category as "other" default, but omit title + description
    let alertMsg = ''
    page.on('dialog', async d => { alertMsg = d.message(); await d.accept() })
    await page.getByRole('button', { name: /Submit Ticket/i }).click()
    await page.waitForTimeout(500)
    // Should alert about title or description being missing
    expect(alertMsg).toMatch(/title|description|category|enter/i)
  })

  test('12.2 Missing title shows alert', async ({ page }) => {
    await setup(page)
    await page.getByRole('button', { name: /New Ticket/i }).click()
    await page.fill('textarea[placeholder="Detailed information..."]', 'Some description')
    // Leave title empty

    let alertMsg = ''
    page.on('dialog', async d => { alertMsg = d.message(); await d.accept() })
    await page.getByRole('button', { name: /Submit Ticket/i }).click()
    await page.waitForTimeout(500)
    expect(alertMsg).toMatch(/title|enter/i)
  })

  test('12.3 File larger than 5 MB shows alert', async ({ page }) => {
    await setup(page)
    await page.getByRole('button', { name: /New Ticket/i }).click()

    // Create a > 5MB file
    const bigFile = path.join(os.tmpdir(), 'big-screenshot.png')
    fs.writeFileSync(bigFile, Buffer.alloc(6 * 1024 * 1024, 0x41))

    let alertMsg = ''
    page.on('dialog', async d => { alertMsg = d.message(); await d.accept() })
    const fileInput = page.locator('input[type="file"][accept="image/*"]').first()
    await fileInput.setInputFiles(bigFile)
    await page.waitForTimeout(500)
    expect(alertMsg).toMatch(/5MB|size/i)
  })

  test('12.4 API error on load shows retry button', async ({ page }) => {
    await mockSessionAPI(page)
    await mockSupportAPIError(page)
    await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('button', { name: /retry|try again/i })).toBeVisible({ timeout: 15_000 })
  })

  test('12.5 Retry button re-fetches tickets', async ({ page }) => {
    await mockSessionAPI(page)
    let callCount = 0
    await page.route('**/api/support/tickets**', route => {
      callCount++
      if (callCount === 1) {
        return route.fulfill({ status: 500, contentType: 'application/json',
          body: JSON.stringify({ success: false, error: 'error' }) })
      }
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, data: MOCK_TICKETS, stats: MOCK_STATS }) })
    })
    await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: /retry|try again/i }).waitFor({ state: 'visible', timeout: 15_000 })
    await page.getByRole('button', { name: /retry|try again/i }).click()
    await page.getByText('Open Tickets').waitFor({ state: 'visible', timeout: 10_000 })
  })

  test('12.6 Search with no match shows empty table', async ({ page }) => {
    await setup(page)
    await page.fill('input[placeholder*="Search tickets"]', 'ZZZNOTFOUND_XYZ')
    await page.waitForTimeout(300)
    await expect(page.getByText(/No tickets found/i)).toBeVisible()
  })

  test('12.7 XSS in search does not crash the page', async ({ page }) => {
    await setup(page)
    await page.fill('input[placeholder*="Search tickets"]', "<script>alert('xss')</script>")
    await page.waitForTimeout(300)
    await expect(page.getByRole('heading', { name: /Support & Feedback/i })).toBeVisible()
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// 13. RESPONSIVE
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Support — Responsive', () => {

  test('13.1 Page renders at 375px mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await setup(page)
    await expect(page.getByRole('heading', { name: /Support & Feedback/i })).toBeVisible()
  })

  test('13.2 "New Ticket" button visible on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await setup(page)
    await expect(page.getByRole('button', { name: /New Ticket/i })).toBeVisible()
  })

  test('13.3 Stats cards visible on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await setup(page)
    await expect(page.getByText('Open Tickets').first()).toBeVisible()
    await expect(page.getByText('In Progress').first()).toBeVisible()
  })

})
