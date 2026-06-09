'use client';
import { useEffect, useRef } from 'react';

export default function Metrics() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.1 }
    );
    obs.observe(el);
    el.querySelectorAll('.reveal').forEach((r) => obs.observe(r));
    return () => obs.disconnect();
  }, []);

  return (
    <section className="metrics reveal" id="metrics" ref={ref}>
      <div className="container">
        <div style={{ textAlign: 'center' }}>
          <div className="section-label">Why Hire-GenAI</div>
          <h2 className="section-title">Numbers that speak for themselves</h2>
          <p className="section-subtitle" style={{ margin: '16px auto 0' }}>
            Our AI transforms recruitment with measurable outcomes across every stage of your hiring pipeline.
          </p>
        </div>
        <div className="metrics-grid">
          <div className="metric-card reveal">
            <div className="metric-icon">⚡</div>
            <div className="metric-num blue">80%</div>
            <div className="metric-desc">Reduction in <strong>time-to-hire</strong> by automating screening, scheduling, and initial outreach with generative AI</div>
          </div>
          <div className="metric-card reveal">
            <div className="metric-icon">🤖</div>
            <div className="metric-num cyan">97%</div>
            <div className="metric-desc">Of scheduling and <strong>administrative tasks</strong> eliminated, freeing recruiters to focus on strategic decisions</div>
          </div>
          <div className="metric-card reveal">
            <div className="metric-icon">🎯</div>
            <div className="metric-num purple">3×</div>
            <div className="metric-desc">More <strong>qualified candidates</strong> reach final rounds thanks to AI-powered matching that removes bias</div>
          </div>
        </div>
      </div>
    </section>
  );
}
