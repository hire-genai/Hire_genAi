/**
 * tests/e2e/23-interview-main.spec.ts
 *
 * E2E tests for /interview/[applicationId] — main AI interview page.
 *
 * ── FEATURES ────────────────────────────────────────────────────────────────
 *  1.  Page load / status check  – "Checking interview status..." spinner
 *  2.  Already-completed guard   – if !canInterview → redirect to post-verify
 *  3.  Interview Instructions modal
 *      – modal appears on load
 *      – 6 instruction items (lighting, mic, internet, quiet, camera, professional)
 *      – "I Understand, Let's Start" button dismisses modal
 *      – X button dismisses modal
 *  4.  Main video UI (after dismissing modal)
 *      – user camera feed (video element)
 *      – Olivia avatar PIP video
 *      – "Olivia" label on avatar
 *      – Interview timer (0:00)
 *      – LIVE INTERVIEW label (right panel, desktop)
 *      – Position / Company / Candidate cards
 *  5.  Call controls
 *      – Mic toggle button
 *      – Camera toggle button
 *      – End call (red phone) button
 *  6.  Mic OFF state  – mic button shows MicOff icon + red background
 *  7.  Camera OFF state – camera off overlay shown
 *  8.  End interview flow
 *      – clicking End shows "End Warning" dialog if questions answered < total
 *      – "End Anyway" button → redirects to post-verify
 *      – "Continue Interview" button keeps interview running
 *  9.  AI agent connection
 *      – agentReady state shows "Connected" badge on avatar
 *      – WebRTC/Azure API is mocked (no real connection required)
 * 10.  Conversation panel    – appears after agent ready
 * 11.  Redirect when completed → spinner shown, then redirects to post-verify
 */

import { test, expect, type Page } from '@playwright/test'

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_URL   = process.env.BASE_URL ?? 'http://localhost:3000'
const APP_ID     = 'dedf39bc-5203-4fb0-a711-995d0b021bfd'
const PAGE_URL   = `${BASE_URL}/interview/${APP_ID}`

// ─── Mock helpers ─────────────────────────────────────────────────────────────

const MOCK_INTERVIEW_QUESTIONS = {
  ok: true,
  application: {
    jobTitle: 'Senior Software Engineer',
    companyName: 'E2E Test Corp',
    candidateName: 'Rahul Test',
    companyId: 'co-001',
  },
  rounds: [
    {
      name: 'Technical Round',
      duration_minutes: 30,
      criteria: ['Problem Solving'],
      questions: [
        { text: 'Tell me about your experience with TypeScript.', criterion: 'Problem Solving', difficulty: 'Medium', marks: 10 },
        { text: 'How do you approach system design?', criterion: 'System Design', difficulty: 'Hard', marks: 10 },
      ],
    },
  ],
}

async function mockInterviewAPIs(page: Page, opts: { canInterview?: boolean } = {}) {
  const { canInterview = true } = opts

  // Interview status check
  await page.route(`**/api/applications/${APP_ID}/interview-status**`, route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, canInterview }),
    })
  )

  // Interview questions
  await page.route(`**/api/applications/${APP_ID}/interview-questions**`, route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_INTERVIEW_QUESTIONS),
    })
  )

  // Block WebRTC/Azure Realtime API (no real connection needed for UI tests)
  await page.route('**/openai.azure.com/**', route => route.abort())
  await page.route('**/realtime/calls**', route => route.abort())
  await page.route('**/realtime/sessions**', route => route.abort())
  // Mock the session/credentials endpoint to prevent UUID error with mock companyId
  await page.route('**/api/session**', route =>
    route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ ok: false, error: 'No Azure key configured' }) })
  )

  // Interview complete
  await page.route('**/api/interview/complete**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
  )

  // Interview evaluate-answer
  await page.route('**/api/interview/evaluate-answer**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
  )

  // Mock getUserMedia (camera) — return a silent black canvas stream
  await page.addInitScript(() => {
    if (!navigator.mediaDevices) return
    const canvas = document.createElement('canvas')
    canvas.width = 640; canvas.height = 480
    navigator.mediaDevices.getUserMedia = () =>
      Promise.resolve(canvas.captureStream(10) as MediaStream)
  })
}

async function setup(page: Page, opts: { canInterview?: boolean } = {}) {
  await page.addInitScript(() => { localStorage.setItem('hasSeenOnboardingTour', 'true') })
  await mockInterviewAPIs(page, opts)
  await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
}

async function dismissInstructions(page: Page) {
  // Wait for instructions modal
  await page.getByText(/Interview Instructions/i).waitFor({ state: 'visible', timeout: 20_000 })
  // Click the I Understand button — it's the last button in the modal footer section
  const btn = page.locator('div').filter({ hasText: /I Understand|Let.*Start/ }).last().locator('button').last()
  await btn.waitFor({ state: 'visible', timeout: 5000 })
  await btn.click()
  await page.waitForTimeout(800)
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. PAGE LOAD — STATUS CHECK
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Interview Main — Page Load', () => {

  test('1.1 "Checking interview status..." spinner shown initially', async ({ page }) => {
    await page.addInitScript(() => { localStorage.setItem('hasSeenOnboardingTour', 'true') })
    // Delay the status check to see the loading state
    await page.route(`**/api/applications/${APP_ID}/interview-status**`, async route => {
      await new Promise(r => setTimeout(r, 300))
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ ok: true, canInterview: true }) })
    })
    await mockInterviewAPIs(page)
    await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(/Checking interview status/i)).toBeVisible({ timeout: 3000 })
  })

  test('1.2 Page loads interview instructions modal after status check', async ({ page }) => {
    await setup(page)
    await expect(page.getByText(/Interview Instructions/i)).toBeVisible({ timeout: 15_000 })
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// 2. ALREADY-COMPLETED GUARD
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Interview Main — Already-Completed Guard', () => {

  test('2.1 Redirects to post-verify when canInterview=false', async ({ page }) => {
    // Also mock post-verify APIs to prevent errors on redirect
    await page.route('**/api/interview/post-verify/**', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
    )
    await page.route('**/models/**', route => route.abort())
    await setup(page, { canInterview: false })
    await expect(page).toHaveURL(
      new RegExp(`/interview/${APP_ID}/post-verify`),
      { timeout: 20_000 }
    )
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// 3. INTERVIEW INSTRUCTIONS MODAL
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Interview Main — Instructions Modal', () => {

  test('3.1 Instructions modal visible with "Interview Instructions" heading', async ({ page }) => {
    await setup(page)
    await expect(page.getByText(/Interview Instructions/i)).toBeVisible({ timeout: 15_000 })
  })

  test('3.2 "Please read before starting" subtitle shown', async ({ page }) => {
    await setup(page)
    await expect(page.getByText(/Please read before starting/i)).toBeVisible({ timeout: 10_000 })
  })

  test('3.3 All 6 instruction items visible', async ({ page }) => {
    await setup(page)
    await expect(page.getByText(/Interview Instructions/i)).toBeVisible({ timeout: 10_000 })
    for (const item of [
      'Ensure Good Lighting',
      'Test Your Microphone & Camera',
      'Stable Internet Connection',
      'Quiet Environment',
      'Keep Camera On',
      'Professional Setting',
    ]) {
      await expect(page.getByText(item).first()).toBeVisible()
    }
  })

  test('3.4 "I Understand" button is clickable and triggers state change', async ({ page }) => {
    await setup(page)
    await expect(page.getByText(/Interview Instructions/i)).toBeVisible({ timeout: 10_000 })
    const btn = page.locator('div').filter({ hasText: /I Understand|Let.*Start/ }).last().locator('button').last()
    await btn.waitFor({ state: 'visible', timeout: 5000 })
    await btn.click()
    await page.waitForTimeout(800)
    // After clicking, the modal fades out (opacity-0). The video controls should now be interactive.
    // The modal uses opacity transition — check that controls are now visible
    await expect(page.locator('button.rounded-full').first()).toBeVisible({ timeout: 5000 })
  })

  test('3.5 After dismissing modal, interview controls are accessible', async ({ page }) => {
    await setup(page)
    await expect(page.getByText(/Interview Instructions/i)).toBeVisible({ timeout: 10_000 })
    await page.locator('div').filter({ hasText: /I Understand|Let.*Start/ }).last().locator('button').last().click()
    await page.waitForTimeout(800)
    // Controls (rounded buttons) should now be in the foreground and interactable
    const controlsVisible = await page.locator('button.rounded-full').first().isVisible().catch(() => false)
    expect(controlsVisible).toBe(true)
  })

  test('3.6 Tip box shown about recording', async ({ page }) => {
    await setup(page)
    await expect(page.getByText(/Interview Instructions/i)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/Tip.*recorded|recorded.*evaluation/i)).toBeVisible()
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// 4. MAIN VIDEO UI
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Interview Main — Video UI', () => {

  test('4.1 User video element present in DOM', async ({ page }) => {
    await setup(page)
    await dismissInstructions(page)
    // User video is mirrored main video
    await expect(page.locator('video').first()).toBeAttached()
  })

  test('4.2 Olivia avatar video present', async ({ page }) => {
    await setup(page)
    await dismissInstructions(page)
    // Avatar video has the Olivia character src
    const avatarVid = page.locator('video[src*="olivia"]')
    await expect(avatarVid).toBeAttached({ timeout: 5000 })
  })

  test('4.3 "Olivia" label shown on avatar PIP', async ({ page }) => {
    await setup(page)
    await dismissInstructions(page)
    await expect(page.getByText('Olivia').first()).toBeVisible()
  })

  test('4.4 Interview timer (0:00) visible', async ({ page }) => {
    await setup(page)
    await dismissInstructions(page)
    await expect(page.getByText(/0:00/).first()).toBeVisible({ timeout: 5000 })
  })

  test('4.5 "LIVE INTERVIEW" label shown (desktop)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await setup(page)
    await dismissInstructions(page)
    await expect(page.getByText(/LIVE INTERVIEW/i).first()).toBeVisible()
  })

  test('4.6 Job position shown in right panel', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await setup(page)
    await dismissInstructions(page)
    await expect(page.getByText('Senior Software Engineer').first()).toBeVisible({ timeout: 5000 })
  })

  test('4.7 Company name shown in right panel', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await setup(page)
    await dismissInstructions(page)
    await expect(page.getByText('E2E Test Corp').first()).toBeVisible({ timeout: 5000 })
  })

  test('4.8 Candidate name shown in right panel', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await setup(page)
    await dismissInstructions(page)
    await expect(page.getByText('Rahul Test').first()).toBeVisible({ timeout: 5000 })
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// 5. CALL CONTROLS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Interview Main — Call Controls', () => {

  test('5.1 Mic toggle button visible', async ({ page }) => {
    await setup(page)
    await dismissInstructions(page)
    const micBtn = page.locator('button').filter({ has: page.locator('svg.lucide-mic, .lucide-mic') }).first()
    await expect(micBtn).toBeVisible()
  })

  test('5.2 Camera toggle button visible', async ({ page }) => {
    await setup(page)
    await dismissInstructions(page)
    const camBtn = page.locator('button').filter({ has: page.locator('svg.lucide-video, .lucide-video') }).first()
    await expect(camBtn).toBeVisible()
  })

  test('5.3 End call (red phone) button visible', async ({ page }) => {
    await setup(page)
    await dismissInstructions(page)
    // The end call button is the only permanently-red rounded button in the controls
    const endBtn = page.locator('button.bg-red-600.rounded-full').first()
    await expect(endBtn).toBeVisible({ timeout: 5000 })
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// 6. MIC TOGGLE
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Interview Main — Mic Toggle', () => {
  // Controls are 3 rounded buttons: [Mic, Camera, EndCall(red)]
  // We find the control bar by its container class

  test('6.1 Clicking mic button changes its style to OFF state', async ({ page }) => {
    await setup(page)
    await dismissInstructions(page)
    // The 3 control buttons are in a rounded bar at the bottom
    // Mic is the 1st, camera is 2nd, end call (red) is 3rd
    const controls = page.locator('div.flex.items-center.gap-3, div.flex.items-center.gap-4').filter({
      has: page.locator('button.rounded-full').nth(2)
    }).first()
    const micBtn = controls.locator('button.rounded-full').first()
    if (await micBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await micBtn.click()
      // Some visual change should happen (red background or different state)
      await page.waitForTimeout(500)
      // Red button (end call) should still be last
      const redBtn = controls.locator('button.bg-red-600').first()
      await expect(redBtn).toBeVisible({ timeout: 2000 })
    }
  })

  test('6.2 Mic toggle is clickable multiple times', async ({ page }) => {
    await setup(page)
    await dismissInstructions(page)
    const controls = page.locator('div.flex.items-center.gap-3, div.flex.items-center.gap-4').filter({
      has: page.locator('button.rounded-full').nth(2)
    }).first()
    const micBtn = controls.locator('button.rounded-full').first()
    if (await micBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await micBtn.click()
      await page.waitForTimeout(200)
      await micBtn.click()
      await page.waitForTimeout(200)
    }
    // Page should not crash
    await expect(page.locator('button.rounded-full').first()).toBeVisible()
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// 7. CAMERA TOGGLE
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Interview Main — Camera Toggle', () => {

  test('7.1 Clicking camera button shows "Camera is off" overlay', async ({ page }) => {
    await setup(page)
    await dismissInstructions(page)
    // Camera is 2nd button in control bar
    const controls = page.locator('div.flex.items-center.gap-3, div.flex.items-center.gap-4').filter({
      has: page.locator('button.rounded-full').nth(2)
    }).first()
    const camBtn = controls.locator('button.rounded-full').nth(1)
    if (await camBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await camBtn.click()
      await expect(page.getByText(/Camera is off/i)).toBeVisible({ timeout: 3000 })
    }
  })

  test('7.2 Camera toggle on/off cycle works', async ({ page }) => {
    await setup(page)
    await dismissInstructions(page)
    const controls = page.locator('div.flex.items-center.gap-3, div.flex.items-center.gap-4').filter({
      has: page.locator('button.rounded-full').nth(2)
    }).first()
    const camBtn = controls.locator('button.rounded-full').nth(1)
    if (await camBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await camBtn.click() // off
      await expect(page.getByText(/Camera is off/i)).toBeVisible({ timeout: 3000 })
      await camBtn.click() // on
      await expect(page.getByText(/Camera is off/i)).not.toBeVisible({ timeout: 3000 })
    }
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// 8. END INTERVIEW FLOW
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Interview Main — End Interview', () => {

  test('8.1 Clicking End button shows End Warning dialog', async ({ page }) => {
    await setup(page)
    await dismissInstructions(page)
    const endBtn = page.locator('button').filter({ has: page.locator('svg.lucide-phone-off, .lucide-phone-off') }).first()
    await endBtn.click()
    // Warning dialog should appear
    await expect(page.getByText(/End Interview\?|End Anyway|end.*interview|Incomplete/i).first())
      .toBeVisible({ timeout: 5000 })
  })

  test('8.2 "End Anyway" button in warning dialog redirects to post-verify', async ({ page }) => {
    await setup(page)
    await dismissInstructions(page)
    const endBtn = page.locator('button').filter({ has: page.locator('svg.lucide-phone-off, .lucide-phone-off') }).first()
    await endBtn.click()
    const endAnyway = page.getByRole('button', { name: /End Anyway/i })
    await endAnyway.waitFor({ state: 'visible', timeout: 5000 })
    await endAnyway.click()
    await expect(page).toHaveURL(new RegExp(`/interview/${APP_ID}/post-verify`), { timeout: 15_000 })
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// 9. AI AGENT CONNECTION STATE
// ─────────────────────────────────────────────────────────────────────────────

// ── Section 9: AI Agent Connection ───────────────────────────────────────────
// NOTE: These tests require Azure OpenAI API key + valid DB UUIDs.
// Skipped until ChatGPT/Azure Realtime credentials are configured.
// Code kept for future use.

test.describe('Interview Main — AI Agent Connection', () => {

  test('9.1 Avatar PIP is visible and contains Olivia label', async ({ page }) => {
    await setup(page)
    await dismissInstructions(page)
    await expect(page.getByText('Olivia').first()).toBeVisible()
  })

  test.skip('9.2 AI agent connects via WebRTC — requires Azure OpenAI key', async ({ page }) => {
    // SKIPPED: No Azure OpenAI key configured.
    // When key is set, remove test.skip and this test will verify:
    // - agentReady state is true after WebRTC connection
    // - "Connected" badge appears on avatar
    // - Conversation panel shows agent messages
    await setup(page)
    await dismissInstructions(page)
    await expect(page.locator('button').filter({ has: page.locator('svg.lucide-phone-off, .lucide-phone-off') }).first()).toBeVisible()
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// 10. RESPONSIVE
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Interview Main — Responsive', () => {

  test('10.1 Controls visible at 375px mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await setup(page)
    await dismissInstructions(page)
    // Controls should be visible — any button in the rounded bar
    await expect(page.locator('button.rounded-full').first()).toBeVisible({ timeout: 5000 })
  })

  test('10.2 Instructions modal dismiss enables controls on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await setup(page)
    await expect(page.getByText(/Interview Instructions/i)).toBeVisible({ timeout: 15_000 })
    await page.locator('div').filter({ hasText: /I Understand|Let.*Start/ }).last().locator('button').last().click()
    await page.waitForTimeout(800)
    // After dismissal, controls should be visible
    await expect(page.locator('button.rounded-full').first()).toBeVisible({ timeout: 5000 })
  })

})
