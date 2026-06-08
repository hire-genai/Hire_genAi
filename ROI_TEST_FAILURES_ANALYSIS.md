# 🔍 ROI Calculator Test Failures - Detailed Analysis

**Test Run:** June 4, 2026  
**Total Tests:** 52  
**Passed:** 41 (78.8%)  
**Failed:** 11 (21.2%)  
**Status:** Exit code 0 (tests ran to completion)

---

## Failed Tests - Root Cause Analysis

### **FAILURE #1: Default values are pre-filled in all inputs**
**File:** `04-roi-calculator.spec.ts:253`  
**Status:** ❌ FAILED

**Expected:** `qualifiedPctInput` value = `"80"`  
**Actual:** `qualifiedPctInput` value = `"15"`  
**Test expectation from constants:**
```javascript
const DEFAULTS = {
  qualifiedPct: "80",  // ← Test expects 80
}
```

**Code in ROI page:**
```typescript
const [qualRate, setQualRate] = useState(15)  // ← Actual default is 15
```

**Root Cause:** 
- Test constants define `qualifiedPct: "80"`
- Page initializes `qualRate` state to `15`
- **Mismatch between test expectation and implementation**

**File Responsible:** `/app/(www)/roi/page.tsx` line ~69

**Proposed Fix:**
```typescript
// Option A: Change test defaults to match code
const DEFAULTS = {
  qualifiedPct: "15",  // Change from "80" to "15"
}

// Option B: Change code to match test defaults
const [qualRate, setQualRate] = useState(80)  // Change from 15 to 80
```

**Recommendation:** Check which is the intended default - 15% or 80% qualified rate. The code has 15, the test expects 80.

---

### **FAILURE #2: Recommended Plan updates to Starter when CV volume is low**
**File:** `04-roi-calculator.spec.ts:479`  
**Status:** ❌ FAILED

**Expected:** Plan name contains `"starter"`  
**Actual:** Plan name = `"professional"`

**Test sequence:**
```javascript
await roiPage.setInputValue(roiPage.recruiterInput, "1");
await roiPage.setInputValue(roiPage.cvsPerReqInput, "50");
// totalCvs = 1 recruiter * 5 JDs * 50 CVs = 250 CVs

const planName = await roiPage.getRecommendedPlanName();
expect(planName.toLowerCase()).toContain("starter");  // ← Expects Starter
// ← But gets Professional
```

**Plan logic in code:**
```typescript
const PLANS_LOOKUP = [
  { name: 'Starter',      monthly: 99,   annual: 990,   cvCap: 200   },
  { name: 'Professional', monthly: 499,  annual: 4990,  cvCap: 1000  },
  ...
]

const totalCvs = jdVolume * cvsPerReq  // = 1*5*50 = 250 CVs
const plan = PLANS_LOOKUP.find(p => totalCvs <= p.cvCap) ?? PLANS_LOOKUP[PLANS_LOOKUP.length - 1]
// Finds: 250 <= 200? NO. 250 <= 1000? YES → Professional
```

**Root Cause:**
- `totalCvs = 250` 
- Starter cap is 200 CVs
- 250 > 200, so Starter is skipped
- Professional cap is 1000 CVs
- 250 <= 1000, so Professional is selected (correct algorithm, but wrong test expectation)

**File Responsible:** `/app/(www)/roi/page.tsx` lines ~18-24 (PLANS_LOOKUP) and ~107-108 (plan calculation)

**Proposed Fix:**
```typescript
// Option A: Update test expectations
// If totalCvs = 250, Professional is correct (200 < 250 <= 1000)
await roiPage.setInputValue(roiPage.cvsPerReqInput, "40");
// New totalCvs = 1 * 5 * 40 = 200 CVs (exactly at Starter cap)

// Option B: Increase Starter cvCap in code
const PLANS_LOOKUP = [
  { name: 'Starter', monthly: 99, annual: 990, cvCap: 300 },  // Increase from 200
  ...
]
```

**Recommendation:** Adjust test to use `cvsPerReq: "40"` (gives 200 CVs, within Starter cap) OR increase Starter's cvCap to 300.

---

### **FAILURE #3: Recommended Plan updates to Enterprise for very high volume**
**File:** `04-roi-calculator.spec.ts:490`  
**Status:** ❌ FAILED

**Expected:** Plan name contains `"enterprise"`  
**Actual:** Plan name = `"large"`

**Test sequence:**
```javascript
await roiPage.setInputValue(roiPage.recruiterInput, "10");
await roiPage.setInputValue(roiPage.cvsPerReqInput, "500");
// totalCvs = 10 recruiters * 5 JDs * 500 CVs = 25,000 CVs

const planName = await roiPage.getRecommendedPlanName();
expect(planName.toLowerCase()).toContain("enterprise");  // ← Expects Enterprise
// ← But gets Large
```

**Plan caps in code:**
```typescript
const PLANS_LOOKUP = [
  { name: 'Starter',      cvCap: 200    },
  { name: 'Professional', cvCap: 1000   },
  { name: 'Business',     cvCap: 2000   },
  { name: 'Large',        cvCap: 6000   },
  { name: 'Ultra',        cvCap: 8000   },
  { name: 'Enterprise',   cvCap: 10000  },  // ← Highest cap
]

const totalCvs = 25000
const plan = PLANS_LOOKUP.find(p => totalCvs <= p.cvCap)
// Finds: 25000 <= 10000? NO
// No match found, so returns: PLANS_LOOKUP[PLANS_LOOKUP.length - 1] = Enterprise
```

**Wait - the logic SHOULD return Enterprise!** Let me trace carefully:

Actually the issue is:
- 25,000 CVs > 10,000 (Enterprise cap)
- `find()` returns `undefined`
- Fallback: `?? PLANS_LOOKUP[PLANS_LOOKUP.length - 1]` = Enterprise

But test gets "Large" instead. This suggests:
- Either the calculation is wrong (totalCvs != 25000)
- Or the plan lookup isn't matching

**Root Cause:** One of:
1. `jdVolume` calculation is wrong (maybe missing step)
2. The fallback isn't working
3. The `find()` is matching Large instead of returning undefined

**File Responsible:** `/app/(www)/roi/page.tsx` lines ~24-25, ~98-108

**Proposed Fix:**
Need to trace the actual calculation. Most likely the cvCap numbers are wrong or the calculation is different.

---

### **FAILURE #4: Get Started CTA navigates to signup with plan pre-selected**
**File:** `04-roi-calculator.spec.ts:516`  
**Status:** ❌ FAILED

**Expected URL:** Contains `plan=` parameter  
**Actual URL:** `http://localhost:3000/signup?section=company` (no plan param)

**Test sequence:**
```javascript
const ctaBtn = page.locator('button').filter({ hasText: /Get Started with .+ Plan/ }).first();
await ctaBtn.click();

await expect(page).toHaveURL(/\/signup/, { timeout: 10_000 });
expect(page.url()).toMatch(/[?&]plan=/);  // ← FAILS - no plan param
```

**Code in ROI page:**
```typescript
const handleSelectPlan = (planName: string) => {
  const params = new URLSearchParams({ plan: planName, billing })
  router.push(getAppUrl(`/signup?${params.toString()}`))
}
```

**Root Cause:**
- CTA button is being clicked
- But navigation URL has no `plan=` parameter
- **The `handleSelectPlan` is not being called from the button**, OR
- **The button isn't wired to call `handleSelectPlan`**

**File Responsible:** `/app/(www)/roi/page.tsx` - need to find where "Get Started with X Plan" button is rendered

**Proposed Fix:**
```typescript
// Find the "Get Started with X Plan" button in the render section
// Make sure it's calling: onClick={() => handleSelectPlan(calc.plan.name)}
<Button onClick={() => handleSelectPlan(calc.plan.name)}>
  Get Started with {calc.plan.name} Plan
</Button>
```

---

### **FAILURE #5: Billing toggle switches between Monthly and Annual pricing display**
**File:** `04-roi-calculator.spec.ts:536`  
**Status:** ❌ FAILED

**Expected CTA Text:** Contains `"billed annually"`  
**Actual CTA Text:** `"get started with professional plan ($499/mo) → "`

**Test sequence:**
```javascript
const annualBtn = page.locator('button').filter({ hasText: /^Annual/ }).first();
await annualBtn.click();  // Click Annual toggle

const ctaBtn = page.locator('button').filter({ hasText: /Get Started with .+ Plan/ }).first();
const ctaText = await ctaBtn.textContent();
expect(ctaText?.toLowerCase()).toContain("billed annually");  // ← FAILS
```

**Root Cause:**
- Billing toggle is clicked
- CTA button text doesn't update to show "billed annually"
- **The CTA button is not reactive to `billing` state change**

**File Responsible:** `/app/(www)/roi/page.tsx` - the CTA button JSX

**Proposed Fix:**
```typescript
// CTA button should show different text based on billing state
<Button>
  Get Started with {calc.plan.name} Plan
  {billing === 'annual' && ' (Billed Annually)'}
</Button>
```

---

### **FAILURE #6: ROI Insight percentage updates when inputs change**
**File:** `04-roi-calculator.spec.ts:565`  
**Status:** ❌ FAILED

**Expected:** ROI value matches regex `/%|\+/` (percentage or plus sign)  
**Actual:** Received string = `"Recommended Based on Your Volume"`

**Root Cause:**
- Test is trying to find the ROI Insight value
- Getting the wrong DOM element (a heading instead of the ROI value)
- **The `getRoiInsightValue()` locator is not finding the correct element**

**File Responsible:** 
- Test locator issue in `04-roi-calculator.spec.ts` line ~139
- OR the ROI value is not rendered in the expected location in `/app/(www)/roi/page.tsx`

**Proposed Fix:**
```typescript
// In test, fix the locator:
async getRoiInsightValue(): Promise<string> {
  // Current: looking for wrong element
  // Need to locate: the actual ROI % value in the plan recommendation section
  const roiEl = this.page.locator('[class*="text-emerald"]').filter({ hasText: /\d+%/ }).first();
  return (await roiEl.textContent() ?? '').trim();
}
```

---

### **FAILURE #7: Pricing page billing toggle switches between monthly and annual**
**File:** `04-roi-calculator.spec.ts:587`  
**Status:** ❌ FAILED

**Expected:** Locator `text=$99` visible  
**Actual:** Strict mode violation - locator resolved to 4 elements (ambiguous)

**Root Cause:**
- Multiple "$99" strings on the page (price + credits text)
- Locator is not specific enough
- **Test needs more specific selector for the price**

**File Responsible:** Test locator in `04-roi-calculator.spec.ts` line ~601

**Proposed Fix:**
```javascript
// Instead of generic text search
await expect(page.locator("text=$99")).toBeVisible();

// Use more specific selector
const starterCard = page.locator('[class*="rounded-2xl"]').filter({ hasText: /Starter/i }).first();
await expect(starterCard.locator("text=$99/month")).toBeVisible();
```

---

### **FAILURE #8: Pricing page has ROI Assessment link pointing to /roi**
**File:** `04-roi-calculator.spec.ts:606`  
**Status:** ❌ FAILED

**Expected:** Link text contains `"ROI Assessment"`  
**Actual:** Link text = `"ROI"` (missing "Assessment")

**Root Cause:**
- Navbar link says just "ROI" instead of "ROI Assessment"
- **Text content mismatch in the link**

**File Responsible:** Pricing page navbar or `/app/(www)/pricing/page.tsx`

**Proposed Fix:**
```typescript
// In the navbar or pricing page
<a href="/roi">ROI Assessment</a>  // Change from "ROI" to "ROI Assessment"
```

---

### **FAILURE #9: ROI Insight value is mathematically reasonable with defaults**
**File:** `04-roi-calculator.spec.ts:635`  
**Status:** ❌ FAILED

**Expected:** ROI value matches pattern `/^\d[\d,]*%(\+)?$/`  
**Actual:** Received string = `"Recommended Based on Your Volume"`

**Root Cause:**
- Same as Failure #6 - wrong DOM element being selected
- **The `getRoiInsightValue()` locator is not finding the ROI percentage**

**File Responsible:** Same as #6

---

### **FAILURE #10: Monthly Savings increases when hourly rate increases**
**File:** `04-roi-calculator.spec.ts:960`  
**Status:** ❌ FAILED

**Expected:** `savings50 > savings30` (should increase with higher hourly rate)  
**Actual:** `savings50 = 1513`, `savings30 = 1513` (same value!)

**Test sequence:**
```javascript
await roiPage.setInputValue(roiPage.hourlyRateInput, "30");
const savings30 = await roiPage.getMonthlySavingsValue();  // = 1513

await roiPage.setInputValue(roiPage.hourlyRateInput, "50");
const savings50 = await roiPage.getMonthlySavingsValue();  // = 1513 (same!)

expect(savings50).toBeGreaterThan(savings30);  // 1513 > 1513 = FALSE
```

**Root Cause:**
- Hourly rate change is not triggering recalculation
- Monthly Savings should increase when hourly rate increases
- **`hourlyRate` state change is not in the `useMemo` dependency array**

**File Responsible:** `/app/(www)/roi/page.tsx` line ~104-105

**Current code:**
```typescript
const calc = useMemo(() => {
  // ... calculations use hourlyRate ...
  const hCostPerReq  = hHrs * hourlyRate  // ← Uses hourlyRate
  const aCostPerReq  = aHrs * hourlyRate  // ← Uses hourlyRate
  const savings      = hMonthlyCost - aMonthlyCost  // ← Depends on above
  // ...
}, [recruiterCount, cvsPerReq, shortlistRate, qualRate, hourlyRate, workDays, dailyHours, jdVolume])
//                                                         ↑
// Wait - hourlyRate IS in dependencies!
```

**Actual issue:** The calculation itself might be wrong. Need to verify:
- Is `getMonthlySavingsValue()` reading the correct DOM value?
- Or is the calculation not updating?

**File Responsible:** `/app/(www)/roi/page.tsx` - Monthly Savings calculation

**Proposed Fix:**
Verify that:
1. Hourly rate state is updating
2. `useMemo` is recalculating (should be - hourlyRate is in deps)
3. The DOM is showing the updated value

---

### **FAILURE #11: ROI page Get Started CTA uses billing param from toggle**
**File:** `04-roi-calculator.spec.ts:1022`  
**Status:** ❌ FAILED

**Expected URL:** `/signup` with `billing=annual` param  
**Actual URL:** Stays on `/roi` (no navigation)

**Test sequence:**
```javascript
const annualBtn = page.locator('button').filter({ hasText: /^Annual/ }).first();
await annualBtn.click();  // Click Annual toggle

const ctaBtn = page.locator('button').filter({ hasText: /Get Started with .+ Plan/ }).first();
await ctaBtn.click();  // Click CTA

await expect(page).toHaveURL(/\/signup/, { timeout: 10_000 });  // ← FAILS - still on /roi
expect(page.url()).toMatch(/billing=annual/);
```

**Root Cause:**
- CTA button is not responsive to `billing` state
- OR CTA button is not calling the navigation handler
- **Same as Failure #4** - the button isn't wired up properly

**File Responsible:** `/app/(www)/roi/page.tsx` - CTA button JSX and handler

---

## Summary Table

| # | Test | Issue | Root Cause | File | Fix |
|---|------|-------|-----------|------|-----|
| 1 | Default values pre-filled | Default 15 vs expected 80 | Constants mismatch | roi/page.tsx:69 | Change test OR code to match |
| 2 | Plan updates to Starter | Gets Professional for 250 CVs | 250 > Starter cap (200) | roi/page.tsx:18-108 | Adjust test CVs or cap |
| 3 | Plan updates to Enterprise | Gets Large for 25k CVs | CVCap or calc logic issue | roi/page.tsx:24-108 | Trace calculation |
| 4 | Get Started with plan param | No plan param in URL | Button not calling handler | roi/page.tsx | Wire button to `handleSelectPlan` |
| 5 | Billing toggle CTA text | CTA doesn't show "billed annually" | Button not reactive to billing | roi/page.tsx | Update CTA text based on billing state |
| 6 | ROI Insight updates | Wrong DOM element selected | Locator issue | roi/page.tsx + test | Fix locator or rendering |
| 7 | Pricing toggle | Ambiguous price selector | Non-specific locator | test:587 | Make selector more specific |
| 8 | ROI Assessment link text | Shows "ROI" not "ROI Assessment" | Text mismatch | navbar/pricing | Change link text |
| 9 | ROI math reasonable | Wrong DOM element | Same as #6 | roi/page.tsx + test | Fix locator/rendering |
| 10 | Savings increases with rate | Both 1513 (same value) | Calculation not updating OR locator wrong | roi/page.tsx:105 | Verify calc & reading value |
| 11 | Billing param in URL | No navigation on CTA | Button not wired | roi/page.tsx | Wire button to handler |

---

## Critical Issues to Fix First

1. **Default qualified rate mismatch** (Test expects 80, code has 15) - CRITICAL
2. **CTA button not wired to navigation** (Failures #4, #11) - CRITICAL  
3. **Billing state not affecting CTA text** (Failure #5) - HIGH
4. **Monthly Savings not updating on hourly rate change** (Failure #10) - HIGH
5. **ROI Insight locator issues** (Failures #6, #9) - MEDIUM (test-only, not code)

---

## Next Steps

1. Fix the qualified rate default (15 vs 80)
2. Wire CTA buttons to `handleSelectPlan` with current billing state
3. Make CTA text reactive to billing toggle
4. Verify Monthly Savings calculation updates on hourly rate change
5. Fix test locators for ROI Insight percentage
6. Fix plan cap logic or test expectations for Starter/Enterprise plans
