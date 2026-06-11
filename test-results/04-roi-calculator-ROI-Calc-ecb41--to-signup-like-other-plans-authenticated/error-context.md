# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 04-roi-calculator.spec.ts >> ROI Calculator & Pricing Integration >> ROI to Pricing integration >> Pricing page CTA for Enterprise plan goes to signup like other plans
- Location: tests\e2e\04-roi-calculator.spec.ts:1039:9

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/signup/
Received string:  "http://localhost:3000/pricing"
Timeout: 10000ms

Call log:
  - Expect "toHaveURL" with timeout 10000ms
    21 × unexpected value "http://localhost:3000/pricing"

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
- paragraph: 📌 Illustrative averages — no preset limits. Volume scales to your needs.
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
- button "Choose Enterprise":
  - text: Choose Enterprise
  - img
- paragraph: Unlimited team members · Cancel anytime
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
- button "Open chat assistant": 💬
- region "Notifications (F8)":
  - list
- alert
```

# Test source

```ts
  950  |        *   Static steps total (ids 1,2,3,7,8,9,10,11):
  951  |        *     45+20+10+60+40+45+60+60 = 340
  952  |        *   totalH = 500+60+300+340 = 1200 min = 20h
  953  |        *   totalA = 100+5+150+340  = 595 min = 9.917h
  954  |        *   prodIndex = 20 / 9.917 ≈ 2.02
  955  |        */
  956  |       const prodValue = await roiPage.getKpiValue("Productivity Index");
  957  |       const numeric = parseFormattedNumber(prodValue);
  958  | 
  959  |       // Should be approximately 2.0 (within 10%)
  960  |       expect(numeric).toBeGreaterThan(1.8);
  961  |       expect(numeric).toBeLessThan(2.3);
  962  |     });
  963  | 
  964  |     test("Monthly Savings increases proportionally when recruiter count doubles", async ({ page }) => {
  965  |       await roiPage.goto();
  966  | 
  967  |       // Get savings with 1 recruiter
  968  |       const savings1 = parseFormattedNumber(await roiPage.getKpiValue("Monthly Savings"));
  969  | 
  970  |       // Set 2 recruiters
  971  |       await roiPage.setInputValue(roiPage.recruiterInput, "2");
  972  |       const savings2 = parseFormattedNumber(await roiPage.getKpiValue("Monthly Savings"));
  973  | 
  974  |       // Savings should roughly double (within 10% tolerance)
  975  |       const ratio = savings2 / savings1;
  976  |       expect(ratio).toBeGreaterThan(1.8);
  977  |       expect(ratio).toBeLessThan(2.2);
  978  |     });
  979  | 
  980  |     test("Monthly Savings increases when hourly rate increases", async ({ page }) => {
  981  |       await roiPage.goto();
  982  | 
  983  |       const savings30 = parseFormattedNumber(await roiPage.getKpiValue("Monthly Savings"));
  984  | 
  985  |       await roiPage.setInputValue(roiPage.hourlyRateInput, "50");
  986  |       // Wait until the input AND the KPI output both reflect the new hourlyRate.
  987  |       // toHaveValue confirms the DOM input shows "50"; the not.toHaveText waits for
  988  |       // React to commit the recalculated savings to the KPI card.
  989  |       await expect(roiPage.hourlyRateInput).toHaveValue("50");
  990  |       const savingsKpiEl = page.locator('div.rounded-2xl.text-center')
  991  |         .filter({ hasText: /Monthly Savings/i }).first()
  992  |         .locator('[class*="text-xl"],[class*="text-2xl"]').first();
  993  |       await expect(savingsKpiEl).not.toHaveText(`$${savings30.toLocaleString()}`, { timeout: 5000 });
  994  |       const savings50 = parseFormattedNumber(await roiPage.getKpiValue("Monthly Savings"));
  995  | 
  996  |       // $50/h vs $30/h — savings should be ~5/3 times larger
  997  |       expect(savings50).toBeGreaterThan(savings30);
  998  |       const ratio = savings50 / savings30;
  999  |       expect(ratio).toBeGreaterThan(1.4);
  1000 |       expect(ratio).toBeLessThan(1.9);
  1001 |     });
  1002 | 
  1003 |     test("Fixed KPI values remain constant as inputs change", async ({ page }) => {
  1004 |       await roiPage.goto();
  1005 | 
  1006 |       // Change multiple inputs
  1007 |       await roiPage.setInputValue(roiPage.recruiterInput, "3");
  1008 |       await roiPage.setInputValue(roiPage.cvsPerReqInput, "150");
  1009 |       await roiPage.setInputValue(roiPage.shortlistPctInput, "20");
  1010 | 
  1011 |       // Fixed metrics must not change
  1012 |       expect(await roiPage.getKpiValue("Screening Time")).toBe(`${FIXED_SCREEN_REDUCE}%`);
  1013 |       expect(await roiPage.getKpiValue("Ranking Time")).toBe(`${FIXED_RANK_REDUCE}%`);
  1014 |       expect(await roiPage.getKpiValue("Qualification Effort")).toBe(`${FIXED_QUAL_REDUCE}%`);
  1015 |     });
  1016 | 
  1017 |   }); // end: Mathematical output verification
  1018 | 
  1019 |   // =========================================================================
  1020 |   // INTEGRATION — ROI → PRICING PAGE
  1021 |   // =========================================================================
  1022 | 
  1023 |   test.describe("ROI to Pricing integration", () => {
  1024 | 
  1025 |     test("Navigating from ROI to pricing shows the full plan list", async ({ page }) => {
  1026 |       await roiPage.goto();
  1027 | 
  1028 |       const link = page.locator('a[href="/pricing"]').first();
  1029 |       await link.click();
  1030 |       await expect(page).toHaveURL(/\/pricing/, { timeout: 10_000 });
  1031 | 
  1032 |       // All 6 plans should be visible
  1033 |       const planNames = ["Starter", "Professional", "Business", "Large", "Ultra", "Enterprise"];
  1034 |       for (const planName of planNames) {
  1035 |         await expect(page.getByText(planName, { exact: true }).first()).toBeVisible();
  1036 |       }
  1037 |     });
  1038 | 
  1039 |     test("Pricing page CTA for Enterprise plan goes to signup like other plans", async ({ page }) => {
  1040 |       await page.goto(PRICING_URL, { waitUntil: "domcontentloaded" });
  1041 | 
  1042 |       // Switch to monthly for deterministic plan param
  1043 |       await page.getByRole("button", { name: /^Monthly$/i }).click();
  1044 | 
  1045 |       // Enterprise now uses the same Stripe checkout flow as other plans
  1046 |       const enterpriseCta = page.locator('button').filter({ hasText: /Choose Enterprise/ }).first();
  1047 |       await expect(enterpriseCta).toBeVisible({ timeout: 10_000 });
  1048 |       await enterpriseCta.click();
  1049 | 
> 1050 |       await expect(page).toHaveURL(/\/signup/, { timeout: 10_000 });
       |                          ^ Error: expect(page).toHaveURL(expected) failed
  1051 |     });
  1052 | 
  1053 |     test("ROI page Get Started CTA uses billing param from toggle", async ({ page }) => {
  1054 |       await roiPage.goto();
  1055 | 
  1056 |       // Explicitly verify both toggle buttons are visible before interacting —
  1057 |       // this stabilises the DOM and prevents a click racing against a render.
  1058 |       const monthlyBtnToggle = page.locator('button').filter({ hasText: /^Monthly$/ }).first();
  1059 |       const annualBtn = page.locator('button').filter({ hasText: /^Annual/ }).first();
  1060 |       await expect(monthlyBtnToggle).toBeVisible();
  1061 |       await expect(annualBtn).toBeVisible();
  1062 |       await annualBtn.scrollIntoViewIfNeeded();
  1063 |       await annualBtn.click();
  1064 | 
  1065 |       // Wait for CTA text to confirm billing state updated before clicking
  1066 |       const ctaBtn = page.locator('button').filter({ hasText: /Get Started with .+ Plan/ }).first();
  1067 |       await expect(ctaBtn).toContainText('billed annually', { timeout: 5000 });
  1068 | 
  1069 |       await ctaBtn.scrollIntoViewIfNeeded();
  1070 |       await ctaBtn.click();
  1071 | 
  1072 |       // Catch URL before signup page rewrites to ?section=company
  1073 |       await page.waitForURL(/signup.*billing=annual/, { timeout: 10_000 });
  1074 |       expect(page.url()).toMatch(/billing=annual/);
  1075 |     });
  1076 | 
  1077 |     test("ROI page Get Started CTA passes monthly billing param when Monthly is selected", async ({ page }) => {
  1078 |       await roiPage.goto();
  1079 | 
  1080 |       // Ensure monthly is selected
  1081 |       const monthlyBtn = page.locator('button').filter({ hasText: /^Monthly$/ }).first();
  1082 |       await monthlyBtn.click();
  1083 |       await page.waitForTimeout(200);
  1084 | 
  1085 |       const ctaBtn = page.locator('button').filter({ hasText: /Get Started with .+ Plan/ }).first();
  1086 |       await ctaBtn.click();
  1087 | 
  1088 |       await expect(page).toHaveURL(/\/signup/, { timeout: 10_000 });
  1089 |       expect(page.url()).toMatch(/billing=monthly/);
  1090 |     });
  1091 | 
  1092 |     test("Get Started Free button in CTA section navigates to /signup", async ({ page }) => {
  1093 |       await roiPage.goto();
  1094 | 
  1095 |       // Scroll to the bottom CTA section
  1096 |       await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  1097 |       await page.waitForTimeout(300);
  1098 | 
  1099 |       const getStartedLink = page.locator('a[href="/signup"]').first();
  1100 |       await expect(getStartedLink).toBeVisible();
  1101 |     });
  1102 | 
  1103 |     test("Book a Demo button in CTA section is visible", async ({ page }) => {
  1104 |       await roiPage.goto();
  1105 | 
  1106 |       await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  1107 |       await page.waitForTimeout(300);
  1108 | 
  1109 |       const bookDemoLink = page.locator('a[href="/book-meeting"]').first();
  1110 |       await expect(bookDemoLink).toBeVisible();
  1111 |     });
  1112 | 
  1113 |   }); // end: ROI to Pricing integration
  1114 | 
  1115 | }); // end: ROI Calculator & Pricing Integration
  1116 | 
```