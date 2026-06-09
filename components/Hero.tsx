export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-grid-bg" />
      <div className="hero-blob hero-blob-1" />
      <div className="hero-blob hero-blob-2" />
      <div className="container">
        <div className="hero-eyebrow">
          <strong>Powered by GPT-4o &amp; Claude</strong> &nbsp;·&nbsp; Next-Generation Recruitment AI
        </div>
        <h1 className="hero-title fade-in">
          Hire Smarter.<br /><span className="highlight">10× Faster</span> with AI.
        </h1>
        <p className="hero-subtitle fade-in">
          Hire-GenAI transforms your entire recruitment pipeline — from sourcing to offer — with generative AI that screens, scores, and schedules so your team focuses on what matters most.
        </p>
        <div className="hero-actions fade-in">
          <a href="https://hire-genai.com/signup" className="btn-primary" target="_blank" rel="noopener">
            🚀 Start Free Trial — It&apos;s Free
          </a>
          <a href="#demo" className="btn-secondary">▶ Product Demo</a>
        </div>
        <div className="hero-stats">
          <div className="hero-stat">
            <div className="hero-stat-num">80%</div>
            <div className="hero-stat-label">Reduction in time-to-hire</div>
          </div>
          <div className="hero-divider" />
          <div className="hero-stat">
            <div className="hero-stat-num">97%</div>
            <div className="hero-stat-label">Scheduling automation</div>
          </div>
          <div className="hero-divider" />
          <div className="hero-stat">
            <div className="hero-stat-num">3×</div>
            <div className="hero-stat-label">More qualified candidates</div>
          </div>
          <div className="hero-divider" />
          <div className="hero-stat">
            <div className="hero-stat-num">$2.4M</div>
            <div className="hero-stat-label">Avg. annual cost savings</div>
          </div>
        </div>
      </div>
    </section>
  );
}
