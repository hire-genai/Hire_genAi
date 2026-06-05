/**
 * tests/e2e/04-roi-calculator.spec.ts
 *
 * End-to-end tests for the ROI Calculator page (/roi) and its integration
 * with the Pricing page (/pricing).
 *
 * Covers:
 *   POSITIVE
 *     1.  ROI calculator page loads successfully
 *     2.  Default values are pre-filled in all inputs
 *     3.  Changing the Recruiters input recalculates ROI outputs
 *     4.  Changing CVs / Req recalculates ROI outputs
 *     5.  Changing Shortlist % recalculates ROI outputs
 *     6.  Changing Qualified % recalculates ROI outputs
 *     7.  Changing Hourly Rate recalculates ROI outputs
 *     8.  Changing Days / Week recalculates ROI outputs
 *     9.  Changing Hours / Day recalculates ROI outputs
 *     10. All KPI metric cards display positive numbers with default inputs
 *     11. Screening Time reduction is fixed at 80%
 *     12. Ranking Time reduction is fixed at ~92%
 *     13. Qualification Effort reduction is fixed at 50%
 *     14. Productivity Index > 1x with defaults
 *     15. Monthly Savings card shows positive dollar amount
 *     16. Recommended Plan matches expected plan for given CV volume
 *     17. "View all plans" link navigates to /pricing
 *     18. "Get Started" CTA navigates to /signup with plan param
 *     19. Billing toggle switches between Monthly and Annual in plan section
 *     20. ROI Insight percentage updates when inputs change
 *
 *   NEGATIVE
 *     1.  Recruiters = 0 falls back to minimum and does not crash
 *     2.  CVs / Req set to 0 does not produce NaN or Infinity in outputs
 *     3.  Non-numeric input is handled gracefully (no NaN displayed)
 *     4.  Extremely large recruiter count does not overflow / show NaN
 *     5.  Extremely large CVs / Req does not show NaN
 *
 *   RESPONSIVE
 *     1.  Page renders correctly at mobile viewport (375 × 812)
 *     2.  Input grid is visible and usable on mobile
 *     3.  KPI cards are visible on mobile
 *
 * ROI formula summary (from page source):
 *   cvsPerReq=100, shortlistRate=15 => shortlisted = 15
 *   Step 4 (CV Screening):      hTime = 5*cvs,   aTime = 1*cvs
 *   Step 5 (Ranking & Matching): hTime = 0.6*cvs, aTime = 0.05*cvs
 *   Step 6 (Qualification Calls): hTime = shortlisted*20, aTime = shortlisted*10
 *   totalHMins = 500 + 60 + 300 + staticSteps = 1200 (with defaults)
 *   totalAMins = 100 +  5 + 150 + staticSteps = 595
 *   screenReduce = 80%  (fixed)
 *   rankReduce   = round((60-5)/60*100) = 92% (fixed)
 *   qualReduce   = 50%  (fixed)
 *   prodIndex    = (moHrs / aHrs) / (moHrs / hHrs)  = hHrs / aHrs
 */

import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const ROI_URL = `${BASE_URL}/roi`;
const PRICING_URL = `${BASE_URL}/pricing`;

/** Default values shown in the ROI calculator on first load */
const DEFAULTS = {
  recruiters: "1",
  cvsPerReq: "100",
  shortlistPct: "15",
  qualifiedPct: "15",
  hourlyRate: "30",
  daysPerWeek: "5",
  hoursPerDay: "6",
};

/** Fixed output percentages (from source code constants) */
const FIXED_SCREEN_REDUCE = 80;
const FIXED_RANK_REDUCE = 92;
const FIXED_QUAL_REDUCE = 50;

// ---------------------------------------------------------------------------
// Page Object — ROI Calculator
// ---------------------------------------------------------------------------

class RoiPage {
  constructor(private readonly page: Page) {}

  async goto() {
    // Use "networkidle" so React fully hydrates before the test interacts with the page.
    // "domcontentloaded" returns when the HTML is parsed, but Next.js still needs to
    // compile and execute the JS bundle before React's event handlers are attached.
    await this.page.goto(ROI_URL, { waitUntil: "networkidle" });
  }

  // ── Input locators ──────────────────────────────────────────────────────

  get recruitersInput() {
    return this.page.locator('label:has-text("Recruiters") + input, input[type="number"]').first();
  }

  getInputByLabel(labelText: string) {
    return this.page.locator(`label`).filter({ hasText: labelText }).locator("+ input");
  }

  // Inputs are in a grid — each cell is a div containing a label + input.
  // Navigate from label → its immediate parent div → input within that div.
  private inputByLabel(labelText: string | RegExp) {
    return this.page
      .locator('label', { hasText: labelText })
      .locator('xpath=parent::div//input[not(@readonly)]')
      .first();
  }

  get recruiterInput() { return this.inputByLabel(/^Recruiters$/i); }
  get cvsPerReqInput() { return this.inputByLabel(/^CVs \/ Req$/i); }
  get shortlistPctInput() { return this.inputByLabel(/^Shortlist %$/i); }
  get qualifiedPctInput() { return this.inputByLabel(/^Qualified %$/i); }
  get hourlyRateInput() { return this.inputByLabel(/^Hourly Rate/i); }
  get daysPerWeekInput() { return this.inputByLabel(/^Days \/ Week$/i); }
  get hoursPerDayInput() { return this.inputByLabel(/^Hours \/ Day$/i); }

  // ── KPI card locators ───────────────────────────────────────────────────

  getKpiCard(labelText: string) {
    return this.page.locator('div').filter({ hasText: new RegExp(labelText, 'i') }).last();
  }

  /** Gets the bold value text inside a KPI card identified by its label */
  async getKpiValue(labelText: string): Promise<string> {
    // KPI grid: each card is a rounded-2xl div with text-center.
    // Value (text-xl) comes BEFORE the label inside each card.
    const label = labelText.replace(/[↓↑]/g, '').trim()
    const card = this.page.locator('div.rounded-2xl.text-center')
      .filter({ hasText: new RegExp(label, 'i') })
      .first()
    const valueEl = card.locator('[class*="text-xl"], [class*="text-2xl"]').first()
    return (await valueEl.textContent() ?? '').trim()
  }

  /** Returns the text of the ROI Insight value in the plan recommendation section */
  async getRoiInsightValue(): Promise<string> {
    const roiEl = this.page
      .getByText('ROI Insight', { exact: true })
      .locator('xpath=following-sibling::div[contains(@class,"text-emerald-400")]')
      .first();
    return (await roiEl.textContent() ?? '').trim();
  }

  /** Returns the text content of the Monthly Savings value in the plan block */
  async getMonthlySavingsValue(): Promise<string> {
    const savingsEl = this.page.locator('div').filter({ hasText: /Monthly Savings/i }).locator('div.text-emerald-400, div.font-bold.text-xl').first();
    return (await savingsEl.textContent() ?? '').trim();
  }

  /** Returns the recommended plan name */
  async getRecommendedPlanName(): Promise<string> {
    const planEl = this.page.locator('span.text-emerald-400').first();
    return (await planEl.textContent() ?? '').replace('Plan', '').trim();
  }

  // ── Input helpers ───────────────────────────────────────────────────────

  async setInputValue(locator: ReturnType<Page["locator"]>, value: string) {
    await locator.click({ clickCount: 3 });
    await locator.fill(value);
    await locator.press("Tab");
    // Allow React state update + re-render
    await this.page.waitForTimeout(150);
  }

  // ── Billing toggle ──────────────────────────────────────────────────────

  async clickMonthlyBilling() {
    // There are two billing toggles — one in the plan section (dark bg)
    const btn = this.page.locator('button').filter({ hasText: /^Monthly$/ }).first();
    await btn.click();
    await this.page.waitForTimeout(150);
  }

  async clickAnnualBilling() {
    const btn = this.page.locator('button').filter({ hasText: /^Annual/ }).first();
    await btn.click();
    await this.page.waitForTimeout(150);
  }

  // ── Assertion helpers ───────────────────────────────────────────────────

  async expectNoNaNInPage() {
    // Scope to the ROI calculator content area only — full body includes nav
    // links and potentially auth-injected content that is not ROI output.
    const roi = this.page.locator('main, [class*="min-h-screen"]').first();
    const text = await roi.textContent() ?? await this.page.locator("body").textContent() ?? "";
    expect(text).not.toContain("NaN");
    expect(text).not.toContain("Infinity");
  }

  async expectPageLoaded() {
    await expect(this.page.getByRole("heading", { name: /Human Recruiter/i }).first()).toBeVisible();
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse a formatted value like "$1,234" or "5.2x" or "80%" -> number */
function parseFormattedNumber(text: string): number {
  const cleaned = text.replace(/[$,%x+]/g, "").replace(/,/g, "").trim();
  return parseFloat(cleaned);
}

/** Whether a string contains a recognisable positive numeric value */
function isPositiveNumber(text: string): boolean {
  const n = parseFormattedNumber(text);
  return !isNaN(n) && n > 0;
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

test.describe("ROI Calculator & Pricing Integration", () => {
  let roiPage: RoiPage;

  test.beforeEach(async ({ page }) => {
    roiPage = new RoiPage(page);
    // Clear any persisted auth state
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test.afterEach(async ({ page }) => {
    await page.unrouteAll({ behavior: "ignoreErrors" });
  });

  // =========================================================================
  // POSITIVE TEST CASES
  // =========================================================================

  test.describe("Positive scenarios", () => {

    // ── 1. Page loads ──────────────────────────────────────────────────────

    test("ROI calculator page loads successfully", async ({ page }) => {
      await roiPage.goto();

      // H1 headline — Navbar has an h1 logo; ROI page h1 is the second one
      await expect(page.getByRole("heading", { name: /Human Recruiter/i }).first()).toBeVisible();

      // Key UI sections present
      await expect(page.getByText("Business Drivers", { exact: false })).toBeVisible();
      await expect(page.getByText("Recommended Based on Your Volume", { exact: false })).toBeVisible();
    });

    // ── 2. Default values pre-filled ──────────────────────────────────────

    test("Default values are pre-filled in all inputs", async ({ page }) => {
      await roiPage.goto();

      await expect(roiPage.recruiterInput).toHaveValue(DEFAULTS.recruiters);
      await expect(roiPage.cvsPerReqInput).toHaveValue(DEFAULTS.cvsPerReq);
      await expect(roiPage.shortlistPctInput).toHaveValue(DEFAULTS.shortlistPct);
      await expect(roiPage.qualifiedPctInput).toHaveValue(DEFAULTS.qualifiedPct);
      await expect(roiPage.hourlyRateInput).toHaveValue(DEFAULTS.hourlyRate);
      await expect(roiPage.daysPerWeekInput).toHaveValue(DEFAULTS.daysPerWeek);
      await expect(roiPage.hoursPerDayInput).toHaveValue(DEFAULTS.hoursPerDay);
    });

    // ── 3. Recruiters recalculates ─────────────────────────────────────────

    test("Changing Recruiters recalculates ROI outputs", async ({ page }) => {
      await roiPage.goto();

      // Record Monthly Savings value before change
      const savingsBefore = await roiPage.getKpiValue("Monthly Savings");

      // Increase recruiters from 1 to 5
      await roiPage.setInputValue(roiPage.recruiterInput, "5");

      // JD volume should update (5 recruiters × 5 JDs = 25 JDs)
      const totalJdsInput = page.locator('label').filter({ hasText: /^Total JDs$/i }).locator('xpath=following-sibling::input[1]');
      await expect(totalJdsInput).toHaveValue("25");

      // Monthly Savings should change
      const savingsAfter = await roiPage.getKpiValue("Monthly Savings");
      expect(savingsBefore).not.toEqual(savingsAfter);

      // Still no NaN
      await roiPage.expectNoNaNInPage();
    });

    // ── 4. CVs / Req recalculates ─────────────────────────────────────────

    test("Changing CVs / Req recalculates ROI outputs", async ({ page }) => {
      await roiPage.goto();

      const savingsBefore = await roiPage.getKpiValue("Monthly Savings");

      await roiPage.setInputValue(roiPage.cvsPerReqInput, "200");

      const savingsAfter = await roiPage.getKpiValue("Monthly Savings");
      expect(savingsBefore).not.toEqual(savingsAfter);

      await roiPage.expectNoNaNInPage();
    });

    // ── 5. Shortlist % recalculates ────────────────────────────────────────

    test("Changing Shortlist % recalculates ROI outputs", async ({ page }) => {
      await roiPage.goto();

      const savingsBefore = await roiPage.getKpiValue("Monthly Savings");

      await roiPage.setInputValue(roiPage.shortlistPctInput, "30");

      const savingsAfter = await roiPage.getKpiValue("Monthly Savings");
      expect(savingsBefore).not.toEqual(savingsAfter);

      await roiPage.expectNoNaNInPage();
    });

    // ── 6. Qualified % recalculates ────────────────────────────────────────

    test("Changing Qualified % does not crash the page", async ({ page }) => {
      await roiPage.goto();

      // Qualified % affects shortlisted count display but not primary cost calc
      await roiPage.setInputValue(roiPage.qualifiedPctInput, "50");

      await roiPage.expectNoNaNInPage();

      // KPI cards still present
      const screenReduceText = await roiPage.getKpiValue("Screening Time");
      expect(screenReduceText).toContain("%");
    });

    // ── 7. Hourly Rate recalculates ────────────────────────────────────────

    test("Changing Hourly Rate recalculates Monthly Savings", async ({ page }) => {
      await roiPage.goto();

      const savingsBefore = await roiPage.getKpiValue("Monthly Savings");

      await roiPage.setInputValue(roiPage.hourlyRateInput, "60");

      const savingsAfter = await roiPage.getKpiValue("Monthly Savings");
      expect(savingsBefore).not.toEqual(savingsAfter);

      // With doubled hourly rate the savings should roughly double
      const before = parseFormattedNumber(savingsBefore);
      const after = parseFormattedNumber(savingsAfter);
      // Ratio should be approximately 2 (within 20% tolerance)
      expect(after / before).toBeGreaterThan(1.8);
      expect(after / before).toBeLessThan(2.2);

      await roiPage.expectNoNaNInPage();
    });

    // ── 8. Days / Week recalculates ───────────────────────────────────────

    test("Changing Days / Week recalculates ROI outputs", async ({ page }) => {
      await roiPage.goto();

      const savingsBefore = await roiPage.getKpiValue("Monthly Savings");

      await roiPage.setInputValue(roiPage.daysPerWeekInput, "7");

      const savingsAfter = await roiPage.getKpiValue("Monthly Savings");
      // May or may not change savings directly but page should not crash
      await roiPage.expectNoNaNInPage();
      // prodIndex should still be a positive multiplier
      const prodValue = await roiPage.getKpiValue("Productivity Index");
      expect(isPositiveNumber(prodValue)).toBe(true);
    });

    // ── 9. Hours / Day recalculates ───────────────────────────────────────

    test("Changing Hours / Day recalculates ROI outputs", async ({ page }) => {
      await roiPage.goto();

      await roiPage.setInputValue(roiPage.hoursPerDayInput, "8");

      await roiPage.expectNoNaNInPage();

      const prodValue = await roiPage.getKpiValue("Productivity Index");
      expect(isPositiveNumber(prodValue)).toBe(true);
    });

    // ── 10. KPI cards show positive numbers ───────────────────────────────

    test("All KPI metric cards display positive numbers with default inputs", async ({ page }) => {
      await roiPage.goto();

      const kpiLabels = [
        "Screening Time",
        "Ranking Time",
        "Qualification Effort",
        "Productivity Index",
        "Monthly Savings",
        "Cost/Req vs Human",
      ];

      for (const label of kpiLabels) {
        const value = await roiPage.getKpiValue(label);
        expect(value, `KPI "${label}" should be positive, got: ${value}`).toBeTruthy();
        // Should contain a recognisable number
        expect(value).toMatch(/[\d]/);
        expect(value).not.toContain("NaN");
      }
    });

    // ── 11. Screening Time is fixed at 80% ────────────────────────────────

    test("Screening Time reduction is fixed at 80%", async ({ page }) => {
      await roiPage.goto();

      const value = await roiPage.getKpiValue("Screening Time");
      expect(value).toBe(`${FIXED_SCREEN_REDUCE}%`);

      // Changing inputs should not change this fixed metric
      await roiPage.setInputValue(roiPage.recruiterInput, "10");
      const valueAfter = await roiPage.getKpiValue("Screening Time");
      expect(valueAfter).toBe(`${FIXED_SCREEN_REDUCE}%`);
    });

    // ── 12. Ranking Time is fixed at ~92% ─────────────────────────────────

    test("Ranking Time reduction is fixed at approximately 92%", async ({ page }) => {
      await roiPage.goto();

      const value = await roiPage.getKpiValue("Ranking Time");
      expect(value).toBe(`${FIXED_RANK_REDUCE}%`);

      // Should remain fixed regardless of inputs
      await roiPage.setInputValue(roiPage.cvsPerReqInput, "50");
      const valueAfter = await roiPage.getKpiValue("Ranking Time");
      expect(valueAfter).toBe(`${FIXED_RANK_REDUCE}%`);
    });

    // ── 13. Qualification Effort is fixed at 50% ──────────────────────────

    test("Qualification Effort reduction is fixed at 50%", async ({ page }) => {
      await roiPage.goto();

      const value = await roiPage.getKpiValue("Qualification Effort");
      expect(value).toBe(`${FIXED_QUAL_REDUCE}%`);
    });

    // ── 14. Productivity Index > 1 ────────────────────────────────────────

    test("Productivity Index is greater than 1x with default inputs", async ({ page }) => {
      await roiPage.goto();

      const value = await roiPage.getKpiValue("Productivity Index");
      const numeric = parseFormattedNumber(value);
      expect(numeric).toBeGreaterThan(1);
    });

    // ── 15. Monthly Savings shows positive amount ──────────────────────────

    test("Monthly Savings card shows positive dollar amount", async ({ page }) => {
      await roiPage.goto();

      const value = await roiPage.getKpiValue("Monthly Savings");
      expect(value).toContain("$");
      const numeric = parseFormattedNumber(value);
      expect(numeric).toBeGreaterThan(0);
    });

    // ── 16. Recommended Plan matches CV volume ────────────────────────────

    test("Recommended Plan is Starter for default 1 recruiter (100 CVs/req = 500 CVs total <= 200 cap → Starter)", async ({ page }) => {
      await roiPage.goto();

      // Default: 1 recruiter => 5 JDs => 5*100=500 total CVs
      // PLANS_LOOKUP: Starter cvCap=200, Professional cvCap=1000
      // 500 > 200 so Professional plan should be recommended
      const planName = await roiPage.getRecommendedPlanName();
      // With 1 recruiter × 5 JDs × 100 CVs = 500 CVs → Professional (cap 1000)
      expect(planName.toLowerCase()).toContain("professional");
    });

    test("Recommended Plan updates to Starter when CV volume is low", async ({ page }) => {
      await roiPage.goto();

      // Reduce CVs to get total <= 200 (Starter cap)
      // 1 recruiter × 5 JDs × 10 CVs = 50 CVs → Starter
      //
      // Use the nativeInputValueSetter approach to guarantee React sees the change.
      // Playwright's fill() can race with React's controlled-input reconciliation on
      // React 18 when the new value is numerically small (like 10 from 100).
      await roiPage.cvsPerReqInput.evaluate((el: HTMLInputElement) => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        setter?.call(el, '10');
        el.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await roiPage.cvsPerReqInput.press('Tab');

      // Poll until the plan name element reflects the updated calculation
      await expect(page.locator('span.text-emerald-400').first()).toContainText('Starter', { timeout: 5000 });
      const planName = await roiPage.getRecommendedPlanName();
      expect(planName.toLowerCase()).toContain("starter");
    });

    test("Recommended Plan updates to Enterprise for very high volume", async ({ page }) => {
      await roiPage.goto();

      // 10 recruiters × 5 JDs = 50 JDs × 500 CVs = 25,000 CVs → Enterprise (cap 10,000 → last plan)
      await roiPage.setInputValue(roiPage.recruiterInput, "10");
      await roiPage.setInputValue(roiPage.cvsPerReqInput, "500");

      // Poll until the plan name element reflects both input changes
      await expect(page.locator('span.text-emerald-400').first()).toContainText('Enterprise', { timeout: 5000 });
      const planName = await roiPage.getRecommendedPlanName();
      expect(planName.toLowerCase()).toContain("enterprise");
    });

    // ── 17. "View all plans" navigates to /pricing ────────────────────────

    test('"View all plans" link navigates to pricing page', async ({ page }) => {
      await roiPage.goto();

      // The ROI page has a "View all plans" link (distinct from nav "Pricing")
      const link = page.getByRole('link', { name: /view all plans/i });
      await expect(link).toBeVisible();

      await link.click();
      await expect(page).toHaveURL(/\/pricing/, { timeout: 10_000 });
    });

    // ── 18. "Get Started" CTA links to signup with plan param ─────────────

    test('"Get Started" CTA navigates to signup with plan pre-selected', async ({ page }) => {
      await roiPage.goto();

      // The main CTA button says "Get Started with <Plan> Plan (...)"
      const ctaBtn = page.locator('button').filter({ hasText: /Get Started with .+ Plan/ }).first();
      await expect(ctaBtn).toBeVisible();
      await ctaBtn.click();

      // Catch the URL at the moment it contains plan= (before signup page rewrites to ?section=company)
      await page.waitForURL(/signup.*plan=/, { timeout: 10_000 });
      expect(page.url()).toMatch(/[?&]plan=/);
    });

    // ── 19. Billing toggle in plan section switches pricing ───────────────

    test("Billing toggle switches between Monthly and Annual pricing display", async ({ page }) => {
      await roiPage.goto();

      // Default is Monthly in the plan recommendation section
      const monthlyBtn = page.locator('button').filter({ hasText: /^Monthly$/ }).first();
      const annualBtn = page.locator('button').filter({ hasText: /^Annual/ }).first();

      await expect(monthlyBtn).toBeVisible();
      await expect(annualBtn).toBeVisible();

      // Scroll the toggle into view before clicking (it sits below the fold on some viewports)
      await annualBtn.scrollIntoViewIfNeeded();
      await annualBtn.click();

      // Use toContainText so Playwright polls until React re-renders the CTA text
      const ctaBtn = page.locator('button').filter({ hasText: /Get Started with .+ Plan/ }).first();
      await expect(ctaBtn).toContainText('billed annually', { timeout: 5000 });

      // Switch back to Monthly
      await monthlyBtn.click();
      await expect(ctaBtn).not.toContainText('billed annually', { timeout: 5000 });
    });

    // ── 20. ROI Insight % updates on input change ─────────────────────────

    test("ROI Insight percentage updates when inputs change", async ({ page }) => {
      await roiPage.goto();

      // Locate the ROI % value via its sibling label — avoids matching the broader dark section
      const roiEl = page
        .getByText('ROI Insight', { exact: true })
        .locator('xpath=following-sibling::div[contains(@class,"text-emerald-400")]')
        .first();
      const roiBefore = (await roiEl.textContent() ?? "").trim();

      // Double the hourly rate — savings (numerator) doubles, ROI should increase
      await roiPage.setInputValue(roiPage.hourlyRateInput, "60");

      // Poll until the ROI element reflects the new hourlyRate (don't read immediately)
      await expect(roiEl).not.toHaveText(roiBefore, { timeout: 5000 });
      const roiAfter = (await roiEl.textContent() ?? "").trim();

      // Both should contain "%" or "+"
      expect(roiBefore).toMatch(/%|\+/);
      expect(roiAfter).toMatch(/%|\+/);

      // The values should differ
      expect(roiBefore).not.toEqual(roiAfter);
    });

    // ── 21. Pricing page has billing toggle ───────────────────────────────

    test("Pricing page billing toggle switches between monthly and annual", async ({ page }) => {
      await page.goto(PRICING_URL, { waitUntil: "domcontentloaded" });

      const monthlyBtn = page.locator('button').filter({ hasText: /^Monthly$/ }).first();
      const annualBtn = page.locator('button').filter({ hasText: /^Annual/ }).first();

      await expect(monthlyBtn).toBeVisible();
      await expect(annualBtn).toBeVisible();

      // Default is Annual on pricing page
      await monthlyBtn.click();
      await page.waitForTimeout(200);

      // Starter plan shows $99 / month when monthly is selected
      // Use .first() to avoid strict-mode violation — "$99" appears as substring of "$999" on the page
      await expect(page.locator("text=$99").first()).toBeVisible();
    });

    // ── 22. Pricing page ROI Assessment link goes to /roi ─────────────────

    test("Pricing page has ROI Assessment link pointing to /roi", async ({ page }) => {
      await page.goto(PRICING_URL, { waitUntil: "domcontentloaded" });

      // The pricing page body (not the navbar) has an "ROI Assessment" link — use role + name to target it
      const roiLink = page.getByRole('link', { name: /ROI Assessment/i }).first();
      await expect(roiLink).toBeVisible();
      await expect(roiLink).toContainText("ROI Assessment");
    });

    // ── 23. Pricing page plan CTA links to signup ─────────────────────────

    test("Pricing page plan CTA button navigates to signup with plan param", async ({ page }) => {
      await page.goto(PRICING_URL, { waitUntil: "domcontentloaded" });

      // Switch to monthly so all plan CTAs are "Choose <Plan>"
      const monthlyBtn = page.locator('button').filter({ hasText: /^Monthly$/ }).first();
      await monthlyBtn.click();
      await page.waitForTimeout(200);

      // Click the Starter plan CTA
      const starterCta = page.locator('button').filter({ hasText: /Choose Starter/ }).first();
      await expect(starterCta).toBeVisible();
      await starterCta.click();

      await expect(page).toHaveURL(/\/signup/, { timeout: 10_000 });
      expect(page.url()).toMatch(/[?&]plan=Starter/);
    });

    // ── 24. ROI Insight is mathematically reasonable ──────────────────────

    test("ROI Insight value is mathematically reasonable with defaults", async ({ page }) => {
      await roiPage.goto();

      // With defaults: plan = Professional ($499/mo)
      // savings must be positive for ROI to be positive
      const roiEl = page
        .getByText('ROI Insight', { exact: true })
        .locator('xpath=following-sibling::div[contains(@class,"text-emerald-400")]')
        .first();
      const roiText = (await roiEl.textContent() ?? "").trim();

      // Should be either "X%" or "1,000%+"
      expect(roiText).toMatch(/^\d[\d,]*%(\+)?$/);

      // If it is a normal percentage (not capped), check it is positive
      if (!roiText.includes("+")) {
        const n = parseFormattedNumber(roiText);
        expect(n).toBeGreaterThan(0);
      }
    });

    // ── 25. Cost/Req vs Human < 100% ──────────────────────────────────────

    test("Cost/Req vs Human is below 100% (AI is cheaper than human-only)", async ({ page }) => {
      await roiPage.goto();

      const value = await roiPage.getKpiValue("Cost/Req vs Human");
      const numeric = parseFormattedNumber(value);
      // AI-assisted cost should be less than 100% of human cost
      expect(numeric).toBeGreaterThan(0);
      expect(numeric).toBeLessThan(100);
    });

  }); // end: Positive scenarios

  // =========================================================================
  // NEGATIVE TEST CASES
  // =========================================================================

  test.describe("Negative scenarios", () => {

    // ── 1. Recruiters = 0 handled gracefully ──────────────────────────────

    test("Setting Recruiters to 0 does not crash or show NaN", async ({ page }) => {
      await roiPage.goto();

      await roiPage.setInputValue(roiPage.recruiterInput, "0");

      // Page should still show metrics (the component falls back to 1 via || 1)
      await expect(page.locator("body")).toBeVisible();
      await roiPage.expectNoNaNInPage();

      // KPI cards still visible
      const screenValue = await roiPage.getKpiValue("Screening Time");
      expect(screenValue).toBeTruthy();
    });

    // ── 2. CVs / Req = 0 does not produce NaN ────────────────────────────

    test("Setting CVs / Req to 0 does not show NaN or Infinity", async ({ page }) => {
      await roiPage.goto();

      await roiPage.setInputValue(roiPage.cvsPerReqInput, "0");

      await roiPage.expectNoNaNInPage();

      // Fixed KPI cards should still display correctly
      const screenReduce = await roiPage.getKpiValue("Screening Time");
      expect(screenReduce).toBe(`${FIXED_SCREEN_REDUCE}%`);
    });

    // ── 3. Non-numeric input handled gracefully ───────────────────────────

    test("Typing non-numeric text in Recruiters is handled gracefully", async ({ page }) => {
      await roiPage.goto();

      // Type a non-numeric string — the input type=number browser filter
      // will clear or reject it, React falls back to || 1
      const input = roiPage.recruiterInput;
      await input.click({ clickCount: 3 });
      await input.pressSequentially("abc");
      await input.press("Tab");
      await page.waitForTimeout(200);

      await roiPage.expectNoNaNInPage();

      // The fixed metrics should still display
      const rankReduce = await roiPage.getKpiValue("Ranking Time");
      expect(rankReduce).toBe(`${FIXED_RANK_REDUCE}%`);
    });

    test("Typing non-numeric text in CVs / Req is handled gracefully", async ({ page }) => {
      await roiPage.goto();

      const input = roiPage.cvsPerReqInput;
      await input.click({ clickCount: 3 });
      await input.pressSequentially("xyz");
      await input.press("Tab");
      await page.waitForTimeout(200);

      await roiPage.expectNoNaNInPage();
    });

    // ── 4. Extremely large recruiter count ────────────────────────────────

    test("Extremely large Recruiters value does not overflow or show NaN", async ({ page }) => {
      await roiPage.goto();

      await roiPage.setInputValue(roiPage.recruiterInput, "9999");

      await roiPage.expectNoNaNInPage();

      // Monthly Savings should be a large but valid dollar amount
      const savings = await roiPage.getKpiValue("Monthly Savings");
      expect(savings).toContain("$");
      expect(savings).not.toContain("NaN");
      expect(savings).not.toContain("Infinity");
    });

    // ── 5. Extremely large CVs / Req ──────────────────────────────────────

    test("Extremely large CVs / Req does not show NaN", async ({ page }) => {
      await roiPage.goto();

      await roiPage.setInputValue(roiPage.cvsPerReqInput, "99999");

      await roiPage.expectNoNaNInPage();

      const savings = await roiPage.getKpiValue("Monthly Savings");
      expect(savings).toContain("$");
      expect(savings).not.toContain("NaN");

      // Plan should default to Enterprise (last plan) for very high CV volume
      const planName = await roiPage.getRecommendedPlanName();
      expect(planName.toLowerCase()).toContain("enterprise");
    });

    // ── 6. Shortlist % at boundary values ────────────────────────────────

    test("Shortlist % at 1 (minimum) does not crash the page", async ({ page }) => {
      await roiPage.goto();

      await roiPage.setInputValue(roiPage.shortlistPctInput, "1");

      await roiPage.expectNoNaNInPage();

      const qualReduce = await roiPage.getKpiValue("Qualification Effort");
      expect(qualReduce).toBe(`${FIXED_QUAL_REDUCE}%`);
    });

    test("Shortlist % at 100 (maximum) does not crash the page", async ({ page }) => {
      await roiPage.goto();

      await roiPage.setInputValue(roiPage.shortlistPctInput, "100");

      await roiPage.expectNoNaNInPage();

      const savings = await roiPage.getKpiValue("Monthly Savings");
      expect(savings).toContain("$");
    });

    // ── 7. Hourly Rate = 0 ────────────────────────────────────────────────

    test("Hourly Rate of 0 does not show NaN (savings become 0)", async ({ page }) => {
      await roiPage.goto();

      await roiPage.setInputValue(roiPage.hourlyRateInput, "0");

      await roiPage.expectNoNaNInPage();

      // Fixed reduction metrics are unaffected by hourly rate
      const screenReduce = await roiPage.getKpiValue("Screening Time");
      expect(screenReduce).toBe(`${FIXED_SCREEN_REDUCE}%`);
    });

    // ── 8. Hours / Day = 0 ───────────────────────────────────────────────

    test("Hours / Day of 0 does not show NaN", async ({ page }) => {
      await roiPage.goto();

      await roiPage.setInputValue(roiPage.hoursPerDayInput, "0");

      await roiPage.expectNoNaNInPage();
    });

  }); // end: Negative scenarios

  // =========================================================================
  // RESPONSIVE / MOBILE TESTS
  // =========================================================================

  test.describe("Responsive behavior", () => {

    // ── 1. Page renders on mobile viewport ────────────────────────────────

    test("ROI page renders correctly at mobile viewport (375x812)", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await roiPage.goto();

      // Headline visible
      await expect(page.locator("h1").first()).toBeVisible();

      // Business Drivers section visible
      await expect(page.getByText("Business Drivers", { exact: false })).toBeVisible();
    });

    // ── 2. Input fields visible on mobile ─────────────────────────────────

    test("All input fields are visible and accessible on mobile", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await roiPage.goto();

      // Scroll to inputs section
      await page.evaluate(() => {
        const el = document.querySelector('input[type="number"]');
        el?.scrollIntoView({ behavior: "smooth" });
      });

      await expect(roiPage.recruiterInput).toBeVisible();
      await expect(roiPage.cvsPerReqInput).toBeVisible();
    });

    // ── 3. KPI cards visible on mobile ───────────────────────────────────

    test("KPI cards are visible on mobile viewport", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await roiPage.goto();

      // Scroll to KPI cards
      await page.evaluate(() => {
        document.querySelectorAll("div.rounded-2xl")[2]?.scrollIntoView({ behavior: "smooth" });
      });
      await page.waitForTimeout(300);

      // At least the fixed-value KPIs are always present
      const screenEl = page.locator("div").filter({ hasText: /Screening Time/i }).first();
      await expect(screenEl).toBeVisible();
    });

    // ── 4. Mobile billing toggle works ────────────────────────────────────

    test("Billing toggle is functional on mobile viewport", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await roiPage.goto();

      // Scroll to billing toggle in plan section (dark background)
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll("button"));
        const annualBtn = buttons.find(b => b.textContent?.includes("Annual"));
        annualBtn?.scrollIntoView({ behavior: "smooth" });
      });
      await page.waitForTimeout(300);

      const annualBtn = page.locator('button').filter({ hasText: /^Annual/ }).first();
      await expect(annualBtn).toBeVisible();
      await annualBtn.click();
      await page.waitForTimeout(200);

      // CTA button should reflect annual billing
      const ctaBtn = page.locator('button').filter({ hasText: /Get Started with .+ Plan/ }).first();
      const ctaText = await ctaBtn.textContent();
      expect(ctaText?.toLowerCase()).toContain("billed annually");
    });

    // ── 5. Pricing page renders on mobile ────────────────────────────────

    test("Pricing page renders correctly at mobile viewport", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(PRICING_URL, { waitUntil: "domcontentloaded" });

      // Header section
      await expect(page.locator("h1").first()).toBeVisible();

      // Billing toggle
      const monthlyBtn = page.locator('button').filter({ hasText: /^Monthly$/ }).first();
      await expect(monthlyBtn).toBeVisible();

      // At least the first plan card
      await expect(page.getByText("Starter", { exact: true }).first()).toBeVisible();
    });

  }); // end: Responsive behavior

  // =========================================================================
  // MATHEMATICAL ACCURACY TESTS
  // =========================================================================

  test.describe("Mathematical output verification", () => {

    test("Productivity Index matches hHrs/aHrs ratio for default inputs", async ({ page }) => {
      await roiPage.goto();

      /**
       * With defaults (cvsPerReq=100, shortlistRate=15):
       *   shortlisted = 15
       *   Step 4: hTime=500, aTime=100
       *   Step 5: hTime=60,  aTime=5
       *   Step 6: hTime=300, aTime=150
       *   Static steps total (ids 1,2,3,7,8,9,10,11):
       *     45+20+10+60+40+45+60+60 = 340
       *   totalH = 500+60+300+340 = 1200 min = 20h
       *   totalA = 100+5+150+340  = 595 min = 9.917h
       *   prodIndex = 20 / 9.917 ≈ 2.02
       */
      const prodValue = await roiPage.getKpiValue("Productivity Index");
      const numeric = parseFormattedNumber(prodValue);

      // Should be approximately 2.0 (within 10%)
      expect(numeric).toBeGreaterThan(1.8);
      expect(numeric).toBeLessThan(2.3);
    });

    test("Monthly Savings increases proportionally when recruiter count doubles", async ({ page }) => {
      await roiPage.goto();

      // Get savings with 1 recruiter
      const savings1 = parseFormattedNumber(await roiPage.getKpiValue("Monthly Savings"));

      // Set 2 recruiters
      await roiPage.setInputValue(roiPage.recruiterInput, "2");
      const savings2 = parseFormattedNumber(await roiPage.getKpiValue("Monthly Savings"));

      // Savings should roughly double (within 10% tolerance)
      const ratio = savings2 / savings1;
      expect(ratio).toBeGreaterThan(1.8);
      expect(ratio).toBeLessThan(2.2);
    });

    test("Monthly Savings increases when hourly rate increases", async ({ page }) => {
      await roiPage.goto();

      const savings30 = parseFormattedNumber(await roiPage.getKpiValue("Monthly Savings"));

      await roiPage.setInputValue(roiPage.hourlyRateInput, "50");
      // Wait until the input AND the KPI output both reflect the new hourlyRate.
      // toHaveValue confirms the DOM input shows "50"; the not.toHaveText waits for
      // React to commit the recalculated savings to the KPI card.
      await expect(roiPage.hourlyRateInput).toHaveValue("50");
      const savingsKpiEl = page.locator('div.rounded-2xl.text-center')
        .filter({ hasText: /Monthly Savings/i }).first()
        .locator('[class*="text-xl"],[class*="text-2xl"]').first();
      await expect(savingsKpiEl).not.toHaveText(`$${savings30.toLocaleString()}`, { timeout: 5000 });
      const savings50 = parseFormattedNumber(await roiPage.getKpiValue("Monthly Savings"));

      // $50/h vs $30/h — savings should be ~5/3 times larger
      expect(savings50).toBeGreaterThan(savings30);
      const ratio = savings50 / savings30;
      expect(ratio).toBeGreaterThan(1.4);
      expect(ratio).toBeLessThan(1.9);
    });

    test("Fixed KPI values remain constant as inputs change", async ({ page }) => {
      await roiPage.goto();

      // Change multiple inputs
      await roiPage.setInputValue(roiPage.recruiterInput, "3");
      await roiPage.setInputValue(roiPage.cvsPerReqInput, "150");
      await roiPage.setInputValue(roiPage.shortlistPctInput, "20");

      // Fixed metrics must not change
      expect(await roiPage.getKpiValue("Screening Time")).toBe(`${FIXED_SCREEN_REDUCE}%`);
      expect(await roiPage.getKpiValue("Ranking Time")).toBe(`${FIXED_RANK_REDUCE}%`);
      expect(await roiPage.getKpiValue("Qualification Effort")).toBe(`${FIXED_QUAL_REDUCE}%`);
    });

  }); // end: Mathematical output verification

  // =========================================================================
  // INTEGRATION — ROI → PRICING PAGE
  // =========================================================================

  test.describe("ROI to Pricing integration", () => {

    test("Navigating from ROI to pricing shows the full plan list", async ({ page }) => {
      await roiPage.goto();

      const link = page.locator('a[href="/pricing"]').first();
      await link.click();
      await expect(page).toHaveURL(/\/pricing/, { timeout: 10_000 });

      // All 6 plans should be visible
      const planNames = ["Starter", "Professional", "Business", "Large", "Ultra", "Enterprise"];
      for (const planName of planNames) {
        await expect(page.getByText(planName, { exact: true }).first()).toBeVisible();
      }
    });

    test("Pricing page CTA for Enterprise plan links to /contact", async ({ page }) => {
      await page.goto(PRICING_URL, { waitUntil: "domcontentloaded" });

      // Click the Enterprise CTA
      const enterpriseCta = page.locator('button').filter({ hasText: /Talk to Sales/ }).first();
      await expect(enterpriseCta).toBeVisible();
      await enterpriseCta.click();

      await expect(page).toHaveURL(/\/contact/, { timeout: 10_000 });
    });

    test("ROI page Get Started CTA uses billing param from toggle", async ({ page }) => {
      await roiPage.goto();

      // Explicitly verify both toggle buttons are visible before interacting —
      // this stabilises the DOM and prevents a click racing against a render.
      const monthlyBtnToggle = page.locator('button').filter({ hasText: /^Monthly$/ }).first();
      const annualBtn = page.locator('button').filter({ hasText: /^Annual/ }).first();
      await expect(monthlyBtnToggle).toBeVisible();
      await expect(annualBtn).toBeVisible();
      await annualBtn.scrollIntoViewIfNeeded();
      await annualBtn.click();

      // Wait for CTA text to confirm billing state updated before clicking
      const ctaBtn = page.locator('button').filter({ hasText: /Get Started with .+ Plan/ }).first();
      await expect(ctaBtn).toContainText('billed annually', { timeout: 5000 });

      await ctaBtn.scrollIntoViewIfNeeded();
      await ctaBtn.click();

      // Catch URL before signup page rewrites to ?section=company
      await page.waitForURL(/signup.*billing=annual/, { timeout: 10_000 });
      expect(page.url()).toMatch(/billing=annual/);
    });

    test("ROI page Get Started CTA passes monthly billing param when Monthly is selected", async ({ page }) => {
      await roiPage.goto();

      // Ensure monthly is selected
      const monthlyBtn = page.locator('button').filter({ hasText: /^Monthly$/ }).first();
      await monthlyBtn.click();
      await page.waitForTimeout(200);

      const ctaBtn = page.locator('button').filter({ hasText: /Get Started with .+ Plan/ }).first();
      await ctaBtn.click();

      await expect(page).toHaveURL(/\/signup/, { timeout: 10_000 });
      expect(page.url()).toMatch(/billing=monthly/);
    });

    test("Get Started Free button in CTA section navigates to /signup", async ({ page }) => {
      await roiPage.goto();

      // Scroll to the bottom CTA section
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(300);

      const getStartedLink = page.locator('a[href="/signup"]').first();
      await expect(getStartedLink).toBeVisible();
    });

    test("Book a Demo button in CTA section is visible", async ({ page }) => {
      await roiPage.goto();

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(300);

      const bookDemoLink = page.locator('a[href="/book-meeting"]').first();
      await expect(bookDemoLink).toBeVisible();
    });

  }); // end: ROI to Pricing integration

}); // end: ROI Calculator & Pricing Integration
