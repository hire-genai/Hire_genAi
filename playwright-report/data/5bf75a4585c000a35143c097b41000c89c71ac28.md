# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 03-pricing-subscription.spec.ts >> Pricing — Subscription Purchase Negative Scenarios >> 3. Stripe checkout creation timeout / network error shows error state
- Location: tests\e2e\03-pricing-subscription.spec.ts:737:7

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
  640 |     // Should not be redirected to /login — session is recognised
  641 |     await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });
  642 | 
  643 |     // Navigate to /jobs (a premium feature route)
  644 |     await page.goto("/jobs");
  645 |     await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });
  646 | 
  647 |     // The page should render something (not a blank screen or 404).
  648 |     // Allow a brief moment for the page to hydrate past the initial loading state.
  649 |     await page.waitForTimeout(500);
  650 |     const bodyText = await page.locator("body").innerText().catch(() => "");
  651 |     expect(bodyText.length, "Expected /jobs page to render content after subscription").toBeGreaterThan(5);
  652 |   });
  653 | });
  654 | 
  655 | // ---------------------------------------------------------------------------
  656 | // NEGATIVE scenarios
  657 | // ---------------------------------------------------------------------------
  658 | 
  659 | test.describe("Pricing — Subscription Purchase Negative Scenarios", () => {
  660 |   test("1. Stripe payment failure shows error message on pricing page", async ({ page }) => {
  661 |     // Simulate an authenticated user in the app context
  662 |     await page.goto("/");
  663 |     await injectAuthSession(page);
  664 | 
  665 |     // Mock stripe create to return a payment failure
  666 |     await mockStripeCheckoutCreate(page, {
  667 |       ok: false,
  668 |       error: "Your card was declined. Please use a different payment method.",
  669 |       code: "card_declined",
  670 |     } as unknown as typeof MOCK_STRIPE_CREATE_SUCCESS);
  671 |     await mockStripeStatus(page, MOCK_STRIPE_STATUS_NONE);
  672 | 
  673 |     await page.goto(
  674 |       `${PRICING_URL}?company_id=${encodeURIComponent(MOCK_SESSION.companyId)}`
  675 |     );
  676 | 
  677 |     await page.getByRole("button", { name: /^Monthly$/i }).click();
  678 |     await expect(page.getByRole("heading", { name: "Starter", exact: true }).first()).toBeVisible({
  679 |       timeout: 15_000,
  680 |     });
  681 | 
  682 |     // Click Choose Starter — this triggers the checkout create API call
  683 |     await page.getByRole("button", { name: "Choose Starter", exact: true }).first().click();
  684 | 
  685 |     // Error banner should appear on the pricing page
  686 |     await expect(
  687 |       page
  688 |         .getByText(/card was declined/i)
  689 |         .or(page.getByText(/payment.*failed/i))
  690 |         .or(page.getByText(/failed to start checkout/i))
  691 |         .or(page.locator(".bg-red-50, [role='alert']"))
  692 |         .first()
  693 |     ).toBeVisible({ timeout: 10_000 });
  694 | 
  695 |     // User must remain on the pricing page
  696 |     await expect(page).toHaveURL(/\/pricing/, { timeout: 5_000 });
  697 |   });
  698 | 
  699 |   test("2. Card declined scenario shows friendly error", async ({ page }) => {
  700 |     await page.goto("/");
  701 |     await injectAuthSession(page);
  702 | 
  703 |     // Mock with insufficient funds error
  704 |     await mockStripeCheckoutCreate(page, {
  705 |       ok: false,
  706 |       error: "Your card has insufficient funds. Please use a different payment method.",
  707 |       code: "insufficient_funds",
  708 |     } as unknown as typeof MOCK_STRIPE_CREATE_SUCCESS);
  709 |     await mockStripeStatus(page, MOCK_STRIPE_STATUS_NONE);
  710 | 
  711 |     await page.goto(
  712 |       `${PRICING_URL}?company_id=${encodeURIComponent(MOCK_SESSION.companyId)}`
  713 |     );
  714 | 
  715 |     await page.getByRole("button", { name: /^Monthly$/i }).click();
  716 |     await expect(
  717 |       page.getByRole("heading", { name: "Professional", exact: true }).first()
  718 |     ).toBeVisible({ timeout: 15_000 });
  719 | 
  720 |     // Attempt Professional plan checkout
  721 |     await page.getByRole("button", { name: "Choose Professional", exact: true }).first().click();
  722 | 
  723 |     // Error message referencing insufficient funds or a generic friendly message
  724 |     await expect(
  725 |       page
  726 |         .getByText(/insufficient funds/i)
  727 |         .or(page.getByText(/different payment method/i))
  728 |         .or(page.getByText(/card.*declined/i))
  729 |         .or(page.locator(".bg-red-50").filter({ hasText: /error/i }))
  730 |         .first()
  731 |     ).toBeVisible({ timeout: 10_000 });
  732 | 
  733 |     // Must still be on pricing page — no redirect to Stripe
  734 |     await expect(page).toHaveURL(/\/pricing/, { timeout: 5_000 });
  735 |   });
  736 | 
  737 |   test("3. Stripe checkout creation timeout / network error shows error state", async ({
  738 |     page,
  739 |   }) => {
> 740 |     await page.goto("/");
      |                ^ Error: page.goto: Test timeout of 30000ms exceeded.
  741 |     await injectAuthSession(page);
  742 | 
  743 |     // Simulate network timeout by aborting the request
  744 |     await page.route("**/api/subscriptions/stripe/create", async (route) => {
  745 |       await route.abort("timedout");
  746 |     });
  747 |     await mockStripeStatus(page, MOCK_STRIPE_STATUS_NONE);
  748 | 
  749 |     await page.goto(
  750 |       `${PRICING_URL}?company_id=${encodeURIComponent(MOCK_SESSION.companyId)}`
  751 |     );
  752 | 
  753 |     await page.getByRole("button", { name: /^Monthly$/i }).click();
  754 |     await expect(page.getByRole("heading", { name: "Business", exact: true }).first()).toBeVisible({
  755 |       timeout: 15_000,
  756 |     });
  757 | 
  758 |     // Attempt Business plan checkout
  759 |     await page.getByRole("button", { name: "Choose Business", exact: true }).first().click();
  760 | 
  761 |     // The app should surface an error (not silently fail or crash)
  762 |     await expect(
  763 |       page
  764 |         .getByText(/failed/i)
  765 |         .or(page.getByText(/error/i))
  766 |         .or(page.getByText(/network/i))
  767 |         .or(page.locator("[role='alert'], .bg-red-50"))
  768 |         .first()
  769 |     ).toBeVisible({ timeout: 15_000 });
  770 | 
  771 |     // User must remain on the pricing page (no empty redirect)
  772 |     await expect(page).toHaveURL(/\/pricing/, { timeout: 5_000 });
  773 |   });
  774 | 
  775 |   test("4. Cancel from Stripe returns user to pricing page", async ({ page }) => {
  776 |     await page.goto("/");
  777 |     await injectAuthSession(page);
  778 | 
  779 |     // Mock successful checkout creation
  780 |     const cancelReturnUrl =
  781 |       "http://localhost:3000/pricing?company_id=" +
  782 |       encodeURIComponent(MOCK_SESSION.companyId) +
  783 |       "&cancel=true";
  784 | 
  785 |     await page.route("**/api/subscriptions/stripe/create", async (route) => {
  786 |       await route.fulfill({
  787 |         status: 200,
  788 |         contentType: "application/json",
  789 |         body: JSON.stringify({
  790 |           ok: true,
  791 |           subscription: {
  792 |             checkoutUrl:
  793 |               // Simulate a Stripe checkout URL that would normally redirect;
  794 |               // we point it to our own cancel URL to simulate the cancel flow.
  795 |               cancelReturnUrl,
  796 |             sessionId: "cs_test_mock_cancel_123",
  797 |           },
  798 |         }),
  799 |       });
  800 |     });
  801 |     await mockStripeStatus(page, MOCK_STRIPE_STATUS_NONE);
  802 | 
  803 |     await page.goto(
  804 |       `${PRICING_URL}?company_id=${encodeURIComponent(MOCK_SESSION.companyId)}`
  805 |     );
  806 | 
  807 |     await page.getByRole("button", { name: /^Monthly$/i }).click();
  808 |     await expect(page.getByRole("heading", { name: "Starter", exact: true }).first()).toBeVisible({
  809 |       timeout: 15_000,
  810 |     });
  811 | 
  812 |     // Click Choose Starter — the mocked checkout URL points back to pricing
  813 |     await page.getByRole("button", { name: "Choose Starter", exact: true }).first().click();
  814 | 
  815 |     // Wait for navigation to the cancel return URL (pricing page)
  816 |     await page.waitForURL(/\/pricing/, { timeout: 15_000 });
  817 | 
  818 |     // Verify we are back on the pricing page
  819 |     await expect(page).toHaveURL(/\/pricing/, { timeout: 5_000 });
  820 | 
  821 |     // Pricing content should still be visible (page is usable after cancel)
  822 |     await expect(
  823 |       page.getByRole("heading", { name: "Starter", exact: true }).first()
  824 |     ).toBeVisible({ timeout: 10_000 });
  825 |   });
  826 | 
  827 |   test("5. Stripe checkout returns failure status — error shown on return page", async ({
  828 |     page,
  829 |   }) => {
  830 |     await page.goto("/");
  831 |     await injectAuthSession(page);
  832 | 
  833 |     // Mock the verify endpoint to return a failed status
  834 |     await mockStripeVerify(page, {
  835 |       ok: false,
  836 |       error: "Payment was not completed. Please try again.",
  837 |       status: "failed",
  838 |     });
  839 |     await mockStripeStatus(page, MOCK_STRIPE_STATUS_NONE);
  840 | 
```