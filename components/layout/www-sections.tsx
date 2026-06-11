'use client';
import { useState, useEffect, useRef } from 'react';
import { getAppUrl } from '@/lib/domain-config';

// ── Hero ──────────────────────────────────────────────────────────────────────
export function Hero() {
  return (
    <section className="hero">
      <div className="hero-grid-bg" />
      <div className="hero-blob hero-blob-1" />
      <div className="hero-blob hero-blob-2" />
      <div className="container">
        <h1 className="hero-title fade-in">Hire Smarter.<br /><span className="highlight">10× Faster</span> with AI.</h1>
        <p className="hero-subtitle fade-in">Hire-GenAI transforms your entire recruitment pipeline — from sourcing to offer — with generative AI that screens, scores, and schedules so your team focuses on what matters most.</p>
        <div className="hero-actions fade-in">
          <a href={getAppUrl('/signup')} className="btn-primary">🚀 Start Free Trial — It&apos;s Free</a>
          <a href="#demo" className="btn-secondary">▶ Product Demo</a>
        </div>
        <div className="hero-stats">
          {[['80%','Reduction in time-to-hire'],['97%','Scheduling automation'],['3×','More qualified candidates'],['$2.4M','Avg. annual cost savings']].map(([n,l],i,a) => (
            <span key={l} style={{ display: 'contents' }}>
              <div className="hero-stat"><div className="hero-stat-num">{n}</div><div className="hero-stat-label">{l}</div></div>
              {i < a.length-1 && <div className="hero-divider" />}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Product Preview ───────────────────────────────────────────────────────────
export function ProductPreview() {
  return (
    <section className="product-preview">
      <div className="container-wide">
        <div className="preview-wrapper float">
          <div className="preview-bar">
            <div className="preview-dot"/><div className="preview-dot"/><div className="preview-dot"/>
            <div className="preview-url">app.hiregenai.com / pipeline</div>
          </div>
          <div className="preview-content">
            <div className="preview-sidebar">
              <div className="preview-sidebar-logo">⚡ Hire-GenAI</div>
              <div style={{ fontSize:'8px', fontWeight:700, color:'rgba(255,255,255,0.3)', letterSpacing:'0.1em', padding:'8px 12px 4px', textTransform:'uppercase' }}>MAIN</div>
              {['Dashboard','Applications','Job Postings','Talent Pool'].map((item,i) => (
                <div key={item} className={`preview-nav-item${i===0?' active':''}`}><div className="preview-nav-icon"/>{item}</div>
              ))}
              <div style={{ fontSize:'8px', fontWeight:700, color:'rgba(255,255,255,0.3)', letterSpacing:'0.1em', padding:'8px 12px 4px', textTransform:'uppercase' }}>MANAGEMENT</div>
              {['Delegation','Support','Settings'].map((item) => (
                <div key={item} className="preview-nav-item"><div className="preview-nav-icon"/>{item}</div>
              ))}
            </div>
            <div className="preview-main">
              <div className="preview-header">
                <div className="preview-title-sm">📊 Hiring Pipeline — Senior Engineers</div>
                <div className="preview-btn-sm">+ Add Candidate</div>
              </div>
              <div className="preview-pipeline">
                {[
                  { title:'Applied (24)', cards:[['Alex Johnson','Full Stack Engineer','94%'],['Sarah Chen','React Developer','88%']] },
                  { title:'Screened (11)', cards:[['Marcus Davis','Backend Engineer','76%',true],['Priya Sharma','DevOps Engineer','91%']] },
                  { title:'Interview (6)', cards:[['James Wilson','Platform Engineer','96%']] },
                  { title:'Offer (2)', cards:[['Emily Rodriguez','Staff Engineer','98%']] },
                ].map(col => (
                  <div key={col.title} className="preview-col">
                    <div className="preview-col-title">{col.title}</div>
                    {col.cards.map(([name,role,score,med], i) => (
                      <div key={`${col.title}-${i}`} className="preview-card">
                        <div className="preview-card-name">{name}</div>
                        <div className="preview-card-role">{role}</div>
                        <div className={`preview-score${med?' medium':''}`}>AI Score: {score}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div className="preview-metrics">
                {[['9 days','Avg. Time to Hire'],['4.8/5','Candidate NPS'],['92%','Offer Acceptance']].map(([v,l]) => (
                  <div key={l} className="preview-metric"><div className="preview-metric-val">{v}</div><div className="preview-metric-label">{l}</div></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Trust Bar ─────────────────────────────────────────────────────────────────
export function TrustBar() {
  const logos = ['TechCorp','ScaleUp','Nexus AI','BuildFast','DataSync','LaunchPad','CoreTeam','GrowthLab'];
  return (
    <section className="trust-bar reveal">
      <div className="container">
        <div className="trust-bar-label">Trusted by 50+ fast-growing companies</div>
        <div className="trust-logos">
          {logos.map(name => (
            <div key={name} className="trust-logo"><span>{name}</span></div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Metrics ───────────────────────────────────────────────────────────────────
export function Metrics() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }), { threshold: 0.1 });
    obs.observe(el); el.querySelectorAll('.reveal').forEach(r => obs.observe(r));
    return () => obs.disconnect();
  }, []);
  return (
    <section className="metrics reveal" id="metrics" ref={ref}>
      <div className="container">
        <div style={{ textAlign:'center' }}>
          <div className="section-label">Why Hire-GenAI</div>
          <h2 className="section-title">Numbers that speak for themselves</h2>
          <p className="section-subtitle" style={{ margin:'16px auto 0' }}>Our AI transforms recruitment with measurable outcomes across every stage of your hiring pipeline.</p>
        </div>
        <div className="metrics-grid">
          {[
            { icon:'⚡', num:'80%', color:'blue', desc:<>Reduction in <strong>time-to-hire</strong> by automating screening, scheduling, and initial outreach with generative AI</> },
            { icon:'🤖', num:'97%', color:'cyan', desc:<>Of scheduling and <strong>administrative tasks</strong> eliminated, freeing recruiters to focus on strategic decisions</> },
            { icon:'🎯', num:'3×', color:'purple', desc:<>More <strong>qualified candidates</strong> reach final rounds thanks to AI-powered matching that removes bias</> },
          ].map(m => (
            <div key={m.num} className="metric-card reveal">
              <div className="metric-icon">{m.icon}</div>
              <div className={`metric-num ${m.color}`}>{m.num}</div>
              <div className="metric-desc">{m.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Features ──────────────────────────────────────────────────────────────────
const featureTabs = [
  { key:'attract', label:'📝 Post & Attract', items:[
    { icon:'📝', color:'indigo', title:'Unlimited Job Postings', desc:'Create and publish an unlimited number of job openings with no caps.' },
    { icon:'🤖', color:'cyan', title:'AI Interview Question Generation', desc:'Automatically generates role-specific interview questions. 5 questions ready per role, instantly.' },
    { icon:'👤', color:'green', title:'Candidate Application Portal', desc:'Clean, mobile-friendly application flow with resume upload, photo capture, and cover letter.' },
    { icon:'⏱', color:'purple', title:'Auto-Schedule Interview Links', desc:'Qualified candidates automatically receive interview links that expire in 48 hours.' },
  ], visual: <AiScoreCard title="● Open — RPA Developer" badge="Engineering · Hybrid" bars={[]} info="Auto-schedule: ON — Links expire in 48h · Budget: $5,000" /> },
  { key:'screen', label:'🤖 CV Screening', items:[
    { icon:'🤖', color:'indigo', title:'AI CV Evaluation & Scoring', desc:'Instantly scans and scores CVs against your job description with over 95% accuracy.' },
    { icon:'🎯', color:'cyan', title:'Data-Driven Shortlisting', desc:'Ranked shortlist of the top qualified candidates with detailed reports.' },
    { icon:'👥', color:'green', title:'Full ATS Pipeline', desc:'Applications, talent pool, delegation & feedback — all in one place.' },
    { icon:'🔒', color:'purple', title:'Diversity & Fairness', desc:'Evaluate candidates on objective criteria to reduce unconscious bias.' },
  ], visual: <AiScoreCard title="John Anderson — RPA Dev" badge="Top Match · 94%" bars={[['Skills Match','96%',96,'indigo'],['Experience Fit','91%',91,'cyan'],['Qualification','88%',88,'green']]} info="4 years hands-on RPA. Recommend auto-scheduling AI interview." /> },
  { key:'assess', label:'🎥 AI Interview', items:[
    { icon:'🎥', color:'indigo', title:'AI-Powered Video Interviews', desc:'Engages candidates in natural, conversational video interviews with role-specific questions.' },
    { icon:'🎙', color:'cyan', title:'Real-Time Voice AI', desc:'Dynamic questions powered by real-time voice AI that adapts based on responses.' },
    { icon:'⏱', color:'green', title:'Instant Evaluation & Scoring', desc:'Every response scored immediately with Hire / Review / Pass recommendation.' },
    { icon:'📋', color:'purple', title:'Detailed Interview Reports', desc:'Full breakdown of all questions with AI reasoning and candidate response transcripts.' },
  ], visual: <AiScoreCard title="🎥 John Anderson" badge="Score: 70/100 · Hire ✓" bars={[['Technical (Q1)','70/100',70,'indigo'],['Team Player (Q2)','68/100',68,'cyan'],['Culture Fit (Q3)','65/100',65,'green']]} info="Questions: 10 · Answered: 10 · ✓ Qualified — Recommendation: Hire" /> },
  { key:'hire', label:'📊 Analytics & Hire', items:[
    { icon:'📊', color:'indigo', title:'Manager & Recruiter Dashboards', desc:'Dedicated dashboards with real-time pipeline visibility and hiring progress.' },
    { icon:'📋', color:'cyan', title:'Full ATS Pipeline Management', desc:'Track every candidate from application to offer in a unified pipeline.' },
    { icon:'📈', color:'green', title:'Advanced Analytics & Reporting', desc:'Detailed hiring metrics, funnel analysis, and AI scoring trends.' },
    { icon:'💳', color:'purple', title:'Wallet & Credits Billing', desc:'Flexible wallet-based credits — top up as you go, no surprise invoices.' },
  ], visual: <AiScoreCard title="📊 Pipeline Overview" badge="Live ●" bars={[['CV Screening Complete','89%',89,'green'],['Interviews Evaluated','74%',74,'indigo']]} info="1,240 credits remaining · ~68 hires available" /> },
] as const;

function AiScoreCard({ title, badge, bars, info }: { title: string; badge: string; bars: readonly (readonly [string, string, number, string])[]; info: string }) {
  return (
    <div className="ai-score-card">
      <div className="ai-score-header">
        <div className="ai-score-name">{title}</div>
        <div className="ai-score-badge high">{badge}</div>
      </div>
      {bars.map(([label, val, w, color]) => (
        <div key={label} className="ai-score-bar-wrap">
          <div className="ai-score-bar-label"><span>{label}</span><span>{val}</span></div>
          <div className="ai-score-bar"><div className={`ai-score-bar-fill ${color}`} style={{ width: `${w}%` }} /></div>
        </div>
      ))}
      <div className="ai-insight"><div className="ai-insight-label">🤖 AI Insight</div><div className="ai-insight-text">{info}</div></div>
    </div>
  );
}

export function Features() {
  const [active, setActive] = useState(0);
  const tab = featureTabs[active];
  return (
    <section className="features reveal" id="features">
      <div className="container">
        <div className="features-header">
          <div className="section-label">Platform</div>
          <h2 className="section-title">Everything you need to hire <span className="highlight">brilliantly</span></h2>
          <p className="section-subtitle" style={{ margin:'16px auto 0' }}>One AI-native platform: Attract, Screen, Assess, and Hire — all in one unified workspace.</p>
        </div>
        <div className="features-tabs">
          {featureTabs.map((t,i) => (
            <button key={t.key} className={`feature-tab${active===i?' active':''}`} onClick={() => setActive(i)}>{t.label}</button>
          ))}
        </div>
        <div className="feature-panel active">
          <div className="features-list">
            {tab.items.map((item,i) => (
              <div key={item.title} className={`feature-item${i===0?' active':''}`}>
                <div className={`feature-item-icon ${item.color}`}>{item.icon}</div>
                <div className="feature-item-body"><h4>{item.title}</h4><p>{item.desc}</p></div>
              </div>
            ))}
          </div>
          <div className="feature-visual">
            <div style={{ fontSize:'13px', fontWeight:700, color:'var(--text-muted)', marginBottom:'16px', textTransform:'uppercase', letterSpacing:'.08em' }}>
              {['Job Setup','AI CV Score','Interview Evaluation','Recruiter Dashboard'][active]}
            </div>
            {tab.visual}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Demo Section ──────────────────────────────────────────────────────────────
export function DemoSection() {
  const [tab, setTab] = useState<'job'|'candidate'|'eval'>('job');
  return (
    <section className="demo-section reveal" id="demo">
      <div className="container">
        <div style={{ textAlign:'center', marginBottom:'48px' }}>
          <div className="section-label">Interactive Demo</div>
          <h2 className="section-title">Hello <span className="highlight">Hire-GenAI</span></h2>
          <p className="section-subtitle" style={{ margin:'16px auto 0' }}>Experience the end-to-end AI interview with real-time voice, dynamic questions, and instant evaluation insights.</p>
        </div>
        <div className="demo-tabs-nav">
          {([['job','📄 Job Details'],['candidate','👤 Candidate Details'],['eval','🤖 AI Evaluation']] as const).map(([k,l]) => (
            <button key={k} className={`demo-tab-btn${tab===k?' active':''}`} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
        {tab === 'job' && (
          <div className="demo-tab-content active">
            <div className="demo-info-banner">ℹ️ Demo preview — pre-filled for <strong>RPA Developer</strong> position.</div>
            <div className="demo-form-grid">
              <div className="demo-form-section"><div className="demo-form-title">Job Status</div><div className="demo-badge-green">● Open</div></div>
              <div className="demo-form-section">
                <div className="demo-form-title">Basic Information</div>
                <div className="demo-field-row">
                  {[['Department','Engineering'],['Job Type','Full-time'],['Work Mode','Hybrid'],['Currency','USD ($)'],['Salary Min','$80,000'],['Salary Max','$120,000'],['Hiring Priority','Medium']].map(([l,v]) => (
                    <div key={l} className="demo-field"><span className="demo-field-label">{l}</span><span className="demo-field-val">{v}</span></div>
                  ))}
                </div>
              </div>
              <div className="demo-form-section">
                <div className="demo-form-title">🤖 Interview Questions</div>
                <div className="demo-ai-box">
                  <div style={{ fontWeight:700, fontSize:'13px', marginBottom:'8px' }}>Generated Questions (5)</div>
                  {[
                    'How do your UiPath/AA skills align with this role?',
                    'Describe a cross-team collaboration for automation.',
                    'Salary expectations & relocation to Bangalore?',
                    'Describe a time when you significantly improved a process.',
                    'How do you stay current with RPA technology trends?',
                  ].map((q, i) => (
                    <div key={i} className="demo-ai-item">{q}</div>
                  ))}
                  <div style={{ marginTop:'12px', display:'flex', alignItems:'center', gap:'8px', fontSize:'12px' }}>
                    <span style={{ fontSize:'11px', fontWeight:700, color:'var(--green)' }}>🔄 Auto-schedule:</span>
                    <span style={{ background:'rgba(0,177,79,0.15)', color:'var(--green)', border:'1px solid rgba(0,177,79,0.3)', borderRadius:'6px', padding:'2px 10px', fontWeight:700 }}>ON</span>
                    <span style={{ color:'var(--text-dim)' }}>· Links expire in 48h</span>
                  </div>
                </div>
              </div>
              <div className="demo-form-section">
                <div className="demo-form-title">👥 Hiring Team &amp; Planning</div>
                <div className="demo-field-row">
                  {[['Hiring Manager','Sarah Chen'],['Recruiter','Alex Kumar'],['Interviewers','3 assigned'],['Target Date','Aug 15, 2025'],['Open Positions','2'],['Budget','$120,000/yr']].map(([l,v]) => (
                    <div key={l} className="demo-field"><span className="demo-field-label">{l}</span><span className="demo-field-val">{v}</span></div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ textAlign:'center', marginTop:'28px' }}>
              <a href="/demo-en" className="btn-primary">Try the Interactive Demo →</a>
              <p style={{ fontSize:'12px', color:'var(--text-dim)', marginTop:'10px' }}>No sign-up required · Pre-filled with RPA Developer template</p>
            </div>
          </div>
        )}
        {tab === 'candidate' && (
          <div className="demo-tab-content active">
            <div className="demo-info-banner">ℹ️ Demo preview — pre-filled candidate application.</div>
            <div className="demo-form-grid">
              <div className="demo-form-section">
                <div className="demo-form-title">👤 General Information</div>
                <div className="demo-field-row">
                  {[['First name','John'],['Last name','Anderson'],['Email','john.anderson@email.com'],['Phone','+1 234 567 8900'],['Salary','$95,000/yr'],['Location','Hyderabad, India']].map(([l,v]) => (
                    <div key={l} className="demo-field"><span className="demo-field-label">{l}</span><span className="demo-field-val">{v}</span></div>
                  ))}
                </div>
              </div>
              <div className="demo-form-section">
                <div className="demo-form-title">📄 Resume &amp; Photo</div>
                <div style={{ display:'flex', gap:'14px', marginTop:'10px' }}>
                  <div className="demo-upload-box"><div style={{ fontSize:'20px' }}>📄</div><div style={{ fontSize:'12px', fontWeight:700, color:'var(--green)' }}>✓ Uploaded</div><div style={{ fontSize:'11px', color:'var(--text-dim)' }}>resume.pdf · 245 KB</div></div>
                  <div className="demo-upload-box"><div style={{ fontSize:'20px' }}>📷</div><div style={{ fontSize:'12px', fontWeight:700, color:'var(--green)' }}>👤 Verified</div><div style={{ fontSize:'11px', color:'var(--text-dim)' }}>photo.jpg · 128 KB</div></div>
                </div>
              </div>
              <div className="demo-form-section">
                <div className="demo-form-title">✉️ Cover Letter</div>
                <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid var(--border)', borderRadius:'10px', padding:'14px', fontSize:'12px', color:'var(--text-muted)', lineHeight:1.6 }}>
                  I am excited to apply for the RPA Developer position. With 4 years of hands-on experience using UiPath and Automation Anywhere, I have successfully delivered automation solutions that reduced processing time by 60%...
                </div>
              </div>
              <div className="demo-form-section">
                <div className="demo-form-title">🌐 Languages &amp; Availability</div>
                <div className="demo-field-row">
                  {[['Languages','English, Hindi'],['Proficiency','Fluent / Native'],['Notice Period','30 days'],['Available From','July 2025'],['Work Auth','Authorized (India)'],['Interview Mode','Video / On-site']].map(([l,v]) => (
                    <div key={l} className="demo-field"><span className="demo-field-label">{l}</span><span className="demo-field-val">{v}</span></div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ textAlign:'center', marginTop:'28px' }}><a href="/demo-en" className="btn-primary">Try the Full Candidate Flow →</a></div>
          </div>
        )}
        {tab === 'eval' && (
          <div className="demo-tab-content active">
            <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:'24px' }} className="demo-eval-grid">
              <div style={{ background:'rgba(0,177,79,0.1)', border:'1px solid rgba(0,177,79,0.3)', borderRadius:'16px', padding:'24px 20px', textAlign:'center', alignSelf:'flex-start', animation:'scoreFloat 3s ease-in-out infinite' }}>
                <div style={{ fontSize:'44px', fontWeight:900, color:'var(--green)', lineHeight:1 }}>70</div>
                <div style={{ fontSize:'12px', color:'var(--text-dim)', margin:'4px 0 10px' }}>out of 100</div>
                <div style={{ padding:'6px 10px', background:'rgba(0,177,79,0.1)', border:'1px solid rgba(0,177,79,0.3)', borderRadius:'8px', fontSize:'11px', fontWeight:700, color:'var(--green)' }}>✓ Qualified — Recommendation: Hire</div>
                <div style={{ marginTop:'12px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px' }}>
                  {[['Questions','10'],['Answered','10'],['Avg Score','69/100'],['Duration','18 min']].map(([l,v]) => (
                    <div key={l} style={{ background:'rgba(255,255,255,0.04)', borderRadius:'8px', padding:'6px', textAlign:'center' }}>
                      <div style={{ fontSize:'13px', fontWeight:800, color:'var(--text)' }}>{v}</div>
                      <div style={{ fontSize:'9px', color:'var(--text-dim)' }}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize:'14px', fontWeight:700, marginBottom:'16px' }}>❓ Interview Responses &amp; Scores</div>
                {[
                  { num:1, q:'How do your skills with UiPath and AA align with this role?', tag:'Technical', score:'70/100', response:'6 years IT experience, 4 years hands-on RPA using Automation Anywhere and UiPath. Have built 20+ bots across finance and HR automation workflows.', strength:'Comprehensive overview of relevant hands-on experience with both platforms', improve:'Lacks specific UiPath project examples — could quantify impact more clearly' },
                  { num:2, q:'Describe your collaboration with business analysts for automation.', tag:'Team Player', score:'68/100', response:'Worked closely with BAs to gather process requirements, documented AS-IS flows, and identified automation opportunities. Regular syncs ensured alignment.', strength:'Good cross-functional collaboration approach with clear communication', improve:'Could provide more specific examples of challenges faced and how they were resolved' },
                  { num:3, q:'How do you stay current with RPA technology trends?', tag:'Culture Fit', score:'65/100', response:'I follow UiPath and AA community blogs, attend webinars monthly, and have completed 3 certifications in the past year including UiPath Advanced RPA.', strength:'Proactive learning mindset with certifications to back it up', improve:'Could mention specific emerging trends or how they applied new learnings to real projects' },
                ].map(q => (
                  <div key={q.num} className="demo-eval-q">
                    <div className="demo-eval-q-header">
                      <span className="demo-eval-q-num">{q.num}</span>
                      <span className="demo-eval-q-text">{q.q}</span>
                      <span className="demo-eval-tag">{q.tag}</span>
                      <span className="demo-eval-score">{q.score}</span>
                    </div>
                    <div className="demo-eval-body">
                      <div className="demo-eval-text">{q.response}</div>
                      <div style={{ display:'flex', gap:'14px', marginTop:'6px' }}>
                        <div><div style={{ fontSize:'11px', fontWeight:700, color:'var(--green)' }}>✓ Strengths</div><div className="demo-eval-text">{q.strength}</div></div>
                        <div><div style={{ fontSize:'11px', fontWeight:700, color:'#F59E0B' }}>⚠ Improve</div><div className="demo-eval-text">{q.improve}</div></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ textAlign:'center', marginTop:'28px', display:'flex', gap:'14px', justifyContent:'center', flexWrap:'wrap' }}>
              <a href="/demo-en" className="btn-primary">Try Full Demo →</a>
              <a href={getAppUrl('/signup')} className="btn-secondary" target="_blank" rel="noopener noreferrer">Start Free Trial</a>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ── ROI Simulator ─────────────────────────────────────────────────────────────
const ROI_PLANS = [
  { name: 'Starter', price: 99, maxCvs: 200 },
  { name: 'Professional', price: 499, maxCvs: 500 },
  { name: 'Business', price: 999, maxCvs: 1000 },
  { name: 'Large', price: 2999, maxCvs: 3000 },
  { name: 'Ultra', price: 3999, maxCvs: 4000 },
  { name: 'Enterprise', price: 4999, maxCvs: 99999 },
];
const ROI_CONST_H = 5.7;
function fmtH(h: number) { return h < 1/6 ? Math.round(h*60)+'m' : h.toFixed(1)+'h'; }
function fmtMoney(n: number) { return '$'+Math.round(n).toLocaleString('en-US'); }
interface ROIState { recruiters:number; cvs:number; shortlist:number; qualifiedPct:number; rate:number; days:number; hours:number; }
function calcROI(s: ROIState) {
  const jds = s.recruiters*5, totalCvs = jds*s.cvs;
  const manScreen=(s.cvs*5)/60, manRank=(s.cvs*0.6)/60, manQual=(s.cvs*s.shortlist/100*20)/60, manTotal=ROI_CONST_H+manScreen+manRank+manQual;
  const aiScreen=(s.cvs*1)/60, aiRank=(s.cvs*0.05)/60, aiQual=(s.cvs*s.shortlist/100*10)/60, aiTotal=ROI_CONST_H+aiScreen+aiRank+aiQual;
  const manCostReq=manTotal*s.rate, aiCostReq=aiTotal*s.rate;
  const manCostMonth=manCostReq*jds, aiCostMonth=aiCostReq*jds, savings=manCostMonth-aiCostMonth;
  let plan=ROI_PLANS[ROI_PLANS.length-1];
  for(const p of ROI_PLANS){ if(totalCvs<=p.maxCvs){ plan=p; break; } }
  return { jds, savings, savingsPerJD:savings/jds, plan, roiPct:Math.round((savings/plan.price)*100),
    screenReduce:Math.round((1-aiScreen/manScreen)*100), rankReduce:Math.round((1-aiRank/manRank)*100),
    qualReduce:Math.round((1-aiQual/manQual)*100), prodIdx:(manTotal/aiTotal).toFixed(1),
    costRatio:Math.round((aiCostReq/manCostReq)*100),
    manScreen,manRank,manQual,manTotal,manCostReq,manCostMonth, aiScreen,aiRank,aiQual,aiTotal,aiCostReq,aiCostMonth,
    shortlistedPerReq:Math.round(s.cvs*s.shortlist/100), qualPerReq:Math.max(1,Math.round(s.cvs*s.shortlist/100*s.qualifiedPct/100)),
  };
}

export function ROISimulator() {
  const DEFAULTS: ROIState = { recruiters:1, cvs:100, shortlist:15, qualifiedPct:15, rate:30, days:5, hours:6 };
  const [s, setS] = useState<ROIState>(DEFAULTS);
  const [raw, setRaw] = useState<Partial<Record<keyof ROIState, string>>>({});
  const [billing, setBilling] = useState<'monthly'|'annual'>('monthly');
  const r = calcROI(s);
  const update = (key: keyof ROIState, val: number) => setS(p=>({...p,[key]:val}));
  const handleChange = (key: keyof ROIState, strVal: string) => {
    setRaw(p => ({ ...p, [key]: strVal }));
    const n = parseFloat(strVal);
    if (!isNaN(n)) setS(p => ({ ...p, [key]: n }));
  };
  const handleBlur = (key: keyof ROIState, min: number) => {
    setRaw(p => { const next = { ...p }; delete next[key]; return next; });
    setS(p => {
      const val = p[key];
      return isNaN(val as number) || (val as number) < min ? { ...p, [key]: DEFAULTS[key] } : p;
    });
  };

  return (
    <section className="roi reveal" id="roi">
      <div className="container-wide">
        <div style={{ textAlign:'center', marginBottom:'40px' }}>
          <div className="section-label">ROI Simulator</div>
          <h2 className="section-title">Human Recruiter vs Human + <span className="highlight">Hire-GenAI</span></h2>
          <p className="section-subtitle" style={{ margin:'12px auto 0' }}>Real-time ROI simulator · AI accelerates screening, ranking &amp; qualification — human strategic steps unchanged</p>
        </div>
        <div className="roi-sim-info-grid" style={{ marginBottom:'20px' }}>
          <div style={{ background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.25)', borderRadius:'12px', padding:'14px 18px', fontSize:'13px', color:'#93C5FD' }}>
            <strong style={{ color:'#BFDBFE' }}>Hire-GenAI does NOT replace recruiters</strong> — Removes screening, parsing &amp; ranking. Recruiters focus on engagement, offers &amp; stakeholders.
          </div>
          <div style={{ background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.25)', borderRadius:'12px', padding:'14px 18px', fontSize:'13px', color:'#FCD34D' }}>
            <strong style={{ color:'#FDE68A' }}>Human Judgment Remains Critical</strong> for hiring decisions, client relationships, and candidate experience.
          </div>
        </div>
        <div className="roi-sim-inputs">
          <h3 style={{ fontSize:'14px', fontWeight:700, color:'var(--text)', marginBottom:'16px', display:'flex', alignItems:'center', gap:'8px' }}>
            ⚙ Business Drivers <span style={{ fontSize:'11px', fontWeight:400, color:'var(--text-dim)' }}>(adjust to simulate ROI)</span>
          </h3>
          <div className="roi-sim-input-grid">
            {[
              { label:'Recruiters', key:'recruiters' as keyof ROIState, min:1, max:50, step:1, sub:'× 5 JDs/mo' },
              { label:'Total JDs', key:null as null, value:String(r.jds), sub:'Auto-calculated', readonly:true },
              { label:'CVs / Req', key:'cvs' as keyof ROIState, min:10, max:500, step:10 },
              { label:'Shortlist %', key:'shortlist' as keyof ROIState, min:1, max:100, step:5 },
              { label:'Qualified %', key:'qualifiedPct' as keyof ROIState, min:1, max:100, step:5 },
              { label:'Hourly Rate $', key:'rate' as keyof ROIState, min:5, max:500, step:5 },
              { label:'Days / Week', key:'days' as keyof ROIState, min:1, max:7, step:1 },
              { label:'Hours / Day', key:'hours' as keyof ROIState, min:1, max:16, step:0.5 },
            ].map((f,i) => (
              <div key={i} className="roi-sim-input-group">
                <label>{f.label}</label>
                {f.readonly
                  ? <input className="roi-sim-input" readOnly value={f.value} />
                  : <input type="number" className="roi-sim-input" value={raw[f.key!] !== undefined ? raw[f.key!] : s[f.key!]} min={f.min} max={f.max} step={f.step} onChange={e=>handleChange(f.key!,e.target.value)} onBlur={()=>handleBlur(f.key!,f.min??0)} />
                }
                {f.sub && <p style={{ fontSize:'9px', color:'var(--text-dim)', marginTop:'3px' }}>{f.sub}</p>}
              </div>
            ))}
          </div>
          <div style={{ marginTop:'14px', background:'rgba(0,177,79,0.1)', color:'#6EE7B7', borderRadius:'8px', padding:'8px 14px', fontSize:'12px', display:'inline-block' }}>
            ✓ Hire-GenAI assists in: parsing, screening, ranking, matching &amp; scoring (Steps 4, 5, 6). All other steps remain 100% human-led.
          </div>
        </div>
        <div className="roi-kpi-grid">
          <div className="roi-kpi rounded-2xl text-center"><div className="roi-kpi-val text-xl">{r.screenReduce}%</div><div className="roi-kpi-label">Screening Time ↓</div></div>
          <div className="roi-kpi rounded-2xl text-center"><div className="roi-kpi-val text-xl">{r.rankReduce}%</div><div className="roi-kpi-label">Ranking Time ↓</div></div>
          <div className="roi-kpi rounded-2xl text-center"><div className="roi-kpi-val text-xl">{r.qualReduce}%</div><div className="roi-kpi-label">Qualification Effort ↓</div></div>
          <div className="roi-kpi rounded-2xl text-center"><div className="roi-kpi-val text-xl">{r.prodIdx}x</div><div className="roi-kpi-label">Productivity Index</div></div>
          <div className="roi-kpi roi-kpi-featured rounded-2xl text-center"><div className="roi-kpi-val text-xl" style={{ color:'#4ADE80' }}>{fmtMoney(r.savings)}</div><div className="roi-kpi-label" style={{ color:'rgba(255,255,255,0.85)' }}>Monthly Savings</div><div className="roi-kpi-sub">{fmtMoney(r.savingsPerJD)}/JD</div></div>
          <div className="roi-kpi rounded-2xl text-center"><div className="roi-kpi-val text-xl">{r.costRatio}%</div><div className="roi-kpi-label">Cost/Req vs Human</div></div>
        </div>
        <div className="roi-rec-card">
          {/* Billing toggle */}
          <div style={{ display:'flex', gap:'6px', marginBottom:'16px', background:'rgba(255,255,255,0.05)', borderRadius:'10px', padding:'4px' }}>
            <button onClick={()=>setBilling('monthly')} style={{ flex:1, padding:'7px', borderRadius:'7px', border:'none', cursor:'pointer', fontSize:'12px', fontWeight:700, background: billing==='monthly' ? 'var(--primary)' : 'transparent', color: billing==='monthly' ? '#fff' : 'var(--text-muted)', transition:'all .2s' }}>Monthly</button>
            <button onClick={()=>setBilling('annual')} style={{ flex:1, padding:'7px', borderRadius:'7px', border:'none', cursor:'pointer', fontSize:'12px', fontWeight:700, background: billing==='annual' ? 'var(--primary)' : 'transparent', color: billing==='annual' ? '#fff' : 'var(--text-muted)', transition:'all .2s' }}>Annual (Save 17%)</button>
          </div>
          <div style={{ marginBottom:'16px' }}>
            <div style={{ fontSize:'10px', fontWeight:700, color:'var(--green)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'6px' }}>Recommended Based on Your Volume</div>
            <div className="pricing-plan"><span className="text-emerald-400" style={{ color:'#34d399' }}>{r.plan.name}</span> Plan</div>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', margin:'8px 0 14px' }}>
              <span style={{ fontSize:'11px', color:'var(--text-dim)' }}>ROI Insight</span>
              <div className="text-emerald-400" style={{ fontSize:'12px', fontWeight:700, color:'#34d399' }}>{r.roiPct}%</div>
            </div>
            <div className="pricing-price">
              <span className="pricing-price-num">${billing==='annual' ? Math.round(r.plan.price*10) : r.plan.price}</span>
              <span className="pricing-price-period">/{billing==='annual' ? 'yr' : 'mo'}</span>
            </div>
          </div>
          {/* Wallet credits */}
          <div style={{ background:'rgba(0,177,79,0.1)', border:'1px solid rgba(0,177,79,0.2)', borderRadius:'10px', padding:'10px 14px', marginBottom:'14px', display:'flex', gap:'8px', alignItems:'center' }}>
            <span style={{ fontSize:'16px' }}>💳</span>
            <div>
              <div style={{ fontSize:'12px', fontWeight:700, color:'#6EE7B7' }}>${(r.plan.price * 2).toLocaleString()} AI credits included</div>
              <div style={{ fontSize:'10px', color:'var(--text-dim)' }}>Full amount into your AI wallet</div>
            </div>
          </div>
          <button type="button" onClick={()=>{ if(typeof window!=='undefined') window.location.href=getAppUrl(`/signup?plan=${r.plan.name}&billing=${billing}`); }} className="btn-primary" style={{ width:'100%', justifyContent:'center', fontSize:'14px', border:'none', cursor:'pointer' }}>
            Get Started with {r.plan.name} Plan ({billing==='annual' ? `$${Math.round(r.plan.price*10)}/yr, billed annually` : `$${r.plan.price}/mo`}) →
          </button>
          <p style={{ textAlign:'center', fontSize:'11px', color:'var(--text-dim)', marginTop:'10px' }}>
            Signup → select plan → Stripe checkout · Cancel anytime · <a href="/pricing" style={{ color:'var(--green)', textDecoration:'underline' }}>View all plans</a>
          </p>
        </div>
        <div className="roi-compare-grid">
          <div className="roi-compare-panel" style={{ border:'1px solid rgba(239,68,68,0.2)' }}>
            <div className="roi-compare-header" style={{ borderColor:'rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.06)' }}>
              <h3 style={{ fontSize:'14px', fontWeight:700, color:'var(--text)' }}>👤 Human Recruiter</h3>
              <p style={{ fontSize:'11px', color:'var(--text-dim)', marginTop:'4px' }}>Manual screening, ranking &amp; qualification</p>
            </div>
            {[
              { label:'Step 4: CV Screening', val:fmtH(r.manScreen) },
              { label:'Step 5: Candidate Ranking & Matching', val:fmtH(r.manRank) },
              { label:'Step 6: Qualification Calls', val:fmtH(r.manQual) },
            ].map((row,i) => (
              <div key={i} className="roi-step-row" style={{ background:'rgba(239,68,68,0.05)', borderBottom:'1px solid rgba(239,68,68,0.1)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'12px' }}>
                  <span style={{ color:'#EF4444' }}>⚡</span><span style={{ fontWeight:600, color:'#FCA5A5' }}>{row.label}</span>
                </div>
                <span style={{ fontFamily:'monospace', fontWeight:700, fontSize:'12px', color:'#EF4444', background:'rgba(239,68,68,0.1)', padding:'3px 10px', borderRadius:'100px' }}>{row.val}</span>
              </div>
            ))}
            <div style={{ padding:'10px 16px', fontSize:'11px', color:'var(--text-dim)', background:'rgba(255,255,255,0.02)', borderBottom:'1px solid var(--border)' }}>Other Steps (No Change) — human-led</div>
            <div style={{ margin:'12px', border:'1px solid rgba(239,68,68,0.15)', background:'rgba(239,68,68,0.05)', borderRadius:'12px', padding:'14px' }}>
              <div className="roi-summary-grid">
                {[['Effort / Req',`${r.manTotal.toFixed(1)}h`],['Reqs / Month',`${r.jds}.0`],['Cost / Req',fmtMoney(r.manCostReq)],['Monthly Cost',fmtMoney(r.manCostMonth)],['Shortlisted / Req',String(r.shortlistedPerReq)],['Qualified / Req',String(r.qualPerReq)]].map(([label,val])=>(
                  <div key={label} className="roi-summary-row"><span style={{ color:'var(--text-dim)' }}>{label}</span><span style={{ fontWeight:700 }}>{val}</span></div>
                ))}
              </div>
            </div>
          </div>
          <div className="roi-compare-panel" style={{ border:'1px solid rgba(0,177,79,0.2)' }}>
            <div className="roi-compare-header" style={{ borderColor:'rgba(0,177,79,0.3)', background:'rgba(0,177,79,0.06)' }}>
              <h3 style={{ fontSize:'14px', fontWeight:700, color:'var(--text)' }}>🤖 Human + <span style={{ color:'var(--green)' }}>Hire-GenAI</span></h3>
              <p style={{ fontSize:'11px', color:'var(--text-dim)', marginTop:'4px' }}>Hire-GenAI accelerates Steps 4, 5, 6</p>
            </div>
            {[
              { label:'Step 4: CV Screening', val:fmtH(r.aiScreen), badge:'AI Accelerated', bs:{ background:'rgba(0,177,79,0.15)', color:'#6EE7B7', borderColor:'rgba(0,177,79,0.3)' } },
              { label:'Step 5: Candidate Ranking & Matching', val:fmtH(r.aiRank), badge:'AI Automated', bs:{ background:'rgba(0,177,79,0.2)', color:'#A7F3D0', borderColor:'rgba(0,177,79,0.4)' } },
              { label:'Step 6: Qualification Calls', val:fmtH(r.aiQual), badge:'AI Assisted', bs:{ background:'rgba(245,158,11,0.15)', color:'#FCD34D', borderColor:'rgba(245,158,11,0.3)' } },
            ].map((row,i)=>(
              <div key={i} className="roi-step-row" style={{ background:'rgba(0,177,79,0.05)', borderBottom:'1px solid rgba(0,177,79,0.1)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'12px' }}>
                  <span style={{ color:'var(--green)' }}>⚡</span><span style={{ fontWeight:600, color:'#6EE7B7' }}>{row.label}</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                  <span style={{ fontFamily:'monospace', fontWeight:700, fontSize:'12px', color:'var(--green)', background:'rgba(0,177,79,0.1)', padding:'3px 10px', borderRadius:'100px' }}>{row.val}</span>
                  <span className="roi-step-badge" style={row.bs}>{row.badge}</span>
                </div>
              </div>
            ))}
            <div style={{ padding:'10px 16px', fontSize:'11px', color:'var(--text-dim)', background:'rgba(255,255,255,0.02)', borderBottom:'1px solid var(--border)' }}>Other Steps (No Change) — human-led</div>
            <div style={{ margin:'12px', border:'1px solid rgba(0,177,79,0.15)', background:'rgba(0,177,79,0.05)', borderRadius:'12px', padding:'14px' }}>
              <div className="roi-summary-grid">
                {[['Effort / Req',`${r.aiTotal.toFixed(1)}h`],['Reqs / Month',`${r.jds}.0`],['Cost / Req',fmtMoney(r.aiCostReq)],['Monthly Cost',fmtMoney(r.aiCostMonth)],['Shortlisted / Req',String(r.shortlistedPerReq)],['Qualified / Req',String(r.qualPerReq)]].map(([label,val])=>(
                  <div key={label} className="roi-summary-row"><span style={{ color:'var(--text-dim)' }}>{label}</span><span style={{ fontWeight:700, color:'var(--green)' }}>{val}</span></div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <p style={{ fontSize:'10px', color:'var(--text-dim)', textAlign:'center', margin:'12px 0 0', lineHeight:1.6 }}>
          * Hire-GenAI Impact (Steps 4–6): CV screening 5min→1min/cv · ranking 0.6→0.05min/cv · qualification calls 20min→10min per shortlisted candidate.
        </p>
        <div style={{ marginTop:'48px', background:'linear-gradient(135deg,rgba(0,177,79,0.12),rgba(6,182,212,0.08))', border:'1px solid rgba(0,177,79,0.2)', borderRadius:'20px', padding:'48px', textAlign:'center' }}>
          <h3 style={{ fontSize:'clamp(22px,3vw,32px)', fontWeight:800, marginBottom:'12px' }}>Ready to Accelerate Your Hiring?</h3>
          <p style={{ fontSize:'15px', color:'var(--text-muted)', marginBottom:'28px' }}>
            Save <strong style={{ color:'var(--green)' }}>{fmtMoney(r.savings)}/month</strong> by adding Hire-GenAI to your team
          </p>
          <div style={{ display:'flex', gap:'16px', justifyContent:'center', flexWrap:'wrap' }}>
            <a href="#pricing" className="btn-primary" style={{ padding:'16px 32px', fontSize:'16px' }}>Get Started Free</a>
            <a href="/book-meeting" className="btn-secondary" style={{ padding:'15px 31px', fontSize:'16px' }}>📅 Book a Demo</a>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── ROI Assessment ────────────────────────────────────────────────────────────
const questions = [
  { q:'How many applications do you typically receive per open position?', opts:['Less than 10','10 - 30','30 - 100','More than 100'] },
  { q:'How much time does your team spend screening CVs for a typical role?', opts:['Less than 2 hours','2 - 5 hours','5 - 10 hours','More than 10 hours'] },
  { q:"What's your average time-to-hire from application to offer?", opts:['Less than 1 week','1 - 2 weeks','2 - 4 weeks','More than 4 weeks'] },
  { q:'How do you currently screen candidates before the first interview?', opts:['Manual CV review only','Phone screening calls','Automated skills assessments','AI-powered screening tools'] },
  { q:'What percentage of candidates you interview meet your quality standards?', opts:['Less than 25%','25% - 50%','50% - 75%','More than 75%'] },
  { q:'How would you describe your cost per hire?', opts:['Very low','Reasonable','High','Very high - excessive'] },
  { q:'How would you rate your candidate experience during the application process?', opts:['Poor - many drop out','Average','Good - satisfied','Excellent'] },
  { q:'How many people are involved in your recruitment process per hire?', opts:['1-2 people','3-4 people','5-6 people','More than 6 people'] },
  { q:'What recruitment technology do you currently use?', opts:['Basic ATS only','ATS with some automation','Multiple integrated tools','Advanced AI-powered platform'] },
  { q:'How important is improving your recruitment efficiency right now?', opts:['Not a priority','Somewhat important','Very important','Critical priority'] },
];

export function ROIAssessment() {
  const [step, setStep] = useState<'q'|'contact'|'done'>('contact');
  const [qIdx, setQIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number,string>>({});
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [company, setCompany] = useState('');
  const [score, setScore] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const pct = step==='done'?100:step==='contact'?5:((qIdx+1)/11*90+5);

  const getRec = (a: Record<number,string>) => {
    const cvOpts = questions[0].opts; const cvIdx = cvOpts.indexOf(a[0] || '');
    const sizeOpts = questions[7].opts; const sizeIdx = sizeOpts.indexOf(a[7] || '');
    const idx = Math.max(cvIdx, sizeIdx);
    return [
      { name:'Starter', price:99 },
      { name:'Professional', price:499 },
      { name:'Business', price:999 },
      { name:'Large', price:2999 },
    ][Math.min(idx, 3)];
  };

  const pick = (opt: string) => {
    const a = { ...answers, [qIdx]: opt }; setAnswers(a);
    setTimeout(() => {
      if (qIdx+1 >= questions.length) {
        const finalScore = Math.round((Object.keys(a).length/questions.length)*72+18);
        setScore(finalScore);
        setSubmitting(true);
        fetch('/api/assessments/submit', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name, email, company, answers: a, efficiencyScore: finalScore }) }).catch(()=>{}).finally(()=>setSubmitting(false));
        setStep('done');
      }
      else setQIdx(qIdx+1);
    }, 400);
  };

  return (
    <section className="reveal" id="assessment" style={{ padding:'80px 0', background:'linear-gradient(180deg,transparent,rgba(0,177,79,0.04) 50%,transparent)' }}>
      <div className="container">
        <div style={{ textAlign:'center', marginBottom:'40px' }}>
          <div className="section-label">ROI Assessment</div>
          <h2 className="section-title" style={{ fontSize:'clamp(24px,3vw,40px)' }}>Feeling Frustrated That You&rsquo;re Not Finding Quality Candidates?</h2>
          <p style={{ fontSize:'16px', color:'var(--text-muted)', margin:'16px auto 0', maxWidth:'600px', lineHeight:1.7 }}>Answer 10 questions to find out why and get your personalised report.</p>
        </div>
        <div className="roi-assessment-wrap">
          <div>
            {[['🏆','Get your personalised score','See how your process compares to industry standards'],['📈','Receive custom recommendations','Get actionable insights to improve hiring efficiency'],['⏱','Learn time-saving strategies','Discover how to automate screening and save hours each week']].map(([icon,t,d]) => (
              <div key={t} className="roi-benefit"><div className="roi-benefit-icon">{icon}</div><div><div style={{ fontWeight:700, fontSize:'14px', marginBottom:'2px' }}>{t}</div><div style={{ fontSize:'13px', color:'var(--text-dim)' }}>{d}</div></div></div>
            ))}
            <div style={{ background:'var(--card-bg)', border:'1px solid var(--border)', borderRadius:'14px', padding:'24px', marginTop:'8px' }}>
              <div style={{ fontSize:'13px', fontWeight:700, color:'var(--text-muted)', marginBottom:'14px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Prefer to talk directly?</div>
              <div style={{ display:'flex', gap:'12px' }}>
                <a href="/book-meeting" className="btn-primary" style={{ padding:'12px 22px', fontSize:'14px' }}>📅 Book a Meeting</a>
                <a href="mailto:support@hire-genai.com" className="btn-secondary" style={{ padding:'11px 21px', fontSize:'14px' }}>✉ Contact</a>
              </div>
            </div>
          </div>
          <div className="roi-assessment-card">
            <div className="roi-quiz-progress-bar"><div className="roi-quiz-progress-fill" style={{ width:`${pct}%` }} /></div>
            {step==='q' && (
              <div>
                <div style={{ fontSize:'11px', fontWeight:700, color:'var(--text-dim)', letterSpacing:'0.06em', marginBottom:'6px' }}>QUESTION {qIdx+1} OF 10</div>
                <div style={{ fontSize:'16px', fontWeight:700, marginBottom:'20px', lineHeight:1.5 }}>{questions[qIdx].q}</div>
                <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                  {questions[qIdx].opts.map(opt => (
                    <div key={opt} className={`roi-option${answers[qIdx]===opt?' selected':''}`} onClick={() => pick(opt)}>
                      <div className="roi-option-dot" /><span>{opt}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {step==='contact' && (
              <div>
                <div style={{ fontSize:'16px', fontWeight:700, marginBottom:'4px' }}>Get your personalised ROI report</div>
                <div style={{ fontSize:'13px', color:'var(--text-dim)', marginBottom:'16px' }}>Answer 10 quick questions and see exactly how much your team can save.</div>
                {[['text','Full Name','Jane Smith',name,setName],['email','Work Email','jane@company.com',email,setEmail],['text','Company','Acme Corp',company,setCompany]].map(([type,label,placeholder,val,setter]) => (
                  <div key={label as string} className="roi-input-group">
                    <label>{label as string}</label>
                    <input type={type as string} placeholder={placeholder as string} className="roi-input" value={val as string} onChange={e => (setter as (v:string)=>void)(e.target.value)} />
                  </div>
                ))}
                <button className="btn-primary" style={{ width:'100%', justifyContent:'center', marginTop:'8px' }} onClick={() => {
                    if (!name || !email || !company) return;
                    setStep('q');
                  }}>Start Assessment →</button>
              </div>
            )}
            {step==='done' && (() => { const rec = getRec(answers); return (
              <div style={{ textAlign:'center', padding:'24px 16px' }}>
                <div style={{ fontSize:'40px', marginBottom:'12px' }}>🎉</div>
                <div style={{ fontSize:'18px', fontWeight:800, marginBottom:'4px' }}>Your report is ready!</div>
                <div style={{ fontSize:'32px', fontWeight:900, color:'var(--green)', margin:'8px 0' }}>Efficiency Score: {score}%</div>
                <div style={{ fontSize:'13px', color:'var(--text-muted)', marginBottom:'20px' }}>We&rsquo;ve prepared a personalised recommendation and will send it to your email.</div>
                <div style={{ background:'rgba(0,177,79,0.1)', border:'1px solid rgba(0,177,79,0.3)', borderRadius:'14px', padding:'16px', marginBottom:'16px', textAlign:'left' }}>
                  <div style={{ fontSize:'10px', fontWeight:700, color:'var(--green)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'6px' }}>Recommended Based on Your Volume</div>
                  <div style={{ fontSize:'18px', fontWeight:800, color:'var(--text)', marginBottom:'4px' }}><span style={{ color:'var(--green)' }}>{rec.name}</span> — ${rec.price}/mo</div>
                  <div style={{ fontSize:'12px', color:'var(--text-dim)' }}>Based on your application volume and team size</div>
                </div>
                <a href={getAppUrl(`/signup?plan=${rec.name}&billing=monthly`)} className="btn-primary" style={{ display:'inline-flex', justifyContent:'center', width:'100%' }}>Start with {rec.name} Plan →</a>
                <a href="#pricing" style={{ display:'block', fontSize:'12px', color:'var(--text-dim)', marginTop:'10px', textDecoration:'underline' }}>Compare all plans</a>
              </div>
            ); })()}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Pricing ───────────────────────────────────────────────────────────────────
const PRICING_PLANS = [
  { name:'Starter', monthlyPrice:99, annualPrice:990, monthlyWallet:99, annualWallet:119, monthlyCVs:'~200', annualCVs:'~240', monthlyInts:'~4', annualInts:'~5', tagline:'For startups and small teams running their first AI-powered hiring workflows.', topLabel:null as string|null, features:['Unlimited job postings','Full ATS — applications, talent pool, delegation & feedback','AI CV evaluation & scoring','AI video interviews','Auto interview question generation','Manager & recruiter dashboards','Wallet billing + invoice generation','Email notifications','Unlimited team members (4 role types)'], dashboardFeatures:['Manager KPIs','Recruiter KPIs','Team overview','Client activation tracking','Onboarding completion analytics'], support:'Standard Support · 72h response · Email + Chat', cta:'Choose Starter', popular:false },
  { name:'Professional', monthlyPrice:499, annualPrice:4990, monthlyWallet:499, annualWallet:599, monthlyCVs:'~1,000', annualCVs:'~1,200', monthlyInts:'~20', annualInts:'~24', tagline:'For agencies scaling their recruiting operations.', topLabel:null as string|null, features:['Everything in Starter','Advanced analytics','Pipeline tracking','AI recruiter workflows','Priority support','Role-based access control','Team performance tracking'], dashboardFeatures:['All Starter dashboards','Pipeline analytics','CSAT & satisfaction tracking','Onboarding TAT + utilization metrics'], support:'Priority Support · 48h response · Chat + Email + Phone', cta:'Choose Professional', popular:false },
  { name:'Business', monthlyPrice:999, annualPrice:9990, monthlyWallet:999, annualWallet:1199, monthlyCVs:'~2,000', annualCVs:'~2,400', monthlyInts:'~40', annualInts:'~48', tagline:'For mid-size agencies and growing recruitment teams.', topLabel:null as string|null, features:['Everything in Professional','Custom dashboard views','SLA compliance tracking','Retention forecasting','Advanced AI scoring','Dedicated business support'], dashboardFeatures:['All Professional dashboards','Executive analytics','Retention forecasting','SLA & utilization insights'], support:'Business Support · 24h response · Dedicated Chat', cta:'Choose Business', popular:false },
  { name:'Large', monthlyPrice:2999, annualPrice:29990, monthlyWallet:2999, annualWallet:3599, monthlyCVs:'~6,000', annualCVs:'~7,200', monthlyInts:'~120', annualInts:'~144', tagline:'For scaling recruitment agencies that need serious AI infrastructure.', topLabel:'⭐ Most Popular · Best for Agencies', features:['Everything in Business','Executive dashboards','Revenue analytics','Multi-team workflows','Slack support','Advanced AI hiring infrastructure'], dashboardFeatures:['Executive-level analytics','CLTV + revenue per client','Pipeline health scorecards','SLA monitoring'], support:'Large Support · 12h response · Slack + Phone + Onboarding', cta:'Choose Large', popular:true },
  { name:'Ultra', monthlyPrice:3999, annualPrice:39990, monthlyWallet:3999, annualWallet:4799, monthlyCVs:'~8,000', annualCVs:'~9,600', monthlyInts:'~160', annualInts:'~192', tagline:'For high-volume AI-powered hiring operations.', topLabel:null as string|null, features:['Everything in Large','Department-level analytics','Capacity planning','Churn risk prediction','Dedicated AI optimization support'], dashboardFeatures:['Advanced operational analytics','Hiring capacity forecasting','Churn risk indicators','Department insights'], support:'Ultra Support · 6h response · 24/7 priority + Dedicated Rep', cta:'Choose Ultra', popular:false },
  { name:'Enterprise', monthlyPrice:4999, annualPrice:49990, monthlyWallet:4999, annualWallet:5999, monthlyCVs:'~10,000', annualCVs:'~12,000', monthlyInts:'~200', annualInts:'~240', tagline:'Ultimate scale for enterprise hiring infrastructure.', topLabel:'🔥 Ultimate Scale', features:['Enterprise-grade ATS','Multi-tenant architecture','Custom AI workflows','Dedicated success manager','Private deployment options','Advanced compliance & security','Custom integrations & APIs'], dashboardFeatures:['Enterprise KPI builder','Multi-tenant benchmarking','Automated health alerts','Cross-org reporting'], support:'Enterprise SLA · 2h critical response · 24/7 dedicated success manager', cta:'Choose Enterprise', popular:false },
];
const pricingFaqs = [
  { q:'Can I switch plans at any time?', a:'Yes — upgrade or downgrade whenever you need. Changes apply immediately with prorated billing.' },
  { q:'How does the annual plan work?', a:"You pay for 10 months and stay active for 12 — saving roughly 17% on cost. Your monthly usage estimates and wallet credits also increase by 20%." },
  { q:'What are the wallet credits?', a:'Every plan includes AI usage wallet credits equal to your subscription cost. These cover CV parsing, video interviews, and question generation. Overage is billed automatically.' },
  { q:'What do the usage estimates mean?', a:'The CV and interview numbers are indicative ranges. They are not hard caps — actual consumption depends on your interview duration and workflow.' },
  { q:'Do you offer custom pricing for very high volume?', a:'Absolutely. For teams needing more than Enterprise-scale volume or custom integrations, contact our sales team for a tailored proposal.' },
];

export function Pricing() {
  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  return (
    <section className="pricing reveal" id="pricing">
      <div className="container">
        <div className="pricing-header">
          <div className="section-label">⚡ AI Recruiting OS · Full ATS + AI Interview</div>
          <h2 className="section-title">Simple, transparent pricing.<br /><span style={{ background:'var(--gradient)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>Pay for what you use.</span></h2>
          <p className="section-subtitle" style={{ margin:'16px auto 0' }}>
            All paid plans include <strong>unlimited team members</strong>. Wallet-based billing — credits auto-refill, no per-seat surprises.
          </p>
          <div className="pricing-toggle">
            <span className="pricing-toggle-label" style={{ fontWeight:annual?400:700, color:annual?'':'var(--text)' }}>Monthly</span>
            <div className="toggle-switch" onClick={() => setAnnual(!annual)}>
              <div className="toggle-knob" style={{ right:annual?'3px':'25px' }} />
            </div>
            <span className="pricing-toggle-label" style={{ fontWeight:annual?700:400, color:annual?'var(--text)':'' }}>Annual</span>
            <span className="pricing-save">Save 17%</span>
          </div>
          <div style={{ fontSize:'12px', color:'var(--text-dim)', marginTop:'8px' }}>Annual plan: credits &amp; usage increase by 20%</div>
        </div>
        <div className="pricing-grid-6">
          {PRICING_PLANS.map(plan => {
            const price = annual ? plan.annualPrice : plan.monthlyPrice;
            const wallet = annual ? plan.annualWallet : plan.monthlyWallet;
            const cvs = annual ? plan.annualCVs : plan.monthlyCVs;
            const ints = annual ? plan.annualInts : plan.monthlyInts;
            return (
              <div key={plan.name} className={`pricing-card${plan.popular?' popular':''}`}>
                {plan.topLabel && (
                  <div className="popular-badge" style={!plan.popular?{ background:'linear-gradient(90deg,#F59E0B,#EF4444)' }:undefined}>{plan.topLabel}</div>
                )}
                <div className="pricing-plan">{plan.name}</div>
                <p style={{ fontSize:'12px', color:'var(--text-muted)', marginBottom:'16px', lineHeight:1.5 }}>{plan.tagline}</p>
                <div className="pricing-price">
                  <span className="pricing-price-num">${price.toLocaleString()}</span>
                  <span className="pricing-price-period">/{annual?'yr':'mo'}</span>
                </div>
                {/* Wallet credits */}
                <div style={{ background:'rgba(0,177,79,0.1)', border:'1px solid rgba(0,177,79,0.2)', borderRadius:'10px', padding:'10px 14px', marginBottom:'14px', display:'flex', gap:'8px', alignItems:'center' }}>
                  <span style={{ fontSize:'16px' }}>💳</span>
                  <div>
                    <div style={{ fontSize:'12px', fontWeight:700, color:'#6EE7B7' }}>${wallet.toLocaleString()} AI credits included</div>
                    <div style={{ fontSize:'10px', color:'var(--text-dim)' }}>{annual?'+20% extra vs monthly':'Full amount into your AI wallet'}</div>
                  </div>
                </div>
                {/* Usage capacity */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'16px' }}>
                  <div style={{ background:'rgba(255,255,255,0.05)', borderRadius:'10px', padding:'10px', textAlign:'center' }}>
                    <div style={{ fontSize:'16px', fontWeight:800, color:'var(--text)' }}>{cvs}</div>
                    <div style={{ fontSize:'10px', color:'var(--text-dim)' }}>candidates screened</div>
                  </div>
                  <div style={{ background:'rgba(255,255,255,0.05)', borderRadius:'10px', padding:'10px', textAlign:'center' }}>
                    <div style={{ fontSize:'16px', fontWeight:800, color:'var(--text)' }}>{ints}</div>
                    <div style={{ fontSize:'10px', color:'var(--text-dim)' }}>AI video rounds</div>
                  </div>
                </div>
                <div style={{ border:'1px solid rgba(255,255,255,0.08)', borderRadius:'10px', overflow:'hidden', marginBottom:'4px' }}>
                  {[
                    { icon:'⚡', label:'AI CV Reports', desc:'Every resume scored, ranked & explained instantly' },
                    { icon:'🎥', label:'AI Video Interviews + Reports', desc:'Automated rounds — questions, recording & post-interview AI summary' },
                    { icon:'❓', label:'Auto Interview Questions', desc:'Role-specific questions generated before every round' },
                    { icon:'📋', label:'Unlimited Job Postings', desc:'No cap on active roles — post as many as you need' },
                    { icon:'🤝', label:'Client & Agent Connect', desc:'Share pipelines, roles & updates with external clients or partners' },
                    { icon:'🔄', label:'Delegation, Feedback & Audit', desc:'Assign to team, collect feedback, full audit trail' },
                    { icon:'📊', label:'Recruiter · Manager · Director', desc:'Dedicated KPI dashboards for every role in your team' },
                  ].map(({ icon, label, desc }, i, arr) => (
                    <div key={label} style={{ display:'flex', alignItems:'flex-start', gap:'10px', padding:'10px 12px', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none', background:'rgba(255,255,255,0.02)' }}>
                      <span style={{ fontSize:'14px', flexShrink:0, marginTop:'1px' }}>{icon}</span>
                      <div>
                        <div style={{ fontSize:'12px', fontWeight:600, color:'var(--text)', lineHeight:1.3 }}>{label}</div>
                        <div style={{ fontSize:'11px', color:'var(--text-dim)', marginTop:'2px', lineHeight:1.4 }}>{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ margin:'12px 0 14px', display:'flex', alignItems:'center' }}>
                  <span style={{ fontSize:'11px', fontWeight:700, color:'#fff', background:'var(--green)', padding:'4px 10px', borderRadius:'100px' }}>🎧 {plan.support}</span>
                </div>
                <a href={getAppUrl(`/signup?plan=${plan.name}&billing=${annual?'annual':'monthly'}`)} className={plan.popular?'btn-primary':'btn-secondary'} style={{ textAlign:'center', justifyContent:'center' }}>
                  {plan.cta} →
                </a>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop:'36px', background:'var(--card-bg)', border:'1px solid var(--border)', borderRadius:'14px', padding:'20px 28px', fontSize:'13px', color:'var(--text-dim)', textAlign:'center' }}>
          Not sure which package is right for you?{' '}
          <button onClick={() => document.getElementById('assessment')?.scrollIntoView({ behavior:'smooth' })} style={{ background:'none', border:'none', padding:0, cursor:'pointer', color:'var(--green)', fontWeight:700, textDecoration:'underline', fontSize:'inherit' }}>Take our ROI Assessment</button>{' '}
          to receive a personalized recommendation based on your hiring volume and expected savings.
        </div>
        <div style={{ marginTop:'24px', textAlign:'center' }}>
          <div style={{ fontSize:'11px', color:'var(--text-dim)', marginTop:'4px' }}>No credit card required · cancel anytime</div>
          <div style={{ fontSize:'12px', color:'var(--text-dim)', marginTop:'6px' }}>🧑‍🤝‍🧑 Unlimited team members on every paid plan · Overage draws from wallet balance automatically</div>
        </div>
        <div style={{ marginTop:'48px' }}>
          <div id="faq" style={{ textAlign:'center', marginBottom:'28px' }}>
            <h3 style={{ fontSize:'22px', fontWeight:800 }}>Common Questions</h3>
            <p style={{ fontSize:'13px', color:'var(--text-dim)', marginTop:'4px' }}>Straight answers on how pricing and plans work</p>
          </div>
          <div className="pricing-faq">
            {pricingFaqs.map((f, i) => (
              <div key={f.q} className="pricing-faq-item" style={{ cursor:'pointer' }} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px' }}>
                  <h4 style={{ margin:0 }}>{f.q}</h4>
                  <span style={{ fontSize:'18px', color:'var(--green)', flexShrink:0, transition:'transform 0.2s', display:'inline-block', transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
                </div>
                {openFaq === i && <p style={{ marginTop:'10px', marginBottom:0 }}>{f.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Trust Banner ──────────────────────────────────────────────────────────────
export function TrustBanner() {
  const badges = [['🔒','GDPR Compliant','Full EU data protection'],['🛡','SOC 2 Ready','Enterprise security'],['🔐','AES-256 Encryption','Bank-grade encryption'],['⚡','99.9% Uptime SLA','Enterprise reliability'],['🌍','Multi-Region','Global CDN'],['✅','ISO 27001 Aligned','Info security management']];
  return (
    <section className="reveal" style={{ padding:'56px 0', borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)', background:'var(--dark2)' }}>
      <div className="container">
        <div style={{ textAlign:'center', fontSize:'13px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--text-muted)', marginBottom:'28px' }}>Enterprise-Grade Security & Compliance</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:'16px' }}>
          {badges.map(([icon,title,desc]) => (
            <div key={title} className="cta-trust-badge" style={{ background:'var(--card-bg)', border:'1px solid var(--border)', borderRadius:'12px', padding:'16px 20px', gap:'14px' }}>
              <div style={{ fontSize:'26px' }}>{icon}</div>
              <div><div style={{ fontWeight:700, fontSize:'13px', color:'var(--text)', marginBottom:'2px' }}>{title}</div><div style={{ fontSize:'12px', color:'var(--text-dim)' }}>{desc}</div></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Testimonials ──────────────────────────────────────────────────────────────
export function Testimonials() {
  const items = [
    { quote:'We went from spending 40 hours a week on CV screening to just 4. The AI evaluation accuracy is impressive — it consistently surfaces candidates we would have missed.', name:'Sarah Mitchell', role:'Head of Talent Acquisition · TechCorp Global', initials:'SM', result:'90% reduction in screening time' },
    { quote:'The video interview feature is a game-changer. Candidates complete on their own schedule, our team reviews when convenient, and the AI scoring saves hours of debrief time.', name:'Marcus Johnson', role:'HR Director · ScaleUp Solutions', initials:'MJ', result:'3× faster time-to-hire' },
    { quote:'As a fast-growing startup we needed to hire fast without sacrificing quality. Hire-GenAI helped us make 12 hires in 6 weeks while our team stayed focused on building the product.', name:'Priya Sharma', role:'Co-founder & CEO · Nexus AI', initials:'PS', result:'12 hires in 6 weeks' },
  ];
  return (
    <section className="testimonials reveal">
      <div className="container">
        <div className="testimonials-header">
          <div className="section-label">Testimonials</div>
          <h2 className="section-title">Loved by hiring teams worldwide</h2>
          <p className="section-subtitle" style={{ margin:'16px auto 0' }}>See what recruiters and HR leaders say about Hire-GenAI.</p>
        </div>
        <div className="testimonials-grid">
          {items.map(t => (
            <div key={t.name} className="testimonial-card">
              <div className="testimonial-stars">★★★★★</div>
              <div className="testimonial-quote">&ldquo;{t.quote}&rdquo;</div>
              <div className="testimonial-author">
                <div className="testimonial-avatar" style={{ background:'rgba(0,177,79,0.2)', color:'var(--green)' }}>{t.initials}</div>
                <div><div className="testimonial-name">{t.name}</div><div className="testimonial-role">{t.role}</div></div>
              </div>
              <div className="testimonial-result">📈 {t.result}</div>
            </div>
          ))}
        </div>
        <div style={{ textAlign:'center', marginTop:'40px' }}>
          <a href="/book-meeting" className="btn-secondary">Read More Case Studies →</a>
        </div>
      </div>
    </section>
  );
}

// ── Company ───────────────────────────────────────────────────────────────────
export function Company() {
  return (
    <section className="company reveal" id="company">
      <div className="container">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'64px', alignItems:'flex-start' }} className="company-2col">
          <div>
            <div className="section-label">Our Company</div>
            <h2 className="section-title" style={{ fontSize:'clamp(24px,3vw,40px)', textAlign:'left' }}>Built by recruiters,<br />powered by AI</h2>
            <p style={{ fontSize:'15px', color:'var(--text-muted)', lineHeight:1.8, marginTop:'16px' }}>Hire-GenAI was founded by a team of recruitment professionals and AI engineers who were tired of watching talented hiring managers drown in CVs and scheduling chaos.</p>
            <p style={{ fontSize:'15px', color:'var(--text-muted)', lineHeight:1.8, marginTop:'12px' }}>We built the platform we always wished existed — one that handles the repetitive work so humans can focus on building relationships and making smart hiring decisions.</p>
            <div style={{ marginTop:'28px', padding:'20px', background:'var(--card-bg)', border:'1px solid var(--border)', borderRadius:'14px' }}>
              <div style={{ fontSize:'13px', fontWeight:700, marginBottom:'10px', color:'var(--text-muted)' }}>Get in touch</div>
              <a href="mailto:hello@hire-genai.com" style={{ display:'block', color:'var(--green)', textDecoration:'none', fontSize:'14px', marginBottom:'6px' }}>✉ hello@hire-genai.com</a>
              <a href="mailto:support@hire-genai.com" style={{ display:'block', color:'var(--green)', textDecoration:'none', fontSize:'14px' }}>🛟 support@hire-genai.com</a>
            </div>
          </div>
          <div>
            {[['🎯','Mission-Driven','Every company deserves access to AI-powered hiring, not just enterprises.'],['🔬','AI-First','Every feature is designed around AI from the ground up.'],['🤝','Human-Centred','AI handles volume work; humans make the final decisions.'],['🔒','Privacy by Design','GDPR-compliant and encrypted end-to-end.']].map(([icon,title,desc]) => (
              <div key={title} className="company-feature-row" style={{ marginBottom:'20px' }}>
                <div className="company-feature-icon">{icon}</div>
                <div><div style={{ fontWeight:700, fontSize:'14px', marginBottom:'4px' }}>{title}</div><div style={{ fontSize:'13px', color:'var(--text-muted)', lineHeight:1.6 }}>{desc}</div></div>
              </div>
            ))}
          </div>
        </div>
        <div className="company-grid">
          {[['🏢','50+','Companies','Fast-growing teams trust Hire-GenAI'],['🎯','10K+','Hires Facilitated','Successful placements made'],['🌍','15+','Countries','Global reach across 3 continents'],['⭐','4.9★','Avg. Rating','Consistently rated excellent']].map(([icon,num,label,desc]) => (
            <div key={label} className="company-card">
              <div className="company-card-icon">{icon}</div>
              <div className="company-card-title">{num}</div>
              <div style={{ fontSize:'12px', fontWeight:700, color:'var(--green)', marginBottom:'6px' }}>{label}</div>
              <div className="company-card-desc">{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Final CTA ─────────────────────────────────────────────────────────────────
export function FinalCTA() {
  return (
    <section className="final-cta reveal">
      <div className="container">
        <div style={{ maxWidth:'640px', margin:'0 auto' }}>
          <div className="section-label" style={{ color:'rgba(255,255,255,0.6)', justifyContent:'center', display:'flex' }}>Get Started Today</div>
          <h2 style={{ fontSize:'clamp(28px,4vw,52px)', fontWeight:900, margin:'12px 0', color:'#fff', lineHeight:1.2, textAlign:'center' }}>Ready to hire smarter,<br />not harder?</h2>
          <p style={{ fontSize:'16px', color:'rgba(255,255,255,0.75)', margin:'16px 0 32px', lineHeight:1.7, textAlign:'center' }}>Join 50+ companies using Hire-GenAI to automate CV screening, run AI video interviews, and build better teams — in a fraction of the time.</p>
          <div style={{ display:'flex', gap:'14px', justifyContent:'center', flexWrap:'wrap' }}>
            <a href={getAppUrl('/signup')} className="btn-primary" style={{ background:'#fff', color:'var(--green)', fontWeight:800 }}>Start Free Trial — No Card Required →</a>
            <a href="/book-meeting" className="btn-secondary" style={{ border:'2px solid rgba(255,255,255,0.4)', color:'#fff', background:'transparent' }}>📅 Book a Demo</a>
          </div>
          <div style={{ marginTop:'24px', display:'flex', gap:'20px', justifyContent:'center', flexWrap:'wrap', fontSize:'13px', color:'rgba(255,255,255,0.65)' }}>
            {['7-day free trial','No credit card needed','Cancel anytime','Full feature access'].map(t => <span key={t}>✓ {t}</span>)}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Reveal Observer ───────────────────────────────────────────────────────────
export function RevealObserver() {
  useEffect(() => {
    const obs = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }), { threshold: 0.1 });
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);
  return null;
}
