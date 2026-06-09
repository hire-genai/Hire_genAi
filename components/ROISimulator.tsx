'use client';
import { useState, useCallback } from 'react';

const ROI_PLANS = [
  { name: 'Starter', price: 99, maxCvs: 200 },
  { name: 'Professional', price: 499, maxCvs: 500 },
  { name: 'Business', price: 999, maxCvs: 1000 },
  { name: 'Large', price: 2999, maxCvs: 3000 },
  { name: 'Ultra', price: 3999, maxCvs: 4000 },
  { name: 'Enterprise', price: 4999, maxCvs: 99999 },
];
const ROI_CONST_H = 5.7;

function fmtH(h: number) {
  if (h < 1 / 6) return Math.round(h * 60) + 'm';
  return h.toFixed(1) + 'h';
}
function fmtMoney(n: number) {
  return '$' + Math.round(n).toLocaleString('en-US');
}

interface ROIState {
  recruiters: number; cvs: number; shortlist: number; qualifiedPct: number; rate: number; days: number; hours: number;
}

function calcROI(s: ROIState) {
  const jds = s.recruiters * 5;
  const totalCvs = jds * s.cvs;
  const manScreen = (s.cvs * 5) / 60;
  const manRank = (s.cvs * 0.6) / 60;
  const manQual = (s.cvs * s.shortlist / 100 * 20) / 60;
  const manTotal = ROI_CONST_H + manScreen + manRank + manQual;
  const aiScreen = (s.cvs * 1) / 60;
  const aiRank = (s.cvs * 0.05) / 60;
  const aiQual = (s.cvs * s.shortlist / 100 * 10) / 60;
  const aiTotal = ROI_CONST_H + aiScreen + aiRank + aiQual;
  const manCostReq = manTotal * s.rate;
  const aiCostReq = aiTotal * s.rate;
  const manCostMonth = manCostReq * jds;
  const aiCostMonth = aiCostReq * jds;
  const savings = manCostMonth - aiCostMonth;
  const savingsPerJD = savings / jds;
  const shortlistedPerReq = Math.round(s.cvs * s.shortlist / 100);
  const qualPerReq = Math.max(1, Math.round(shortlistedPerReq * s.qualifiedPct / 100));
  let plan = ROI_PLANS[ROI_PLANS.length - 1];
  for (const p of ROI_PLANS) { if (totalCvs <= p.maxCvs) { plan = p; break; } }
  const roiPct = Math.round((savings / plan.price) * 100);
  return {
    jds, savings, savingsPerJD, plan, roiPct,
    screenReduce: Math.round((1 - aiScreen / manScreen) * 100),
    rankReduce: Math.round((1 - aiRank / manRank) * 100),
    qualReduce: Math.round((1 - aiQual / manQual) * 100),
    prodIdx: (manTotal / aiTotal).toFixed(1),
    costRatio: Math.round((aiCostReq / manCostReq) * 100),
    manScreen, manRank, manQual, manTotal, manCostReq, manCostMonth,
    aiScreen, aiRank, aiQual, aiTotal, aiCostReq, aiCostMonth,
    shortlistedPerReq, qualPerReq,
  };
}

export default function ROISimulator() {
  const [s, setS] = useState<ROIState>({ recruiters: 1, cvs: 100, shortlist: 15, qualifiedPct: 15, rate: 30, days: 5, hours: 6 });
  const r = calcROI(s);

  const update = useCallback((key: keyof ROIState, val: number) => {
    setS((prev) => ({ ...prev, [key]: val }));
  }, []);

  return (
    <section className="roi reveal" id="roi">
      <div className="container-wide">
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div className="section-label">ROI Simulator</div>
          <h2 className="section-title">Human Recruiter vs Human + <span className="highlight">Hire-GenAI</span></h2>
          <p className="section-subtitle" style={{ margin: '12px auto 0' }}>
            Real-time ROI simulator · AI accelerates screening, ranking &amp; qualification — human strategic steps unchanged
          </p>
        </div>

        <div className="roi-sim-info-grid" style={{ marginBottom: '20px' }}>
          <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '12px', padding: '14px 18px', fontSize: '13px', color: '#93C5FD' }}>
            <strong style={{ color: '#BFDBFE' }}>Hire-GenAI does NOT replace recruiters</strong> — Removes screening, parsing &amp; ranking. Recruiters focus on engagement, offers &amp; stakeholders.
          </div>
          <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '12px', padding: '14px 18px', fontSize: '13px', color: '#FCD34D' }}>
            <strong style={{ color: '#FDE68A' }}>Human Judgment Remains Critical</strong> for hiring decisions, client relationships, and candidate experience.
          </div>
        </div>

        <div className="roi-sim-inputs">
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ⚙ Business Drivers <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-dim)' }}>(adjust to simulate ROI)</span>
          </h3>
          <div className="roi-sim-input-grid">
            {[
              { label: 'Recruiters', key: 'recruiters' as keyof ROIState, min: 1, max: 50, step: 1, sub: '× 5 JDs/mo' },
              { label: 'Total JDs', key: null, value: String(r.jds), sub: 'Auto-calculated', readonly: true },
              { label: 'CVs / Req', key: 'cvs' as keyof ROIState, min: 10, max: 500, step: 10 },
              { label: 'Shortlist %', key: 'shortlist' as keyof ROIState, min: 1, max: 100, step: 5 },
              { label: 'Qualified %', key: 'qualifiedPct' as keyof ROIState, min: 1, max: 100, step: 5 },
              { label: 'Hourly Rate $', key: 'rate' as keyof ROIState, min: 5, max: 500, step: 5 },
              { label: 'Days / Week', key: 'days' as keyof ROIState, min: 1, max: 7, step: 1 },
              { label: 'Hours / Day', key: 'hours' as keyof ROIState, min: 1, max: 16, step: 0.5 },
            ].map((f, i) => (
              <div key={i} className="roi-sim-input-group">
                <label>{f.label}</label>
                {f.readonly ? (
                  <input className="roi-sim-input" readOnly value={f.value} />
                ) : (
                  <input
                    type="number"
                    className="roi-sim-input"
                    value={s[f.key!]}
                    min={f.min}
                    max={f.max}
                    step={f.step}
                    onChange={(e) => update(f.key!, parseFloat(e.target.value) || 0)}
                  />
                )}
                {f.sub && <p style={{ fontSize: '9px', color: 'var(--text-dim)', marginTop: '3px' }}>{f.sub}</p>}
              </div>
            ))}
          </div>
          <div style={{ marginTop: '14px', background: 'rgba(0,177,79,0.1)', color: '#6EE7B7', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', display: 'inline-block' }}>
            ✓ Hire-GenAI assists in: parsing, screening, ranking, matching &amp; scoring (Steps 4, 5, 6). All other steps remain 100% human-led.
          </div>
        </div>

        <div className="roi-kpi-grid">
          <div className="roi-kpi"><div className="roi-kpi-val">{r.screenReduce}%</div><div className="roi-kpi-label">Screening Time ↓</div></div>
          <div className="roi-kpi"><div className="roi-kpi-val">{r.rankReduce}%</div><div className="roi-kpi-label">Ranking Time ↓</div></div>
          <div className="roi-kpi"><div className="roi-kpi-val">{r.qualReduce}%</div><div className="roi-kpi-label">Qualification Effort ↓</div></div>
          <div className="roi-kpi"><div className="roi-kpi-val">{r.prodIdx}x</div><div className="roi-kpi-label">Productivity Index</div></div>
          <div className="roi-kpi highlight">
            <div className="roi-kpi-val">{fmtMoney(r.savings)}</div>
            <div className="roi-kpi-label">Monthly Savings</div>
            <div className="roi-kpi-sub">{fmtMoney(r.savingsPerJD)}/JD</div>
          </div>
          <div className="roi-kpi"><div className="roi-kpi-val">{r.costRatio}%</div><div className="roi-kpi-label">Cost/Req vs Human</div></div>
        </div>

        <div className="roi-rec-card">
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '20px' }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>Recommended Based on Your Volume</div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)' }}>
                <span style={{ color: 'var(--green)' }}>{r.plan.name} Plan</span>
                <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-dim)', marginLeft: '8px' }}>— handles {r.plan.maxCvs.toLocaleString()} CVs/mo</span>
              </h3>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            {[
              { label: 'Per Month', val: `$${r.plan.price}`, sub: 'billed monthly' },
              { label: 'ROI Insight', val: `${r.roiPct}%`, color: 'var(--green)', sub: `${r.jds} JDs/mo · ${s.recruiters} recruiter${s.recruiters > 1 ? 's' : ''} · ${fmtMoney(r.savingsPerJD)} saved/JD` },
              { label: 'Monthly Savings', val: fmtMoney(r.savings), color: 'var(--green)', sub: 'vs manual recruitment' },
            ].map((card, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '14px', textAlign: i === 0 ? 'center' : undefined }}>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginBottom: '4px' }}>{card.label}</div>
                <div style={{ fontSize: i === 0 ? '24px' : '22px', fontWeight: 800, color: card.color || 'var(--text)' }}>{card.val}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>{card.sub}</div>
              </div>
            ))}
          </div>
          <a href="#pricing" className="btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: '14px' }}>
            Get Started with {r.plan.name} Plan (${r.plan.price}/mo) →
          </a>
          <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-dim)', marginTop: '10px' }}>
            Signup → select plan → Stripe checkout · Cancel anytime · <a href="#pricing" style={{ color: 'var(--green)', textDecoration: 'underline' }}>View all plans</a>
          </p>
        </div>

        <div className="roi-compare-grid">
          <div className="roi-compare-panel" style={{ border: '1px solid rgba(239,68,68,0.2)' }}>
            <div className="roi-compare-header" style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>👤 Human Recruiter</h3>
              <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>Manual screening, ranking &amp; qualification</p>
            </div>
            {[
              { label: 'Step 4: CV Screening', val: fmtH(r.manScreen) },
              { label: 'Step 5: Candidate Ranking & Matching', val: fmtH(r.manRank) },
              { label: 'Step 6: Qualification Calls', val: fmtH(r.manQual) },
            ].map((row, i) => (
              <div key={i} className="roi-step-row" style={{ background: 'rgba(239,68,68,0.05)', borderBottom: '1px solid rgba(239,68,68,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                  <span style={{ color: '#EF4444' }}>⚡</span>
                  <span style={{ fontWeight: 600, color: '#FCA5A5' }}>{row.label}</span>
                </div>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '12px', color: '#EF4444', background: 'rgba(239,68,68,0.1)', padding: '3px 10px', borderRadius: '100px' }}>{row.val}</span>
              </div>
            ))}
            <div style={{ padding: '10px 16px', fontSize: '11px', color: 'var(--text-dim)', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>Other Steps (No Change) — human-led</div>
            <div style={{ margin: '12px', border: '1px solid rgba(239,68,68,0.15)', background: 'rgba(239,68,68,0.05)', borderRadius: '12px', padding: '14px', marginTop: 'auto' }}>
              <div className="roi-summary-grid">
                {[
                  ['Effort / Req', `${r.manTotal.toFixed(1)}h`], ['Reqs / Month', `${r.jds}.0`],
                  ['Cost / Req', fmtMoney(r.manCostReq)], ['Monthly Cost', fmtMoney(r.manCostMonth)],
                  ['Shortlisted / Req', String(r.shortlistedPerReq)], ['Qualified / Req', String(r.qualPerReq)],
                ].map(([label, val]) => (
                  <div key={label} className="roi-summary-row"><span style={{ color: 'var(--text-dim)' }}>{label}</span><span style={{ fontWeight: 700 }}>{val}</span></div>
                ))}
              </div>
            </div>
          </div>

          <div className="roi-compare-panel" style={{ border: '1px solid rgba(0,177,79,0.2)' }}>
            <div className="roi-compare-header" style={{ borderColor: 'rgba(0,177,79,0.3)', background: 'rgba(0,177,79,0.06)' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>🤖 Human + <span style={{ color: 'var(--green)' }}>Hire-GenAI</span></h3>
              <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>Hire-GenAI accelerates Steps 4, 5, 6</p>
            </div>
            {[
              { label: 'Step 4: CV Screening', val: fmtH(r.aiScreen), badge: 'AI Accelerated', badgeStyle: { background: 'rgba(0,177,79,0.15)', color: '#6EE7B7', borderColor: 'rgba(0,177,79,0.3)' } },
              { label: 'Step 5: Candidate Ranking & Matching', val: fmtH(r.aiRank), badge: 'AI Automated', badgeStyle: { background: 'rgba(0,177,79,0.2)', color: '#A7F3D0', borderColor: 'rgba(0,177,79,0.4)' } },
              { label: 'Step 6: Qualification Calls', val: fmtH(r.aiQual), badge: 'AI Assisted', badgeStyle: { background: 'rgba(245,158,11,0.15)', color: '#FCD34D', borderColor: 'rgba(245,158,11,0.3)' } },
            ].map((row, i) => (
              <div key={i} className="roi-step-row" style={{ background: 'rgba(0,177,79,0.05)', borderBottom: '1px solid rgba(0,177,79,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                  <span style={{ color: 'var(--green)' }}>⚡</span>
                  <span style={{ fontWeight: 600, color: '#6EE7B7' }}>{row.label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '12px', color: 'var(--green)', background: 'rgba(0,177,79,0.1)', padding: '3px 10px', borderRadius: '100px' }}>{row.val}</span>
                  <span className="roi-step-badge" style={row.badgeStyle}>{row.badge}</span>
                </div>
              </div>
            ))}
            <div style={{ padding: '10px 16px', fontSize: '11px', color: 'var(--text-dim)', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>Other Steps (No Change) — human-led</div>
            <div style={{ margin: '12px', border: '1px solid rgba(0,177,79,0.15)', background: 'rgba(0,177,79,0.05)', borderRadius: '12px', padding: '14px', marginTop: 'auto' }}>
              <div className="roi-summary-grid">
                {[
                  ['Effort / Req', `${r.aiTotal.toFixed(1)}h`], ['Reqs / Month', `${r.jds}.0`],
                  ['Cost / Req', fmtMoney(r.aiCostReq)], ['Monthly Cost', fmtMoney(r.aiCostMonth)],
                  ['Shortlisted / Req', String(r.shortlistedPerReq)], ['Qualified / Req', String(r.qualPerReq)],
                ].map(([label, val]) => (
                  <div key={label} className="roi-summary-row"><span style={{ color: 'var(--text-dim)' }}>{label}</span><span style={{ fontWeight: 700, color: 'var(--green)' }}>{val}</span></div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <p style={{ fontSize: '10px', color: 'var(--text-dim)', textAlign: 'center', margin: '12px 0 0', lineHeight: 1.6 }}>
          * Hire-GenAI Impact (Steps 4–6): CV screening 5min→1min/cv · ranking 0.6→0.05min/cv · qualification calls 20min→10min per shortlisted candidate.<br />
          Plan recommendation based on monthly CV volume. ROI = (Monthly Savings ÷ Plan Monthly Cost) × 100.
        </p>

        <div style={{ marginTop: '48px', background: 'linear-gradient(135deg,rgba(0,177,79,0.12),rgba(6,182,212,0.08))', border: '1px solid rgba(0,177,79,0.2)', borderRadius: '20px', padding: '48px', textAlign: 'center' }}>
          <h3 style={{ fontSize: 'clamp(22px,3vw,32px)', fontWeight: 800, marginBottom: '12px' }}>Ready to Accelerate Your Hiring?</h3>
          <p style={{ fontSize: '15px', color: 'var(--text-muted)', marginBottom: '28px' }}>
            Save <strong style={{ color: 'var(--green)' }}>{fmtMoney(r.savings)}/month</strong> by adding Hire-GenAI to your team
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="#pricing" className="btn-primary" style={{ padding: '16px 32px', fontSize: '16px' }}>Get Started Free</a>
            <a href="https://hire-genai.com/book-meeting" className="btn-secondary" style={{ padding: '15px 31px', fontSize: '16px' }} target="_blank" rel="noopener">📅 Book a Demo</a>
          </div>
        </div>
      </div>
    </section>
  );
}
