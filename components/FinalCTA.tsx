export default function FinalCTA() {
  const badges = ['SOC 2 Certified', 'GDPR Compliant', '99.9% Uptime SLA', '24/7 Support', 'No Lock-in Contracts'];
  return (
    <section className="final-cta reveal">
      <div className="container">
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(0,177,79,0.15)', border: '1px solid rgba(0,177,79,0.3)', color: 'var(--primary-light)', padding: '6px 14px', borderRadius: '100px', fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '20px' }}>
          ✨ Trusted by 50+ Agencies &amp; HR Teams
        </div>
        <h2 className="section-title" style={{ fontSize: 'clamp(32px,5vw,60px)', maxWidth: '800px', margin: '0 auto 24px' }}>
          Ready to transform how you hire?
        </h2>
        <p className="section-subtitle" style={{ margin: '0 auto 40px' }}>
          Start your 7-day free trial today. No credit card required. Full access to every feature from day one.
        </p>
        <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="https://hire-genai.com/signup" className="btn-primary" style={{ padding: '18px 36px', fontSize: '17px' }} target="_blank" rel="noopener">
            Start Free Trial — It&apos;s Free →
          </a>
          <a href="#book-meeting" className="btn-secondary" style={{ padding: '17px 35px', fontSize: '17px' }}>
            📅 Book a Meeting
          </a>
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: '20px' }}>
          7-day free trial · No credit card required · Cancel anytime
        </div>
        <div className="cta-trust-badges">
          {badges.map((b) => (
            <div key={b} className="cta-trust-badge"><span style={{ color: 'var(--green)' }}>✓</span> {b}</div>
          ))}
        </div>
      </div>
    </section>
  );
}
