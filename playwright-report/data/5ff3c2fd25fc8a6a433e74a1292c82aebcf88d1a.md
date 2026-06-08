# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 06-jd-creation.spec.ts >> JD Creation — Positive Scenarios >> 6. Copy JD to clipboard works via Share button
- Location: tests\e2e\06-jd-creation.spec.ts:951:7

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
  855  |   // ── 5. JD preview shows formatted content ────────────────────────────────
  856  | 
  857  |   test("5. JD preview shows formatted content in view mode", async ({
  858  |     page,
  859  |   }) => {
  860  |     await mockAllBackground(page);
  861  |     await mockGetJobs(page, [FIXTURE_JOB_OPEN]);
  862  | 
  863  |     // Mock single-job GET used when opening view mode
  864  |     await page.route(
  865  |       `**/api/jobs/**/${FIXTURE_JOB_OPEN.id}`,
  866  |       async (route: Route) => {
  867  |         if (route.request().method() === "GET") {
  868  |           await route.fulfill({
  869  |             status: 200,
  870  |             contentType: "application/json",
  871  |             body: JSON.stringify({ ok: true, data: FIXTURE_JOB_OPEN }),
  872  |           });
  873  |         } else {
  874  |           await route.continue();
  875  |         }
  876  |       }
  877  |     );
  878  | 
  879  |     await page.goto("/");
  880  |     await injectAuthSession(page);
  881  |     const jobsPage = new JobsPage(page);
  882  |     await jobsPage.goto();
  883  | 
  884  |     await jobsPage.expectJobCardVisible(FIXTURE_JOB_OPEN.title);
  885  | 
  886  |     // Locate the open job card and click its View button
  887  |     const openJobCard = page
  888  |       .locator("[data-slot='card']")
  889  |       .filter({ hasText: FIXTURE_JOB_OPEN.title })
  890  |       .first();
  891  | 
  892  |     const viewButton = openJobCard
  893  |       .getByRole("button", { name: /View/i })
  894  |       .first();
  895  |     const viewVisible = await viewButton.isVisible().catch(() => false);
  896  | 
  897  |     if (viewVisible) {
  898  |       await viewButton.click();
  899  |       await page.waitForTimeout(700);
  900  | 
  901  |       // The job description text should render in view mode
  902  |       await expect(
  903  |         page.getByText(/React and TypeScript/i, { exact: false }).first()
  904  |       ).toBeVisible({ timeout: 10_000 });
  905  | 
  906  |       // Job title must appear in the modal header
  907  |       await expect(
  908  |         page.getByText(FIXTURE_JOB_OPEN.title, { exact: false }).first()
  909  |       ).toBeVisible({ timeout: 5_000 });
  910  | 
  911  |       // Navigate to the Job Description step to verify the JD textarea content
  912  |       await page
  913  |         .getByText(/Job Description/i, { exact: false })
  914  |         .first()
  915  |         .click()
  916  |         .catch(() => {});
  917  |       await page.waitForTimeout(400);
  918  | 
  919  |       const descArea = jdTextarea(page);
  920  |       if (await descArea.isVisible().catch(() => false)) {
  921  |         const content = await descArea.inputValue();
  922  |         expect(
  923  |           content.length,
  924  |           "Job description textarea must contain formatted content in view mode"
  925  |         ).toBeGreaterThan(20);
  926  |         // Description should reference React/TypeScript from the fixture
  927  |         expect(content).toMatch(/React|TypeScript|frontend|web application/i);
  928  |       }
  929  | 
  930  |       // Close the modal
  931  |       await page.keyboard.press("Escape");
  932  |     } else {
  933  |       // Fallback: description may be rendered inline on the card
  934  |       const inlineDescVisible = await openJobCard
  935  |         .getByText(/React and TypeScript/i, { exact: false })
  936  |         .first()
  937  |         .isVisible()
  938  |         .catch(() => false);
  939  | 
  940  |       test.info().annotations.push({
  941  |         type: "note",
  942  |         description: inlineDescVisible
  943  |           ? "Description rendered inline on card — view modal not triggered via button"
  944  |           : "View button not found; description not visible inline either",
  945  |       });
  946  |     }
  947  |   });
  948  | 
  949  |   // ── 6. Copy JD to clipboard via Share button ─────────────────────────────
  950  | 
  951  |   test("6. Copy JD to clipboard works via Share button", async ({ page }) => {
  952  |     await mockAllBackground(page);
  953  |     await mockGetJobs(page, [FIXTURE_JOB_OPEN]);
  954  | 
> 955  |     await page.goto("/");
       |                ^ Error: page.goto: Test timeout of 30000ms exceeded.
  956  |     await injectAuthSession(page);
  957  |     const jobsPage = new JobsPage(page);
  958  |     await jobsPage.goto();
  959  | 
  960  |     await jobsPage.expectJobCardVisible(FIXTURE_JOB_OPEN.title);
  961  | 
  962  |     // Grant clipboard permissions
  963  |     await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  964  | 
  965  |     const openJobCard = page
  966  |       .locator("[data-slot='card']")
  967  |       .filter({ hasText: FIXTURE_JOB_OPEN.title })
  968  |       .first();
  969  | 
  970  |     const shareButton = openJobCard
  971  |       .getByRole("button", { name: /Share/i })
  972  |       .first();
  973  |     const shareVisible = await shareButton.isVisible().catch(() => false);
  974  | 
  975  |     if (shareVisible) {
  976  |       await shareButton.click();
  977  | 
  978  |       // A brief "Copied!" feedback label should appear
  979  |       await expect(page.getByText(/Copied!/i).first()).toBeVisible({
  980  |         timeout: 5_000,
  981  |       });
  982  | 
  983  |       // Clipboard should contain a non-empty value (the job public link)
  984  |       const clipboardText = await page
  985  |         .evaluate(() => navigator.clipboard.readText())
  986  |         .catch(() => "");
  987  |       expect(
  988  |         clipboardText.length,
  989  |         "Clipboard must contain a non-empty string after Share click"
  990  |       ).toBeGreaterThan(0);
  991  |     } else {
  992  |       // Share may live inside a dropdown menu
  993  |       const dropdownTrigger = openJobCard
  994  |         .locator("[aria-haspopup='menu'], [aria-haspopup='listbox']")
  995  |         .first();
  996  |       if (await dropdownTrigger.isVisible().catch(() => false)) {
  997  |         await dropdownTrigger.click();
  998  |         await page.waitForTimeout(300);
  999  |         const menuShareItem = page
  1000 |           .getByRole("menuitem", { name: /Share/i })
  1001 |           .first();
  1002 |         await menuShareItem.click().catch(() => {});
  1003 |         await expect(page.getByText(/Copied!/i).first()).toBeVisible({
  1004 |           timeout: 5_000,
  1005 |         });
  1006 |       } else {
  1007 |         test.info().annotations.push({
  1008 |           type: "note",
  1009 |           description:
  1010 |             "Share button not found on the open job card — clipboard assertion skipped",
  1011 |         });
  1012 |       }
  1013 |     }
  1014 |   });
  1015 | });
  1016 | 
  1017 | // ===========================================================================
  1018 | // NEGATIVE SCENARIOS
  1019 | // ===========================================================================
  1020 | 
  1021 | test.describe("JD Creation — Negative Scenarios", () => {
  1022 |   // ── 1. AI generation without required fields shows validation ─────────────
  1023 | 
  1024 |   test("1. AI question generation without minimum required fields shows validation", async ({
  1025 |     page,
  1026 |   }) => {
  1027 |     await mockAllBackground(page);
  1028 |     await mockGetJobs(page);
  1029 |     await mockQuestionsGenerateSuccess(page);
  1030 | 
  1031 |     await page.goto("/");
  1032 |     await injectAuthSession(page);
  1033 |     const jobsPage = new JobsPage(page);
  1034 |     await jobsPage.goto();
  1035 | 
  1036 |     await jobsPage.openNewJobForm();
  1037 |     await jobsPage.expectFormVisible();
  1038 | 
  1039 |     // Jump directly to Step 3 WITHOUT filling the JD, skills, or experience in Step 2
  1040 |     await page
  1041 |       .getByText(/Interview Questions/i, { exact: false })
  1042 |       .first()
  1043 |       .click()
  1044 |       .catch(() => {});
  1045 |     await page.waitForTimeout(400);
  1046 | 
  1047 |     // Attempt AI generation without selecting any evaluation criterion
  1048 |     const aiBtn = aiGenerateBtn(page);
  1049 |     const aiBtnVisible = await aiBtn.isVisible().catch(() => false);
  1050 | 
  1051 |     if (aiBtnVisible) {
  1052 |       // The form uses alert() for these guards — intercept it
  1053 |       const dialogPromise = page
  1054 |         .waitForEvent("dialog", { timeout: 3_000 })
  1055 |         .catch(() => null);
```