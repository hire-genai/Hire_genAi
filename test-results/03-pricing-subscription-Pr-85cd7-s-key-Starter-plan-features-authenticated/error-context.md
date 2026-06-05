# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 03-pricing-subscription.spec.ts >> Pricing Page — Positive Scenarios >> 2. Pricing page displays key Starter plan features
- Location: tests\e2e\03-pricing-subscription.spec.ts:413:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('AI CV evaluation & scoring').first()
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByText('AI CV evaluation & scoring').first()

```

```yaml
- banner:
  - link "HireGenAI":
    - /url: /
    - heading "HireGenAI" [level=1]
  - navigation:
    - link "Product":
      - /url: /demo-en
    - link "Pricing":
      - /url: /pricing
    - link "ROI":
      - /url: /roi
    - link "Company":
      - /url: /about
  - link "Settings":
    - /url: /settings?tab=payment
    - button:
      - img
  - link "Get started":
    - /url: /signup
    - button "Get started"
- text: ⚡ AI Recruiting OS · Full ATS + AI Interview
- heading "Simple, transparent pricing. Pay for what you use." [level=1]
- paragraph:
  - text: All paid plans include
  - strong: every ATS feature
  - text: — Dashboard, Job Listings, Talent Pool, Application List, Delegation, Feedback, and full analytics. No hidden user limits. Only support level & usage caps change.
- text: 🧑‍🤝‍🧑 Unlimited team members on every paid plan — invite your whole recruiting team.
- button "Monthly"
- button "Annual Save 17%"
- paragraph: "📅 Annual: pay for 10 months · stay active for 12 · wallet credits & usage increase by 20%"
- paragraph: Not sure which package is right for you?
- paragraph:
  - text: Take our
  - link "ROI Assessment":
    - /url: /roi
  - text: to receive a personalized recommendation based on your hiring volume, recruitment costs, and expected savings.
- heading "Starter" [level=3]
- paragraph: For startups and small teams running their first AI-powered hiring workflows.
- text: $990 / year 💳
- paragraph: $119 AI credits included
- paragraph: +20% extra credits vs monthly billing
- paragraph: Typical monthly AI usage
- text: ~240 candidates screened ~5 AI video rounds
- paragraph: 📌 Illustrative averages — soft guidance only. No hard stop at these numbers.
- text: ⚡
- paragraph: AI CV Reports
- paragraph: Every resume scored, ranked & explained instantly
- text: 🎥
- paragraph: AI Video Interviews + Reports
- paragraph: Automated rounds — questions, recording & post-interview AI summary
- text: ❓
- paragraph: Auto Interview Questions
- paragraph: Role-specific questions generated before every round
- text: 📋
- paragraph: Unlimited Job Postings
- paragraph: No cap on active roles — post as many as you need
- text: 🤝
- paragraph: Client & Agent Connect
- paragraph: Share pipelines, roles & updates with external clients or partners
- text: 🔄
- paragraph: Delegation, Feedback & Audit
- paragraph: Assign to team, collect feedback, full audit trail
- text: 📊
- paragraph: Recruiter · Manager · Director
- paragraph: Dedicated KPI dashboards for every role in your team
- text: 🎧 Standard Support · 72h
- button "Choose Starter":
  - text: Choose Starter
  - img
- paragraph: Unlimited team members · Cancel anytime
- heading "Professional" [level=3]
- paragraph: For agencies scaling their recruiting operations.
- text: $4,990 / year 💳
- paragraph: $599 AI credits included
- paragraph: +20% extra credits vs monthly billing
- paragraph: Typical monthly AI usage
- text: ~1,200 candidates screened ~24 AI video rounds
- paragraph: 📌 Illustrative averages — soft guidance only. No hard stop at these numbers.
- text: ⚡
- paragraph: AI CV Reports
- paragraph: Every resume scored, ranked & explained instantly
- text: 🎥
- paragraph: AI Video Interviews + Reports
- paragraph: Automated rounds — questions, recording & post-interview AI summary
- text: ❓
- paragraph: Auto Interview Questions
- paragraph: Role-specific questions generated before every round
- text: 📋
- paragraph: Unlimited Job Postings
- paragraph: No cap on active roles — post as many as you need
- text: 🤝
- paragraph: Client & Agent Connect
- paragraph: Share pipelines, roles & updates with external clients or partners
- text: 🔄
- paragraph: Delegation, Feedback & Audit
- paragraph: Assign to team, collect feedback, full audit trail
- text: 📊
- paragraph: Recruiter · Manager · Director
- paragraph: Dedicated KPI dashboards for every role in your team
- text: 🎧 Priority Support · 48h
- button "Choose Professional":
  - text: Choose Professional
  - img
- paragraph: Unlimited team members · Cancel anytime
- heading "Business" [level=3]
- paragraph: For mid-size agencies and growing recruitment teams.
- text: $9,990 / year 💳
- paragraph: $1,199 AI credits included
- paragraph: +20% extra credits vs monthly billing
- paragraph: Typical monthly AI usage
- text: ~2,400 candidates screened ~48 AI video rounds
- paragraph: 📌 Illustrative averages — soft guidance only. No hard stop at these numbers.
- text: ⚡
- paragraph: AI CV Reports
- paragraph: Every resume scored, ranked & explained instantly
- text: 🎥
- paragraph: AI Video Interviews + Reports
- paragraph: Automated rounds — questions, recording & post-interview AI summary
- text: ❓
- paragraph: Auto Interview Questions
- paragraph: Role-specific questions generated before every round
- text: 📋
- paragraph: Unlimited Job Postings
- paragraph: No cap on active roles — post as many as you need
- text: 🤝
- paragraph: Client & Agent Connect
- paragraph: Share pipelines, roles & updates with external clients or partners
- text: 🔄
- paragraph: Delegation, Feedback & Audit
- paragraph: Assign to team, collect feedback, full audit trail
- text: 📊
- paragraph: Recruiter · Manager · Director
- paragraph: Dedicated KPI dashboards for every role in your team
- text: 🎧 Business Support · 24h
- button "Choose Business":
  - text: Choose Business
  - img
- paragraph: Unlimited team members · Cancel anytime
- text: ⭐ Most Popular · Best for Agencies
- heading "Large" [level=3]
- paragraph: For scaling recruitment agencies that need serious AI infrastructure.
- text: $29,990 / year 💳
- paragraph: $3,599 AI credits included
- paragraph: +20% extra credits vs monthly billing
- paragraph: Typical monthly AI usage
- text: ~7,200 candidates screened ~144 AI video rounds
- paragraph: 📌 Illustrative averages — soft guidance only. No hard stop at these numbers.
- text: ⚡
- paragraph: AI CV Reports
- paragraph: Every resume scored, ranked & explained instantly
- text: 🎥
- paragraph: AI Video Interviews + Reports
- paragraph: Automated rounds — questions, recording & post-interview AI summary
- text: ❓
- paragraph: Auto Interview Questions
- paragraph: Role-specific questions generated before every round
- text: 📋
- paragraph: Unlimited Job Postings
- paragraph: No cap on active roles — post as many as you need
- text: 🤝
- paragraph: Client & Agent Connect
- paragraph: Share pipelines, roles & updates with external clients or partners
- text: 🔄
- paragraph: Delegation, Feedback & Audit
- paragraph: Assign to team, collect feedback, full audit trail
- text: 📊
- paragraph: Recruiter · Manager · Director
- paragraph: Dedicated KPI dashboards for every role in your team
- text: 🎧 Large Support · 12h
- button "Choose Large":
  - text: Choose Large
  - img
- paragraph: Unlimited team members · Cancel anytime
- heading "Ultra" [level=3]
- paragraph: For high-volume AI-powered hiring operations.
- text: $39,990 / year 💳
- paragraph: $4,799 AI credits included
- paragraph: +20% extra credits vs monthly billing
- paragraph: Typical monthly AI usage
- text: ~9,600 candidates screened ~192 AI video rounds
- paragraph: 📌 Illustrative averages — soft guidance only. No hard stop at these numbers.
- text: ⚡
- paragraph: AI CV Reports
- paragraph: Every resume scored, ranked & explained instantly
- text: 🎥
- paragraph: AI Video Interviews + Reports
- paragraph: Automated rounds — questions, recording & post-interview AI summary
- text: ❓
- paragraph: Auto Interview Questions
- paragraph: Role-specific questions generated before every round
- text: 📋
- paragraph: Unlimited Job Postings
- paragraph: No cap on active roles — post as many as you need
- text: 🤝
- paragraph: Client & Agent Connect
- paragraph: Share pipelines, roles & updates with external clients or partners
- text: 🔄
- paragraph: Delegation, Feedback & Audit
- paragraph: Assign to team, collect feedback, full audit trail
- text: 📊
- paragraph: Recruiter · Manager · Director
- paragraph: Dedicated KPI dashboards for every role in your team
- text: 🎧 Ultra Support · 6h
- button "Choose Ultra":
  - text: Choose Ultra
  - img
- paragraph: Unlimited team members · Cancel anytime
- text: 🔥 Ultimate Scale
- heading "Enterprise" [level=3]
- paragraph: Ultimate scale for enterprise hiring infrastructure.
- text: $49,990 / year 💳
- paragraph: $5,999 AI credits included
- paragraph: +20% extra credits vs monthly billing
- paragraph: Typical monthly AI usage
- text: ~12,000 candidates screened ~240 AI video rounds
- paragraph: 📞 Talk to sales — no preset limits. Volume scales to your needs.
- text: ⚡
- paragraph: AI CV Reports
- paragraph: Every resume scored, ranked & explained instantly
- text: 🎥
- paragraph: AI Video Interviews + Reports
- paragraph: Automated rounds — questions, recording & post-interview AI summary
- text: ❓
- paragraph: Auto Interview Questions
- paragraph: Role-specific questions generated before every round
- text: 📋
- paragraph: Unlimited Job Postings
- paragraph: No cap on active roles — post as many as you need
- text: 🤝
- paragraph: Client & Agent Connect
- paragraph: Share pipelines, roles & updates with external clients or partners
- text: 🔄
- paragraph: Delegation, Feedback & Audit
- paragraph: Assign to team, collect feedback, full audit trail
- text: 📊
- paragraph: Recruiter · Manager · Director
- paragraph: Dedicated KPI dashboards for every role in your team
- text: 🎧 Enterprise SLA · 2h critical
- button "Talk to Sales":
  - text: Talk to Sales
  - img
- paragraph: Unlimited team members · Enterprise onboarding
- button "Not ready to commit? Skip for Free — start your 7-day trial":
  - text: Not ready to commit? Skip for Free — start your 7-day trial
  - img
- text: No credit card required · cancel anytime
- heading "Common Questions" [level=2]
- paragraph: Straight answers on how pricing and plans work
- heading "Can I switch plans at any time?" [level=3]
- paragraph: Yes — upgrade or downgrade whenever you need. Changes apply immediately with prorated billing.
- heading "How does the annual plan work?" [level=3]
- paragraph: You pay for 10 months and stay active for 12 — saving roughly 17% on cost. Your monthly usage estimates and wallet credits also increase by 20%.
- heading "What are the wallet credits?" [level=3]
- paragraph: Every plan includes AI usage wallet credits equal to your subscription cost. These cover CV parsing, video interviews, and question generation. If you exceed them, additional usage is billed automatically at standard rates.
- heading "What do the usage estimates mean?" [level=3]
- paragraph: The CV and interview numbers are indicative ranges based on typical usage at each tier. They are not hard caps — actual consumption depends on your interview duration and workflow. Overage draws from your wallet balance automatically.
- heading "Do you offer custom pricing for very high volume?" [level=3]
- paragraph: Absolutely. For teams needing more than Enterprise-scale volume or custom integrations, contact our sales team for a tailored proposal.
- contentinfo:
  - heading "HireGenAI" [level=3]
  - paragraph: By SKYGENAI
  - paragraph: HireGenAI pre-screens and interviews candidates, helping you shortlist talent 20x faster and more efficiently.
  - paragraph:
    - text: "Email:"
    - link "support@hire-genai.com":
      - /url: mailto:support@hire-genai.com
  - link:
    - /url: "#"
    - img
  - link:
    - /url: "#"
    - img
  - link:
    - /url: "#"
    - img
  - link:
    - /url: https://www.linkedin.com/company/hire-genai
    - img
  - heading "Product" [level=4]
  - list:
    - listitem:
      - link "Try the Demo":
        - /url: /demo-en
    - listitem:
      - link "Pricing":
        - /url: /pricing
    - listitem:
      - link "FAQs":
        - /url: /?scroll=faq
  - heading "Company" [level=4]
  - list:
    - listitem:
      - link "About us":
        - /url: /about
    - listitem:
      - link "Contact":
        - /url: /contact
    - listitem:
      - link "Book a Meeting":
        - /url: /book-meeting
    - listitem:
      - link "Admin":
        - /url: /owner-login
  - heading "Legal" [level=4]
  - list:
    - listitem:
      - link "Privacy Policy":
        - /url: /privacy
    - listitem:
      - link "Terms and Conditions":
        - /url: /terms
  - paragraph: Trustpilot
  - img
  - img
  - img
  - img
  - img
  - paragraph: TrustScore 4.5
  - img
  - paragraph: GDPR COMPLIANT
  - paragraph: Your data is secure and compliant
  - paragraph: © 2025 HireGenAI. All rights reserved.
- region "Notifications (F8)":
  - list
- alert
```

# Test source

```ts
  323 |   await page.getByRole("option", { name: "United States", exact: true }).click();
  324 |   await page.getByRole("button", { name: /^Next$/i }).click();
  325 |   await page.waitForURL(/section=legal/, { timeout: 10_000 });
  326 | 
  327 |   // Step 3 — Legal Information
  328 |   await page.locator("#legalCompanyName").waitFor({ state: "visible" });
  329 |   await page.locator("#legalCompanyName").fill("E2E Pricing Corporation Inc.");
  330 |   await page.getByRole("button", { name: /^Next$/i }).click();
  331 |   await page.waitForURL(/section=manager/, { timeout: 10_000 });
  332 | 
  333 |   // Step 4 — Manager Account + OTP
  334 |   await page.locator("#firstName").waitFor({ state: "visible" });
  335 |   await page.locator("#firstName").fill("Pricing");
  336 |   await page.locator("#lastName").fill("Tester");
  337 |   await page.locator("#email").fill(TEST_EMAIL);
  338 |   await page.getByRole("button", { name: /Send Code/i }).click();
  339 |   // Wait for OTP input to appear
  340 |   const otpInput = page.locator('input[placeholder="000000"], input[inputmode="numeric"][maxlength="6"]');
  341 |   await otpInput.waitFor({ state: "visible", timeout: 10_000 });
  342 |   await otpInput.fill(OTP_CODE);
  343 |   await page.getByRole("button", { name: /^Verify$/i }).click();
  344 |   await page.getByText(/Email verified successfully/i).waitFor({ state: "visible", timeout: 10_000 });
  345 |   await page.getByRole("button", { name: /^Next$/i }).click();
  346 |   await page.waitForURL(/section=review/, { timeout: 10_000 });
  347 | 
  348 |   // Step 5 — Review & Complete
  349 |   await page.locator("#tos").waitFor({ state: "visible" });
  350 |   const tos = page.locator("#tos");
  351 |   const privacy = page.locator("#privacy");
  352 |   if (!(await tos.isChecked())) await tos.click();
  353 |   if (!(await privacy.isChecked())) await privacy.click();
  354 |   await page.getByRole("button", { name: /Complete Registration/i }).click();
  355 | }
  356 | 
  357 | // ---------------------------------------------------------------------------
  358 | // Suite configuration
  359 | // ---------------------------------------------------------------------------
  360 | 
  361 | /**
  362 |  * All pricing / subscription tests run without a pre-existing auth session.
  363 |  * We control auth state explicitly per test.
  364 |  */
  365 | test.use({ storageState: { cookies: [], origins: [] } });
  366 | 
  367 | // ---------------------------------------------------------------------------
  368 | // POSITIVE scenarios
  369 | // ---------------------------------------------------------------------------
  370 | 
  371 | test.describe("Pricing Page — Positive Scenarios", () => {
  372 |   test("1. Pricing page loads all plans with correct monthly prices", async ({ page }) => {
  373 |     await mockStripeStatus(page, MOCK_STRIPE_STATUS_NONE);
  374 | 
  375 |     await page.goto(PRICING_URL);
  376 |     // Wait for the pricing section to mount (first plan heading)
  377 |     await expect(page.getByRole("heading", { name: "Starter", exact: true }).first()).toBeVisible({
  378 |       timeout: 15_000,
  379 |     });
  380 | 
  381 |     // Switch to monthly so prices are deterministic
  382 |     await page.getByRole("button", { name: /^Monthly$/i }).click();
  383 | 
  384 |     for (const plan of EXPECTED_PLANS) {
  385 |       // Plan name heading
  386 |       await expect(
  387 |         page.getByRole("heading", { name: plan.name, exact: true }).first()
  388 |       ).toBeVisible({ timeout: 10_000 });
  389 | 
  390 |       // Monthly price displayed (formatted with locale, e.g. "$99", "$2,999")
  391 |       const priceText = `$${plan.monthlyPrice.toLocaleString()}`;
  392 |       await expect(page.getByText(priceText, { exact: false }).first()).toBeVisible({
  393 |         timeout: 10_000,
  394 |       });
  395 |     }
  396 | 
  397 |     // CTA buttons for selectable plans (non-Enterprise)
  398 |     for (const plan of EXPECTED_PLANS.filter((p) => p.name !== "Enterprise")) {
  399 |       await expect(
  400 |         page.getByRole("button", { name: plan.cta, exact: true }).first()
  401 |       ).toBeVisible({ timeout: 5_000 });
  402 |     }
  403 | 
  404 |     // Enterprise shows "Talk to Sales" link or button
  405 |     await expect(
  406 |       page
  407 |         .getByRole("button", { name: "Talk to Sales", exact: true })
  408 |         .or(page.getByRole("link", { name: "Talk to Sales", exact: true }))
  409 |         .first()
  410 |     ).toBeVisible({ timeout: 5_000 });
  411 |   });
  412 | 
  413 |   test("2. Pricing page displays key Starter plan features", async ({ page }) => {
  414 |     await mockStripeStatus(page, MOCK_STRIPE_STATUS_NONE);
  415 | 
  416 |     await page.goto(PRICING_URL);
  417 |     await expect(page.getByRole("heading", { name: "Starter", exact: true }).first()).toBeVisible({
  418 |       timeout: 15_000,
  419 |     });
  420 | 
  421 |     // Verify key feature text appears somewhere on the page (may be inside any plan card)
  422 |     for (const feature of STARTER_FEATURES) {
> 423 |       await expect(page.getByText(feature, { exact: false }).first()).toBeVisible({
      |                                                                       ^ Error: expect(locator).toBeVisible() failed
  424 |         timeout: 10_000,
  425 |       });
  426 |     }
  427 |   });
  428 | 
  429 |   test("3. Monthly/Annual toggle switches prices correctly", async ({ page }) => {
  430 |     await mockStripeStatus(page, MOCK_STRIPE_STATUS_NONE);
  431 | 
  432 |     await page.goto(PRICING_URL);
  433 |     await expect(page.getByRole("heading", { name: "Starter", exact: true }).first()).toBeVisible({
  434 |       timeout: 15_000,
  435 |     });
  436 | 
  437 |     // Switch to Monthly
  438 |     await page.getByRole("button", { name: /^Monthly$/i }).click();
  439 | 
  440 |     // Verify "/ month" label appears (monthly cycle indicator)
  441 |     await expect(page.getByText("/ month", { exact: false }).first()).toBeVisible({
  442 |       timeout: 5_000,
  443 |     });
  444 | 
  445 |     // Verify Starter monthly price $99 is displayed
  446 |     await expect(page.getByText("$99", { exact: false }).first()).toBeVisible({
  447 |       timeout: 5_000,
  448 |     });
  449 | 
  450 |     // Switch to Annual
  451 |     await page.getByRole("button", { name: /^Annual$/i }).click();
  452 | 
  453 |     // Verify "/ year" label appears (annual cycle indicator)
  454 |     await expect(page.getByText("/ year", { exact: false }).first()).toBeVisible({
  455 |       timeout: 5_000,
  456 |     });
  457 | 
  458 |     // Starter annual price is $990 — verify it appears
  459 |     await expect(page.getByText("$990", { exact: false }).first()).toBeVisible({
  460 |       timeout: 5_000,
  461 |     });
  462 | 
  463 |     // Verify "Save 17%" badge is visible in the Annual toggle button
  464 |     await expect(page.getByText("Save 17%", { exact: false }).first()).toBeVisible({
  465 |       timeout: 5_000,
  466 |     });
  467 | 
  468 |     // Annual hint text should be visible
  469 |     await expect(
  470 |       page.getByText(/pay for 10 months/i).first()
  471 |     ).toBeVisible({ timeout: 5_000 });
  472 | 
  473 |     // Switch back to monthly and confirm price resets
  474 |     await page.getByRole("button", { name: /^Monthly$/i }).click();
  475 |     await expect(page.getByText("$99", { exact: false }).first()).toBeVisible({
  476 |       timeout: 5_000,
  477 |     });
  478 |   });
  479 | 
  480 |   test("4. Clicking Starter CTA redirects to signup with plan pre-selected", async ({
  481 |     page,
  482 |   }) => {
  483 |     await mockStripeStatus(page, MOCK_STRIPE_STATUS_NONE);
  484 | 
  485 |     await page.goto(PRICING_URL);
  486 |     // Default is annual; switch to monthly for predictable plan param
  487 |     await page.getByRole("button", { name: /^Monthly$/i }).click();
  488 |     await expect(page.getByRole("heading", { name: "Starter", exact: true }).first()).toBeVisible({
  489 |       timeout: 15_000,
  490 |     });
  491 | 
  492 |     // Click "Choose Starter"
  493 |     await page.getByRole("button", { name: "Choose Starter", exact: true }).first().click();
  494 | 
  495 |     // Should navigate to /signup with ?plan=Starter
  496 |     await expect(page).toHaveURL(/\/signup.*plan=Starter/i, { timeout: 15_000 });
  497 | 
  498 |     // Signup page Step 1 should load
  499 |     await page.locator("#companyName").waitFor({ state: "visible", timeout: 15_000 });
  500 |   });
  501 | 
  502 |   test("5. Clicking Professional CTA redirects to signup with plan pre-selected", async ({
  503 |     page,
  504 |   }) => {
  505 |     await mockStripeStatus(page, MOCK_STRIPE_STATUS_NONE);
  506 | 
  507 |     await page.goto(PRICING_URL);
  508 |     await page.getByRole("button", { name: /^Monthly$/i }).click();
  509 |     await expect(
  510 |       page.getByRole("heading", { name: "Professional", exact: true }).first()
  511 |     ).toBeVisible({ timeout: 15_000 });
  512 | 
  513 |     await page.getByRole("button", { name: "Choose Professional", exact: true }).first().click();
  514 | 
  515 |     await expect(page).toHaveURL(/\/signup.*plan=Professional/i, { timeout: 15_000 });
  516 |     await page.locator("#companyName").waitFor({ state: "visible", timeout: 15_000 });
  517 |   });
  518 | 
  519 |   test("6. After signup with plan, Stripe checkout session is created and user is redirected", async ({
  520 |     page,
  521 |   }) => {
  522 |     // Mock OTP and signup complete with a checkout URL
  523 |     await mockSignupOtp(page);
```