# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 20-contact.spec.ts >> Contact — Footer >> 8.5 LinkedIn social link in footer
- Location: tests\e2e\20-contact.spec.ts:392:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.goto: Test timeout of 30000ms exceeded.
Call log:
  - navigating to "http://localhost:3000/contact", waiting until "networkidle"

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
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
    - generic [ref=e33]:
      - generic [ref=e34]:
        - heading "Get in Touch" [level=1] [ref=e35]
        - paragraph [ref=e36]: Have questions about HireGenAI? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
        - generic [ref=e37]:
          - generic [ref=e38]:
            - img [ref=e40]
            - generic [ref=e43]:
              - heading "Email Us" [level=3] [ref=e44]
              - paragraph [ref=e45]: support@hire-genai.com
          - generic [ref=e46]:
            - img [ref=e48]
            - generic [ref=e50]:
              - heading "Live Chat" [level=3] [ref=e51]
              - paragraph [ref=e52]: Available Mon-Fri, 9am-6pm IST
      - generic [ref=e53]:
        - heading "Leave a Message" [level=2] [ref=e54]
        - generic [ref=e55]:
          - generic [ref=e56]:
            - generic [ref=e57]: Full Name
            - textbox "Full Name" [ref=e58]:
              - /placeholder: Your full name
          - generic [ref=e59]:
            - generic [ref=e60]: Work Email
            - textbox "Work Email" [ref=e61]:
              - /placeholder: you@company.com
          - generic [ref=e62]:
            - generic [ref=e63]: Company Name
            - textbox "Company Name" [ref=e64]:
              - /placeholder: Your company name
          - generic [ref=e65]:
            - generic [ref=e66]: Phone Number (Optional)
            - textbox "Phone Number (Optional)" [ref=e67]:
              - /placeholder: +1 (555) 123-4567
          - generic [ref=e68]:
            - generic [ref=e69]: Subject
            - textbox "Subject" [ref=e70]:
              - /placeholder: How can we help?
          - generic [ref=e71]:
            - generic [ref=e72]: Your Message
            - textbox "Your Message" [ref=e73]:
              - /placeholder: Tell us more about your needs...
          - generic [ref=e74]:
            - checkbox "I agree to the Terms & Conditions and Privacy Policy" [ref=e75] [cursor=pointer]
            - generic [ref=e76] [cursor=pointer]:
              - text: I agree to the
              - link "Terms & Conditions" [ref=e77]:
                - /url: /terms
              - text: and
              - link "Privacy Policy" [ref=e78]:
                - /url: /privacy
          - button "Send Message" [disabled]:
            - text: Send Message
            - img
    - contentinfo [ref=e79]:
      - generic [ref=e80]:
        - generic [ref=e81]:
          - generic [ref=e82]:
            - heading "HireGenAI" [level=3] [ref=e83]
            - paragraph [ref=e84]: By SKYGENAI
            - paragraph [ref=e85]: HireGenAI pre-screens and interviews candidates, helping you shortlist talent 20x faster and more efficiently.
            - paragraph [ref=e86]:
              - text: "Email:"
              - link "support@hire-genai.com" [ref=e87] [cursor=pointer]:
                - /url: mailto:support@hire-genai.com
            - generic [ref=e88]:
              - link [ref=e89] [cursor=pointer]:
                - /url: "#"
                - img [ref=e90]
              - link [ref=e92] [cursor=pointer]:
                - /url: "#"
                - img [ref=e93]
              - link [ref=e96] [cursor=pointer]:
                - /url: "#"
                - img [ref=e97]
              - link [ref=e100] [cursor=pointer]:
                - /url: https://www.linkedin.com/company/hire-genai
                - img [ref=e101]
          - generic [ref=e105]:
            - heading "Product" [level=4] [ref=e106]
            - list [ref=e107]:
              - listitem [ref=e108]:
                - link "Try the Demo" [ref=e109] [cursor=pointer]:
                  - /url: /demo-en
              - listitem [ref=e110]:
                - link "Pricing" [ref=e111] [cursor=pointer]:
                  - /url: /pricing
              - listitem [ref=e112]:
                - link "Assessment" [ref=e113] [cursor=pointer]:
                  - /url: /?scroll=assessment
              - listitem [ref=e114]:
                - link "FAQs" [ref=e115] [cursor=pointer]:
                  - /url: /?scroll=faq
          - generic [ref=e116]:
            - heading "Company" [level=4] [ref=e117]
            - list [ref=e118]:
              - listitem [ref=e119]:
                - link "About us" [ref=e120] [cursor=pointer]:
                  - /url: /about
              - listitem [ref=e121]:
                - link "Contact" [ref=e122] [cursor=pointer]:
                  - /url: /contact
              - listitem [ref=e123]:
                - link "Book a Meeting" [ref=e124] [cursor=pointer]:
                  - /url: /book-meeting
              - listitem [ref=e125]:
                - link "Admin" [ref=e126] [cursor=pointer]:
                  - /url: /owner-login
          - generic [ref=e127]:
            - heading "Legal" [level=4] [ref=e128]
            - list [ref=e129]:
              - listitem [ref=e130]:
                - link "Privacy Policy" [ref=e131] [cursor=pointer]:
                  - /url: /privacy
              - listitem [ref=e132]:
                - link "Terms and Conditions" [ref=e133] [cursor=pointer]:
                  - /url: /terms
          - generic [ref=e135]:
            - generic [ref=e136]:
              - paragraph [ref=e137]: Trustpilot
              - generic [ref=e138]:
                - img [ref=e139]
                - img [ref=e141]
                - img [ref=e143]
                - img [ref=e145]
                - img [ref=e147]
              - paragraph [ref=e149]: TrustScore 4.5
            - generic [ref=e150]:
              - generic [ref=e151]:
                - img [ref=e152]
                - paragraph [ref=e155]: GDPR COMPLIANT
              - paragraph [ref=e156]: Your data is secure and compliant
        - paragraph [ref=e158]: © 2025 HireGenAI. All rights reserved.
  - region "Notifications (F8)":
    - list
  - button "Open Next.js Dev Tools" [ref=e164] [cursor=pointer]:
    - img [ref=e165]
  - alert [ref=e168]
```

# Test source

```ts
  294 |   })
  295 | 
  296 |   test('6.4 "Return to Home" navigates to /', async ({ page }) => {
  297 |     await submitForm(page)
  298 |     await page.getByRole('link', { name: /Return to Home/i }).click()
  299 |     await expect(page).toHaveURL(`${BASE_URL}/`, { timeout: 10_000 })
  300 |   })
  301 | 
  302 |   test('6.5 Form is hidden on success state', async ({ page }) => {
  303 |     await submitForm(page)
  304 |     // The form should not be visible on success state
  305 |     await expect(page.locator('#fullName')).not.toBeVisible({ timeout: 3000 })
  306 |   })
  307 | 
  308 | })
  309 | 
  310 | // ─────────────────────────────────────────────────────────────────────────────
  311 | // 7. NEGATIVE CASES
  312 | // ─────────────────────────────────────────────────────────────────────────────
  313 | 
  314 | test.describe('Contact — Negative Cases', () => {
  315 | 
  316 |   test('7.1 Submitting without agreeing to terms — button stays disabled', async ({ page }) => {
  317 |     await mockContactAPI(page)
  318 |     await page.goto(PAGE_URL, { waitUntil: 'networkidle' })
  319 |     await fillForm(page)
  320 |     // Don't check terms
  321 |     await expect(page.getByRole('button', { name: /Send Message/i })).toBeDisabled()
  322 |   })
  323 | 
  324 |   test('7.2 API error shows alert', async ({ page }) => {
  325 |     await mockContactAPI(page, false)
  326 |     await page.goto(PAGE_URL, { waitUntil: 'networkidle' })
  327 |     await fillForm(page)
  328 |     await checkTerms(page)
  329 | 
  330 |     let alertMsg = ''
  331 |     page.on('dialog', async d => { alertMsg = d.message(); await d.accept() })
  332 |     await page.getByRole('button', { name: /Send Message/i }).click()
  333 |     await page.waitForTimeout(1000)
  334 |     expect(alertMsg).toMatch(/failed|try again/i)
  335 |   })
  336 | 
  337 |   test('7.3 XSS in message field does not break page', async ({ page }) => {
  338 |     await mockContactAPI(page)
  339 |     await page.goto(PAGE_URL, { waitUntil: 'networkidle' })
  340 |     await page.fill('#message', "<script>alert('xss')</script>")
  341 |     await expect(page.getByRole('heading', { name: /Get in Touch/i })).toBeVisible()
  342 |   })
  343 | 
  344 |   test('7.4 Invalid email format blocked by HTML5 validation', async ({ page }) => {
  345 |     await mockContactAPI(page)
  346 |     await page.goto(PAGE_URL, { waitUntil: 'networkidle' })
  347 |     await page.fill('#fullName', 'Test')
  348 |     await page.fill('#workEmail', 'not-an-email')
  349 |     await page.fill('#companyName', 'Corp')
  350 |     await page.fill('#subject', 'Test')
  351 |     await page.fill('#message', 'Test message')
  352 |     await checkTerms(page)
  353 |     await page.getByRole('button', { name: /Send Message/i }).click()
  354 |     const emailInput = page.locator('#workEmail')
  355 |     const validationMsg = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage)
  356 |     expect(validationMsg.length).toBeGreaterThan(0)
  357 |   })
  358 | 
  359 | })
  360 | 
  361 | // ─────────────────────────────────────────────────────────────────────────────
  362 | // 8. FOOTER
  363 | // ─────────────────────────────────────────────────────────────────────────────
  364 | 
  365 | test.describe('Contact — Footer', () => {
  366 | 
  367 |   test('8.1 Footer is visible', async ({ page }) => {
  368 |     await mockContactAPI(page)
  369 |     await page.goto(PAGE_URL, { waitUntil: 'networkidle' })
  370 |     await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  371 |     await expect(page.locator('footer')).toBeVisible()
  372 |   })
  373 | 
  374 |   test('8.2 Footer shows "© 2025 HireGenAI"', async ({ page }) => {
  375 |     await mockContactAPI(page)
  376 |     await page.goto(PAGE_URL, { waitUntil: 'networkidle' })
  377 |     await expect(page.getByText(/© 2025 HireGenAI/i)).toBeVisible()
  378 |   })
  379 | 
  380 |   test('8.3 "GDPR COMPLIANT" badge shown in footer', async ({ page }) => {
  381 |     await mockContactAPI(page)
  382 |     await page.goto(PAGE_URL, { waitUntil: 'networkidle' })
  383 |     await expect(page.getByText(/GDPR COMPLIANT/i)).toBeVisible()
  384 |   })
  385 | 
  386 |   test('8.4 TrustScore badge shown', async ({ page }) => {
  387 |     await mockContactAPI(page)
  388 |     await page.goto(PAGE_URL, { waitUntil: 'networkidle' })
  389 |     await expect(page.getByText(/TrustScore/i)).toBeVisible()
  390 |   })
  391 | 
  392 |   test('8.5 LinkedIn social link in footer', async ({ page }) => {
  393 |     await mockContactAPI(page)
> 394 |     await page.goto(PAGE_URL, { waitUntil: 'networkidle' })
      |                ^ Error: page.goto: Test timeout of 30000ms exceeded.
  395 |     // LinkedIn link in footer — use href attribute selector to be precise
  396 |     await expect(page.locator('a[href*="linkedin.com"]').last()).toBeVisible()
  397 |   })
  398 | 
  399 | })
  400 | 
  401 | // ─────────────────────────────────────────────────────────────────────────────
  402 | // 9. RESPONSIVE
  403 | // ─────────────────────────────────────────────────────────────────────────────
  404 | 
  405 | test.describe('Contact — Responsive', () => {
  406 | 
  407 |   test('9.1 Page renders at 375px mobile', async ({ page }) => {
  408 |     await page.setViewportSize({ width: 375, height: 812 })
  409 |     await mockContactAPI(page)
  410 |     await page.goto(PAGE_URL, { waitUntil: 'networkidle' })
  411 |     await expect(page.getByRole('heading', { name: /Get in Touch/i })).toBeVisible()
  412 |   })
  413 | 
  414 |   test('9.2 Form fields visible on mobile', async ({ page }) => {
  415 |     await page.setViewportSize({ width: 375, height: 812 })
  416 |     await mockContactAPI(page)
  417 |     await page.goto(PAGE_URL, { waitUntil: 'networkidle' })
  418 |     await expect(page.locator('#fullName')).toBeVisible()
  419 |     await expect(page.locator('#message')).toBeVisible()
  420 |   })
  421 | 
  422 |   test('9.3 Submit button visible on mobile', async ({ page }) => {
  423 |     await page.setViewportSize({ width: 375, height: 812 })
  424 |     await mockContactAPI(page)
  425 |     await page.goto(PAGE_URL, { waitUntil: 'networkidle' })
  426 |     await expect(page.getByRole('button', { name: /Send Message/i })).toBeVisible()
  427 |   })
  428 | 
  429 | })
  430 | 
```