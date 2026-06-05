# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 03-pricing-subscription.spec.ts >> Pricing Page — Positive Scenarios >> 3. Monthly/Annual toggle switches prices correctly
- Location: tests\e2e\03-pricing-subscription.spec.ts:429:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /^Annual$/i })

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e3]:
    - banner [ref=e4]:
      - generic [ref=e6]:
        - generic [ref=e7]:
          - link "HireGenAI" [ref=e9] [cursor=pointer]:
            - /url: /
            - heading "HireGenAI" [level=1] [ref=e10]
          - navigation [ref=e11]:
            - link "Product" [ref=e12] [cursor=pointer]:
              - /url: /demo-en
            - link "Pricing" [ref=e13] [cursor=pointer]:
              - /url: /pricing
            - link "ROI" [ref=e14] [cursor=pointer]:
              - /url: /roi
            - link "Company" [ref=e15] [cursor=pointer]:
              - /url: /about
        - generic [ref=e16]:
          - link "Settings" [ref=e17] [cursor=pointer]:
            - /url: /settings?tab=payment
            - button [ref=e18]:
              - img [ref=e19]
          - link "Get started" [ref=e23] [cursor=pointer]:
            - /url: /signup
            - button "Get started" [ref=e24]
    - generic [ref=e25]:
      - generic [ref=e26]: ⚡ AI Recruiting OS · Full ATS + AI Interview
      - heading "Simple, transparent pricing. Pay for what you use." [level=1] [ref=e27]:
        - text: Simple, transparent pricing.
        - text: Pay for what you use.
      - paragraph [ref=e28]:
        - text: All paid plans include
        - strong [ref=e29]: every ATS feature
        - text: — Dashboard, Job Listings, Talent Pool, Application List, Delegation, Feedback, and full analytics.
        - text: No hidden user limits. Only support level & usage caps change.
      - generic [ref=e30]: 🧑‍🤝‍🧑 Unlimited team members on every paid plan — invite your whole recruiting team.
    - generic [ref=e32]:
      - button "Monthly" [active] [ref=e33] [cursor=pointer]
      - button "Annual Save 17%" [ref=e34] [cursor=pointer]:
        - text: Annual
        - generic [ref=e35]: Save 17%
    - generic [ref=e36]:
      - generic [ref=e37]:
        - paragraph [ref=e38]: Not sure which package is right for you?
        - paragraph [ref=e39]:
          - text: Take our
          - link "ROI Assessment" [ref=e40] [cursor=pointer]:
            - /url: /roi
          - text: to receive a personalized recommendation based on your hiring volume, recruitment costs, and expected savings.
      - generic [ref=e41]:
        - generic [ref=e43]:
          - generic [ref=e44]:
            - heading "Starter" [level=3] [ref=e45]
            - paragraph [ref=e46]: For startups and small teams running their first AI-powered hiring workflows.
          - generic [ref=e47]:
            - generic [ref=e48]:
              - generic [ref=e49]: $99
              - generic [ref=e50]: / month
            - generic [ref=e51]:
              - generic [ref=e52]: 💳
              - generic [ref=e53]:
                - paragraph [ref=e54]: $99 AI credits included
                - paragraph [ref=e55]: Full amount loaded into your AI wallet
          - generic [ref=e56]:
            - paragraph [ref=e57]: Typical monthly AI usage
            - generic [ref=e58]:
              - generic [ref=e59]:
                - generic [ref=e60]: ~200
                - generic [ref=e61]: candidates screened
              - generic [ref=e62]:
                - generic [ref=e63]: ~4
                - generic [ref=e64]: AI video rounds
            - paragraph [ref=e65]: 📌 Illustrative averages — soft guidance only. No hard stop at these numbers.
          - generic [ref=e66]:
            - generic [ref=e67]:
              - generic [ref=e68]: ⚡
              - generic [ref=e69]:
                - paragraph [ref=e70]: AI CV Reports
                - paragraph [ref=e71]: Every resume scored, ranked & explained instantly
            - generic [ref=e72]:
              - generic [ref=e73]: 🎥
              - generic [ref=e74]:
                - paragraph [ref=e75]: AI Video Interviews + Reports
                - paragraph [ref=e76]: Automated rounds — questions, recording & post-interview AI summary
            - generic [ref=e77]:
              - generic [ref=e78]: ❓
              - generic [ref=e79]:
                - paragraph [ref=e80]: Auto Interview Questions
                - paragraph [ref=e81]: Role-specific questions generated before every round
            - generic [ref=e82]:
              - generic [ref=e83]: 📋
              - generic [ref=e84]:
                - paragraph [ref=e85]: Unlimited Job Postings
                - paragraph [ref=e86]: No cap on active roles — post as many as you need
            - generic [ref=e87]:
              - generic [ref=e88]: 🤝
              - generic [ref=e89]:
                - paragraph [ref=e90]: Client & Agent Connect
                - paragraph [ref=e91]: Share pipelines, roles & updates with external clients or partners
            - generic [ref=e92]:
              - generic [ref=e93]: 🔄
              - generic [ref=e94]:
                - paragraph [ref=e95]: Delegation, Feedback & Audit
                - paragraph [ref=e96]: Assign to team, collect feedback, full audit trail
            - generic [ref=e97]:
              - generic [ref=e98]: 📊
              - generic [ref=e99]:
                - paragraph [ref=e100]: Recruiter · Manager · Director
                - paragraph [ref=e101]: Dedicated KPI dashboards for every role in your team
          - generic [ref=e103]: 🎧 Standard Support · 72h
          - generic [ref=e104]:
            - button "Choose Starter" [ref=e105] [cursor=pointer]:
              - text: Choose Starter
              - img [ref=e106]
            - paragraph [ref=e108]: Unlimited team members · Cancel anytime
        - generic [ref=e110]:
          - generic [ref=e111]:
            - heading "Professional" [level=3] [ref=e112]
            - paragraph [ref=e113]: For agencies scaling their recruiting operations.
          - generic [ref=e114]:
            - generic [ref=e115]:
              - generic [ref=e116]: $499
              - generic [ref=e117]: / month
            - generic [ref=e118]:
              - generic [ref=e119]: 💳
              - generic [ref=e120]:
                - paragraph [ref=e121]: $499 AI credits included
                - paragraph [ref=e122]: Full amount loaded into your AI wallet
          - generic [ref=e123]:
            - paragraph [ref=e124]: Typical monthly AI usage
            - generic [ref=e125]:
              - generic [ref=e126]:
                - generic [ref=e127]: ~1,000
                - generic [ref=e128]: candidates screened
              - generic [ref=e129]:
                - generic [ref=e130]: ~20
                - generic [ref=e131]: AI video rounds
            - paragraph [ref=e132]: 📌 Illustrative averages — soft guidance only. No hard stop at these numbers.
          - generic [ref=e133]:
            - generic [ref=e134]:
              - generic [ref=e135]: ⚡
              - generic [ref=e136]:
                - paragraph [ref=e137]: AI CV Reports
                - paragraph [ref=e138]: Every resume scored, ranked & explained instantly
            - generic [ref=e139]:
              - generic [ref=e140]: 🎥
              - generic [ref=e141]:
                - paragraph [ref=e142]: AI Video Interviews + Reports
                - paragraph [ref=e143]: Automated rounds — questions, recording & post-interview AI summary
            - generic [ref=e144]:
              - generic [ref=e145]: ❓
              - generic [ref=e146]:
                - paragraph [ref=e147]: Auto Interview Questions
                - paragraph [ref=e148]: Role-specific questions generated before every round
            - generic [ref=e149]:
              - generic [ref=e150]: 📋
              - generic [ref=e151]:
                - paragraph [ref=e152]: Unlimited Job Postings
                - paragraph [ref=e153]: No cap on active roles — post as many as you need
            - generic [ref=e154]:
              - generic [ref=e155]: 🤝
              - generic [ref=e156]:
                - paragraph [ref=e157]: Client & Agent Connect
                - paragraph [ref=e158]: Share pipelines, roles & updates with external clients or partners
            - generic [ref=e159]:
              - generic [ref=e160]: 🔄
              - generic [ref=e161]:
                - paragraph [ref=e162]: Delegation, Feedback & Audit
                - paragraph [ref=e163]: Assign to team, collect feedback, full audit trail
            - generic [ref=e164]:
              - generic [ref=e165]: 📊
              - generic [ref=e166]:
                - paragraph [ref=e167]: Recruiter · Manager · Director
                - paragraph [ref=e168]: Dedicated KPI dashboards for every role in your team
          - generic [ref=e170]: 🎧 Priority Support · 48h
          - generic [ref=e171]:
            - button "Choose Professional" [ref=e172] [cursor=pointer]:
              - text: Choose Professional
              - img [ref=e173]
            - paragraph [ref=e175]: Unlimited team members · Cancel anytime
        - generic [ref=e177]:
          - generic [ref=e178]:
            - heading "Business" [level=3] [ref=e179]
            - paragraph [ref=e180]: For mid-size agencies and growing recruitment teams.
          - generic [ref=e181]:
            - generic [ref=e182]:
              - generic [ref=e183]: $999
              - generic [ref=e184]: / month
            - generic [ref=e185]:
              - generic [ref=e186]: 💳
              - generic [ref=e187]:
                - paragraph [ref=e188]: $999 AI credits included
                - paragraph [ref=e189]: Full amount loaded into your AI wallet
          - generic [ref=e190]:
            - paragraph [ref=e191]: Typical monthly AI usage
            - generic [ref=e192]:
              - generic [ref=e193]:
                - generic [ref=e194]: ~2,000
                - generic [ref=e195]: candidates screened
              - generic [ref=e196]:
                - generic [ref=e197]: ~40
                - generic [ref=e198]: AI video rounds
            - paragraph [ref=e199]: 📌 Illustrative averages — soft guidance only. No hard stop at these numbers.
          - generic [ref=e200]:
            - generic [ref=e201]:
              - generic [ref=e202]: ⚡
              - generic [ref=e203]:
                - paragraph [ref=e204]: AI CV Reports
                - paragraph [ref=e205]: Every resume scored, ranked & explained instantly
            - generic [ref=e206]:
              - generic [ref=e207]: 🎥
              - generic [ref=e208]:
                - paragraph [ref=e209]: AI Video Interviews + Reports
                - paragraph [ref=e210]: Automated rounds — questions, recording & post-interview AI summary
            - generic [ref=e211]:
              - generic [ref=e212]: ❓
              - generic [ref=e213]:
                - paragraph [ref=e214]: Auto Interview Questions
                - paragraph [ref=e215]: Role-specific questions generated before every round
            - generic [ref=e216]:
              - generic [ref=e217]: 📋
              - generic [ref=e218]:
                - paragraph [ref=e219]: Unlimited Job Postings
                - paragraph [ref=e220]: No cap on active roles — post as many as you need
            - generic [ref=e221]:
              - generic [ref=e222]: 🤝
              - generic [ref=e223]:
                - paragraph [ref=e224]: Client & Agent Connect
                - paragraph [ref=e225]: Share pipelines, roles & updates with external clients or partners
            - generic [ref=e226]:
              - generic [ref=e227]: 🔄
              - generic [ref=e228]:
                - paragraph [ref=e229]: Delegation, Feedback & Audit
                - paragraph [ref=e230]: Assign to team, collect feedback, full audit trail
            - generic [ref=e231]:
              - generic [ref=e232]: 📊
              - generic [ref=e233]:
                - paragraph [ref=e234]: Recruiter · Manager · Director
                - paragraph [ref=e235]: Dedicated KPI dashboards for every role in your team
          - generic [ref=e237]: 🎧 Business Support · 24h
          - generic [ref=e238]:
            - button "Choose Business" [ref=e239] [cursor=pointer]:
              - text: Choose Business
              - img [ref=e240]
            - paragraph [ref=e242]: Unlimited team members · Cancel anytime
        - generic [ref=e243]:
          - generic [ref=e244]: ⭐ Most Popular · Best for Agencies
          - generic [ref=e245]:
            - generic [ref=e246]:
              - heading "Large" [level=3] [ref=e247]
              - paragraph [ref=e248]: For scaling recruitment agencies that need serious AI infrastructure.
            - generic [ref=e249]:
              - generic [ref=e250]:
                - generic [ref=e251]: $2,999
                - generic [ref=e252]: / month
              - generic [ref=e253]:
                - generic [ref=e254]: 💳
                - generic [ref=e255]:
                  - paragraph [ref=e256]: $2,999 AI credits included
                  - paragraph [ref=e257]: Full amount loaded into your AI wallet
            - generic [ref=e258]:
              - paragraph [ref=e259]: Typical monthly AI usage
              - generic [ref=e260]:
                - generic [ref=e261]:
                  - generic [ref=e262]: ~6,000
                  - generic [ref=e263]: candidates screened
                - generic [ref=e264]:
                  - generic [ref=e265]: ~120
                  - generic [ref=e266]: AI video rounds
              - paragraph [ref=e267]: 📌 Illustrative averages — soft guidance only. No hard stop at these numbers.
            - generic [ref=e268]:
              - generic [ref=e269]:
                - generic [ref=e270]: ⚡
                - generic [ref=e271]:
                  - paragraph [ref=e272]: AI CV Reports
                  - paragraph [ref=e273]: Every resume scored, ranked & explained instantly
              - generic [ref=e274]:
                - generic [ref=e275]: 🎥
                - generic [ref=e276]:
                  - paragraph [ref=e277]: AI Video Interviews + Reports
                  - paragraph [ref=e278]: Automated rounds — questions, recording & post-interview AI summary
              - generic [ref=e279]:
                - generic [ref=e280]: ❓
                - generic [ref=e281]:
                  - paragraph [ref=e282]: Auto Interview Questions
                  - paragraph [ref=e283]: Role-specific questions generated before every round
              - generic [ref=e284]:
                - generic [ref=e285]: 📋
                - generic [ref=e286]:
                  - paragraph [ref=e287]: Unlimited Job Postings
                  - paragraph [ref=e288]: No cap on active roles — post as many as you need
              - generic [ref=e289]:
                - generic [ref=e290]: 🤝
                - generic [ref=e291]:
                  - paragraph [ref=e292]: Client & Agent Connect
                  - paragraph [ref=e293]: Share pipelines, roles & updates with external clients or partners
              - generic [ref=e294]:
                - generic [ref=e295]: 🔄
                - generic [ref=e296]:
                  - paragraph [ref=e297]: Delegation, Feedback & Audit
                  - paragraph [ref=e298]: Assign to team, collect feedback, full audit trail
              - generic [ref=e299]:
                - generic [ref=e300]: 📊
                - generic [ref=e301]:
                  - paragraph [ref=e302]: Recruiter · Manager · Director
                  - paragraph [ref=e303]: Dedicated KPI dashboards for every role in your team
            - generic [ref=e305]: 🎧 Large Support · 12h
            - generic [ref=e306]:
              - button "Choose Large" [ref=e307] [cursor=pointer]:
                - text: Choose Large
                - img [ref=e308]
              - paragraph [ref=e310]: Unlimited team members · Cancel anytime
        - generic [ref=e312]:
          - generic [ref=e313]:
            - heading "Ultra" [level=3] [ref=e314]
            - paragraph [ref=e315]: For high-volume AI-powered hiring operations.
          - generic [ref=e316]:
            - generic [ref=e317]:
              - generic [ref=e318]: $3,999
              - generic [ref=e319]: / month
            - generic [ref=e320]:
              - generic [ref=e321]: 💳
              - generic [ref=e322]:
                - paragraph [ref=e323]: $3,999 AI credits included
                - paragraph [ref=e324]: Full amount loaded into your AI wallet
          - generic [ref=e325]:
            - paragraph [ref=e326]: Typical monthly AI usage
            - generic [ref=e327]:
              - generic [ref=e328]:
                - generic [ref=e329]: ~8,000
                - generic [ref=e330]: candidates screened
              - generic [ref=e331]:
                - generic [ref=e332]: ~160
                - generic [ref=e333]: AI video rounds
            - paragraph [ref=e334]: 📌 Illustrative averages — soft guidance only. No hard stop at these numbers.
          - generic [ref=e335]:
            - generic [ref=e336]:
              - generic [ref=e337]: ⚡
              - generic [ref=e338]:
                - paragraph [ref=e339]: AI CV Reports
                - paragraph [ref=e340]: Every resume scored, ranked & explained instantly
            - generic [ref=e341]:
              - generic [ref=e342]: 🎥
              - generic [ref=e343]:
                - paragraph [ref=e344]: AI Video Interviews + Reports
                - paragraph [ref=e345]: Automated rounds — questions, recording & post-interview AI summary
            - generic [ref=e346]:
              - generic [ref=e347]: ❓
              - generic [ref=e348]:
                - paragraph [ref=e349]: Auto Interview Questions
                - paragraph [ref=e350]: Role-specific questions generated before every round
            - generic [ref=e351]:
              - generic [ref=e352]: 📋
              - generic [ref=e353]:
                - paragraph [ref=e354]: Unlimited Job Postings
                - paragraph [ref=e355]: No cap on active roles — post as many as you need
            - generic [ref=e356]:
              - generic [ref=e357]: 🤝
              - generic [ref=e358]:
                - paragraph [ref=e359]: Client & Agent Connect
                - paragraph [ref=e360]: Share pipelines, roles & updates with external clients or partners
            - generic [ref=e361]:
              - generic [ref=e362]: 🔄
              - generic [ref=e363]:
                - paragraph [ref=e364]: Delegation, Feedback & Audit
                - paragraph [ref=e365]: Assign to team, collect feedback, full audit trail
            - generic [ref=e366]:
              - generic [ref=e367]: 📊
              - generic [ref=e368]:
                - paragraph [ref=e369]: Recruiter · Manager · Director
                - paragraph [ref=e370]: Dedicated KPI dashboards for every role in your team
          - generic [ref=e372]: 🎧 Ultra Support · 6h
          - generic [ref=e373]:
            - button "Choose Ultra" [ref=e374] [cursor=pointer]:
              - text: Choose Ultra
              - img [ref=e375]
            - paragraph [ref=e377]: Unlimited team members · Cancel anytime
        - generic [ref=e378]:
          - generic [ref=e379]: 🔥 Ultimate Scale
          - generic [ref=e380]:
            - generic [ref=e381]:
              - heading "Enterprise" [level=3] [ref=e382]
              - paragraph [ref=e383]: Ultimate scale for enterprise hiring infrastructure.
            - generic [ref=e384]:
              - generic [ref=e385]:
                - generic [ref=e386]: $4,999
                - generic [ref=e387]: / month
              - generic [ref=e388]:
                - generic [ref=e389]: 💳
                - generic [ref=e390]:
                  - paragraph [ref=e391]: $4,999 AI credits included
                  - paragraph [ref=e392]: Full amount loaded into your AI wallet
            - generic [ref=e393]:
              - paragraph [ref=e394]: Typical monthly AI usage
              - generic [ref=e395]:
                - generic [ref=e396]:
                  - generic [ref=e397]: ~10,000
                  - generic [ref=e398]: candidates screened
                - generic [ref=e399]:
                  - generic [ref=e400]: ~200
                  - generic [ref=e401]: AI video rounds
              - paragraph [ref=e402]: 📞 Talk to sales — no preset limits. Volume scales to your needs.
            - generic [ref=e403]:
              - generic [ref=e404]:
                - generic [ref=e405]: ⚡
                - generic [ref=e406]:
                  - paragraph [ref=e407]: AI CV Reports
                  - paragraph [ref=e408]: Every resume scored, ranked & explained instantly
              - generic [ref=e409]:
                - generic [ref=e410]: 🎥
                - generic [ref=e411]:
                  - paragraph [ref=e412]: AI Video Interviews + Reports
                  - paragraph [ref=e413]: Automated rounds — questions, recording & post-interview AI summary
              - generic [ref=e414]:
                - generic [ref=e415]: ❓
                - generic [ref=e416]:
                  - paragraph [ref=e417]: Auto Interview Questions
                  - paragraph [ref=e418]: Role-specific questions generated before every round
              - generic [ref=e419]:
                - generic [ref=e420]: 📋
                - generic [ref=e421]:
                  - paragraph [ref=e422]: Unlimited Job Postings
                  - paragraph [ref=e423]: No cap on active roles — post as many as you need
              - generic [ref=e424]:
                - generic [ref=e425]: 🤝
                - generic [ref=e426]:
                  - paragraph [ref=e427]: Client & Agent Connect
                  - paragraph [ref=e428]: Share pipelines, roles & updates with external clients or partners
              - generic [ref=e429]:
                - generic [ref=e430]: 🔄
                - generic [ref=e431]:
                  - paragraph [ref=e432]: Delegation, Feedback & Audit
                  - paragraph [ref=e433]: Assign to team, collect feedback, full audit trail
              - generic [ref=e434]:
                - generic [ref=e435]: 📊
                - generic [ref=e436]:
                  - paragraph [ref=e437]: Recruiter · Manager · Director
                  - paragraph [ref=e438]: Dedicated KPI dashboards for every role in your team
            - generic [ref=e440]: 🎧 Enterprise SLA · 2h critical
            - generic [ref=e441]:
              - button "Talk to Sales" [ref=e442] [cursor=pointer]:
                - text: Talk to Sales
                - img [ref=e443]
              - paragraph [ref=e445]: Unlimited team members · Enterprise onboarding
    - generic [ref=e446]:
      - button "Not ready to commit? Skip for Free — start your 7-day trial" [ref=e447] [cursor=pointer]:
        - text: Not ready to commit?
        - generic [ref=e448]: Skip for Free — start your 7-day trial
        - img [ref=e449]
      - generic [ref=e451]: No credit card required · cancel anytime
    - generic [ref=e453]:
      - heading "Common Questions" [level=2] [ref=e454]
      - paragraph [ref=e455]: Straight answers on how pricing and plans work
      - generic [ref=e456]:
        - generic [ref=e457]:
          - heading "Can I switch plans at any time?" [level=3] [ref=e458]
          - paragraph [ref=e459]: Yes — upgrade or downgrade whenever you need. Changes apply immediately with prorated billing.
        - generic [ref=e460]:
          - heading "How does the annual plan work?" [level=3] [ref=e461]
          - paragraph [ref=e462]: You pay for 10 months and stay active for 12 — saving roughly 17% on cost. Your monthly usage estimates and wallet credits also increase by 20%.
        - generic [ref=e463]:
          - heading "What are the wallet credits?" [level=3] [ref=e464]
          - paragraph [ref=e465]: Every plan includes AI usage wallet credits equal to your subscription cost. These cover CV parsing, video interviews, and question generation. If you exceed them, additional usage is billed automatically at standard rates.
        - generic [ref=e466]:
          - heading "What do the usage estimates mean?" [level=3] [ref=e467]
          - paragraph [ref=e468]: The CV and interview numbers are indicative ranges based on typical usage at each tier. They are not hard caps — actual consumption depends on your interview duration and workflow. Overage draws from your wallet balance automatically.
        - generic [ref=e469]:
          - heading "Do you offer custom pricing for very high volume?" [level=3] [ref=e470]
          - paragraph [ref=e471]: Absolutely. For teams needing more than Enterprise-scale volume or custom integrations, contact our sales team for a tailored proposal.
    - contentinfo [ref=e472]:
      - generic [ref=e473]:
        - generic [ref=e474]:
          - generic [ref=e475]:
            - heading "HireGenAI" [level=3] [ref=e476]
            - paragraph [ref=e477]: By SKYGENAI
            - paragraph [ref=e478]: HireGenAI pre-screens and interviews candidates, helping you shortlist talent 20x faster and more efficiently.
            - paragraph [ref=e479]:
              - text: "Email:"
              - link "support@hire-genai.com" [ref=e480] [cursor=pointer]:
                - /url: mailto:support@hire-genai.com
            - generic [ref=e481]:
              - link [ref=e482] [cursor=pointer]:
                - /url: "#"
                - img [ref=e483]
              - link [ref=e485] [cursor=pointer]:
                - /url: "#"
                - img [ref=e486]
              - link [ref=e489] [cursor=pointer]:
                - /url: "#"
                - img [ref=e490]
              - link [ref=e493] [cursor=pointer]:
                - /url: https://www.linkedin.com/company/hire-genai
                - img [ref=e494]
          - generic [ref=e498]:
            - heading "Product" [level=4] [ref=e499]
            - list [ref=e500]:
              - listitem [ref=e501]:
                - link "Try the Demo" [ref=e502] [cursor=pointer]:
                  - /url: /demo-en
              - listitem [ref=e503]:
                - link "Pricing" [ref=e504] [cursor=pointer]:
                  - /url: /pricing
              - listitem [ref=e505]:
                - link "FAQs" [ref=e506] [cursor=pointer]:
                  - /url: /?scroll=faq
          - generic [ref=e507]:
            - heading "Company" [level=4] [ref=e508]
            - list [ref=e509]:
              - listitem [ref=e510]:
                - link "About us" [ref=e511] [cursor=pointer]:
                  - /url: /about
              - listitem [ref=e512]:
                - link "Contact" [ref=e513] [cursor=pointer]:
                  - /url: /contact
              - listitem [ref=e514]:
                - link "Book a Meeting" [ref=e515] [cursor=pointer]:
                  - /url: /book-meeting
              - listitem [ref=e516]:
                - link "Admin" [ref=e517] [cursor=pointer]:
                  - /url: /owner-login
          - generic [ref=e518]:
            - heading "Legal" [level=4] [ref=e519]
            - list [ref=e520]:
              - listitem [ref=e521]:
                - link "Privacy Policy" [ref=e522] [cursor=pointer]:
                  - /url: /privacy
              - listitem [ref=e523]:
                - link "Terms and Conditions" [ref=e524] [cursor=pointer]:
                  - /url: /terms
          - generic [ref=e526]:
            - generic [ref=e527]:
              - paragraph [ref=e528]: Trustpilot
              - generic [ref=e529]:
                - img [ref=e530]
                - img [ref=e532]
                - img [ref=e534]
                - img [ref=e536]
                - img [ref=e538]
              - paragraph [ref=e540]: TrustScore 4.5
            - generic [ref=e541]:
              - generic [ref=e542]:
                - img [ref=e543]
                - paragraph [ref=e546]: GDPR COMPLIANT
              - paragraph [ref=e547]: Your data is secure and compliant
        - paragraph [ref=e549]: © 2025 HireGenAI. All rights reserved.
  - region "Notifications (F8)":
    - list
  - button "Open Next.js Dev Tools" [ref=e555] [cursor=pointer]:
    - img [ref=e556]
  - alert [ref=e559]
```

# Test source

```ts
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
  423 |       await expect(page.getByText(feature, { exact: false }).first()).toBeVisible({
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
> 451 |     await page.getByRole("button", { name: /^Annual$/i }).click();
      |                                                           ^ Error: locator.click: Test timeout of 30000ms exceeded.
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
  524 |     await mockSignupComplete(page, { checkoutUrl: STRIPE_CHECKOUT_URL });
  525 |     await mockStripeStatus(page, MOCK_STRIPE_STATUS_NONE);
  526 | 
  527 |     // Mock Stripe checkout create (in case the app calls it separately)
  528 |     await mockStripeCheckoutCreate(page);
  529 |     await mockStripeCheckoutAlt(page);
  530 | 
  531 |     // Intercept the redirect to Stripe's checkout domain so we don't actually leave
  532 |     let stripeRedirectDetected = false;
  533 |     await page.route("https://checkout.stripe.com/**", async (route) => {
  534 |       stripeRedirectDetected = true;
  535 |       // Simulate Stripe redirecting back with success query params
  536 |       await route.fulfill({
  537 |         status: 302,
  538 |         headers: {
  539 |           Location: "http://localhost:3000/payment?session_id=cs_test_mock_session_abc123&status=success",
  540 |         },
  541 |         body: "",
  542 |       });
  543 |     });
  544 | 
  545 |     // Also mock the payment success/return page API calls
  546 |     await mockStripeVerify(page, { ok: true, status: "active" });
  547 |     await mockStripeConfirm(page);
  548 | 
  549 |     await completeFiveStepSignup(page, "Starter");
  550 | 
  551 |     // After signup complete the app should either:
```