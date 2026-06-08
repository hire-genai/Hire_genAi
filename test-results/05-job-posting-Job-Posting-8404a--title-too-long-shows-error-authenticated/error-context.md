# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 05-job-posting.spec.ts >> Job Posting — Negative Scenarios >> 2. Job title too long shows error
- Location: tests\e2e\05-job-posting.spec.ts:924:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.goto: Test timeout of 30000ms exceeded.
Call log:
  - navigating to "http://localhost:3000/", waiting until "load"

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - banner [ref=e4]:
      - generic [ref=e6]:
        - generic [ref=e7]:
          - heading "HireGenAI" [level=1] [ref=e9]
          - navigation [ref=e10]:
            - link "Product" [ref=e11] [cursor=pointer]:
              - /url: /demo-en
            - link "Pricing" [ref=e12] [cursor=pointer]:
              - /url: /pricing
            - link "ROI" [ref=e13] [cursor=pointer]:
              - /url: /roi
            - link "Company" [ref=e14] [cursor=pointer]:
              - /url: /about
        - generic [ref=e15]:
          - link "Login" [ref=e16] [cursor=pointer]:
            - /url: /login
            - button "Login" [ref=e17]
          - link "Get started" [ref=e18] [cursor=pointer]:
            - /url: /signup
            - button "Get started" [ref=e19]
    - generic [ref=e23]:
      - img [ref=e24]
      - generic [ref=e26]: HireGenAI Launches All-New AI-Powered Recruitment Suite
    - generic [ref=e30]:
      - 'heading "AI-Recruiter: Your 24/7 Screening Partner" [level=1] [ref=e31]'
      - paragraph [ref=e32]: Automate the most time-consuming parts of your recruitment funnel. Focus on the top 60% of qualified candidates while AI handles the rest.
      - generic [ref=e33]:
        - link "Explore the Benefits" [ref=e34] [cursor=pointer]:
          - /url: /roi
        - link "Try Demo" [ref=e35] [cursor=pointer]:
          - /url: /demo-en
          - img
          - text: Try Demo
    - generic [ref=e43]:
      - generic [ref=e44]:
        - generic [ref=e45]: AI-Powered Recruitment
        - heading "Feeling Frustrated That You're Not Finding Quality Candidates Even Though You're Spending Hours Screening?" [level=1] [ref=e46]
        - paragraph [ref=e47]: Answer 10 questions to find out why you're experiencing this frustration and get your personalized report.
        - generic [ref=e48]:
          - generic [ref=e49]:
            - img [ref=e51]
            - generic [ref=e53]:
              - strong [ref=e54]: Get your personalized score
              - paragraph [ref=e55]: See how your recruitment process compares to industry standards
          - generic [ref=e56]:
            - img [ref=e58]
            - generic [ref=e60]:
              - strong [ref=e61]: Receive custom recommendations
              - paragraph [ref=e62]: Get actionable insights to improve your hiring efficiency
          - generic [ref=e63]:
            - img [ref=e65]
            - generic [ref=e67]:
              - strong [ref=e68]: Learn time-saving strategies
              - paragraph [ref=e69]: Discover how to automate screening and save hours each week
      - generic [ref=e71]:
        - generic [ref=e72]:
          - heading "Recruitment Efficiency Assessment" [level=2] [ref=e73]
          - paragraph [ref=e74]: Answer 10 questions to get your personalized report
        - generic [ref=e77]:
          - heading "Let's get started with your contact information" [level=3] [ref=e78]
          - generic [ref=e79]:
            - generic [ref=e80]: Full Name
            - textbox "Full Name" [ref=e81]
          - generic [ref=e82]:
            - generic [ref=e83]: Work Email
            - textbox "Work Email" [ref=e84]
          - generic [ref=e85]:
            - generic [ref=e86]: Company Name
            - textbox "Company Name" [ref=e87]
          - generic [ref=e88]:
            - generic [ref=e89]: Phone Number (Optional)
            - textbox "Phone Number (Optional)" [ref=e90]
        - generic [ref=e91]:
          - button "Previous" [disabled]:
            - img
            - text: Previous
          - button "Start Assessment" [disabled]:
            - text: Start Assessment
            - img
    - generic [ref=e93]:
      - generic [ref=e94]:
        - heading "Everything you need for modern recruitment" [level=2] [ref=e95]
        - paragraph [ref=e96]: Our comprehensive AI-powered platform handles every aspect of your hiring process, from job posting to final decision-making.
      - generic [ref=e97]:
        - generic [ref=e99]:
          - img [ref=e101]
          - heading "Intelligent CV Parsing" [level=3] [ref=e104]
          - paragraph [ref=e105]: Instantly scans and scores all incoming CVs against your job description. Identifies key skills, experience, and qualifications with over 95% accuracy.
        - generic [ref=e107]:
          - img [ref=e109]
          - heading "AI-Powered Initial Interview" [level=3] [ref=e119]
          - paragraph [ref=e120]: Engages qualified candidates in natural, conversational video interviews. Asks role-specific questions and analyzes responses for content, communication skills, and cultural fit.
        - generic [ref=e122]:
          - img [ref=e124]
          - heading "Data-Driven Shortlisting" [level=3] [ref=e126]
          - paragraph [ref=e127]: Provides a ranked shortlist of the top 60% of candidates who are genuinely qualified and interested. Delivers detailed reports and video clips for efficient review.
        - generic [ref=e129]:
          - img [ref=e131]
          - heading "Advanced Analytics" [level=3] [ref=e133]
          - paragraph [ref=e134]: Real-time insights into your hiring pipeline with predictive analytics and performance metrics.
    - generic [ref=e136]:
      - generic [ref=e137]:
        - heading "Traditional Recruitment Is Holding You Back" [level=2] [ref=e138]
        - paragraph [ref=e139]: Every day you wait, top talent slips away to faster competitors. Here's what's really costing you.
      - generic [ref=e140]:
        - generic [ref=e141]:
          - img [ref=e143]
          - heading "Slow & Inefficient" [level=3] [ref=e146]
          - paragraph [ref=e147]: Manual resume screening and scheduling create bottlenecks that stretch hiring cycles to 40+ days, causing you to lose top candidates to faster competitors.
        - generic [ref=e148]:
          - img [ref=e150]
          - heading "Expensive & Resource-Heavy" [level=3] [ref=e152]
          - paragraph [ref=e153]: Labor-intensive processes drain your budget with high cost-per-hire and dependency on external agencies, while your HR team drowns in administrative work.
        - generic [ref=e154]:
          - img [ref=e156]
          - heading "Limited & Biased" [level=3] [ref=e161]
          - paragraph [ref=e162]: Human limitations restrict your reach to active applicants only, while unconscious bias compromises diversity goals and leads to poor hiring decisions.
    - generic [ref=e164]:
      - generic [ref=e165]:
        - 'heading "AI Recruitment: The Complete Hiring Transformation" [level=2] [ref=e166]'
        - paragraph [ref=e167]: Our platform combines cutting-edge artificial intelligence with human expertise to deliver unprecedented hiring results.
      - generic [ref=e168]:
        - generic [ref=e169]:
          - generic [ref=e170]: ⚡
          - heading "Lightning-Fast Hiring" [level=3] [ref=e171]
          - paragraph [ref=e172]: Reduce time-to-hire from 40 days to just 4-11 days
          - paragraph [ref=e173]: Automate resume screening, candidate ranking, and interview scheduling in minutes. Fill critical roles before your competition even starts searching.
        - generic [ref=e174]:
          - generic [ref=e175]: 💰
          - heading "Dramatic Cost Savings" [level=3] [ref=e176]
          - paragraph [ref=e177]: Cut recruitment costs by 20-50%
          - paragraph [ref=e178]: Eliminate manual labor expenses, reduce agency dependency, and decrease turnover through superior candidate matching—delivering measurable ROI from day one.
        - generic [ref=e179]:
          - generic [ref=e180]: 🌐
          - heading "Unlimited Scalability" [level=3] [ref=e181]
          - paragraph [ref=e182]: Handle thousands of applications 24/7
          - paragraph [ref=e183]: Process high-volume hiring periods effortlessly without adding HR headcount. Our AI never sleeps, never tires, and scales instantly with your growth.
        - generic [ref=e184]:
          - generic [ref=e185]: 🎯
          - heading "Data-Driven Precision" [level=3] [ref=e186]
          - paragraph [ref=e187]: Match candidates with predictive accuracy
          - paragraph [ref=e188]: Advanced algorithms analyze skills, experience, and historical performance data to identify candidates most likely to succeed and stay long-term.
        - generic [ref=e189]:
          - generic [ref=e190]: 🤝
          - heading "Diversity & Fairness" [level=3] [ref=e191]
          - paragraph [ref=e192]: Reduce unconscious bias by design
          - paragraph [ref=e193]: Evaluate candidates on objective criteria—skills, qualifications, and potential—rather than demographics, helping you build truly diverse teams.
        - generic [ref=e194]:
          - generic [ref=e195]: 🔍
          - heading "Proactive Talent Discovery" [level=3] [ref=e196]
          - paragraph [ref=e197]: Access passive candidates automatically
          - paragraph [ref=e198]: Our AI actively searches internal and external databases to find qualified professionals who aren't actively job hunting, expanding your talent pool exponentially.
    - generic [ref=e200]:
      - generic [ref=e201]:
        - paragraph [ref=e202]: FOR COMPANIES
        - heading "Transform Your Hiring Outcomes" [level=2] [ref=e203]
      - generic [ref=e204]:
        - generic [ref=e206]:
          - img [ref=e208]
          - generic [ref=e210]:
            - heading "Build Better Teams, Faster" [level=3] [ref=e211]
            - paragraph [ref=e212]: Fill critical positions 4x faster than traditional methods, minimizing productivity losses and keeping projects on track.
        - generic [ref=e214]:
          - img [ref=e216]
          - generic [ref=e218]:
            - heading "Hire Smarter, Not Harder" [level=3] [ref=e219]
            - paragraph [ref=e220]: Our AI-powered screening analyzes candidate qualifications and experience to identify top performers, significantly improving quality of hire and reducing costly turnover.
        - generic [ref=e222]:
          - img [ref=e224]
          - generic [ref=e227]:
            - heading "Grow Without Growing Pains" [level=3] [ref=e228]
            - paragraph [ref=e229]: Scale your hiring seamlessly during growth periods or seasonal peaks without proportionally increasing your HR budget or headcount.
        - generic [ref=e231]:
          - img [ref=e233]
          - generic [ref=e238]:
            - heading "Champion Real Diversity" [level=3] [ref=e239]
            - paragraph [ref=e240]: Move beyond good intentions to measurable results with bias-reduced screening that evaluates candidates fairly and objectively.
    - generic [ref=e242]:
      - generic [ref=e243]:
        - paragraph [ref=e244]: FOR HR TEAMS & RECRUITERS
        - heading "Elevate Your Impact, Reclaim Your Time" [level=2] [ref=e245]
      - generic [ref=e246]:
        - generic [ref=e247]:
          - generic [ref=e248]: 🎯
          - heading "Focus on What Matters" [level=3] [ref=e249]
          - paragraph [ref=e250]: Eliminate 70% of administrative work—resume screening, data entry, scheduling—and dedicate your expertise to relationship-building, cultural assessment, and strategic planning.
        - generic [ref=e251]:
          - generic [ref=e252]: 📊
          - heading "Make Better Decisions" [level=3] [ref=e253]
          - paragraph [ref=e254]: Access data-driven insights and predictive analytics that complement your intuition, helping you identify top talent with confidence.
        - generic [ref=e255]:
          - generic [ref=e256]: 💬
          - heading "Delight Every Candidate" [level=3] [ref=e257]
          - paragraph [ref=e258]: AI-powered chatbots provide instant, 24/7 responses and updates, creating a positive candidate experience that strengthens your employer brand.
        - generic [ref=e259]:
          - generic [ref=e260]: 🚀
          - heading "Multiply Your Productivity" [level=3] [ref=e261]
          - paragraph [ref=e262]: Manage more requisitions and candidates simultaneously without sacrificing quality, making you a more valuable strategic partner to your organization.
        - generic [ref=e263]:
          - generic [ref=e264]: 💎
          - heading "Discover Hidden Talent" [level=3] [ref=e265]
          - paragraph [ref=e266]: Proactively identify qualified passive candidates who would never have applied, giving you access to talent your competitors don't even know exists.
    - generic [ref=e268]:
      - generic [ref=e269]:
        - heading "See The Difference AI Makes" [level=2] [ref=e270]
        - paragraph [ref=e271]: Compare traditional recruitment with HireGenAI and see why leading companies are making the switch.
      - generic [ref=e273]:
        - generic [ref=e274]:
          - heading "What Matters Most" [level=3] [ref=e276]
          - heading "With HireGenAI" [level=3] [ref=e278]
          - heading "Traditional Approach" [level=3] [ref=e280]
        - generic [ref=e281]:
          - heading "Speed" [level=4] [ref=e283]
          - paragraph [ref=e285]:
            - img [ref=e286]
            - text: 4-11 days
          - paragraph [ref=e289]:
            - img [ref=e290]
            - text: 40+ days
        - generic [ref=e293]:
          - heading "Cost Per Hire" [level=4] [ref=e295]
          - paragraph [ref=e297]: 💰 20-50% lower
          - paragraph [ref=e299]: 💸 Significantly higher
        - generic [ref=e300]:
          - heading "Volume Capacity" [level=4] [ref=e302]
          - paragraph [ref=e304]: 🚀 Thousands 24/7
          - paragraph [ref=e306]: 👥 Limited by staff
        - generic [ref=e307]:
          - heading "Consistency" [level=4] [ref=e309]
          - paragraph [ref=e311]: ✅ Same criteria for all
          - paragraph [ref=e313]: ❌ Varies by recruiter
        - generic [ref=e314]:
          - heading "Candidate Reach" [level=4] [ref=e316]
          - paragraph [ref=e318]: 🌍 Active + passive
          - paragraph [ref=e320]: 📝 Active only
        - generic [ref=e321]:
          - heading "Scalability" [level=4] [ref=e323]
          - paragraph [ref=e325]: ♾️ Instant, unlimited
          - paragraph [ref=e327]: ⚠️ Requires more staff
        - generic [ref=e328]:
          - heading "Bias Reduction" [level=4] [ref=e330]
          - paragraph [ref=e332]: 🎯 Objective, skills-focused
          - paragraph [ref=e334]: ⚠️ Unconscious bias
    - generic [ref=e336]:
      - generic [ref=e337]:
        - heading "Frequently Asked Questions" [level=2] [ref=e338]
        - paragraph [ref=e339]: Everything you need to know about HireGenAI
      - generic [ref=e342]:
        - heading "What is the HireGenAI, and how does it work?" [level=3] [ref=e344]:
          - button "What is the HireGenAI, and how does it work?" [ref=e345] [cursor=pointer]:
            - generic [ref=e346]: What is the HireGenAI, and how does it work?
            - img
        - heading "How does it accelerate my hiring process?" [level=3] [ref=e348]:
          - button "How does it accelerate my hiring process?" [ref=e349] [cursor=pointer]:
            - generic [ref=e350]: How does it accelerate my hiring process?
            - img
        - heading "Will the HireGenAI replace my recruiter?" [level=3] [ref=e352]:
          - button "Will the HireGenAI replace my recruiter?" [ref=e353] [cursor=pointer]:
            - generic [ref=e354]: Will the HireGenAI replace my recruiter?
            - img
        - heading "What kind of roles can HireGenAI screen for?" [level=3] [ref=e356]:
          - button "What kind of roles can HireGenAI screen for?" [ref=e357] [cursor=pointer]:
            - generic [ref=e358]: What kind of roles can HireGenAI screen for?
            - img
        - heading "Can HireGenAI integrate with our existing hiring processes?" [level=3] [ref=e360]:
          - button "Can HireGenAI integrate with our existing hiring processes?" [ref=e361] [cursor=pointer]:
            - generic [ref=e362]: Can HireGenAI integrate with our existing hiring processes?
            - img
        - heading "How do I get started?" [level=3] [ref=e364]:
          - button "How do I get started?" [ref=e365] [cursor=pointer]:
            - generic [ref=e366]: How do I get started?
            - img
    - generic [ref=e368]:
      - heading "Ready to revolutionize your hiring?" [level=2] [ref=e369]
      - paragraph [ref=e370]: Join thousands of companies already using AI to hire better, faster, and smarter.
      - generic [ref=e371]:
        - link "View pricing" [ref=e372] [cursor=pointer]:
          - /url: /pricing
          - text: View pricing
          - img
        - link "Try demo" [ref=e373] [cursor=pointer]:
          - /url: /demo-en
    - contentinfo [ref=e374]:
      - generic [ref=e375]:
        - generic [ref=e376]:
          - generic [ref=e377]:
            - heading "HireGenAI" [level=3] [ref=e378]
            - paragraph [ref=e379]: By SKYGENAI
            - paragraph [ref=e380]: HireGenAI pre-screens and interviews candidates, helping you shortlist talent 20x faster and more efficiently.
            - paragraph [ref=e381]:
              - text: "Email:"
              - link "support@hire-genai.com" [ref=e382] [cursor=pointer]:
                - /url: mailto:support@hire-genai.com
            - generic [ref=e383]:
              - link [ref=e384] [cursor=pointer]:
                - /url: "#"
                - img [ref=e385]
              - link [ref=e387] [cursor=pointer]:
                - /url: "#"
                - img [ref=e388]
              - link [ref=e391] [cursor=pointer]:
                - /url: "#"
                - img [ref=e392]
              - link [ref=e395] [cursor=pointer]:
                - /url: https://www.linkedin.com/company/hire-genai
                - img [ref=e396]
          - generic [ref=e400]:
            - heading "Product" [level=4] [ref=e401]
            - list [ref=e402]:
              - listitem [ref=e403]:
                - link "Try the Demo" [ref=e404] [cursor=pointer]:
                  - /url: /demo-en
              - listitem [ref=e405]:
                - link "Pricing" [ref=e406] [cursor=pointer]:
                  - /url: /pricing
              - listitem [ref=e407]:
                - button "Assessment" [ref=e408] [cursor=pointer]
              - listitem [ref=e409]:
                - button "FAQs" [ref=e410] [cursor=pointer]
          - generic [ref=e411]:
            - heading "Company" [level=4] [ref=e412]
            - list [ref=e413]:
              - listitem [ref=e414]:
                - link "About us" [ref=e415] [cursor=pointer]:
                  - /url: /about
              - listitem [ref=e416]:
                - link "Contact" [ref=e417] [cursor=pointer]:
                  - /url: /contact
              - listitem [ref=e418]:
                - link "Book a Meeting" [ref=e419] [cursor=pointer]:
                  - /url: /book-meeting
              - listitem [ref=e420]:
                - link "Admin" [ref=e421] [cursor=pointer]:
                  - /url: /owner-login
          - generic [ref=e422]:
            - heading "Legal" [level=4] [ref=e423]
            - list [ref=e424]:
              - listitem [ref=e425]:
                - link "Privacy Policy" [ref=e426] [cursor=pointer]:
                  - /url: /privacy
              - listitem [ref=e427]:
                - link "Terms and Conditions" [ref=e428] [cursor=pointer]:
                  - /url: /terms
          - generic [ref=e430]:
            - generic [ref=e431]:
              - paragraph [ref=e432]: Trustpilot
              - generic [ref=e433]:
                - img [ref=e434]
                - img [ref=e436]
                - img [ref=e438]
                - img [ref=e440]
                - img [ref=e442]
              - paragraph [ref=e444]: TrustScore 4.5
            - generic [ref=e445]:
              - generic [ref=e446]:
                - img [ref=e447]
                - paragraph [ref=e450]: GDPR COMPLIANT
              - paragraph [ref=e451]: Your data is secure and compliant
        - paragraph [ref=e453]: © 2025 HireGenAI. All rights reserved.
  - region "Notifications (F8)":
    - list
  - button "Open Next.js Dev Tools" [ref=e459] [cursor=pointer]:
    - img [ref=e460]
  - alert [ref=e463]
```

# Test source

```ts
  844  | test.describe("Job Posting — Negative Scenarios", () => {
  845  |   // ── 1. Required fields validation ─────────────────────────────────────────
  846  | 
  847  |   test("1. Create job without required fields shows validation", async ({ page }) => {
  848  |     await mockAllBackgroundEndpoints(page);
  849  |     await mockGetJobs(page, ALL_FIXTURE_JOBS);
  850  | 
  851  |     // Mock POST to return a validation error
  852  |     await page.route("**/api/jobs", async (route: Route) => {
  853  |       if (route.request().method() === "POST") {
  854  |         await route.fulfill({
  855  |           status: 400,
  856  |           contentType: "application/json",
  857  |           body: JSON.stringify({
  858  |             ok: false,
  859  |             error: "Validation failed: Job title is required.",
  860  |           }),
  861  |         });
  862  |       } else {
  863  |         await route.continue();
  864  |       }
  865  |     });
  866  | 
  867  |     await page.goto("/");
  868  |     await injectAuthSession(page);
  869  |     const jobsPage = new JobsPage(page);
  870  |     await jobsPage.goto();
  871  | 
  872  |     // Open the form
  873  |     await jobsPage.openNewJobForm();
  874  |     await jobsPage.expectFormVisible();
  875  | 
  876  |     // Attempt to publish WITHOUT filling any required fields
  877  |     // Try clicking Publish — the form should block submission or show errors
  878  |     const publishButton = page.getByRole("button", { name: /Publish Job/i }).first();
  879  |     const publishVisible = await publishButton.isVisible().catch(() => false);
  880  | 
  881  |     if (publishVisible) {
  882  |       await publishButton.click();
  883  |     } else {
  884  |       // Try submitting via Save as Draft
  885  |       const draftButton = page.getByRole("button", { name: /Save as Draft/i }).first();
  886  |       await draftButton.click().catch(() => {});
  887  |     }
  888  | 
  889  |     await page.waitForTimeout(800);
  890  | 
  891  |     // Either client-side HTML5 validation (native browser), an inline error
  892  |     // message, or a server-returned error toast should be visible.
  893  |     const hasError = await page.evaluate(() => {
  894  |       // Check if any required input is flagged as invalid (HTML5 validation)
  895  |       const inputs = document.querySelectorAll("input[required], textarea[required]");
  896  |       for (const input of Array.from(inputs)) {
  897  |         if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
  898  |           if (!input.validity.valid) return true;
  899  |         }
  900  |       }
  901  |       return false;
  902  |     });
  903  | 
  904  |     const hasErrorText = await page
  905  |       .locator("[role='alert'], .text-destructive, .text-red-500, .text-red-600")
  906  |       .first()
  907  |       .isVisible()
  908  |       .catch(() => false);
  909  | 
  910  |     const hasToastError = await page
  911  |       .getByText(/required|validation|error/i)
  912  |       .first()
  913  |       .isVisible()
  914  |       .catch(() => false);
  915  | 
  916  |     expect(
  917  |       hasError || hasErrorText || hasToastError,
  918  |       "Expected a validation error when submitting empty required fields"
  919  |     ).toBe(true);
  920  |   });
  921  | 
  922  |   // ── 2. Job title too long ─────────────────────────────────────────────────
  923  | 
  924  |   test("2. Job title too long shows error", async ({ page }) => {
  925  |     await mockAllBackgroundEndpoints(page);
  926  |     await mockGetJobs(page, ALL_FIXTURE_JOBS);
  927  | 
  928  |     // Mock POST to reject an overlong title
  929  |     await page.route("**/api/jobs", async (route: Route) => {
  930  |       if (route.request().method() === "POST") {
  931  |         await route.fulfill({
  932  |           status: 400,
  933  |           contentType: "application/json",
  934  |           body: JSON.stringify({
  935  |             ok: false,
  936  |             error: "Job title must not exceed 255 characters.",
  937  |           }),
  938  |         });
  939  |       } else {
  940  |         await route.continue();
  941  |       }
  942  |     });
  943  | 
> 944  |     await page.goto("/");
       |                ^ Error: page.goto: Test timeout of 30000ms exceeded.
  945  |     await injectAuthSession(page);
  946  |     const jobsPage = new JobsPage(page);
  947  |     await jobsPage.goto();
  948  | 
  949  |     await jobsPage.openNewJobForm();
  950  |     await jobsPage.expectFormVisible();
  951  | 
  952  |     // Fill an excessively long title (300 chars) — advance to Step 2 before description
  953  |     const longTitle = "A".repeat(300);
  954  |     await jobsPage.fillJobTitle(longTitle);
  955  |     await jobsPage.fillLocation("Chicago, IL");
  956  |     await jobsPage.fillExperienceYears("2");
  957  |     await jobsPage.nextStep();
  958  |     await jobsPage.fillJobDescription("A job description for validation testing.");
  959  |     await jobsPage.fillRequiredSkills("Java, Spring Boot");
  960  | 
  961  |     // Try to publish
  962  |     const publishButton = page.getByRole("button", { name: /Publish Job/i }).first();
  963  |     await publishButton.click().catch(() => {});
  964  | 
  965  |     await page.waitForTimeout(800);
  966  | 
  967  |     // Check for HTML5 maxlength enforcement on the title input
  968  |     const titleExceedsMaxLength = await page.evaluate(() => {
  969  |       const titleInput = document.querySelector("input[name='jobTitle'], input[id='jobTitle']") as HTMLInputElement | null;
  970  |       if (titleInput && titleInput.maxLength > 0) {
  971  |         return titleInput.value.length > titleInput.maxLength;
  972  |       }
  973  |       return false;
  974  |     });
  975  | 
  976  |     // Check for an error message
  977  |     const hasErrorMessage = await page
  978  |       .getByText(/too long|exceed|255|maximum|limit/i)
  979  |       .first()
  980  |       .isVisible()
  981  |       .catch(() => false);
  982  | 
  983  |     const hasGeneralError = await page
  984  |       .locator("[role='alert'], .text-destructive, .text-red-500")
  985  |       .first()
  986  |       .isVisible()
  987  |       .catch(() => false);
  988  | 
  989  |     expect(
  990  |       titleExceedsMaxLength || hasErrorMessage || hasGeneralError,
  991  |       "Expected an error when job title exceeds maximum length"
  992  |     ).toBe(true);
  993  |   });
  994  | 
  995  |   // ── 3. Salary min > max shows error ──────────────────────────────────────
  996  | 
  997  |   test("3. Salary min > max shows error", async ({ page }) => {
  998  |     await mockAllBackgroundEndpoints(page);
  999  |     await mockGetJobs(page, ALL_FIXTURE_JOBS);
  1000 | 
  1001 |     // Mock POST to return salary validation error
  1002 |     await page.route("**/api/jobs", async (route: Route) => {
  1003 |       if (route.request().method() === "POST") {
  1004 |         await route.fulfill({
  1005 |           status: 400,
  1006 |           contentType: "application/json",
  1007 |           body: JSON.stringify({
  1008 |             ok: false,
  1009 |             error: "Minimum salary must be less than maximum salary.",
  1010 |           }),
  1011 |         });
  1012 |       } else {
  1013 |         await route.continue();
  1014 |       }
  1015 |     });
  1016 | 
  1017 |     await page.goto("/");
  1018 |     await injectAuthSession(page);
  1019 |     const jobsPage = new JobsPage(page);
  1020 |     await jobsPage.goto();
  1021 | 
  1022 |     await jobsPage.openNewJobForm();
  1023 |     await jobsPage.expectFormVisible();
  1024 | 
  1025 |     // Fill required fields — advance to Step 2 before description
  1026 |     await jobsPage.fillJobTitle("Backend Developer");
  1027 |     await jobsPage.fillLocation("Denver, CO");
  1028 |     await jobsPage.fillExperienceYears("3");
  1029 |     await jobsPage.nextStep();
  1030 |     await jobsPage.fillJobDescription("Build scalable backend services.");
  1031 |     await jobsPage.fillRequiredSkills("Node.js, PostgreSQL");
  1032 | 
  1033 |     // Set salary min HIGHER than max
  1034 |     const salaryMinInput = page
  1035 |       .locator("input[name='salaryMin'], input[id='salaryMin'], input[placeholder*='min' i]")
  1036 |       .first();
  1037 |     const salaryMaxInput = page
  1038 |       .locator("input[name='salaryMax'], input[id='salaryMax'], input[placeholder*='max' i]")
  1039 |       .first();
  1040 | 
  1041 |     const salaryMinVisible = await salaryMinInput.isVisible().catch(() => false);
  1042 |     if (salaryMinVisible) {
  1043 |       await salaryMinInput.fill("200000");
  1044 |       await salaryMaxInput.fill("80000"); // max < min — invalid
```