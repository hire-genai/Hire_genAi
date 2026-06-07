# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 02-company-login.spec.ts >> Company Login — Redirect Behavior >> Authenticated user visiting /login is redirected away
- Location: tests\e2e\02-company-login.spec.ts:606:7

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
  510 |     // Mock the API to return a "user not found" response
  511 |     await mockOtpSendUserNotFound(page);
  512 | 
  513 |     await loginPage.goto();
  514 |     await loginPage.fillEmail("nobody@nonexistent-domain.xyz");
  515 |     await loginPage.submitEmail();
  516 | 
  517 |     // Expect the server's error message to surface in the UI
  518 |     await loginPage.expectLoginError(
  519 |       "User does not exist. Please sign up first before trying to login."
  520 |     );
  521 | 
  522 |     // Should remain on the email step — OTP input must not appear
  523 |     const otpVisible = await loginPage.otpInput.isVisible().catch(() => false);
  524 |     expect(otpVisible, "OTP step should not appear for non-existent user").toBe(false);
  525 |   });
  526 | 
  527 |   test("3. Wrong OTP shows error", async ({ page }) => {
  528 |     const loginPage = new LoginPage(page);
  529 | 
  530 |     // Step 1: OTP send succeeds, step 2: verify fails with wrong OTP
  531 |     await mockOtpSendSuccess(page);
  532 |     await mockOtpVerifyWrong(page);
  533 | 
  534 |     await loginPage.goto();
  535 |     await loginPage.fillEmail(VALID_EMAIL);
  536 |     await loginPage.submitEmail();
  537 | 
  538 |     // Wait for the OTP step
  539 |     await loginPage.waitForOtpStep();
  540 | 
  541 |     // Enter an incorrect OTP
  542 |     await loginPage.fillOTP(WRONG_OTP);
  543 |     await loginPage.submitOTP();
  544 | 
  545 |     // Expect an error indicating the OTP is wrong
  546 |     await loginPage.expectLoginError("Invalid OTP");
  547 | 
  548 |     // Should remain on the OTP step — not redirected to dashboard
  549 |     await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });
  550 |   });
  551 | 
  552 |   test("4. Expired OTP shows error", async ({ page }) => {
  553 |     const loginPage = new LoginPage(page);
  554 | 
  555 |     // OTP send succeeds, but when the user tries to verify it has expired
  556 |     await mockOtpSendSuccess(page);
  557 |     await mockOtpVerifyExpired(page);
  558 | 
  559 |     await loginPage.goto();
  560 |     await loginPage.fillEmail(VALID_EMAIL);
  561 |     await loginPage.submitEmail();
  562 | 
  563 |     await loginPage.waitForOtpStep();
  564 | 
  565 |     // Enter any OTP — the server will reject it as expired
  566 |     await loginPage.fillOTP(VALID_OTP);
  567 |     await loginPage.submitOTP();
  568 | 
  569 |     // Expect an expiry-specific error message
  570 |     await loginPage.expectLoginError("expired");
  571 | 
  572 |     // Still on /login
  573 |     await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });
  574 |   });
  575 | 
  576 |   test("5. Too many OTP attempts shows lockout message", async ({ page }) => {
  577 |     const loginPage = new LoginPage(page);
  578 | 
  579 |     // OTP send succeeds; on verify the server returns 429 (rate limited / locked)
  580 |     await mockOtpSendSuccess(page);
  581 |     await mockOtpVerifyLocked(page);
  582 | 
  583 |     await loginPage.goto();
  584 |     await loginPage.fillEmail(VALID_EMAIL);
  585 |     await loginPage.submitEmail();
  586 | 
  587 |     await loginPage.waitForOtpStep();
  588 | 
  589 |     // Attempt to verify — the server rejects with a lockout error
  590 |     await loginPage.fillOTP(WRONG_OTP);
  591 |     await loginPage.submitOTP();
  592 | 
  593 |     // Expect a lockout / rate-limit message
  594 |     await loginPage.expectLoginError("Too many failed attempts");
  595 | 
  596 |     // Still on /login, not on dashboard
  597 |     await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });
  598 |   });
  599 | });
  600 | 
  601 | // ---------------------------------------------------------------------------
  602 | // REDIRECT scenario: authenticated users visiting /login
  603 | // ---------------------------------------------------------------------------
  604 | 
  605 | test.describe("Company Login — Redirect Behavior", () => {
  606 |   test("Authenticated user visiting /login is redirected away", async ({
  607 |     page,
  608 |   }) => {
  609 |     // Inject an authenticated session before visiting /login
> 610 |     await page.goto("/");
      |                ^ Error: page.goto: Test timeout of 30000ms exceeded.
  611 |     await injectAuthSession(page);
  612 | 
  613 |     // Also set up a verify mock in case the login page triggers any API calls
  614 |     await mockOtpVerifySuccess(page);
  615 | 
  616 |     // Navigate to /login as an already-authenticated user
  617 |     await page.goto("/login");
  618 | 
  619 |     // The app should detect the existing session and redirect to /dashboard
  620 |     // (or whichever postLoginRedirect is stored).
  621 |     // Wait up to 10 s for the redirect to occur.
  622 |     await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });
  623 | 
  624 |     // The user should land on an authenticated page, not a public page
  625 |     const finalUrl = page.url();
  626 |     const isAuthenticatedRoute =
  627 |       finalUrl.includes("/dashboard") ||
  628 |       finalUrl.includes("/jobs") ||
  629 |       finalUrl.includes("/candidates") ||
  630 |       finalUrl.includes("/settings") ||
  631 |       (!finalUrl.includes("/login") && !finalUrl.includes("/signup"));
  632 | 
  633 |     expect(
  634 |       isAuthenticatedRoute,
  635 |       `Expected authenticated redirect from /login, but ended up at: ${finalUrl}`
  636 |     ).toBe(true);
  637 |   });
  638 | });
  639 | 
  640 | // ---------------------------------------------------------------------------
  641 | // Session cookie validation (standalone assertions)
  642 | // ---------------------------------------------------------------------------
  643 | 
  644 | test.describe("Company Login — Session Cookie Validation", () => {
  645 |   test("Session cookie is set with correct attributes after successful login", async ({
  646 |     page,
  647 |     context,
  648 |   }) => {
  649 |     const loginPage = new LoginPage(page);
  650 | 
  651 |     await mockOtpSendSuccess(page);
  652 |     await mockOtpVerifySuccess(page);
  653 | 
  654 |     await loginPage.goto();
  655 |     await loginPage.fillEmail(VALID_EMAIL);
  656 |     await loginPage.submitEmail();
  657 |     await loginPage.waitForOtpStep();
  658 |     await loginPage.fillOTP(VALID_OTP);
  659 |     await loginPage.submitOTP();
  660 | 
  661 |     // Wait for the success transition
  662 |     await loginPage.expectLoginSuccess();
  663 | 
  664 |     // Retrieve all cookies from the context
  665 |     const cookies = await context.cookies();
  666 |     const sessionCookie = cookies.find((c) => c.name === SESSION_COOKIE);
  667 | 
  668 |     expect(sessionCookie, `"${SESSION_COOKIE}" cookie must be set after login`).toBeDefined();
  669 |     expect(
  670 |       sessionCookie!.value,
  671 |       `"${SESSION_COOKIE}" cookie value must be non-empty`
  672 |     ).toBeTruthy();
  673 | 
  674 |     // The cookie should be scoped to the root path
  675 |     expect(sessionCookie!.path).toBe("/");
  676 | 
  677 |     // Validate that the cookie value contains the expected user identity
  678 |     const decoded = decodeURIComponent(sessionCookie!.value);
  679 |     let parsed: Record<string, unknown> = {};
  680 |     try {
  681 |       parsed = JSON.parse(decoded);
  682 |     } catch {
  683 |       // If it is not JSON the app may store it in a different format; skip
  684 |     }
  685 | 
  686 |     if (Object.keys(parsed).length > 0) {
  687 |       expect(parsed).toHaveProperty("userId");
  688 |       expect(parsed).toHaveProperty("companyId");
  689 |       expect(parsed).toHaveProperty("email");
  690 |     }
  691 |   });
  692 | 
  693 |   test("Session cookie is absent / cleared before login", async ({ context }) => {
  694 |     // In a fresh context (storageState reset at suite level) there should be
  695 |     // no session cookie before any login action.
  696 |     const cookies = await context.cookies();
  697 |     const sessionCookie = cookies.find((c) => c.name === SESSION_COOKIE);
  698 |     const hasCookie =
  699 |       !!sessionCookie &&
  700 |       !!sessionCookie.value &&
  701 |       (sessionCookie.expires === -1 || sessionCookie.expires > Date.now() / 1000);
  702 | 
  703 |     expect(
  704 |       hasCookie,
  705 |       `"${SESSION_COOKIE}" cookie should not be present in a fresh (unauthenticated) context`
  706 |     ).toBe(false);
  707 |   });
  708 | });
  709 | 
```