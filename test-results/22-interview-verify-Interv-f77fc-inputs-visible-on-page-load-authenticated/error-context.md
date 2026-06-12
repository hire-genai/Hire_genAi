# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 22-interview-verify.spec.ts >> Interview Verify — OTP Sending >> 2.1 OTP loading state or OTP inputs visible on page load
- Location: tests\e2e\22-interview-verify.spec.ts:145:7

# Error details

```
Error: expect(received).toBeTruthy()

Received: null
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e5]:
        - img [ref=e6]
        - generic [ref=e9]: Email OTP
      - img [ref=e10]
      - generic [ref=e12]:
        - img [ref=e13]
        - generic [ref=e16]: Photo Verify
    - generic [ref=e18]:
      - generic [ref=e19]:
        - img [ref=e21]
        - heading "Email Verification" [level=2] [ref=e24]
        - paragraph [ref=e25]: We've sent a 6-digit code to r***l@example.com
      - generic [ref=e26]:
        - textbox [active] [ref=e27]
        - textbox [ref=e28]
        - textbox [ref=e29]
        - textbox [ref=e30]
        - textbox [ref=e31]
        - textbox [ref=e32]
      - button "Didn't receive the code? Resend" [ref=e34] [cursor=pointer]
  - region "Notifications (F8)":
    - list
  - button "Open Next.js Dev Tools" [ref=e40] [cursor=pointer]:
    - img [ref=e41]
  - alert [ref=e44]
```

# Test source

```ts
  52  | }
  53  | 
  54  | async function mockVerifyOTP(page: Page, success = true) {
  55  |   await page.route('**/api/interview/verify/verify-otp**', route =>
  56  |     route.fulfill({
  57  |       status: 200,
  58  |       contentType: 'application/json',
  59  |       body: JSON.stringify(
  60  |         success ? { ok: true } : { ok: false, error: 'Invalid OTP. Please try again.' }
  61  |       ),
  62  |     })
  63  |   )
  64  | }
  65  | 
  66  | async function mockComparePhoto(page: Page, hasPhoto = true) {
  67  |   await page.route('**/api/interview/verify/compare-photo**', route => {
  68  |     const method = route.request().method()
  69  |     if (method === 'GET') {
  70  |       return route.fulfill({
  71  |         status: 200,
  72  |         contentType: 'application/json',
  73  |         body: JSON.stringify(
  74  |           hasPhoto ? { ok: true, storedPhotoUrl: 'https://storage.test/photo.jpg' }
  75  |                    : { ok: true, skipped: true, message: 'No photo on file' }
  76  |         ),
  77  |       })
  78  |     }
  79  |     return route.fulfill({
  80  |       status: 200,
  81  |       contentType: 'application/json',
  82  |       body: JSON.stringify({ ok: true, matched: true }),
  83  |     })
  84  |   })
  85  | }
  86  | 
  87  | async function mockSecurityAlert(page: Page) {
  88  |   await page.route('**/api/interview/verify/security-alert**', route =>
  89  |     route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
  90  |   )
  91  | }
  92  | 
  93  | async function setupPage(page: Page, opts: { sendSuccess?: boolean; verifySuccess?: boolean; hasPhoto?: boolean } = {}) {
  94  |   const { sendSuccess = true, verifySuccess = true, hasPhoto = false } = opts
  95  | 
  96  |   // Dismiss onboarding tour
  97  |   await page.addInitScript(() => {
  98  |     localStorage.setItem('hasSeenOnboardingTour', 'true')
  99  |     // Prevent auto-send dedupe from sessionStorage in test
  100 |   })
  101 | 
  102 |   await mockSendOTP(page, sendSuccess)
  103 |   await mockVerifyOTP(page, verifySuccess)
  104 |   await mockComparePhoto(page, hasPhoto)
  105 |   await mockSecurityAlert(page)
  106 | 
  107 |   await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
  108 | }
  109 | 
  110 | // ─────────────────────────────────────────────────────────────────────────────
  111 | // 1. PAGE LOAD
  112 | // ─────────────────────────────────────────────────────────────────────────────
  113 | 
  114 | test.describe('Interview Verify — Page Load', () => {
  115 | 
  116 |   test('1.1 Page renders 2-step progress indicator', async ({ page }) => {
  117 |     await setupPage(page)
  118 |     await expect(page.getByText('Email OTP').first()).toBeVisible({ timeout: 10_000 })
  119 |     await expect(page.getByText('Photo Verify').first()).toBeVisible()
  120 |   })
  121 | 
  122 |   test('1.2 "Email Verification" heading shown in step 1', async ({ page }) => {
  123 |     await setupPage(page)
  124 |     await expect(page.getByText('Email OTP').first()).toBeVisible({ timeout: 10_000 })
  125 |     // After OTP sends (auto), heading should appear
  126 |     await expect(page.getByText(/Email Verification/i).first()).toBeVisible({ timeout: 10_000 })
  127 |   })
  128 | 
  129 |   test('1.3 Step 1 (Email OTP) is active by default', async ({ page }) => {
  130 |     await setupPage(page)
  131 |     await expect(page.getByText('Email OTP').first()).toBeVisible({ timeout: 10_000 })
  132 |     // Email OTP pill should have active styling (ring)
  133 |     const step1 = page.locator('div').filter({ hasText: /^Email OTP$/ }).first()
  134 |     await expect(step1).toBeVisible()
  135 |   })
  136 | 
  137 | })
  138 | 
  139 | // ─────────────────────────────────────────────────────────────────────────────
  140 | // 2. OTP SENDING
  141 | // ─────────────────────────────────────────────────────────────────────────────
  142 | 
  143 | test.describe('Interview Verify — OTP Sending', () => {
  144 | 
  145 |   test('2.1 OTP loading state or OTP inputs visible on page load', async ({ page }) => {
  146 |     await setupPage(page)
  147 |     // Either spinner briefly shows, or OTP inputs appear — both mean OTP sent
  148 |     const result = await Promise.race([
  149 |       page.getByText(/Sending verification code/i).waitFor({ state: 'visible', timeout: 2000 }).then(() => 'spinner').catch(() => null),
  150 |       page.getByText(/6-digit code/i).first().waitFor({ state: 'visible', timeout: 10_000 }).then(() => 'otp').catch(() => null),
  151 |     ])
> 152 |     expect(result).toBeTruthy()
      |                    ^ Error: expect(received).toBeTruthy()
  153 |   })
  154 | 
  155 |   test('2.2 Masked email shown after OTP sent successfully', async ({ page }) => {
  156 |     await setupPage(page)
  157 |     await expect(page.getByText(/r\*\*\*l@example\.com/i).first()).toBeVisible({ timeout: 10_000 })
  158 |   })
  159 | 
  160 |   test('2.3 "We\'ve sent a 6-digit code" message shown', async ({ page }) => {
  161 |     await setupPage(page)
  162 |     await expect(page.getByText(/6-digit code/i).first()).toBeVisible({ timeout: 10_000 })
  163 |   })
  164 | 
  165 | })
  166 | 
  167 | // ─────────────────────────────────────────────────────────────────────────────
  168 | // 3. OTP INPUT BOXES
  169 | // ─────────────────────────────────────────────────────────────────────────────
  170 | 
  171 | test.describe('Interview Verify — OTP Input', () => {
  172 | 
  173 |   test('3.1 Six OTP input boxes visible after sending', async ({ page }) => {
  174 |     await setupPage(page)
  175 |     // Wait for OTP sent state
  176 |     await expect(page.getByText(/r\*\*\*l@example\.com/i).first()).toBeVisible({ timeout: 10_000 })
  177 |     const otpInputs = page.locator('input[inputmode="numeric"]')
  178 |     await expect(otpInputs).toHaveCount(6, { timeout: 5000 })
  179 |   })
  180 | 
  181 |   test('3.2 OTP boxes accept only digits', async ({ page }) => {
  182 |     await setupPage(page)
  183 |     await expect(page.getByText(/r\*\*\*l@example\.com/i).first()).toBeVisible({ timeout: 10_000 })
  184 |     const firstBox = page.locator('input[inputmode="numeric"]').first()
  185 |     await firstBox.fill('a')
  186 |     await expect(firstBox).toHaveValue('')
  187 |     await firstBox.fill('5')
  188 |     await expect(firstBox).toHaveValue('5')
  189 |   })
  190 | 
  191 |   test('3.3 Typing in box moves to next box (auto-advance)', async ({ page }) => {
  192 |     await setupPage(page)
  193 |     await expect(page.getByText(/r\*\*\*l@example\.com/i).first()).toBeVisible({ timeout: 10_000 })
  194 |     const boxes = page.locator('input[inputmode="numeric"]')
  195 |     // Type into first box, second box value should become fillable
  196 |     await boxes.nth(0).fill('1')
  197 |     await page.waitForTimeout(200)
  198 |     // Box 0 should now have value '1'
  199 |     await expect(boxes.nth(0)).toHaveValue('1')
  200 |     // And second box should be focused (auto-advance)
  201 |     const focused = await boxes.nth(1).evaluate(el => el === document.activeElement).catch(() => false)
  202 |     expect(focused).toBe(true)
  203 |   })
  204 | 
  205 |   test('3.4 OTP inputs accept single digit only', async ({ page }) => {
  206 |     await setupPage(page)
  207 |     await expect(page.getByText(/r\*\*\*l@example\.com/i).first()).toBeVisible({ timeout: 10_000 })
  208 |     const boxes = page.locator('input[inputmode="numeric"]')
  209 |     // Fill first box with '5', verify it holds exactly one digit
  210 |     await boxes.first().fill('5')
  211 |     const val = await boxes.first().inputValue()
  212 |     expect(val.length).toBeLessThanOrEqual(1)
  213 |     expect(val).toBe('5')
  214 |   })
  215 | 
  216 | })
  217 | 
  218 | // ─────────────────────────────────────────────────────────────────────────────
  219 | // 4. OTP VERIFICATION
  220 | // ─────────────────────────────────────────────────────────────────────────────
  221 | 
  222 | test.describe('Interview Verify — OTP Verification', () => {
  223 | 
  224 |   async function typeOTP(page: Page, code = '123456') {
  225 |     await expect(page.getByText(/r\*\*\*l@example\.com/i).first()).toBeVisible({ timeout: 10_000 })
  226 |     const boxes = page.locator('input[inputmode="numeric"]')
  227 |     for (let i = 0; i < 6; i++) {
  228 |       await boxes.nth(i).fill(code[i])
  229 |     }
  230 |   }
  231 | 
  232 |   test('4.1 Entering all 6 digits triggers verification', async ({ page }) => {
  233 |     await setupPage(page)
  234 |     let verified = false
  235 |     await page.route('**/api/interview/verify/verify-otp**', route => {
  236 |       verified = true
  237 |       return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
  238 |     })
  239 |     await typeOTP(page)
  240 |     await page.waitForTimeout(500)
  241 |     expect(verified).toBe(true)
  242 |   })
  243 | 
  244 |   test('4.2 "Verifying..." spinner shown during verification', async ({ page }) => {
  245 |     await page.addInitScript(() => { localStorage.setItem('hasSeenOnboardingTour', 'true') })
  246 |     await mockSendOTP(page)
  247 |     await page.route('**/api/interview/verify/verify-otp**', async route => {
  248 |       await new Promise(r => setTimeout(r, 400))
  249 |       await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
  250 |     })
  251 |     await mockComparePhoto(page)
  252 |     await mockSecurityAlert(page)
```