# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 21-settings-payment.spec.ts >> Settings Payment — Stripe Redirect Handling >> 15.2 stripe_sub_success clears URL param
- Location: tests\e2e\21-settings-payment.spec.ts:623:7

# Error details

```
Error: expect(received).not.toContain(expected) // indexOf

Expected substring: not "stripe_sub_success"
Received string:        "http://localhost:3000/settings?tab=payment&stripe_sub_success=1"
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - complementary [ref=e3]:
      - generic [ref=e4]:
        - generic [ref=e5]:
          - generic [ref=e6]:
            - img [ref=e8]
            - generic [ref=e13]: HireGenAI
          - button "Collapse Sidebar" [ref=e15] [cursor=pointer]:
            - img
        - generic [ref=e16]:
          - generic [ref=e17]: ET
          - generic [ref=e18]:
            - heading "E2E Test User" [level=4] [ref=e19]
            - paragraph [ref=e20]: e2e-test@playwrightcorp.com
            - paragraph [ref=e21]: Manager
      - navigation [ref=e22]:
        - generic [ref=e23]:
          - heading "MAIN" [level=3] [ref=e24]
          - generic [ref=e25]:
            - link "Dashboard" [ref=e26] [cursor=pointer]:
              - /url: /dashboard
              - button "Dashboard" [ref=e27]:
                - img
                - generic [ref=e28]: Dashboard
            - link "Applications" [ref=e29] [cursor=pointer]:
              - /url: /candidate
              - button "Applications" [ref=e30]:
                - img
                - generic [ref=e31]: Applications
            - link "Job Postings" [ref=e32] [cursor=pointer]:
              - /url: /jobs
              - button "Job Postings" [ref=e33]:
                - img
                - generic [ref=e34]: Job Postings
            - link "Talent Pool" [ref=e35] [cursor=pointer]:
              - /url: /talent-pool
              - button "Talent Pool" [ref=e36]:
                - img
                - generic [ref=e37]: Talent Pool
        - generic [ref=e38]:
          - heading "MANAGEMENT" [level=3] [ref=e39]
          - generic [ref=e40]:
            - link "Delegation" [ref=e41] [cursor=pointer]:
              - /url: /delegation
              - button "Delegation" [ref=e42]:
                - img
                - generic [ref=e43]: Delegation
            - link "Support" [ref=e44] [cursor=pointer]:
              - /url: /support
              - button "Support" [ref=e45]:
                - img
                - generic [ref=e46]: Support
            - link "Settings" [ref=e47] [cursor=pointer]:
              - /url: /settings
              - button "Settings" [ref=e48]:
                - img
                - generic [ref=e49]: Settings
      - button "Logout" [ref=e51] [cursor=pointer]:
        - img
        - text: Logout
    - main [ref=e52]:
      - generic [ref=e54]:
        - generic [ref=e56]:
          - heading "Settings" [level=1] [ref=e57]
          - paragraph [ref=e58]: Manage your account and preferences
        - generic [ref=e60]:
          - button "Company Profile" [ref=e61] [cursor=pointer]:
            - img
            - generic [ref=e62]: Company Profile
          - button "User Management" [ref=e63] [cursor=pointer]:
            - img
            - generic [ref=e64]: User Management
          - button "Payment" [ref=e65] [cursor=pointer]:
            - img
            - generic [ref=e66]: Payment
          - button "Other Settings" [ref=e67] [cursor=pointer]:
            - img
            - generic [ref=e68]: Other Settings
        - generic [ref=e70]:
          - generic [ref=e71]:
            - tablist [ref=e72]:
              - tab "Overview" [selected] [ref=e73] [cursor=pointer]
              - tab "Usage" [ref=e74] [cursor=pointer]
              - tab "Invoices" [ref=e75] [cursor=pointer]
            - tabpanel "Overview" [ref=e76]:
              - generic [ref=e77]:
                - generic [ref=e79]:
                  - generic [ref=e80]:
                    - generic [ref=e81]:
                      - paragraph [ref=e82]: Wallet Balance
                      - paragraph [ref=e83]: $47.50
                    - img [ref=e85]
                  - generic [ref=e88]:
                    - img
                    - text: Free Trial
                - generic [ref=e91]:
                  - generic [ref=e92]:
                    - paragraph [ref=e93]: Current Month
                    - paragraph [ref=e94]: $12.80
                    - paragraph [ref=e95]: "Cap: $500.00"
                  - img [ref=e97]
                - generic [ref=e102]:
                  - generic [ref=e103]:
                    - paragraph [ref=e104]: Total Spent
                    - paragraph [ref=e105]: $34.20
                    - paragraph [ref=e106]: All-time usage
                  - img [ref=e108]
                - generic [ref=e112]:
                  - generic [ref=e113]:
                    - paragraph [ref=e114]: Auto-Recharge
                    - switch [ref=e116] [cursor=pointer]
                    - paragraph [ref=e117]: Manual top-up
                  - img [ref=e119]
              - generic [ref=e123]:
                - generic [ref=e125]:
                  - img [ref=e126]
                  - text: FREE TRIAL · 5 days left
                - heading "Trial Period Ongoing" [level=3] [ref=e128]
                - generic [ref=e130]:
                  - generic [ref=e131]: 9 days trial
                  - generic [ref=e132]: 44% used
                - generic [ref=e135]:
                  - generic [ref=e136]: ✨ Full Pro features unlocked
                  - generic [ref=e137]:
                    - button "Upgrade to Pro" [ref=e138] [cursor=pointer]
                    - button "Continue trial" [ref=e139] [cursor=pointer]
              - generic [ref=e140]:
                - generic [ref=e141]:
                  - generic [ref=e142]:
                    - img [ref=e143]
                    - generic [ref=e145]: Saved Payment Method
                  - generic [ref=e146]: Manage your saved card for auto-recharge
                - generic [ref=e148]:
                  - generic [ref=e149]:
                    - img [ref=e150]
                    - heading "No Card Saved" [level=3] [ref=e152]
                    - paragraph [ref=e153]: Add a card to enable automatic wallet recharge
                    - button "Add Card" [ref=e154] [cursor=pointer]:
                      - img
                      - text: Add Card
                  - generic [ref=e156]:
                    - img [ref=e157]
                    - generic [ref=e159]:
                      - paragraph [ref=e160]: How it works
                      - list [ref=e161]:
                        - listitem [ref=e162]: Securely saved via Stripe — no card details stored on our servers
                        - listitem [ref=e163]: Auto-charges when wallet balance falls below threshold
                        - listitem [ref=e164]: Remove card anytime
              - generic [ref=e165]:
                - generic [ref=e167]:
                  - generic [ref=e168]:
                    - img [ref=e170]
                    - generic [ref=e172]:
                      - generic [ref=e173]: Auto-Recharge
                      - paragraph [ref=e174]: Triggers when wallet balance drops below $10
                  - switch [ref=e176] [cursor=pointer]
                - generic [ref=e178]:
                  - paragraph [ref=e179]: No active plan found
                  - paragraph [ref=e180]: Auto-recharge amount is linked to your subscription plan price. Subscribe to a plan to enable this feature.
          - paragraph [ref=e182]: Stripe subscription activated — your plan is being set up...
  - region "Notifications (F8)":
    - list
  - button "Open Next.js Dev Tools" [ref=e188] [cursor=pointer]:
    - img [ref=e189]
  - alert [ref=e192]: Settings
```

# Test source

```ts
  531 |     await page.getByRole('button', { name: /Keep my plan/i }).click()
  532 |     await expect(page.getByText(/Cancel plan\?/i)).not.toBeVisible({ timeout: 2000 })
  533 |   })
  534 | 
  535 |   test('13.3 "Confirm cancellation" calls /api/subscriptions/stripe/cancel', async ({ page }) => {
  536 |     await setup(page, {
  537 |       billing: MOCK_BILLING_ACTIVE,
  538 |       stripeStatus: MOCK_STRIPE_SUBSCRIPTION_ACTIVE,
  539 |     })
  540 |     let cancelCalled = false
  541 |     await page.route('**/api/subscriptions/stripe/cancel**', route => {
  542 |       cancelCalled = true
  543 |       return route.fulfill({ status: 200, contentType: 'application/json',
  544 |         body: JSON.stringify({ ok: true }) })
  545 |     })
  546 |     // handleStripeCancel in BillingContent also shows a browser confirm — accept it
  547 |     page.on('dialog', async d => await d.accept())
  548 | 
  549 |     await page.getByRole('button', { name: /Cancel Subscription/i }).click()
  550 |     await expect(page.getByText(/Cancel plan\?/i)).toBeVisible({ timeout: 3000 })
  551 |     await page.getByRole('button', { name: /Confirm cancellation/i }).click()
  552 |     await page.waitForTimeout(1500)
  553 |     expect(cancelCalled).toBe(true)
  554 |   })
  555 | 
  556 |   test('13.4 Cancel success shows toast message', async ({ page }) => {
  557 |     await setup(page, {
  558 |       billing: MOCK_BILLING_ACTIVE,
  559 |       stripeStatus: MOCK_STRIPE_SUBSCRIPTION_ACTIVE,
  560 |     })
  561 |     await page.route('**/api/subscriptions/stripe/cancel**', route =>
  562 |       route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
  563 |     )
  564 |     page.on('dialog', async d => await d.accept())
  565 |     await page.getByRole('button', { name: /Cancel Subscription/i }).click()
  566 |     await page.getByRole('button', { name: /Confirm cancellation/i }).click()
  567 |     await expect(page.getByText(/cancelled|access continues/i).first()).toBeVisible({ timeout: 5000 })
  568 |   })
  569 | 
  570 | })
  571 | 
  572 | // ─────────────────────────────────────────────────────────────────────────────
  573 | // 14. RESUME SUBSCRIPTION
  574 | // ─────────────────────────────────────────────────────────────────────────────
  575 | 
  576 | test.describe('Settings Payment — Resume Subscription', () => {
  577 | 
  578 |   test('14.1 Clicking Reactivate calls /api/subscriptions/stripe/resume', async ({ page }) => {
  579 |     await setup(page, {
  580 |       billing: MOCK_BILLING_ACTIVE,
  581 |       stripeStatus: { ...MOCK_STRIPE_SUBSCRIPTION_ACTIVE, cancelAtCycleEnd: true },
  582 |     })
  583 |     let resumeCalled = false
  584 |     await page.route('**/api/subscriptions/stripe/resume**', route => {
  585 |       resumeCalled = true
  586 |       return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
  587 |     })
  588 | 
  589 |     await page.getByRole('button', { name: /Reactivate Subscription/i }).click()
  590 |     await page.waitForTimeout(1000)
  591 |     expect(resumeCalled).toBe(true)
  592 |   })
  593 | 
  594 |   test('14.2 Resume success shows toast', async ({ page }) => {
  595 |     await setup(page, {
  596 |       billing: MOCK_BILLING_ACTIVE,
  597 |       stripeStatus: { ...MOCK_STRIPE_SUBSCRIPTION_ACTIVE, cancelAtCycleEnd: true },
  598 |     })
  599 |     await page.route('**/api/subscriptions/stripe/resume**', route =>
  600 |       route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
  601 |     )
  602 |     await page.getByRole('button', { name: /Reactivate Subscription/i }).click()
  603 |     await expect(page.getByText(/resumed|auto-renewal restored/i).first()).toBeVisible({ timeout: 5000 })
  604 |   })
  605 | 
  606 | })
  607 | 
  608 | // ─────────────────────────────────────────────────────────────────────────────
  609 | // 15-18. STRIPE REDIRECT HANDLING
  610 | // ─────────────────────────────────────────────────────────────────────────────
  611 | 
  612 | test.describe('Settings Payment — Stripe Redirect Handling', () => {
  613 | 
  614 |   test('15.1 stripe_sub_success=1 shows activation toast', async ({ page }) => {
  615 |     await mockSessionAPI(page)
  616 |     await mockAllBillingAPIs(page)
  617 |     await page.addInitScript(() => { localStorage.setItem('hasSeenOnboardingTour', 'true') })
  618 |     await page.goto(`${BASE_URL}/settings?tab=payment&stripe_sub_success=1`, { waitUntil: 'domcontentloaded' })
  619 |     await page.getByText('Wallet Balance').first().waitFor({ state: 'visible', timeout: 20_000 })
  620 |     await expect(page.getByText(/activated|setting up/i).first()).toBeVisible({ timeout: 5000 })
  621 |   })
  622 | 
  623 |   test('15.2 stripe_sub_success clears URL param', async ({ page }) => {
  624 |     await mockSessionAPI(page)
  625 |     await mockAllBillingAPIs(page)
  626 |     await page.addInitScript(() => { localStorage.setItem('hasSeenOnboardingTour', 'true') })
  627 |     await page.goto(`${BASE_URL}/settings?tab=payment&stripe_sub_success=1`, { waitUntil: 'domcontentloaded' })
  628 |     await page.getByText('Wallet Balance').first().waitFor({ state: 'visible', timeout: 20_000 })
  629 |     // URL should be cleaned up (no stripe_sub_success param)
  630 |     await page.waitForTimeout(1000)
> 631 |     expect(page.url()).not.toContain('stripe_sub_success')
      |                            ^ Error: expect(received).not.toContain(expected) // indexOf
  632 |   })
  633 | 
  634 |   test('16.1 stripe_sub_cancel=1 shows cancelled toast', async ({ page }) => {
  635 |     await mockSessionAPI(page)
  636 |     await mockAllBillingAPIs(page)
  637 |     await page.addInitScript(() => { localStorage.setItem('hasSeenOnboardingTour', 'true') })
  638 |     await page.goto(`${BASE_URL}/settings?tab=payment&stripe_sub_cancel=1`, { waitUntil: 'domcontentloaded' })
  639 |     await page.getByText('Wallet Balance').first().waitFor({ state: 'visible', timeout: 20_000 })
  640 |     await expect(page.getByText(/subscription setup cancelled/i).first()).toBeVisible({ timeout: 5000 })
  641 |   })
  642 | 
  643 |   test('17.1 stripe_success=1 shows wallet updated toast', async ({ page }) => {
  644 |     await mockSessionAPI(page)
  645 |     await mockAllBillingAPIs(page)
  646 |     await page.route('**/api/stripe/confirm**', route =>
  647 |       route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
  648 |     )
  649 |     await page.addInitScript(() => { localStorage.setItem('hasSeenOnboardingTour', 'true') })
  650 |     await page.goto(`${BASE_URL}/settings?tab=payment&stripe_success=1&session_id=cs_test_123`, { waitUntil: 'domcontentloaded' })
  651 |     await page.getByText('Wallet Balance').first().waitFor({ state: 'visible', timeout: 20_000 })
  652 |     await expect(page.getByText(/Stripe payment successful|updating balance/i).first()).toBeVisible({ timeout: 5000 })
  653 |   })
  654 | 
  655 |   test('18.1 stripe_cancel=1 shows payment cancelled toast', async ({ page }) => {
  656 |     await mockSessionAPI(page)
  657 |     await mockAllBillingAPIs(page)
  658 |     await page.addInitScript(() => { localStorage.setItem('hasSeenOnboardingTour', 'true') })
  659 |     await page.goto(`${BASE_URL}/settings?tab=payment&stripe_cancel=1`, { waitUntil: 'domcontentloaded' })
  660 |     await page.getByText('Wallet Balance').first().waitFor({ state: 'visible', timeout: 20_000 })
  661 |     await expect(page.getByText(/Stripe payment cancelled/i).first()).toBeVisible({ timeout: 5000 })
  662 |   })
  663 | 
  664 | })
  665 | 
  666 | // ─────────────────────────────────────────────────────────────────────────────
  667 | // 19-20. SAVED CARD & AUTO-RECHARGE COMPONENTS
  668 | // ─────────────────────────────────────────────────────────────────────────────
  669 | 
  670 | test.describe('Settings Payment — Saved Card & Auto-Recharge Components', () => {
  671 | 
  672 |   test('19.1 SavedCardSettings component visible in overview', async ({ page }) => {
  673 |     await setup(page)
  674 |     // SavedCardSettings component renders — check for its heading
  675 |     await expect(page.getByText(/Saved Card|Payment Method|saved card/i).first()).toBeVisible({ timeout: 5000 })
  676 |   })
  677 | 
  678 |   test('20.1 AutoRechargeSettings component visible in overview', async ({ page }) => {
  679 |     await setup(page)
  680 |     // AutoRechargeSettings renders — check for its heading
  681 |     await expect(page.getByText(/Auto.Recharge/i).first()).toBeVisible({ timeout: 5000 })
  682 |   })
  683 | 
  684 | })
  685 | 
  686 | // ─────────────────────────────────────────────────────────────────────────────
  687 | // 21-25. USAGE TAB
  688 | // ─────────────────────────────────────────────────────────────────────────────
  689 | 
  690 | test.describe('Settings Payment — Usage Tab', () => {
  691 | 
  692 |   async function goToUsage(page: Page) {
  693 |     await setup(page)
  694 |     await page.getByRole('tab', { name: /^Usage$/i }).first().click()
  695 |     await page.getByText(/Usage Analytics/i).first()
  696 |       .waitFor({ state: 'visible', timeout: 10_000 })
  697 |   }
  698 | 
  699 |   test('21.1 "Usage Analytics" heading shown', async ({ page }) => {
  700 |     await goToUsage(page)
  701 |     await expect(page.getByText(/Usage Analytics/i).first()).toBeVisible()
  702 |   })
  703 | 
  704 |   test('21.2 Subtitle "Track your AI service consumption" visible', async ({ page }) => {
  705 |     await goToUsage(page)
  706 |     await expect(page.getByText(/Track your AI service consumption/i)).toBeVisible()
  707 |   })
  708 | 
  709 |   test('22.1 Filter section has Job Description and Date Range selectors', async ({ page }) => {
  710 |     await goToUsage(page)
  711 |     await expect(page.getByText('Job Description').first()).toBeVisible()
  712 |     await expect(page.getByText('Date Range').first()).toBeVisible()
  713 |   })
  714 | 
  715 |   test('22.2 Date range selector has all expected options', async ({ page }) => {
  716 |     await goToUsage(page)
  717 |     // Open the date range select
  718 |     const dateSelect = page.getByRole('combobox').filter({ hasText: /Last 30 days/i }).first()
  719 |     await dateSelect.click()
  720 |     await expect(page.getByRole('option', { name: /Last 7 days/i })).toBeVisible()
  721 |     await expect(page.getByRole('option', { name: /Last 30 days/i })).toBeVisible()
  722 |     await expect(page.getByRole('option', { name: /Last 90 days/i })).toBeVisible()
  723 |     await expect(page.getByRole('option', { name: /Last year/i })).toBeVisible()
  724 |   })
  725 | 
  726 |   test('22.3 "Apply Filters" button visible and clickable', async ({ page }) => {
  727 |     await goToUsage(page)
  728 |     await expect(page.getByRole('button', { name: /Apply Filters/i })).toBeVisible()
  729 |   })
  730 | 
  731 |   test('23.1 CV Parsing usage card shows amount', async ({ page }) => {
```