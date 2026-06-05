# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 03-pricing-subscription.spec.ts >> Pricing — Billing Toggle State >> Billing cycle passes correctly as query param to signup URL
- Location: tests\e2e\03-pricing-subscription.spec.ts:974:7

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
- generic [active] [ref=e1]:
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
      - button "Monthly" [ref=e33] [cursor=pointer]
      - button "Annual Save 17%" [ref=e34] [cursor=pointer]:
        - text: Annual
        - generic [ref=e35]: Save 17%
    - paragraph [ref=e36]: "📅 Annual: pay for 10 months · stay active for 12 · wallet credits & usage increase by 20%"
    - generic [ref=e37]:
      - generic [ref=e38]:
        - paragraph [ref=e39]: Not sure which package is right for you?
        - paragraph [ref=e40]:
          - text: Take our
          - link "ROI Assessment" [ref=e41] [cursor=pointer]:
            - /url: /roi
          - text: to receive a personalized recommendation based on your hiring volume, recruitment costs, and expected savings.
      - generic [ref=e42]:
        - generic [ref=e44]:
          - generic [ref=e45]:
            - heading "Starter" [level=3] [ref=e46]
            - paragraph [ref=e47]: For startups and small teams running their first AI-powered hiring workflows.
          - generic [ref=e48]:
            - generic [ref=e49]:
              - generic [ref=e50]: $990
              - generic [ref=e51]: / year
            - generic [ref=e52]:
              - generic [ref=e53]: 💳
              - generic [ref=e54]:
                - paragraph [ref=e55]: $119 AI credits included
                - paragraph [ref=e56]: +20% extra credits vs monthly billing
          - generic [ref=e57]:
            - paragraph [ref=e58]: Typical monthly AI usage
            - generic [ref=e59]:
              - generic [ref=e60]:
                - generic [ref=e61]: ~240
                - generic [ref=e62]: candidates screened
              - generic [ref=e63]:
                - generic [ref=e64]: ~5
                - generic [ref=e65]: AI video rounds
            - paragraph [ref=e66]: 📌 Illustrative averages — soft guidance only. No hard stop at these numbers.
          - generic [ref=e67]:
            - generic [ref=e68]:
              - generic [ref=e69]: ⚡
              - generic [ref=e70]:
                - paragraph [ref=e71]: AI CV Reports
                - paragraph [ref=e72]: Every resume scored, ranked & explained instantly
            - generic [ref=e73]:
              - generic [ref=e74]: 🎥
              - generic [ref=e75]:
                - paragraph [ref=e76]: AI Video Interviews + Reports
                - paragraph [ref=e77]: Automated rounds — questions, recording & post-interview AI summary
            - generic [ref=e78]:
              - generic [ref=e79]: ❓
              - generic [ref=e80]:
                - paragraph [ref=e81]: Auto Interview Questions
                - paragraph [ref=e82]: Role-specific questions generated before every round
            - generic [ref=e83]:
              - generic [ref=e84]: 📋
              - generic [ref=e85]:
                - paragraph [ref=e86]: Unlimited Job Postings
                - paragraph [ref=e87]: No cap on active roles — post as many as you need
            - generic [ref=e88]:
              - generic [ref=e89]: 🤝
              - generic [ref=e90]:
                - paragraph [ref=e91]: Client & Agent Connect
                - paragraph [ref=e92]: Share pipelines, roles & updates with external clients or partners
            - generic [ref=e93]:
              - generic [ref=e94]: 🔄
              - generic [ref=e95]:
                - paragraph [ref=e96]: Delegation, Feedback & Audit
                - paragraph [ref=e97]: Assign to team, collect feedback, full audit trail
            - generic [ref=e98]:
              - generic [ref=e99]: 📊
              - generic [ref=e100]:
                - paragraph [ref=e101]: Recruiter · Manager · Director
                - paragraph [ref=e102]: Dedicated KPI dashboards for every role in your team
          - generic [ref=e104]: 🎧 Standard Support · 72h
          - generic [ref=e105]:
            - button "Choose Starter" [ref=e106] [cursor=pointer]:
              - text: Choose Starter
              - img [ref=e107]
            - paragraph [ref=e109]: Unlimited team members · Cancel anytime
        - generic [ref=e111]:
          - generic [ref=e112]:
            - heading "Professional" [level=3] [ref=e113]
            - paragraph [ref=e114]: For agencies scaling their recruiting operations.
          - generic [ref=e115]:
            - generic [ref=e116]:
              - generic [ref=e117]: $4,990
              - generic [ref=e118]: / year
            - generic [ref=e119]:
              - generic [ref=e120]: 💳
              - generic [ref=e121]:
                - paragraph [ref=e122]: $599 AI credits included
                - paragraph [ref=e123]: +20% extra credits vs monthly billing
          - generic [ref=e124]:
            - paragraph [ref=e125]: Typical monthly AI usage
            - generic [ref=e126]:
              - generic [ref=e127]:
                - generic [ref=e128]: ~1,200
                - generic [ref=e129]: candidates screened
              - generic [ref=e130]:
                - generic [ref=e131]: ~24
                - generic [ref=e132]: AI video rounds
            - paragraph [ref=e133]: 📌 Illustrative averages — soft guidance only. No hard stop at these numbers.
          - generic [ref=e134]:
            - generic [ref=e135]:
              - generic [ref=e136]: ⚡
              - generic [ref=e137]:
                - paragraph [ref=e138]: AI CV Reports
                - paragraph [ref=e139]: Every resume scored, ranked & explained instantly
            - generic [ref=e140]:
              - generic [ref=e141]: 🎥
              - generic [ref=e142]:
                - paragraph [ref=e143]: AI Video Interviews + Reports
                - paragraph [ref=e144]: Automated rounds — questions, recording & post-interview AI summary
            - generic [ref=e145]:
              - generic [ref=e146]: ❓
              - generic [ref=e147]:
                - paragraph [ref=e148]: Auto Interview Questions
                - paragraph [ref=e149]: Role-specific questions generated before every round
            - generic [ref=e150]:
              - generic [ref=e151]: 📋
              - generic [ref=e152]:
                - paragraph [ref=e153]: Unlimited Job Postings
                - paragraph [ref=e154]: No cap on active roles — post as many as you need
            - generic [ref=e155]:
              - generic [ref=e156]: 🤝
              - generic [ref=e157]:
                - paragraph [ref=e158]: Client & Agent Connect
                - paragraph [ref=e159]: Share pipelines, roles & updates with external clients or partners
            - generic [ref=e160]:
              - generic [ref=e161]: 🔄
              - generic [ref=e162]:
                - paragraph [ref=e163]: Delegation, Feedback & Audit
                - paragraph [ref=e164]: Assign to team, collect feedback, full audit trail
            - generic [ref=e165]:
              - generic [ref=e166]: 📊
              - generic [ref=e167]:
                - paragraph [ref=e168]: Recruiter · Manager · Director
                - paragraph [ref=e169]: Dedicated KPI dashboards for every role in your team
          - generic [ref=e171]: 🎧 Priority Support · 48h
          - generic [ref=e172]:
            - button "Choose Professional" [ref=e173] [cursor=pointer]:
              - text: Choose Professional
              - img [ref=e174]
            - paragraph [ref=e176]: Unlimited team members · Cancel anytime
        - generic [ref=e178]:
          - generic [ref=e179]:
            - heading "Business" [level=3] [ref=e180]
            - paragraph [ref=e181]: For mid-size agencies and growing recruitment teams.
          - generic [ref=e182]:
            - generic [ref=e183]:
              - generic [ref=e184]: $9,990
              - generic [ref=e185]: / year
            - generic [ref=e186]:
              - generic [ref=e187]: 💳
              - generic [ref=e188]:
                - paragraph [ref=e189]: $1,199 AI credits included
                - paragraph [ref=e190]: +20% extra credits vs monthly billing
          - generic [ref=e191]:
            - paragraph [ref=e192]: Typical monthly AI usage
            - generic [ref=e193]:
              - generic [ref=e194]:
                - generic [ref=e195]: ~2,400
                - generic [ref=e196]: candidates screened
              - generic [ref=e197]:
                - generic [ref=e198]: ~48
                - generic [ref=e199]: AI video rounds
            - paragraph [ref=e200]: 📌 Illustrative averages — soft guidance only. No hard stop at these numbers.
          - generic [ref=e201]:
            - generic [ref=e202]:
              - generic [ref=e203]: ⚡
              - generic [ref=e204]:
                - paragraph [ref=e205]: AI CV Reports
                - paragraph [ref=e206]: Every resume scored, ranked & explained instantly
            - generic [ref=e207]:
              - generic [ref=e208]: 🎥
              - generic [ref=e209]:
                - paragraph [ref=e210]: AI Video Interviews + Reports
                - paragraph [ref=e211]: Automated rounds — questions, recording & post-interview AI summary
            - generic [ref=e212]:
              - generic [ref=e213]: ❓
              - generic [ref=e214]:
                - paragraph [ref=e215]: Auto Interview Questions
                - paragraph [ref=e216]: Role-specific questions generated before every round
            - generic [ref=e217]:
              - generic [ref=e218]: 📋
              - generic [ref=e219]:
                - paragraph [ref=e220]: Unlimited Job Postings
                - paragraph [ref=e221]: No cap on active roles — post as many as you need
            - generic [ref=e222]:
              - generic [ref=e223]: 🤝
              - generic [ref=e224]:
                - paragraph [ref=e225]: Client & Agent Connect
                - paragraph [ref=e226]: Share pipelines, roles & updates with external clients or partners
            - generic [ref=e227]:
              - generic [ref=e228]: 🔄
              - generic [ref=e229]:
                - paragraph [ref=e230]: Delegation, Feedback & Audit
                - paragraph [ref=e231]: Assign to team, collect feedback, full audit trail
            - generic [ref=e232]:
              - generic [ref=e233]: 📊
              - generic [ref=e234]:
                - paragraph [ref=e235]: Recruiter · Manager · Director
                - paragraph [ref=e236]: Dedicated KPI dashboards for every role in your team
          - generic [ref=e238]: 🎧 Business Support · 24h
          - generic [ref=e239]:
            - button "Choose Business" [ref=e240] [cursor=pointer]:
              - text: Choose Business
              - img [ref=e241]
            - paragraph [ref=e243]: Unlimited team members · Cancel anytime
        - generic [ref=e244]:
          - generic [ref=e245]: ⭐ Most Popular · Best for Agencies
          - generic [ref=e246]:
            - generic [ref=e247]:
              - heading "Large" [level=3] [ref=e248]
              - paragraph [ref=e249]: For scaling recruitment agencies that need serious AI infrastructure.
            - generic [ref=e250]:
              - generic [ref=e251]:
                - generic [ref=e252]: $29,990
                - generic [ref=e253]: / year
              - generic [ref=e254]:
                - generic [ref=e255]: 💳
                - generic [ref=e256]:
                  - paragraph [ref=e257]: $3,599 AI credits included
                  - paragraph [ref=e258]: +20% extra credits vs monthly billing
            - generic [ref=e259]:
              - paragraph [ref=e260]: Typical monthly AI usage
              - generic [ref=e261]:
                - generic [ref=e262]:
                  - generic [ref=e263]: ~7,200
                  - generic [ref=e264]: candidates screened
                - generic [ref=e265]:
                  - generic [ref=e266]: ~144
                  - generic [ref=e267]: AI video rounds
              - paragraph [ref=e268]: 📌 Illustrative averages — soft guidance only. No hard stop at these numbers.
            - generic [ref=e269]:
              - generic [ref=e270]:
                - generic [ref=e271]: ⚡
                - generic [ref=e272]:
                  - paragraph [ref=e273]: AI CV Reports
                  - paragraph [ref=e274]: Every resume scored, ranked & explained instantly
              - generic [ref=e275]:
                - generic [ref=e276]: 🎥
                - generic [ref=e277]:
                  - paragraph [ref=e278]: AI Video Interviews + Reports
                  - paragraph [ref=e279]: Automated rounds — questions, recording & post-interview AI summary
              - generic [ref=e280]:
                - generic [ref=e281]: ❓
                - generic [ref=e282]:
                  - paragraph [ref=e283]: Auto Interview Questions
                  - paragraph [ref=e284]: Role-specific questions generated before every round
              - generic [ref=e285]:
                - generic [ref=e286]: 📋
                - generic [ref=e287]:
                  - paragraph [ref=e288]: Unlimited Job Postings
                  - paragraph [ref=e289]: No cap on active roles — post as many as you need
              - generic [ref=e290]:
                - generic [ref=e291]: 🤝
                - generic [ref=e292]:
                  - paragraph [ref=e293]: Client & Agent Connect
                  - paragraph [ref=e294]: Share pipelines, roles & updates with external clients or partners
              - generic [ref=e295]:
                - generic [ref=e296]: 🔄
                - generic [ref=e297]:
                  - paragraph [ref=e298]: Delegation, Feedback & Audit
                  - paragraph [ref=e299]: Assign to team, collect feedback, full audit trail
              - generic [ref=e300]:
                - generic [ref=e301]: 📊
                - generic [ref=e302]:
                  - paragraph [ref=e303]: Recruiter · Manager · Director
                  - paragraph [ref=e304]: Dedicated KPI dashboards for every role in your team
            - generic [ref=e306]: 🎧 Large Support · 12h
            - generic [ref=e307]:
              - button "Choose Large" [ref=e308] [cursor=pointer]:
                - text: Choose Large
                - img [ref=e309]
              - paragraph [ref=e311]: Unlimited team members · Cancel anytime
        - generic [ref=e313]:
          - generic [ref=e314]:
            - heading "Ultra" [level=3] [ref=e315]
            - paragraph [ref=e316]: For high-volume AI-powered hiring operations.
          - generic [ref=e317]:
            - generic [ref=e318]:
              - generic [ref=e319]: $39,990
              - generic [ref=e320]: / year
            - generic [ref=e321]:
              - generic [ref=e322]: 💳
              - generic [ref=e323]:
                - paragraph [ref=e324]: $4,799 AI credits included
                - paragraph [ref=e325]: +20% extra credits vs monthly billing
          - generic [ref=e326]:
            - paragraph [ref=e327]: Typical monthly AI usage
            - generic [ref=e328]:
              - generic [ref=e329]:
                - generic [ref=e330]: ~9,600
                - generic [ref=e331]: candidates screened
              - generic [ref=e332]:
                - generic [ref=e333]: ~192
                - generic [ref=e334]: AI video rounds
            - paragraph [ref=e335]: 📌 Illustrative averages — soft guidance only. No hard stop at these numbers.
          - generic [ref=e336]:
            - generic [ref=e337]:
              - generic [ref=e338]: ⚡
              - generic [ref=e339]:
                - paragraph [ref=e340]: AI CV Reports
                - paragraph [ref=e341]: Every resume scored, ranked & explained instantly
            - generic [ref=e342]:
              - generic [ref=e343]: 🎥
              - generic [ref=e344]:
                - paragraph [ref=e345]: AI Video Interviews + Reports
                - paragraph [ref=e346]: Automated rounds — questions, recording & post-interview AI summary
            - generic [ref=e347]:
              - generic [ref=e348]: ❓
              - generic [ref=e349]:
                - paragraph [ref=e350]: Auto Interview Questions
                - paragraph [ref=e351]: Role-specific questions generated before every round
            - generic [ref=e352]:
              - generic [ref=e353]: 📋
              - generic [ref=e354]:
                - paragraph [ref=e355]: Unlimited Job Postings
                - paragraph [ref=e356]: No cap on active roles — post as many as you need
            - generic [ref=e357]:
              - generic [ref=e358]: 🤝
              - generic [ref=e359]:
                - paragraph [ref=e360]: Client & Agent Connect
                - paragraph [ref=e361]: Share pipelines, roles & updates with external clients or partners
            - generic [ref=e362]:
              - generic [ref=e363]: 🔄
              - generic [ref=e364]:
                - paragraph [ref=e365]: Delegation, Feedback & Audit
                - paragraph [ref=e366]: Assign to team, collect feedback, full audit trail
            - generic [ref=e367]:
              - generic [ref=e368]: 📊
              - generic [ref=e369]:
                - paragraph [ref=e370]: Recruiter · Manager · Director
                - paragraph [ref=e371]: Dedicated KPI dashboards for every role in your team
          - generic [ref=e373]: 🎧 Ultra Support · 6h
          - generic [ref=e374]:
            - button "Choose Ultra" [ref=e375] [cursor=pointer]:
              - text: Choose Ultra
              - img [ref=e376]
            - paragraph [ref=e378]: Unlimited team members · Cancel anytime
        - generic [ref=e379]:
          - generic [ref=e380]: 🔥 Ultimate Scale
          - generic [ref=e381]:
            - generic [ref=e382]:
              - heading "Enterprise" [level=3] [ref=e383]
              - paragraph [ref=e384]: Ultimate scale for enterprise hiring infrastructure.
            - generic [ref=e385]:
              - generic [ref=e386]:
                - generic [ref=e387]: $49,990
                - generic [ref=e388]: / year
              - generic [ref=e389]:
                - generic [ref=e390]: 💳
                - generic [ref=e391]:
                  - paragraph [ref=e392]: $5,999 AI credits included
                  - paragraph [ref=e393]: +20% extra credits vs monthly billing
            - generic [ref=e394]:
              - paragraph [ref=e395]: Typical monthly AI usage
              - generic [ref=e396]:
                - generic [ref=e397]:
                  - generic [ref=e398]: ~12,000
                  - generic [ref=e399]: candidates screened
                - generic [ref=e400]:
                  - generic [ref=e401]: ~240
                  - generic [ref=e402]: AI video rounds
              - paragraph [ref=e403]: 📞 Talk to sales — no preset limits. Volume scales to your needs.
            - generic [ref=e404]:
              - generic [ref=e405]:
                - generic [ref=e406]: ⚡
                - generic [ref=e407]:
                  - paragraph [ref=e408]: AI CV Reports
                  - paragraph [ref=e409]: Every resume scored, ranked & explained instantly
              - generic [ref=e410]:
                - generic [ref=e411]: 🎥
                - generic [ref=e412]:
                  - paragraph [ref=e413]: AI Video Interviews + Reports
                  - paragraph [ref=e414]: Automated rounds — questions, recording & post-interview AI summary
              - generic [ref=e415]:
                - generic [ref=e416]: ❓
                - generic [ref=e417]:
                  - paragraph [ref=e418]: Auto Interview Questions
                  - paragraph [ref=e419]: Role-specific questions generated before every round
              - generic [ref=e420]:
                - generic [ref=e421]: 📋
                - generic [ref=e422]:
                  - paragraph [ref=e423]: Unlimited Job Postings
                  - paragraph [ref=e424]: No cap on active roles — post as many as you need
              - generic [ref=e425]:
                - generic [ref=e426]: 🤝
                - generic [ref=e427]:
                  - paragraph [ref=e428]: Client & Agent Connect
                  - paragraph [ref=e429]: Share pipelines, roles & updates with external clients or partners
              - generic [ref=e430]:
                - generic [ref=e431]: 🔄
                - generic [ref=e432]:
                  - paragraph [ref=e433]: Delegation, Feedback & Audit
                  - paragraph [ref=e434]: Assign to team, collect feedback, full audit trail
              - generic [ref=e435]:
                - generic [ref=e436]: 📊
                - generic [ref=e437]:
                  - paragraph [ref=e438]: Recruiter · Manager · Director
                  - paragraph [ref=e439]: Dedicated KPI dashboards for every role in your team
            - generic [ref=e441]: 🎧 Enterprise SLA · 2h critical
            - generic [ref=e442]:
              - button "Talk to Sales" [ref=e443] [cursor=pointer]:
                - text: Talk to Sales
                - img [ref=e444]
              - paragraph [ref=e446]: Unlimited team members · Enterprise onboarding
    - generic [ref=e447]:
      - button "Not ready to commit? Skip for Free — start your 7-day trial" [ref=e448] [cursor=pointer]:
        - text: Not ready to commit?
        - generic [ref=e449]: Skip for Free — start your 7-day trial
        - img [ref=e450]
      - generic [ref=e452]: No credit card required · cancel anytime
    - generic [ref=e454]:
      - heading "Common Questions" [level=2] [ref=e455]
      - paragraph [ref=e456]: Straight answers on how pricing and plans work
      - generic [ref=e457]:
        - generic [ref=e458]:
          - heading "Can I switch plans at any time?" [level=3] [ref=e459]
          - paragraph [ref=e460]: Yes — upgrade or downgrade whenever you need. Changes apply immediately with prorated billing.
        - generic [ref=e461]:
          - heading "How does the annual plan work?" [level=3] [ref=e462]
          - paragraph [ref=e463]: You pay for 10 months and stay active for 12 — saving roughly 17% on cost. Your monthly usage estimates and wallet credits also increase by 20%.
        - generic [ref=e464]:
          - heading "What are the wallet credits?" [level=3] [ref=e465]
          - paragraph [ref=e466]: Every plan includes AI usage wallet credits equal to your subscription cost. These cover CV parsing, video interviews, and question generation. If you exceed them, additional usage is billed automatically at standard rates.
        - generic [ref=e467]:
          - heading "What do the usage estimates mean?" [level=3] [ref=e468]
          - paragraph [ref=e469]: The CV and interview numbers are indicative ranges based on typical usage at each tier. They are not hard caps — actual consumption depends on your interview duration and workflow. Overage draws from your wallet balance automatically.
        - generic [ref=e470]:
          - heading "Do you offer custom pricing for very high volume?" [level=3] [ref=e471]
          - paragraph [ref=e472]: Absolutely. For teams needing more than Enterprise-scale volume or custom integrations, contact our sales team for a tailored proposal.
    - contentinfo [ref=e473]:
      - generic [ref=e474]:
        - generic [ref=e475]:
          - generic [ref=e476]:
            - heading "HireGenAI" [level=3] [ref=e477]
            - paragraph [ref=e478]: By SKYGENAI
            - paragraph [ref=e479]: HireGenAI pre-screens and interviews candidates, helping you shortlist talent 20x faster and more efficiently.
            - paragraph [ref=e480]:
              - text: "Email:"
              - link "support@hire-genai.com" [ref=e481] [cursor=pointer]:
                - /url: mailto:support@hire-genai.com
            - generic [ref=e482]:
              - link [ref=e483] [cursor=pointer]:
                - /url: "#"
                - img [ref=e484]
              - link [ref=e486] [cursor=pointer]:
                - /url: "#"
                - img [ref=e487]
              - link [ref=e490] [cursor=pointer]:
                - /url: "#"
                - img [ref=e491]
              - link [ref=e494] [cursor=pointer]:
                - /url: https://www.linkedin.com/company/hire-genai
                - img [ref=e495]
          - generic [ref=e499]:
            - heading "Product" [level=4] [ref=e500]
            - list [ref=e501]:
              - listitem [ref=e502]:
                - link "Try the Demo" [ref=e503] [cursor=pointer]:
                  - /url: /demo-en
              - listitem [ref=e504]:
                - link "Pricing" [ref=e505] [cursor=pointer]:
                  - /url: /pricing
              - listitem [ref=e506]:
                - link "FAQs" [ref=e507] [cursor=pointer]:
                  - /url: /?scroll=faq
          - generic [ref=e508]:
            - heading "Company" [level=4] [ref=e509]
            - list [ref=e510]:
              - listitem [ref=e511]:
                - link "About us" [ref=e512] [cursor=pointer]:
                  - /url: /about
              - listitem [ref=e513]:
                - link "Contact" [ref=e514] [cursor=pointer]:
                  - /url: /contact
              - listitem [ref=e515]:
                - link "Book a Meeting" [ref=e516] [cursor=pointer]:
                  - /url: /book-meeting
              - listitem [ref=e517]:
                - link "Admin" [ref=e518] [cursor=pointer]:
                  - /url: /owner-login
          - generic [ref=e519]:
            - heading "Legal" [level=4] [ref=e520]
            - list [ref=e521]:
              - listitem [ref=e522]:
                - link "Privacy Policy" [ref=e523] [cursor=pointer]:
                  - /url: /privacy
              - listitem [ref=e524]:
                - link "Terms and Conditions" [ref=e525] [cursor=pointer]:
                  - /url: /terms
          - generic [ref=e527]:
            - generic [ref=e528]:
              - paragraph [ref=e529]: Trustpilot
              - generic [ref=e530]:
                - img [ref=e531]
                - img [ref=e533]
                - img [ref=e535]
                - img [ref=e537]
                - img [ref=e539]
              - paragraph [ref=e541]: TrustScore 4.5
            - generic [ref=e542]:
              - generic [ref=e543]:
                - img [ref=e544]
                - paragraph [ref=e547]: GDPR COMPLIANT
              - paragraph [ref=e548]: Your data is secure and compliant
        - paragraph [ref=e550]: © 2025 HireGenAI. All rights reserved.
  - region "Notifications (F8)":
    - list
  - button "Open Next.js Dev Tools" [ref=e556] [cursor=pointer]:
    - img [ref=e557]
  - alert [ref=e560]
```

# Test source

```ts
  893  | 
  894  |     // Step 1
  895  |     await page.locator("#companyName").fill("Error Test Corp");
  896  |     await page.locator("#industry").click();
  897  |     await page.getByRole("option", { name: "Technology", exact: true }).click();
  898  |     await page.locator("#companySize").click();
  899  |     await page.getByRole("option", { name: "1-10 employees", exact: true }).click();
  900  |     await page.getByRole("button", { name: /^Next$/i }).click();
  901  |     await page.waitForURL(/section=contact/, { timeout: 10_000 });
  902  | 
  903  |     // Step 2
  904  |     await page.locator("#street").waitFor({ state: "visible" });
  905  |     await page.locator("#street").fill("456 Error Lane");
  906  |     await page.locator("#city").fill("Boston");
  907  |     await page.locator("#state").fill("MA");
  908  |     await page.locator("#postalCode").fill("02101");
  909  |     await page.locator("#country").click();
  910  |     await page.getByRole("option", { name: "United States", exact: true }).click();
  911  |     await page.getByRole("button", { name: /^Next$/i }).click();
  912  |     await page.waitForURL(/section=legal/, { timeout: 10_000 });
  913  | 
  914  |     // Step 3
  915  |     await page.locator("#legalCompanyName").waitFor({ state: "visible" });
  916  |     await page.locator("#legalCompanyName").fill("Error Test Corporation LLC");
  917  |     await page.getByRole("button", { name: /^Next$/i }).click();
  918  |     await page.waitForURL(/section=manager/, { timeout: 10_000 });
  919  | 
  920  |     // Step 4 — OTP
  921  |     await page.locator("#firstName").waitFor({ state: "visible" });
  922  |     await page.locator("#firstName").fill("Error");
  923  |     await page.locator("#lastName").fill("Tester");
  924  |     await page.locator("#email").fill(`error-${Date.now()}@testcorp.io`);
  925  |     await page.getByRole("button", { name: /Send Code/i }).click();
  926  |     const otpInput = page.locator(
  927  |       'input[placeholder="000000"], input[inputmode="numeric"][maxlength="6"]'
  928  |     );
  929  |     await otpInput.waitFor({ state: "visible", timeout: 10_000 });
  930  |     await otpInput.fill(OTP_CODE);
  931  |     await page.getByRole("button", { name: /^Verify$/i }).click();
  932  |     await page.getByText(/Email verified successfully/i).waitFor({ state: "visible", timeout: 10_000 });
  933  |     await page.getByRole("button", { name: /^Next$/i }).click();
  934  |     await page.waitForURL(/section=review/, { timeout: 10_000 });
  935  | 
  936  |     // Step 5 — Submit (will fail due to mocked 500 response)
  937  |     await page.locator("#tos").waitFor({ state: "visible" });
  938  |     if (!(await page.locator("#tos").isChecked())) await page.locator("#tos").click();
  939  |     if (!(await page.locator("#privacy").isChecked())) await page.locator("#privacy").click();
  940  |     await page.getByRole("button", { name: /Complete Registration/i }).click();
  941  | 
  942  |     // Error banner should appear — user stays on /signup
  943  |     await expect(
  944  |       page
  945  |         .locator(".bg-red-50, [data-testid='signup-error']")
  946  |         .or(page.getByText(/internal error/i))
  947  |         .or(page.getByText(/try again/i))
  948  |         .first()
  949  |     ).toBeVisible({ timeout: 15_000 });
  950  | 
  951  |     // Must still be on the signup page
  952  |     await expect(page).toHaveURL(/\/signup/, { timeout: 5_000 });
  953  |   });
  954  | });
  955  | 
  956  | // ---------------------------------------------------------------------------
  957  | // Billing toggle state tests
  958  | // ---------------------------------------------------------------------------
  959  | 
  960  | test.describe("Pricing — Billing Toggle State", () => {
  961  |   test("Annual billing toggle is active by default", async ({ page }) => {
  962  |     await mockStripeStatus(page, MOCK_STRIPE_STATUS_NONE);
  963  |     await page.goto(PRICING_URL);
  964  |     await expect(page.getByRole("heading", { name: "Starter", exact: true }).first()).toBeVisible({
  965  |       timeout: 15_000,
  966  |     });
  967  | 
  968  |     // Default is annual — "/ year" should be visible, not "/ month"
  969  |     await expect(page.getByText("/ year", { exact: false }).first()).toBeVisible({
  970  |       timeout: 5_000,
  971  |     });
  972  |   });
  973  | 
  974  |   test("Billing cycle passes correctly as query param to signup URL", async ({ page }) => {
  975  |     await mockStripeStatus(page, MOCK_STRIPE_STATUS_NONE);
  976  |     await page.goto(PRICING_URL);
  977  |     await expect(page.getByRole("heading", { name: "Starter", exact: true }).first()).toBeVisible({
  978  |       timeout: 15_000,
  979  |     });
  980  | 
  981  |     // Switch to monthly billing
  982  |     await page.getByRole("button", { name: /^Monthly$/i }).click();
  983  |     await expect(page.getByText("/ month", { exact: false }).first()).toBeVisible({
  984  |       timeout: 5_000,
  985  |     });
  986  | 
  987  |     // Click Choose Starter — billing=monthly should be in the signup URL
  988  |     await page.getByRole("button", { name: "Choose Starter", exact: true }).first().click();
  989  |     await expect(page).toHaveURL(/\/signup.*billing=monthly/i, { timeout: 15_000 });
  990  | 
  991  |     // Go back to pricing and switch to annual
  992  |     await page.goto(PRICING_URL);
> 993  |     await page.getByRole("button", { name: /^Annual$/i }).click();
       |                                                           ^ Error: locator.click: Test timeout of 30000ms exceeded.
  994  |     await expect(page.getByText("/ year", { exact: false }).first()).toBeVisible({
  995  |       timeout: 5_000,
  996  |     });
  997  | 
  998  |     await page.getByRole("button", { name: "Choose Starter", exact: true }).first().click();
  999  |     await expect(page).toHaveURL(/\/signup.*billing=annual/i, { timeout: 15_000 });
  1000 |   });
  1001 | });
  1002 | 
  1003 | // ---------------------------------------------------------------------------
  1004 | // Plan feature visibility tests
  1005 | // ---------------------------------------------------------------------------
  1006 | 
  1007 | test.describe("Pricing — Plan Feature Visibility", () => {
  1008 |   test("Each pricing card renders support tier information", async ({ page }) => {
  1009 |     await mockStripeStatus(page, MOCK_STRIPE_STATUS_NONE);
  1010 |     await page.goto(PRICING_URL);
  1011 |     await expect(page.getByRole("heading", { name: "Starter", exact: true }).first()).toBeVisible({
  1012 |       timeout: 15_000,
  1013 |     });
  1014 | 
  1015 |     // Support tiers per plan (from the PLANS constant in pricing/page.tsx)
  1016 |     const supportTiers = [
  1017 |       "Standard Support",
  1018 |       "Priority Support",
  1019 |       "Business Support",
  1020 |       "Large Support",
  1021 |       "Ultra Support",
  1022 |       "Enterprise SLA",
  1023 |     ] as const;
  1024 | 
  1025 |     for (const tier of supportTiers) {
  1026 |       await expect(page.getByText(tier, { exact: false }).first()).toBeVisible({
  1027 |         timeout: 10_000,
  1028 |       });
  1029 |     }
  1030 |   });
  1031 | 
  1032 |   test("Enterprise plan CTA links to contact page, not signup", async ({ page }) => {
  1033 |     await mockStripeStatus(page, MOCK_STRIPE_STATUS_NONE);
  1034 |     await page.goto(PRICING_URL);
  1035 |     await expect(page.getByRole("heading", { name: "Enterprise", exact: true }).first()).toBeVisible({
  1036 |       timeout: 15_000,
  1037 |     });
  1038 | 
  1039 |     // "Talk to Sales" should navigate to /contact, not /signup
  1040 |     const talkToSalesButton = page
  1041 |       .getByRole("button", { name: "Talk to Sales", exact: true })
  1042 |       .or(page.getByRole("link", { name: "Talk to Sales", exact: true }))
  1043 |       .first();
  1044 | 
  1045 |     await expect(talkToSalesButton).toBeVisible({ timeout: 5_000 });
  1046 | 
  1047 |     // Click and verify it goes to /contact
  1048 |     await talkToSalesButton.click();
  1049 |     await expect(page).toHaveURL(/\/contact/, { timeout: 15_000 });
  1050 |   });
  1051 | 
  1052 |   test("Pricing page renders billing comparison callout (Annual savings hint)", async ({
  1053 |     page,
  1054 |   }) => {
  1055 |     await mockStripeStatus(page, MOCK_STRIPE_STATUS_NONE);
  1056 |     await page.goto(PRICING_URL);
  1057 | 
  1058 |     // Switch to annual
  1059 |     await page.getByRole("button", { name: /^Annual$/i }).click();
  1060 | 
  1061 |     // Annual promotion callout from the pricing page source
  1062 |     await expect(
  1063 |       page.getByText(/pay for 10 months/i).first()
  1064 |     ).toBeVisible({ timeout: 10_000 });
  1065 | 
  1066 |     await expect(
  1067 |       page.getByText(/stay active for 12/i).first()
  1068 |     ).toBeVisible({ timeout: 10_000 });
  1069 |   });
  1070 | });
  1071 | 
```