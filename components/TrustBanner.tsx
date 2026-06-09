export default function TrustBanner() {
  const items = ['7-day free trial', 'No credit card required', 'Cancel anytime', 'GDPR Compliant'];
  return (
    <div style={{ background: 'rgba(0,177,79,0.06)', borderTop: '1px solid rgba(0,177,79,0.15)', borderBottom: '1px solid rgba(0,177,79,0.15)', padding: '20px 0' }}>
      <div className="container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '32px', flexWrap: 'wrap' }}>
          {items.map((item) => (
            <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--green)' }}>
              ✓ {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
