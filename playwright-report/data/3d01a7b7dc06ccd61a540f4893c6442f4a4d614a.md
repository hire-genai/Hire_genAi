# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 14-talent-pool.spec.ts >> Talent Pool — Page Load >> 1.3 Loading skeleton shown before data arrives
- Location: tests\e2e\14-talent-pool.spec.ts:179:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('[class*="skeleton"], [class*="animate-pulse"]').first()
Expected: visible
Timeout: 3000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 3000ms
  - waiting for locator('[class*="skeleton"], [class*="animate-pulse"]').first()

```

```yaml
- paragraph: Loading...
- region "Notifications (F8)":
  - list
- alert
```

# Test source

```ts
  89  |       total: 3, activeInterest: 2, passive: 1,
  90  |       byPosition: 3,
  91  |       bySource: { referral: 1, linkedin: 1, pastApplication: 1 },
  92  |       recentlyContacted: 1, avgSkillsPerCandidate: '3.7',
  93  |     },
  94  |     availableJDs: [
  95  |       { id: 'jd-001', title: 'Senior Engineer', department: 'Engineering', location: 'Remote',
  96  |         responsibilities: ['Build features', 'Code reviews'], required_skills: ['TypeScript', 'React'] },
  97  |       { id: 'jd-002', title: 'Product Manager', department: 'Product', location: 'NYC',
  98  |         responsibilities: ['Define roadmap', 'Manage stakeholders'], required_skills: ['Analytics', 'Communication'] },
  99  |     ],
  100 |     recruiters: [{ id: 'rec-001', name: 'E2E Recruiter' }],
  101 |   },
  102 | }
  103 | 
  104 | // ─── Route helpers ────────────────────────────────────────────────────────────
  105 | 
  106 | async function mockTalentPoolAPI(page: Page, overrideData?: object) {
  107 |   await page.route('**/api/talent-pool**', route => {
  108 |     const method = route.request().method()
  109 |     if (method === 'GET') {
  110 |       return route.fulfill({
  111 |         status: 200, contentType: 'application/json',
  112 |         body: JSON.stringify(overrideData ?? MOCK_DATA),
  113 |       })
  114 |     }
  115 |     if (method === 'POST') {
  116 |       return route.fulfill({
  117 |         status: 200, contentType: 'application/json',
  118 |         body: JSON.stringify({ success: true, poolId: 'pool-new' }),
  119 |       })
  120 |     }
  121 |     return route.continue()
  122 |   })
  123 | }
  124 | 
  125 | async function mockTalentPoolAPIError(page: Page) {
  126 |   await page.route('**/api/talent-pool**', route =>
  127 |     route.fulfill({ status: 500, contentType: 'application/json',
  128 |       body: JSON.stringify({ error: 'Internal server error' }) })
  129 |   )
  130 | }
  131 | 
  132 | async function mockSendEmailAPI(page: Page, success = true) {
  133 |   await page.route('**/api/talent-pool/send-email**', route =>
  134 |     route.fulfill({
  135 |       status: success ? 200 : 500,
  136 |       contentType: 'application/json',
  137 |       body: JSON.stringify(success
  138 |         ? { success: true, sentTo: 2 }
  139 |         : { error: 'Email service unavailable' }),
  140 |     })
  141 |   )
  142 | }
  143 | 
  144 | async function mockImportAPI(page: Page) {
  145 |   await page.route('**/api/talent-pool/import**', route =>
  146 |     route.fulfill({
  147 |       status: 200, contentType: 'application/json',
  148 |       body: JSON.stringify({ imported: 3, errors: 0, errorDetails: [] }),
  149 |     })
  150 |   )
  151 | }
  152 | 
  153 | async function setup(page: Page, overrideData?: object) {
  154 |   await mockSessionAPI(page)
  155 |   await mockTalentPoolAPI(page, overrideData)
  156 |   await mockSendEmailAPI(page)
  157 |   await mockImportAPI(page)
  158 |   await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
  159 |   // Wait for data to load — stats cards appear only after !loading
  160 |   await page.getByText('Total Pool').waitFor({ state: 'visible', timeout: 20_000 })
  161 | }
  162 | 
  163 | // ─────────────────────────────────────────────────────────────────────────────
  164 | // 1. PAGE LOAD
  165 | // ─────────────────────────────────────────────────────────────────────────────
  166 | 
  167 | test.describe('Talent Pool — Page Load', () => {
  168 | 
  169 |   test('1.1 Page renders with "Talent Pool" heading', async ({ page }) => {
  170 |     await setup(page)
  171 |     await expect(page.getByRole('heading', { name: /Talent Pool/i }).first()).toBeVisible()
  172 |   })
  173 | 
  174 |   test('1.2 Subtitle text visible', async ({ page }) => {
  175 |     await setup(page)
  176 |     await expect(page.getByText(/Manage and engage with potential candidates/i)).toBeVisible()
  177 |   })
  178 | 
  179 |   test('1.3 Loading skeleton shown before data arrives', async ({ page }) => {
  180 |     await mockSessionAPI(page)
  181 |     // Delay API response so skeleton is visible
  182 |     await page.route('**/api/talent-pool**', async route => {
  183 |       await new Promise(r => setTimeout(r, 500))
  184 |       await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DATA) })
  185 |     })
  186 |     await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
  187 |     // Skeleton should appear immediately
  188 |     const skeleton = page.locator('[class*="skeleton"], [class*="animate-pulse"]').first()
> 189 |     await expect(skeleton).toBeVisible({ timeout: 3000 })
      |                            ^ Error: expect(locator).toBeVisible() failed
  190 |   })
  191 | 
  192 |   test('1.4 Error state shown with retry button on API failure', async ({ page }) => {
  193 |     await mockSessionAPI(page)
  194 |     await mockTalentPoolAPIError(page)
  195 |     await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
  196 |     await expect(page.getByText(/error|failed|something went wrong/i).first()).toBeVisible({ timeout: 15_000 })
  197 |     await expect(page.getByRole('button', { name: /retry|try again/i })).toBeVisible({ timeout: 5000 })
  198 |   })
  199 | 
  200 | })
  201 | 
  202 | // ─────────────────────────────────────────────────────────────────────────────
  203 | // 2. STATS DASHBOARD
  204 | // ─────────────────────────────────────────────────────────────────────────────
  205 | 
  206 | test.describe('Talent Pool — Stats Dashboard', () => {
  207 | 
  208 |   test('2.1 All 6 stat card labels visible', async ({ page }) => {
  209 |     await setup(page)
  210 |     for (const label of ['Total Pool', 'Active Interest', 'Passive', 'Referrals', 'Recent Contact', 'Avg Skills']) {
  211 |       await expect(page.getByText(label).first()).toBeVisible()
  212 |     }
  213 |   })
  214 | 
  215 |   test('2.2 Total Pool count matches mock data', async ({ page }) => {
  216 |     await setup(page)
  217 |     // Stats show: total=3, activeInterest=2, passive=1
  218 |     const totalCard = page.locator('[data-slot="card"]').filter({ hasText: 'Total Pool' }).first()
  219 |     await expect(totalCard).toContainText('3')
  220 |   })
  221 | 
  222 |   test('2.3 Active Interest count correct', async ({ page }) => {
  223 |     await setup(page)
  224 |     const card = page.locator('[data-slot="card"]').filter({ hasText: 'Active Interest' }).first()
  225 |     await expect(card).toContainText('2')
  226 |   })
  227 | 
  228 |   test('2.4 Passive count correct', async ({ page }) => {
  229 |     await setup(page)
  230 |     // Stat card for Passive — find card whose small grey label says "Passive"
  231 |     // The stat cards have: p.text-xs (label) then p.text-xl (value)
  232 |     const card = page.locator('[data-slot="card"]')
  233 |       .filter({ has: page.locator('p', { hasText: /^Passive$/ }) })
  234 |       .first()
  235 |     await expect(card).toBeVisible()
  236 |     await expect(card.locator('p.text-xl').first()).toContainText('1')
  237 |   })
  238 | 
  239 |   test('2.5 Referrals count correct', async ({ page }) => {
  240 |     await setup(page)
  241 |     const card = page.locator('[data-slot="card"]').filter({ hasText: 'Referrals' }).first()
  242 |     await expect(card).toContainText('1')
  243 |   })
  244 | 
  245 |   test('2.6 Avg Skills value shown', async ({ page }) => {
  246 |     await setup(page)
  247 |     const card = page.locator('[data-slot="card"]').filter({ hasText: 'Avg Skills' }).first()
  248 |     await expect(card).toContainText('3.7')
  249 |   })
  250 | 
  251 | })
  252 | 
  253 | // ─────────────────────────────────────────────────────────────────────────────
  254 | // 3. VIEW-AS FILTER
  255 | // ─────────────────────────────────────────────────────────────────────────────
  256 | 
  257 | test.describe('Talent Pool — View-As Filter', () => {
  258 | 
  259 |   test('3.1 Role selector visible with options', async ({ page }) => {
  260 |     await setup(page)
  261 |     await expect(page.getByText('View as:').first()).toBeVisible()
  262 |     // Role selector should have recruiter/manager/director options
  263 |     const trigger = page.getByText(/Recruiter|Manager|Director/i).first()
  264 |     await expect(trigger).toBeVisible()
  265 |   })
  266 | 
  267 |   test('3.2 Recruiter dropdown shows "All Recruiters" option', async ({ page }) => {
  268 |     await setup(page)
  269 |     await expect(page.getByText('All Recruiters').first()).toBeVisible()
  270 |   })
  271 | 
  272 | })
  273 | 
  274 | // ─────────────────────────────────────────────────────────────────────────────
  275 | // 4. ADD TO POOL BUTTON
  276 | // ─────────────────────────────────────────────────────────────────────────────
  277 | 
  278 | test.describe('Talent Pool — Add to Pool Button', () => {
  279 | 
  280 |   test('4.1 "Add to Pool" button visible in header', async ({ page }) => {
  281 |     await setup(page)
  282 |     await expect(page.getByRole('button', { name: /Add to Pool/i })).toBeVisible()
  283 |   })
  284 | 
  285 |   test('4.2 Clicking "Add to Pool" opens the Add Candidate dialog', async ({ page }) => {
  286 |     await setup(page)
  287 |     await page.getByRole('button', { name: /Add to Pool/i }).click()
  288 |     await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 })
  289 |     await expect(page.getByText(/Add Candidate to Talent Pool/i)).toBeVisible()
```