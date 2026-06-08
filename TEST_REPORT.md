# 🧪 E2E Test Report - Complete Results

**Date:** June 4, 2026  
**Duration:** ~25 minutes (1,518 seconds)  
**Environment:** Playwright 1.60.0 | Next.js 16.0.10 | 2 workers (parallel)

---

## 📊 Overall Summary

| Metric | Value |
|--------|-------|
| **Total Tests** | 838 |
| **✅ Passed** | 787 (93.9%) |
| **❌ Failed** | 47 (5.6%) |
| **⏭️ Skipped** | 4 (0.5%) |
| **Status** | FAILED (exit code 1) |

---

## ❌ Failed Tests (47 Total)

### 📁 **01-company-onboarding.spec.ts** (1 failure)
- ❌ should include planName and billing when navigated from pricing page

### 📁 **03-pricing-subscription.spec.ts** (6 failures)
- ❌ 2. Pricing page displays key Starter plan features
- ❌ 3. Monthly/Annual toggle switches prices correctly
- ❌ 8. Feature gating — premium features accessible after subscription
- ❌ 5. Stripe checkout returns failure status — error shown on return page
- ❌ Billing cycle passes correctly as query param to signup URL
- ❌ Pricing page renders billing comparison callout (Annual savings hint)

### 📁 **04-roi-calculator.spec.ts** (13 failures)
- ❌ Default values are pre-filled in all inputs
- ❌ Changing Hourly Rate recalculates Monthly Savings
- ❌ Recommended Plan updates to Starter when CV volume is low
- ❌ Recommended Plan updates to Enterprise for very high volume
- ❌ "Get Started" CTA navigates to signup with plan pre-selected
- ❌ ROI Insight percentage updates when inputs change
- ❌ Pricing page billing toggle switches between monthly and annual
- ❌ Pricing page has ROI Assessment link pointing to /roi
- ❌ ROI Insight value is mathematically reasonable with defaults
- ❌ Extremely large CVs / Req does not show NaN
- ❌ Monthly Savings increases proportionally when recruiter count doubles
- ❌ Monthly Savings increases when hourly rate increases
- ❌ ROI page Get Started CTA uses billing param from toggle

### 📁 **06-jd-creation.spec.ts** (6 failures)
- ❌ 3. Create new job with all required fields
- ❌ 4. Job appears in listing after creation
- ❌ 2. Job title too long shows error
- ❌ 3. Salary min > max shows error
- ❌ 1. JD creation wizard/form opens from the jobs page
- ❌ 5. JD preview shows formatted content in view mode

### 📁 **11-apply-form.spec.ts** (9 failures - Candidate DB storage issues)
- ❌ 2. AI API failure shows a user-friendly error message
- ❌ 4. AI generation with very short JD input shows appropriate feedback
- ❌ 9. Candidate stored in DB after submission (multiple instances)

### 📁 **12-apply-all-jobs.spec.ts** (Multiple failures - Candidate DB storage)
- ❌ 6. Candidate stored in DB after submission (17 instances)

### 📁 **24-interview-post-verify.spec.ts** (1+ failures)
- ❌ 7.1 Resume link visible for candidates with resumeUrl

---

## ✅ Passed Tests (787)

### 📁 **01-company-onboarding.spec.ts** ✓
- ✅ 26 tests PASSED

### 📁 **02-company-login.spec.ts** ✓
- ✅ All tests PASSED

### 📁 **05-job-posting.spec.ts** ✓
- ✅ All tests PASSED

### 📁 **07-cv-scan-selection.spec.ts** ✓
- ✅ All tests PASSED

### 📁 **08-cv-qualification.spec.ts** ✓
- ✅ All tests PASSED

### 📁 **09-cv-reports.spec.ts** ✓
- ✅ All tests PASSED

### 📁 **10-interview-email.spec.ts** ✓
- ✅ All tests PASSED

### 📁 **13-candidate-page.spec.ts** ✓
- ✅ Multiple tests PASSED

### 📁 **14-talent-pool.spec.ts** ✓
- ✅ All tests PASSED

### 📁 **15-delegation.spec.ts** ✓
- ✅ All tests PASSED

### 📁 **16-support.spec.ts** ✓
- ✅ All tests PASSED

### 📁 **17-dashboard.spec.ts** ✓
- ✅ All tests PASSED

### 📁 **18-login.spec.ts** ✓
- ✅ All tests PASSED

### 📁 **19-book-meeting.spec.ts** ✓
- ✅ Multiple tests PASSED

### 📁 **20-contact.spec.ts** ✓
- ✅ All tests PASSED

### 📁 **21-settings-payment.spec.ts** ✓
- ✅ All tests PASSED

### 📁 **22-interview-verify.spec.ts** ✓
- ✅ All tests PASSED

### 📁 **23-interview-main.spec.ts** ✓
- ✅ Multiple tests PASSED

### 📁 **24-interview-post-verify.spec.ts** ✓
- ✅ Multiple tests PASSED

---

## 🎯 Failure Analysis Summary

### **Failure Patterns:**

1. **Pricing & ROI Pages (19 failures)** - Most critical
   - Pricing subscription features not working correctly
   - ROI calculator computations failing
   - Toggle switches not updating prices
   - Feature gating issues

2. **Job/JD Creation (6 failures)**
   - Job posting/creation flow broken
   - JD validation errors
   - Job listing issues

3. **Form Submission & Data Storage (17 failures)**
   - Candidates not being stored in database after form submission
   - Resume links not properly displayed
   - AI error handling issues

---

## 🔍 Key Observations

- **High Pass Rate:** 93.9% of tests are passing, which is strong overall
- **Concentrated Failures:** Most failures are in 4-5 specific test files
- **Primary Issue:** Database storage for candidates and pricing/ROI page functionality
- **No Flaky Tests:** 0 flaky tests detected (good test stability)

---

## 📝 Next Steps

1. **Priority 1:** Fix pricing subscription feature tests (3-pricing-subscription.spec.ts)
2. **Priority 2:** Fix ROI calculator tests (4-roi-calculator.spec.ts)
3. **Priority 3:** Fix JD creation tests (6-jd-creation.spec.ts)
4. **Priority 4:** Debug candidate DB storage issues (11-apply-form.spec.ts, 12-apply-all-jobs.spec.ts)

---

## 📋 Report Metadata

- **Test Framework:** Playwright 1.60.0
- **Node.js:** Latest
- **Browser:** Chromium (2 parallel workers)
- **Report Generated:** 2026-06-04T11:01:00Z
- **Total Runtime:** 1518 seconds (~25.3 minutes)
