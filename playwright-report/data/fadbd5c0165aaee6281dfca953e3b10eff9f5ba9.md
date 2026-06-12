# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 12-apply-all-jobs.spec.ts >> Apply → Senior Software Engineer (E2E Test) >> 5. Full submission succeeds → Application Submitted!
- Location: tests\e2e\12-apply-all-jobs.spec.ts:150:9

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('#firstName')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - img [ref=e4]
    - heading "Unable to Load Application" [level=2] [ref=e6]
    - paragraph [ref=e7]: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
    - button "Go Back" [ref=e8] [cursor=pointer]:
      - img
      - text: Go Back
  - region "Notifications (F8)":
    - list
  - button "Open Next.js Dev Tools" [ref=e14] [cursor=pointer]:
    - img [ref=e15]
  - alert [ref=e18]
```

# Test source

```ts
  1   | /**
  2   |  * tests/e2e/12-apply-all-jobs.spec.ts
  3   |  *
  4   |  * Runs apply-form tests against every seeded job from tests/e2e/seeded-jobs.json.
  5   |  * For each of the 17 jobs it verifies:
  6   |  *   1. Apply page loads (job title visible)
  7   |  *   2. All form fields accept input
  8   |  *   3. PDF upload accepted
  9   |  *   4. Consent flow (Agree + checkbox) enables submit
  10  |  *   5. Full submission succeeds → "Application Submitted!" shown
  11  |  *   6. Candidate is stored in DB (verify via /api/applications)
  12  |  *
  13  |  * Prerequisites:
  14  |  *   node scripts/seed-test-company.js   ← creates company + base job
  15  |  *   node scripts/seed-jds.js            ← creates 17 jobs, writes seeded-jobs.json
  16  |  */
  17  | 
  18  | import path from 'path'
  19  | import fs from 'fs'
  20  | import os from 'os'
  21  | import { test, expect, type Page } from '@playwright/test'
  22  | 
  23  | // ─── Load seeded jobs ─────────────────────────────────────────────────────────
  24  | const SEEDED_FILE = path.join(__dirname, 'seeded-jobs.json')
  25  | const seededData  = JSON.parse(fs.readFileSync(SEEDED_FILE, 'utf-8'))
  26  | const JOBS: Array<{ title: string; jobId: string; applyUrl: string }> = seededData.jobs
  27  | 
  28  | const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'
  29  | 
  30  | // ─── Helpers ─────────────────────────────────────────────────────────────────
  31  | 
  32  | function makePdf(name: string): string {
  33  |   const file = path.join(os.tmpdir(), name)
  34  |   fs.writeFileSync(
  35  |     file,
  36  |     Buffer.from(
  37  |       '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
  38  |       '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
  39  |       '3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Contents 4 0 R/Resources<<>>>>\nendobj\n' +
  40  |       '4 0 obj<</Length 60>>stream\nBT /F1 12 Tf 100 700 Td (Experienced professional resume) Tj ET\nendstream\nendobj\n' +
  41  |       'xref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n' +
  42  |       '0000000115 00000 n\n0000000206 00000 n\n' +
  43  |       'trailer<</Size 5/Root 1 0 R>>\nstartxref\n315\n%%EOF'
  44  |     )
  45  |   )
  46  |   return file
  47  | }
  48  | 
  49  | // Minimal 1×1 white JPEG
  50  | const FAKE_PHOTO =
  51  |   'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAAR' +
  52  |   'CAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFREBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8' +
  53  |   'AJQAB/9k='
  54  | 
  55  | async function injectPhoto(page: Page) {
  56  |   const photo = FAKE_PHOTO
  57  |   await page.evaluate((photoData: string) => {
  58  |     function getFiber(el: Element): any {
  59  |       const key = Object.keys(el).find(k =>
  60  |         k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance') || k.startsWith('__reactContainer')
  61  |       )
  62  |       return key ? (el as any)[key] : null
  63  |     }
  64  |     const roots = [
  65  |       ...Array.from(document.querySelectorAll('h3')).filter(h => h.textContent?.includes('Candidate Photo')),
  66  |       document.body,
  67  |     ]
  68  |     for (const rootEl of roots) {
  69  |       const fiber = getFiber(rootEl)
  70  |       if (!fiber) continue
  71  |       const queue: any[] = [fiber]
  72  |       const seen = new Set<any>()
  73  |       while (queue.length > 0 && seen.size < 3000) {
  74  |         const f = queue.shift()
  75  |         if (!f || seen.has(f)) continue
  76  |         seen.add(f)
  77  |         if (typeof f.memoizedProps?.onCapture === 'function') { f.memoizedProps.onCapture(photoData); return }
  78  |         if (f.child) queue.push(f.child)
  79  |         if (f.sibling) queue.push(f.sibling)
  80  |       }
  81  |     }
  82  |   }, photo)
  83  | }
  84  | 
  85  | async function fillForm(page: Page, email: string) {
> 86  |   await page.fill('#firstName', 'Test')
      |              ^ Error: page.fill: Test timeout of 30000ms exceeded.
  87  |   await page.fill('#lastName', 'Candidate')
  88  |   await page.fill('#email', email)
  89  |   await page.fill('#phone', '+91 99999 00000')
  90  |   await page.fill('input[inputmode="decimal"]', '75000')
  91  |   await page.fill('#location', 'Mumbai, India')
  92  |   await page.fill('#start', '2025-08-01')
  93  |   await injectPhoto(page)
  94  | }
  95  | 
  96  | async function uploadPdf(page: Page, pdfPath: string) {
  97  |   await page.locator('input[type="file"][accept*="pdf"]').setInputFiles(pdfPath)
  98  | }
  99  | 
  100 | async function acceptConsent(page: Page) {
  101 |   await page.getByRole('button', { name: /^Agree$/i }).click()
  102 |   const cb = page.locator('input[type="checkbox"]').last()
  103 |   if (!(await cb.isChecked())) await cb.check()
  104 | }
  105 | 
  106 | // ─── Tests: one describe per job ─────────────────────────────────────────────
  107 | 
  108 | for (const job of JOBS) {
  109 |   const TS       = Date.now()
  110 |   const jobEmail = `apply.${job.jobId.slice(0, 8)}.${TS}@e2etest.com`
  111 | 
  112 |   test.describe(`Apply → ${job.title}`, () => {
  113 | 
  114 |     test('1. Apply page loads — job title visible', async ({ page }) => {
  115 |       await page.goto(job.applyUrl, { waitUntil: 'networkidle' })
  116 |       await expect(page.getByRole('heading', { name: /Apply for this position/i })).toBeVisible()
  117 |       // Job title should appear somewhere on the page (in the green header band)
  118 |       await expect(page.getByText(job.title.slice(0, 30), { exact: false })).toBeVisible()
  119 |     })
  120 | 
  121 |     test('2. All form fields accept input correctly', async ({ page }) => {
  122 |       await page.goto(job.applyUrl, { waitUntil: 'networkidle' })
  123 |       await fillForm(page, jobEmail)
  124 | 
  125 |       await expect(page.locator('#firstName')).toHaveValue('Test')
  126 |       await expect(page.locator('#lastName')).toHaveValue('Candidate')
  127 |       await expect(page.locator('#email')).toHaveValue(jobEmail)
  128 |       await expect(page.locator('#phone')).toHaveValue('+91 99999 00000')
  129 |       await expect(page.locator('#location')).toHaveValue('Mumbai, India')
  130 |     })
  131 | 
  132 |     test('3. PDF resume upload shows file name', async ({ page }) => {
  133 |       await page.goto(job.applyUrl, { waitUntil: 'networkidle' })
  134 |       const pdf = makePdf(`cv-${job.jobId.slice(0, 8)}.pdf`)
  135 |       await uploadPdf(page, pdf)
  136 |       await expect(page.getByText(path.basename(pdf))).toBeVisible({ timeout: 5000 })
  137 |     })
  138 | 
  139 |     test('4. Consent accepted — Submit button becomes enabled', async ({ page }) => {
  140 |       await page.goto(job.applyUrl, { waitUntil: 'networkidle' })
  141 |       const btn = page.getByRole('button', { name: /Submit Application/i })
  142 | 
  143 |       // Initially disabled (consent not given)
  144 |       await expect(btn).toBeDisabled()
  145 | 
  146 |       await acceptConsent(page)
  147 |       await expect(btn).toBeEnabled()
  148 |     })
  149 | 
  150 |     test('5. Full submission succeeds → Application Submitted!', async ({ page }) => {
  151 |       // Mock CV parse/eval — real DB submit is NOT mocked
  152 |       await page.route('**/api/resumes/parse**', r => r.fulfill({ status: 200,
  153 |         contentType: 'application/json', body: JSON.stringify({ parsed: { rawText: 'Candidate profile.' }, success: true }) }))
  154 |       await page.route('**/api/applications/evaluate-cv**', r => r.fulfill({ status: 200,
  155 |         contentType: 'application/json', body: JSON.stringify({ score: 80, qualified: true, verdict: 'Strong Match' }) }))
  156 | 
  157 |       await page.goto(job.applyUrl, { waitUntil: 'networkidle' })
  158 | 
  159 |       const uniqueEmail = `submit.${job.jobId.slice(0, 8)}.${TS}@e2etest.com`
  160 |       const pdf = makePdf(`cv-submit-${job.jobId.slice(0, 8)}.pdf`)
  161 | 
  162 |       await fillForm(page, uniqueEmail)
  163 |       await uploadPdf(page, pdf)
  164 |       await acceptConsent(page)
  165 | 
  166 |       await page.getByRole('button', { name: /Submit Application/i }).click()
  167 | 
  168 |       await expect(page.getByText(/Application Submitted!/i)).toBeVisible({ timeout: 45_000 })
  169 |       await expect(page.getByText(/Thank you for applying/i)).toBeVisible()
  170 |     })
  171 | 
  172 |     test('6. Candidate stored in DB after submission', async ({ page }) => {
  173 |       await page.route('**/api/resumes/parse**', r => r.fulfill({ status: 200,
  174 |         contentType: 'application/json', body: JSON.stringify({ parsed: { rawText: 'DB check candidate.' }, success: true }) }))
  175 |       await page.route('**/api/applications/evaluate-cv**', r => r.fulfill({ status: 200,
  176 |         contentType: 'application/json', body: JSON.stringify({ score: 75, qualified: true, verdict: 'Good Match' }) }))
  177 | 
  178 |       await page.goto(job.applyUrl, { waitUntil: 'networkidle' })
  179 | 
  180 |       const dbEmail = `dbcheck.${job.jobId.slice(0, 8)}.${TS}@e2etest.com`
  181 |       const pdf = makePdf(`cv-db-${job.jobId.slice(0, 8)}.pdf`)
  182 | 
  183 |       await fillForm(page, dbEmail)
  184 |       await uploadPdf(page, pdf)
  185 |       await acceptConsent(page)
  186 |       await page.getByRole('button', { name: /Submit Application/i }).click()
```