export default function TrustBar() {
  return (
    <section className="trust">
      <div className="container">
        <div className="trust-label">Trusted by 50+ recruitment agencies, HR teams, and staffing firms</div>
        <div className="trust-logos">
          <div className="trust-logo" style={{ background: 'rgba(0,177,79,0.08)', borderColor: 'rgba(0,177,79,0.2)', color: 'var(--green)' }}>
            ✅ 50+ Active Clients
          </div>
          <div className="trust-logo">🎲 Recruitment Agencies</div>
          <div className="trust-logo">🏢 HR &amp; Talent Teams</div>
          <div className="trust-logo">🚀 Tech Startups</div>
          <div className="trust-logo">🌍 Global Enterprises</div>
          <div className="trust-logo">👥 Staffing Firms</div>
        </div>
      </div>
    </section>
  );
}
