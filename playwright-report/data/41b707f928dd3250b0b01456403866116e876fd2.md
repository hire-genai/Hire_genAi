# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 19-book-meeting.spec.ts >> Book Meeting — Step 2 Details Form >> 5.4 "Schedule Meeting" button disabled until required fields filled
- Location: tests\e2e\19-book-meeting.spec.ts:286:7

# Error details

```
TimeoutError: locator.waitFor: Timeout 5000ms exceeded.
Call log:
  - waiting for locator('button').filter({ hasText: /^\d+:\d+(am|pm)$/ }).first() to be visible

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e3]:
    - banner [ref=e4]:
      - generic [ref=e6]:
        - generic [ref=e7]:
          - link "HireGenAI" [ref=e9] [cursor=pointer]:
            - /url: /
            - heading "HireGenAI" [level=1] [ref=e10]
          - navigation [ref=e11]:
            - link "Product" [ref=e12] [cursor=pointer]:
              - /url: /demo-en
            - link "Pricing" [ref=e13] [cursor=pointer]:
              - /url: /pricing
            - link "ROI" [ref=e14] [cursor=pointer]:
              - /url: /roi
            - link "Company" [ref=e15] [cursor=pointer]:
              - /url: /about
        - generic [ref=e16]:
          - link "Settings" [ref=e17] [cursor=pointer]:
            - /url: /settings?tab=payment
            - button [ref=e18]:
              - img [ref=e19]
          - link "Get started" [ref=e23] [cursor=pointer]:
            - /url: /signup
            - button "Get started" [ref=e24]
    - generic [ref=e28]:
      - img [ref=e29]
      - generic [ref=e31]: HireGenAI Launches All-New AI-Powered Recruitment Suite
    - generic [ref=e34]:
      - generic [ref=e35]:
        - generic [ref=e36]:
          - generic [ref=e38]: H
          - generic [ref=e39]: HireGenAI
        - generic [ref=e40]:
          - generic [ref=e41]: T
          - paragraph [ref=e42]: HireGenAI Team
          - heading "30 Minute Meeting" [level=2] [ref=e43]
          - generic [ref=e44]:
            - img [ref=e45]
            - generic [ref=e48]: 30 min
          - generic [ref=e49]:
            - img [ref=e50]
            - generic [ref=e53]: India Standard Time
          - generic [ref=e54]:
            - img [ref=e55]
            - generic [ref=e58]: Google Meet
        - generic [ref=e59]:
          - generic [ref=e60]:
            - generic [ref=e61]: "1"
            - generic [ref=e63]: "2"
            - generic [ref=e65]: "3"
          - generic [ref=e66]:
            - generic [ref=e67]: Time
            - generic [ref=e68]: Details
            - generic [ref=e69]: Done
      - generic [ref=e71]:
        - generic [ref=e72]:
          - generic [ref=e73]:
            - button [ref=e74] [cursor=pointer]:
              - img [ref=e75]
            - heading "June 2026" [level=3] [ref=e77]
            - button [ref=e78] [cursor=pointer]:
              - img [ref=e79]
          - generic [ref=e81]:
            - generic [ref=e82]: MON
            - generic [ref=e83]: TUE
            - generic [ref=e84]: WED
            - generic [ref=e85]: THU
            - generic [ref=e86]: FRI
            - generic [ref=e87]: SAT
            - generic [ref=e88]: SUN
          - generic [ref=e89]:
            - button "1" [disabled] [ref=e91]
            - button "2" [disabled] [ref=e93]
            - button "3" [disabled] [ref=e95]
            - button "4" [disabled] [ref=e97]
            - button "5" [ref=e99] [cursor=pointer]
            - button "6" [ref=e101] [cursor=pointer]
            - button "7" [ref=e103] [cursor=pointer]
            - button "8" [ref=e105] [cursor=pointer]
            - button "9" [ref=e107] [cursor=pointer]
            - button "10" [ref=e109] [cursor=pointer]
            - button "11" [ref=e111] [cursor=pointer]
            - button "12" [ref=e113] [cursor=pointer]
            - button "13" [ref=e115] [cursor=pointer]
            - button "14" [ref=e117] [cursor=pointer]
            - button "15" [active] [ref=e119] [cursor=pointer]
            - button "16" [ref=e121] [cursor=pointer]
            - button "17" [ref=e123] [cursor=pointer]
            - button "18" [ref=e125] [cursor=pointer]
            - button "19" [ref=e127] [cursor=pointer]
            - button "20" [ref=e129] [cursor=pointer]
            - button "21" [ref=e131] [cursor=pointer]
            - button "22" [ref=e133] [cursor=pointer]
            - button "23" [ref=e135] [cursor=pointer]
            - button "24" [ref=e137] [cursor=pointer]
            - button "25" [ref=e139] [cursor=pointer]
            - button "26" [ref=e141] [cursor=pointer]
            - button "27" [ref=e143] [cursor=pointer]
            - button "28" [ref=e145] [cursor=pointer]
            - button "29" [ref=e147] [cursor=pointer]
            - button "30" [ref=e149] [cursor=pointer]
          - generic [ref=e150]:
            - paragraph [ref=e151]: Time zone
            - generic [ref=e152]:
              - img [ref=e153]
              - generic [ref=e156]: India Standard Time (12:06 am)
        - generic [ref=e158]:
          - img [ref=e159]
          - paragraph [ref=e161]: Select a date to see available times
    - contentinfo [ref=e162]:
      - generic [ref=e163]:
        - generic [ref=e164]:
          - generic [ref=e165]:
            - heading "HireGenAI" [level=3] [ref=e166]
            - paragraph [ref=e167]: By SKYGENAI
            - paragraph [ref=e168]: HireGenAI pre-screens and interviews candidates, helping you shortlist talent 20x faster and more efficiently.
            - paragraph [ref=e169]:
              - text: "Email:"
              - link "support@hire-genai.com" [ref=e170] [cursor=pointer]:
                - /url: mailto:support@hire-genai.com
            - generic [ref=e171]:
              - link [ref=e172] [cursor=pointer]:
                - /url: "#"
                - img [ref=e173]
              - link [ref=e175] [cursor=pointer]:
                - /url: "#"
                - img [ref=e176]
              - link [ref=e179] [cursor=pointer]:
                - /url: "#"
                - img [ref=e180]
              - link [ref=e183] [cursor=pointer]:
                - /url: https://www.linkedin.com/company/hire-genai
                - img [ref=e184]
          - generic [ref=e188]:
            - heading "Product" [level=4] [ref=e189]
            - list [ref=e190]:
              - listitem [ref=e191]:
                - link "Try the Demo" [ref=e192] [cursor=pointer]:
                  - /url: /demo-en
              - listitem [ref=e193]:
                - link "Pricing" [ref=e194] [cursor=pointer]:
                  - /url: /pricing
              - listitem [ref=e195]: Assessment
              - listitem [ref=e196]: FAQs
          - generic [ref=e197]:
            - heading "Company" [level=4] [ref=e198]
            - list [ref=e199]:
              - listitem [ref=e200]:
                - link "About us" [ref=e201] [cursor=pointer]:
                  - /url: /about
              - listitem [ref=e202]:
                - link "Contact" [ref=e203] [cursor=pointer]:
                  - /url: /contact
              - listitem [ref=e204]:
                - link "Book a Meeting" [ref=e205] [cursor=pointer]:
                  - /url: /book-meeting
              - listitem [ref=e206]:
                - link "Admin" [ref=e207] [cursor=pointer]:
                  - /url: /owner-login
          - generic [ref=e208]:
            - heading "Legal" [level=4] [ref=e209]
            - list [ref=e210]:
              - listitem [ref=e211]:
                - link "Privacy Policy" [ref=e212] [cursor=pointer]:
                  - /url: /privacy
              - listitem [ref=e213]:
                - link "Terms and Conditions" [ref=e214] [cursor=pointer]:
                  - /url: /terms
          - generic [ref=e216]:
            - generic [ref=e217]:
              - paragraph [ref=e218]: Trustpilot
              - generic [ref=e219]:
                - img [ref=e220]
                - img [ref=e222]
                - img [ref=e224]
                - img [ref=e226]
                - img [ref=e228]
              - paragraph [ref=e230]: TrustScore 4.5
            - generic [ref=e231]:
              - generic [ref=e232]:
                - img [ref=e233]
                - paragraph [ref=e236]: GDPR COMPLIANT
              - paragraph [ref=e237]: Your data is secure and compliant
        - paragraph [ref=e239]: © 2024 HireGenAI. All rights reserved.
  - region "Notifications (F8)":
    - list
  - button "Open Next.js Dev Tools" [ref=e245] [cursor=pointer]:
    - img [ref=e246]
  - alert [ref=e249]
```

# Test source

```ts
  1   | /**
  2   |  * tests/e2e/19-book-meeting.spec.ts
  3   |  *
  4   |  * E2E tests for /book-meeting — 3-step calendar booking.
  5   |  *
  6   |  * ── FEATURES COVERED ────────────────────────────────────────────────────────
  7   |  *  1.  Page Load     – branding, "30 Minute Meeting", step indicator
  8   |  *  2.  Left Sidebar  – meeting info (30 min, timezone, Google Meet)
  9   |  *  3.  Step 1 Calendar – month navigation, day grid, selectable future dates,
  10  |  *                        past dates disabled, day of week headers
  11  |  *  4.  Time Slots    – visible after date selected, selectable, Next button
  12  |  *  5.  Step 2 Form   – fields, required validation, Back button, Schedule
  13  |  *  6.  Step 3 Confirm– "Your Meeting is Booked!", summary, Back to Home
  14  |  *  7.  Booked Slots  – booked times shown as disabled
  15  |  *  8.  API calls     – GET booked slots, POST booking
  16  |  *  9.  Negative Cases– required fields, missing date/time, API failure
  17  |  */
  18  | 
  19  | import { test, expect, type Page } from '@playwright/test'
  20  | 
  21  | // Book-meeting is a public (www) page — no auth needed
  22  | test.use({ storageState: { cookies: [], origins: [] } })
  23  | 
  24  | // ─── Constants ────────────────────────────────────────────────────────────────
  25  | 
  26  | const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'
  27  | const PAGE_URL = `${BASE_URL}/book-meeting`
  28  | 
  29  | // ─── Route helpers ────────────────────────────────────────────────────────────
  30  | 
  31  | async function mockBookingAPIs(page: Page, bookingSuccess = true) {
  32  |   // GET: no booked slots
  33  |   await page.route('**/api/meeting-bookings**', route => {
  34  |     const method = route.request().method()
  35  |     if (method === 'GET') {
  36  |       return route.fulfill({ status: 200, contentType: 'application/json',
  37  |         body: JSON.stringify({ success: true, bookings: [] }) })
  38  |     }
  39  |     if (method === 'POST') {
  40  |       if (!bookingSuccess) {
  41  |         return route.fulfill({ status: 500, contentType: 'application/json',
  42  |           body: JSON.stringify({ error: 'Failed to book' }) })
  43  |       }
  44  |       return route.fulfill({ status: 200, contentType: 'application/json',
  45  |         body: JSON.stringify({ success: true, booking: { id: 'book-001' } }) })
  46  |     }
  47  |     return route.continue()
  48  |   })
  49  | }
  50  | 
  51  | /** Navigate to a future date on the calendar and select a time slot */
  52  | async function selectDateAndTime(page: Page) {
  53  |   // Navigate to the next month (find calendar nav button containing ChevronRight icon)
  54  |   // Use aria-label or position to avoid picking up other chevrons
  55  |   const nextBtn = page.locator('button').filter({ has: page.locator('[class*="lucide-chevron-right"]') }).first()
  56  |   const nextBtnFallback = page.getByRole('button').nth(2) // 3rd button is typically next-month
  57  |   await (await nextBtn.isVisible().catch(() => false) ? nextBtn : nextBtnFallback).click()
  58  |   await page.waitForTimeout(300)
  59  | 
  60  |   // Click day 15 — always future in next month, avoids day-10 edge cases
  61  |   await page.getByRole('button', { name: /^15$/ }).first().click()
  62  |   await page.waitForTimeout(300)
  63  | 
  64  |   // Wait for time slots to appear (fetchBookedSlots must complete)
  65  |   // Try 9:00am first, fall back to first available slot
  66  |   const slot9am = page.getByRole('button', { name: /^9:00am$/ })
  67  |   const hasSlot = await slot9am.isVisible({ timeout: 8000 }).catch(() => false)
  68  |   if (hasSlot) {
  69  |     await slot9am.click()
  70  |   } else {
  71  |     // Click the first time slot button (any format like "9:00am", "10:00am" etc.)
  72  |     const anySlot = page.locator('button').filter({ hasText: /^\d+:\d+(am|pm)$/ }).first()
> 73  |     await anySlot.waitFor({ state: 'visible', timeout: 5000 })
      |                   ^ TimeoutError: locator.waitFor: Timeout 5000ms exceeded.
  74  |     await anySlot.click()
  75  |   }
  76  |   await page.waitForTimeout(200)
  77  | }
  78  | 
  79  | // All tests in this file need extra time for calendar interactions
  80  | // test.describe.configure must be at file scope — 60 s per test
  81  | test.describe.configure({ timeout: 60_000 })
  82  | 
  83  | // ─────────────────────────────────────────────────────────────────────────────
  84  | // 1. PAGE LOAD
  85  | // ─────────────────────────────────────────────────────────────────────────────
  86  | 
  87  | test.describe('Book Meeting — Page Load', () => {
  88  | 
  89  |   test('1.1 Page renders HireGenAI branding', async ({ page }) => {
  90  |     await mockBookingAPIs(page)
  91  |     await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
  92  |     await expect(page.getByText('HireGenAI').first()).toBeVisible()
  93  |   })
  94  | 
  95  |   test('1.2 "30 Minute Meeting" title visible', async ({ page }) => {
  96  |     await mockBookingAPIs(page)
  97  |     await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
  98  |     await expect(page.getByText('30 Minute Meeting')).toBeVisible()
  99  |   })
  100 | 
  101 |   test('1.3 Step indicator shows 3 steps (Time, Details, Done)', async ({ page }) => {
  102 |     await mockBookingAPIs(page)
  103 |     await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
  104 |     await expect(page.getByText('Time').first()).toBeVisible()
  105 |     await expect(page.getByText('Details').first()).toBeVisible()
  106 |     await expect(page.getByText('Done').first()).toBeVisible()
  107 |   })
  108 | 
  109 |   test('1.4 Announcement banner visible', async ({ page }) => {
  110 |     await mockBookingAPIs(page)
  111 |     await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
  112 |     await expect(page.getByText(/AI-Powered Recruitment Suite/i)).toBeVisible()
  113 |   })
  114 | 
  115 | })
  116 | 
  117 | // ─────────────────────────────────────────────────────────────────────────────
  118 | // 2. LEFT SIDEBAR
  119 | // ─────────────────────────────────────────────────────────────────────────────
  120 | 
  121 | test.describe('Book Meeting — Left Sidebar', () => {
  122 | 
  123 |   test('2.1 "30 min" duration shown', async ({ page }) => {
  124 |     await mockBookingAPIs(page)
  125 |     await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
  126 |     await expect(page.getByText('30 min').first()).toBeVisible()
  127 |   })
  128 | 
  129 |   test('2.2 Timezone "India Standard Time" shown', async ({ page }) => {
  130 |     await mockBookingAPIs(page)
  131 |     await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
  132 |     await expect(page.getByText('India Standard Time').first()).toBeVisible()
  133 |   })
  134 | 
  135 |   test('2.3 "Google Meet" location shown', async ({ page }) => {
  136 |     await mockBookingAPIs(page)
  137 |     await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
  138 |     await expect(page.getByText('Google Meet')).toBeVisible()
  139 |   })
  140 | 
  141 |   test('2.4 "HireGenAI Team" profile shown', async ({ page }) => {
  142 |     await mockBookingAPIs(page)
  143 |     await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
  144 |     await expect(page.getByText('HireGenAI Team')).toBeVisible()
  145 |   })
  146 | 
  147 | })
  148 | 
  149 | // ─────────────────────────────────────────────────────────────────────────────
  150 | // 3. STEP 1 — CALENDAR
  151 | // ─────────────────────────────────────────────────────────────────────────────
  152 | 
  153 | test.describe('Book Meeting — Step 1 Calendar', () => {
  154 | 
  155 |   test('3.1 Calendar renders with month/year heading', async ({ page }) => {
  156 |     await mockBookingAPIs(page)
  157 |     await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
  158 |     // Should show current month and year
  159 |     const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  160 |     await expect(page.getByText(currentMonth).first()).toBeVisible()
  161 |   })
  162 | 
  163 |   test('3.2 Day of week headers (MON-SUN) visible', async ({ page }) => {
  164 |     await mockBookingAPIs(page)
  165 |     await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
  166 |     for (const day of ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']) {
  167 |       await expect(page.getByText(day)).toBeVisible()
  168 |     }
  169 |   })
  170 | 
  171 |   test('3.3 Previous month navigation button present', async ({ page }) => {
  172 |     await mockBookingAPIs(page)
  173 |     await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
```