'use client';
import { useState } from 'react';

const plans = [
  {
    name: 'Starter', monthlyPrice: '$99', annualPrice: '$990', period: '/mo', annualPeriod: '/yr',
    sub: '~200 CVs · ~4 AI interviews/mo', annualSub: '~240 CVs · ~5 AI interviews/yr',
    walletSub: 'Wallet: $99/mo', desc: 'For startups and small teams running their first AI-powered hiring workflows.',
    features: ['Unlimited job postings', 'Full ATS — applications, talent pool, delegation & feedback', 'AI CV evaluation & scoring', 'AI video interviews', 'Auto interview question generation', 'Manager & recruiter dashboards', 'Wallet billing + invoice generation', 'Email notifications', 'Unlimited team members (4 role types)'],
    support: 'Standard Support · 72h response · Email + Chat', cta: 'Choose Starter →', popular: false,
  },
  {
    name: 'Professional', monthlyPrice: '$499', annualPrice: '$4,990', period: '/mo', annualPeriod: '/yr',
    sub: '~1,000 CVs · ~20 AI interviews/mo', annualSub: '~1,000 CVs · ~20 AI interviews/mo',
    walletSub: 'Wallet: $499/mo', desc: 'For agencies scaling their recruiting operations.',
    features: ['Everything in Starter', 'Advanced analytics', 'Pipeline tracking', 'AI recruiter workflows', 'Priority support', 'Role-based access control', 'Team performance tracking'],
    support: 'Priority Support · 48h response · Chat + Email + Phone', cta: 'Choose Professional →', popular: false,
  },
  {
    name: 'Business', monthlyPrice: '$999', annualPrice: '$9,990', period: '/mo', annualPeriod: '/yr',
    sub: '~2,000 CVs · ~40 AI interviews/mo', annualSub: '~2,000 CVs · ~40 AI interviews/mo',
    walletSub: 'Wallet: $999/mo', desc: 'For mid-size agencies and growing recruitment teams.',
    features: ['Everything in Professional', 'Custom dashboard views', 'SLA compliance tracking', 'Retention forecasting', 'Advanced AI scoring', 'Dedicated business support'],
    support: 'Business Support · 24h response · Dedicated Chat', cta: 'Choose Business →', popular: false,
  },
  {
    name: 'Large', monthlyPrice: '$2,999', annualPrice: '$29,990', period: '/mo', annualPeriod: '/yr',
    sub: '~6,000 CVs · ~120 AI interviews/mo', annualSub: '~6,000 CVs · ~120 AI interviews/mo',
    walletSub: 'Wallet: $2,999/mo', desc: 'For scaling recruitment agencies that need serious AI infrastructure.',
    features: ['Everything in Business', 'Executive dashboards', 'Revenue analytics', 'Multi-team workflows', 'Slack support', 'Advanced AI hiring infrastructure'],
    support: 'Large Support · 12h response · Slack + Phone + Onboarding', cta: 'Choose Large →', popular: true,
    badge: '🔥 Most Popular · Best for Agencies',
  },
  {
    name: 'Ultra', monthlyPrice: '$3,999', annualPrice: '$39,990', period: '/mo', annualPeriod: '/yr',
    sub: '~8,000 CVs · ~160 AI interviews/mo', annualSub: '~8,000 CVs · ~160 AI interviews/mo',
    walletSub: 'Wallet: $3,999/mo', desc: 'For high-volume AI-powered hiring operations.',
    features: ['Everything in Large', 'Department-level analytics', 'Capacity planning', 'Churn risk prediction', 'Dedicated AI optimization support'],
    support: 'Ultra Support · 6h response · 24/7 priority + Dedicated Rep', cta: 'Choose Ultra →', popular: false,
  },
  {
    name: 'Enterprise', monthlyPrice: '$4,999', annualPrice: '$49,990', period: '/mo', annualPeriod: '/yr',
    sub: '~10,000 CVs · ~200 AI interviews/mo', annualSub: '~10,000 CVs · ~200 AI interviews/mo',
    walletSub: 'Wallet: $4,999/mo', desc: 'Ultimate scale for enterprise hiring infrastructure.',
    features: ['Enterprise-grade ATS', 'Multi-tenant architecture', 'Custom AI workflows', 'Dedicated success manager', 'Private deployment options', 'Advanced compliance & security', 'Custom integrations & APIs'],
    support: 'Enterprise SLA · 2h critical response · 24/7 dedicated success manager', cta: 'Choose Enterprise →', popular: false,
    badge: '🔥 Ultimate Scale',
  },
];

const faqs = [
  { q: 'Can I switch plans at any time?', a: 'Yes — upgrade or downgrade whenever you need. Changes apply immediately with prorated billing.' },
  { q: 'How does the annual plan work?', a: 'You pay for 10 months and stay active for 12 — saving roughly 17% on cost. Your monthly usage estimates and wallet credits also increase by 20%.' },
  { q: 'What are the wallet credits?', a: 'Every plan includes AI usage wallet credits equal to your subscription cost. These cover CV parsing, video interviews, and question generation. If you exceed them, additional usage is billed automatically at standard rates.' },
  { q: 'What do the usage estimates mean?', a: 'The CV and interview numbers are indicative ranges based on typical usage at each tier. They are not hard caps — actual consumption depends on your interview duration and workflow. Overage draws from your wallet balance automatically.' },
  { q: 'Do you offer custom pricing for very high volume?', a: 'Absolutely. For teams needing more than Enterprise-scale volume or custom integrations, contact our sales team for a tailored proposal.' },
];

export default function Pricing() {
  const [annual, setAnnual] = useState(false);

  return (
    <section className="pricing reveal" id="pricing">
      <div className="container">
        <div className="pricing-header">
          <div className="section-label">⚡ AI Recruiting OS · Full ATS + AI Interview</div>
          <h2 className="section-title">Simple, transparent pricing.<br /><span className="highlight">Pay for what you use.</span></h2>
          <p className="section-subtitle" style={{ margin: '16px auto 0' }}>
            All paid plans include <strong>unlimited team members</strong>. Wallet-based billing — credits auto-refill, no per-seat surprises.
          </p>
          <div className="pricing-toggle">
            <span className="pricing-toggle-label" style={{ fontWeight: annual ? 400 : 700, color: annual ? '' : 'var(--text)' }}>Monthly</span>
            <div className="toggle-switch" onClick={() => setAnnual(!annual)}>
              <div className="toggle-knob" style={{ right: annual ? '25px' : '3px' }} />
            </div>
            <span className="pricing-toggle-label" style={{ fontWeight: annual ? 700 : 400, color: annual ? 'var(--text)' : '' }}>Annual</span>
            <span className="pricing-save">Save 17%</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '8px' }}>Annual plan: credits &amp; usage increase by 20%</div>
        </div>

        <div className="pricing-grid-6">
          {plans.map((plan) => (
            <div key={plan.name} className={`pricing-card${plan.popular ? ' popular' : ''}`}>
              {plan.badge && (
                <div className="popular-badge" style={plan.name === 'Enterprise' ? { background: 'linear-gradient(90deg,#F59E0B,#EF4444)' } : undefined}>
                  {plan.badge}
                </div>
              )}
              <div className="pricing-plan">{plan.name}</div>
              <div className="pricing-price">
                <span className="pricing-price-num">{annual ? plan.annualPrice : plan.monthlyPrice}</span>
                <span className="pricing-price-period">{annual ? plan.annualPeriod : plan.period}</span>
              </div>
              <div className="pricing-price-sub">{annual ? plan.annualSub : plan.sub}</div>
              <div className="pricing-price-sub" style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{plan.walletSub}</div>
              <div className="pricing-desc">{plan.desc}</div>
              <div className="pricing-divider" />
              <div className="pricing-features">
                {plan.features.map((f) => (
                  <div key={f} className="pricing-feature"><span className="pricing-feature-check">✓</span>{f}</div>
                ))}
              </div>
              <div className="pricing-support">{plan.support}</div>
              <a href="https://hire-genai.com/signup" className={plan.popular ? 'btn-primary' : 'btn-secondary'} style={{ textAlign: 'center', justifyContent: 'center' }} target="_blank" rel="noopener">
                {plan.cta}
              </a>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '36px', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px 28px', fontSize: '13px', color: 'var(--text-dim)', textAlign: 'center' }}>
          Not sure which package is right for you?{' '}
          <a href="#roi" style={{ color: 'var(--green)', fontWeight: 700, textDecoration: 'underline' }}>Take our ROI Assessment</a>{' '}
          to receive a personalized recommendation based on your hiring volume, recruitment costs, and expected savings.
        </div>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>No credit card required · cancel anytime</div>
          <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '6px' }}>🤷 Unlimited team members on every paid plan · Overage draws from wallet balance automatically</div>
        </div>

        <div style={{ marginTop: '48px' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <h3 style={{ fontSize: '22px', fontWeight: 800 }}>Common Questions</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: '4px' }}>Straight answers on how pricing and plans work</p>
          </div>
          <div className="pricing-faq">
            {faqs.map((f) => (
              <div key={f.q} className="pricing-faq-item"><h4>{f.q}</h4><p>{f.a}</p></div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
