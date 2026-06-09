export default function Topbar() {
  return (
    <div className="topbar">
      <div className="container">
        <div className="topbar-links">
          <a href="#">Help Center</a>
          <a href="#">Developer Docs</a>
          <a href="#">Trust &amp; Security</a>
          <a href="#">Community</a>
        </div>
        <div style={{ color: 'var(--primary-light)', fontWeight: 600 }}>
          🎉 New: AI Candidate Scoring v2.0 is live &mdash;{' '}
          <a href="#" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
            See what&apos;s new →
          </a>
        </div>
      </div>
    </div>
  );
}
