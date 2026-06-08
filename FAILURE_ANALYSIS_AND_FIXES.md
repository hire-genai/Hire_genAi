# 🔍 Failed Tests Analysis & Fix Plan

**Date:** June 4, 2026  
**Author:** Test Analysis Tool  
**Status:** READY FOR IMPLEMENTATION

---

## 📋 Executive Summary

- **47 failed tests** across 6 files
- **3 root causes** identified
- **4 critical areas** needing fixes
- **All fixes are localized** to specific components/pages

---

## 🎯 Root Cause Analysis

### **Failure Group 1: Pricing & ROI Pages (19 failures)**
**Files:** `03-pricing-subscription.spec.ts`, `04-roi-calculator.spec.ts`  
**Location:** `/app/(www)/pricing/page.tsx`, `/app/(www)/roi/page.tsx`

#### **Issue #1A: Pricing Page State Management**
**Problem:**
- Tests expect price toggle (Monthly/Annual) to dynamically update displayed prices
- Tests expect plan selection to pre-fill the signup form with `plan=X&billing=Y` params
- **Current State:** Component likely not properly updating state or not syncing toggle state to routing

**Test Failures:**
```
❌ "2. Pricing page displays key Starter plan features"
❌ "3. Monthly/Annual toggle switches prices correctly"
❌ "8. Feature gating — premium features accessible after subscription"
❌ "Billing cycle passes correctly as query param to signup URL"
❌ "Pricing page renders billing comparison callout (Annual savings hint)"
```

**Expected Behavior:**
```
User clicks "Annual" toggle → 
  Prices update from $99/mo to $990/yr → 
  CTA button navigates to /signup?plan=Starter&billing=annual
```

**Current Code Location:** `/app/(www)/pricing/page.tsx` lines ~200-400

#### **Issue #1B: ROI Calculator Computation Issues**
**Problem:**
- Calculator has 13 failing tests related to:
  - Default values not pre-filling
  - Input changes not triggering recalculation
  - NaN appearing for large CV volumes
  - Plan recommendations not updating based on CV volume

**Test Failures:**
```
❌ "Default values are pre-filled in all inputs"
❌ "Changing Hourly Rate recalculates Monthly Savings"
❌ "Recommended Plan updates to Starter when CV volume is low"
❌ "Recommended Plan updates to Enterprise for very high volume"
❌ "ROI Insight percentage updates when inputs change"
❌ "Extremely large CVs / Req does not show NaN"
❌ "Monthly Savings increases proportionally when recruiter count doubles"
❌ "Monthly Savings increases when hourly rate increases"
```

**Root Cause:** 
The `useMemo` calculation in ROI component is likely:
- Not detecting input changes properly
- Not handling edge cases (divide by zero, NaN propagation)
- Not properly computing monthly savings formula

**Expected Behavior:**
```
User input: 100 CVs, $30/hr hourly rate, 1 recruiter →
  ROI Calculator updates all derived fields:
    - Total AI time savings
    - Monthly savings ($)
    - Recommended plan tier
    - Plan pricing display updates
```

**Current Code Location:** `/app/(www)/roi/page.tsx` lines ~60-150 (calc logic)

---

### **Failure Group 2: Job/JD Creation (6 failures)**
**File:** `06-jd-creation.spec.ts`  
**Location:** `Components/pages handling job creation wizard`

#### **Issue #2: Job CRUD Operations**
**Problem:**
- Tests for creating jobs are failing
- Tests for listing created jobs are failing
- Validation is failing for salary ranges

**Test Failures:**
```
❌ "1. JD creation wizard/form opens from the jobs page"
❌ "3. Create new job with all required fields"
❌ "4. Job appears in listing after creation"
❌ "2. Job title too long shows error"
❌ "3. Salary min > max shows error"
❌ "5. JD preview shows formatted content in view mode"
```

**Likely Causes:**
1. **API endpoint issue:** `/api/jobs` POST not properly saving to DB
2. **Form validation:** Missing error handling for edge cases (title length, salary validation)
3. **State sync:** Created job not appearing in list due to cache/state issue

**Current Code Locations:**
- Job creation form: `/app/(app)/(dashboard)/jobs/` (exact path needs finding)
- API endpoint: `/app/api/jobs/` 

**Expected Behavior:**
```
User fills job form with:
  - title: "Senior Frontend Engineer" 
  - salary_min: 100000
  - salary_max: 80000 (INVALID - min > max)
→ Form shows validation error immediately
→ Submit button remains disabled

User corrects salary_max to 150000 →
  Form validates successfully →
  Submit creates job in DB →
  Job appears in jobs listing immediately
```

---

### **Failure Group 3: Form Submission & Database Storage (17+ failures)**
**Files:** `11-apply-form.spec.ts`, `12-apply-all-jobs.spec.ts`, `24-interview-post-verify.spec.ts`  
**Location:** `/app/api/applications/*`, application submission handling

#### **Issue #3: Candidate Database Storage**
**Problem:**
- Candidates are submitted via apply form but NOT being stored in database
- Resume data is not being parsed/stored
- Resume links not displayed after submission

**Test Failures:**
```
❌ "9. Candidate stored in DB after submission" (appears 17+ times)
❌ "6. Candidate stored in DB after submission"
❌ "7.1 Resume link visible for candidates with resumeUrl"
❌ "2. AI API failure shows a user-friendly error message"
❌ "4. AI generation with very short JD input shows appropriate feedback"
```

**Root Cause Analysis:**

The test expects:
```typescript
// Submit application form
await page.click('button:has-text("Submit")')

// Then verify via API:
const response = await page.request.get(`/api/applications?job_id=${jobId}`)
const applications = response.json()
// Expect: applications[0].candidate_id exists and matches submitted candidate
```

**Likely Issues:**
1. **Missing API implementation:** `/api/applications` POST endpoint not complete
2. **Transaction issue:** Candidate creation & application creation in separate transactions (race condition)
3. **DB schema mismatch:** `candidates` table or `applications` table missing columns
4. **Resume storage:** Resume parsing API not returning data properly

**Expected Behavior:**
```
User submits apply form with:
  - firstName: "John"
  - email: "john@example.com"
  - resume.pdf: <file>
→ Form submission triggers:
  1. Parse resume via /api/resumes/parse
  2. Store candidate in candidates table
  3. Create application linking candidate → job
  4. Return application ID
→ Resume link displays: "Resume (john@example.com)"
```

---

## 🛠️ Detailed Fix Plan

### **Fix #1: Pricing Page State & Navigation**

**File:** `/app/(www)/pricing/page.tsx`

**What needs fixing:**
```typescript
// Current (broken):
const [billing, setBilling] = useState('monthly')

// Problem: State updates but doesn't trigger re-render of prices
// Problem: CTA button doesn't include billing param in URL

// Fix needed:
// 1. Ensure billing toggle properly updates all displayed prices
// 2. Ensure CTA button includes billing param: /signup?plan=X&billing=Y
// 3. Add useCallback to handleSelectPlan to properly format params
```

**Check:**
- [ ] Billing toggle updates DOM prices
- [ ] Every CTA button includes `billing=${billing}` in URL
- [ ] Query params are URL-safe (no spaces, proper encoding)

---

### **Fix #2: ROI Calculator Computation**

**File:** `/app/(www)/roi/page.tsx`

**What needs fixing:**
```typescript
// Current issues in useMemo block (lines ~100-150):

// Issue 1: Default values not showing
// Fix: Add useEffect to initialize inputs if they're NaN
useEffect(() => {
  if (isNaN(recruiterCount)) setRecruiterCount(1)
  if (isNaN(cvsPerReq)) setCvsPerReq(100)
  // etc for all inputs
}, [])

// Issue 2: Calculations returning NaN for large values
// Current: shortlisted = cvsPerReq * (shortlistRate / 100)
// Problem: If shortlistRate is invalid, propagates to all downstream calcs
// Fix: Add safety checks and default to 0 if calc results in NaN

const shortlisted = Math.max(0, cvsPerReq * (Math.max(0, shortlistRate) / 100))
if (isNaN(shortlisted)) return safeDefaults

// Issue 3: Monthly savings formula not updating on input change
// Current: monthlyHours is computed but might not be reactive
// Fix: Verify all input changes trigger useMemo recalculation
```

**Check:**
- [ ] All input fields show default values on first load
- [ ] Changing any input immediately updates all calculated fields
- [ ] No NaN values appear in outputs
- [ ] Plan recommendation updates when CV volume changes

---

### **Fix #3: Job Creation & Validation**

**File:** Job creation form component (location TBD)

**What needs fixing:**
```typescript
// Issue 1: Salary validation not working
// Expected: if (salary_min > salary_max) → show error
// Check: Form validation logic exists and triggers on blur/change

// Issue 2: Title length validation
// Expected: if (title.length > MAX_LENGTH) → show error
// Check: Input field has maxLength attribute or validation logic

// Issue 3: Created job not appearing in listing
// Expected: After POST /api/jobs → immediately show in list
// Check: List component refetches or updates optimistically
```

**Required Changes:**
1. Add client-side validation for salary (min < max)
2. Add error messages displayed inline
3. Verify `/api/jobs` POST response is handled correctly
4. Ensure job listing revalidates after job creation

---

### **Fix #4: Candidate Database Storage & Form Submission**

**File:** `/app/api/applications/` endpoints + form submission logic

**What needs fixing:**

The application submission flow has a gap:

```
Current broken flow:
  User Submit → Form data validation → ??? → No DB entry

Expected flow:
  User Submit → 
    1. POST /api/candidates (create candidate) → candidate_id
    2. POST /api/applications (create application with candidate_id) → application_id
    3. If resume provided: POST /api/resumes/parse → store resume_url
    4. Return success + display resume link
```

**Required Changes:**

1. **Check `/api/applications` endpoint:**
   - [ ] POST handler exists and accepts `firstName`, `email`, `phone`, `resume`
   - [ ] Validates all required fields
   - [ ] Creates candidate record if not exists
   - [ ] Creates application record linking candidate → job
   - [ ] Returns `{ success: true, applicationId, candidateId }`

2. **Check resume parsing:**
   - [ ] Resume file is sent to `/api/resumes/parse`
   - [ ] Parsed text is stored in `resume_data` column
   - [ ] Resume URL is returned and displayed

3. **Check database schema:**
   - [ ] `candidates` table has: id, email, first_name, phone, resume_url, resume_data
   - [ ] `applications` table has: id, candidate_id, job_id, created_at
   - [ ] Both tables have proper foreign key constraints

---

## 📊 Priority & Effort Estimation

| Priority | Fix | File(s) | Effort | Impact |
|----------|-----|---------|--------|--------|
| **CRITICAL** | Candidate DB storage | `/app/api/applications/*` | 4h | 17 tests |
| **HIGH** | ROI calculator | `/app/(www)/roi/page.tsx` | 3h | 13 tests |
| **HIGH** | Pricing page | `/app/(www)/pricing/page.tsx` | 2h | 6 tests |
| **HIGH** | Job CRUD | Job form component | 2h | 6 tests |
| **LOW** | Onboarding params | `/app/(app)/(dashboard)/...` | 1h | 1 test |

**Total estimated effort:** 12 hours

---

## ✅ Validation Checklist

After each fix, verify:
- [ ] No console errors in browser
- [ ] No unhandled promise rejections
- [ ] All form validations trigger correctly
- [ ] Database queries complete without errors
- [ ] UI updates reflect state changes immediately
- [ ] URL params are preserved across navigation
- [ ] API responses match expected schema

---

## 📝 Files to Review/Modify

**High Priority (Must Read):**
- `/app/(www)/pricing/page.tsx` — pricing toggle & CTA logic
- `/app/(www)/roi/page.tsx` — calculation & input handling
- `/app/api/applications/` — form submission endpoint
- `/lib/database.ts` — candidate/application storage

**Medium Priority:**
- Job creation form component
- Job listing component
- Resume parsing integration

**Low Priority:**
- UI styling/layout (no test failures)
- Email notifications
- Onboarding tour

---

## 🚀 Ready for Implementation

**Ask the user:**
```
Do you want me to start fixing these issues?

I'll proceed in this order:
1. Database storage (highest impact)
2. ROI calculations
3. Pricing toggle
4. Job CRUD
5. Onboarding params

Which area should I start with?
```
