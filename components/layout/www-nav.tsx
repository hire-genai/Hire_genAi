'use client';
import { useState, useEffect } from 'react';
import { getAppUrl } from '@/lib/domain-config';

const scrollTo = (id: string) => {
  // If not on homepage, navigate there first
  if (typeof window !== 'undefined' && !window.location.pathname.match(/^\/?$/)) {
    window.location.href = '/?scroll=' + id;
    return;
  }
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
};

export function WwwNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });

    // Handle ?scroll= param (used when navigating from other pages)
    const params = new URLSearchParams(window.location.search);
    const target = params.get('scroll');
    if (target) {
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(() => {
        const el = document.getElementById(target);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 400);
    }

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const sectionLinks: [string, string][] = [
    ['features', 'Features'],
    ['demo', 'Demo'],
    ['roi', 'ROI'],
    ['pricing', 'Pricing'],
  ];

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      background: scrolled ? 'rgba(3,17,10,0.97)' : 'rgba(3,17,10,0.9)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--border)',
      boxShadow: scrolled ? '0 4px 30px rgba(0,0,0,0.4)' : 'none',
      transition: 'all .3s',
    }}>
      <div className="nav-inner">
        <a href="/" className="logo">
          <div className="logo-icon">⚡</div>
          <span style={{ color: 'var(--text)' }}>Hire-<span>GenAI</span></span>
        </a>
        <div className="nav-links">
          {sectionLinks.map(([id, label]) => (
            <button key={id} className="nav-item" style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => scrollTo(id)}>{label}</button>
          ))}
          <a href="/about" className="nav-item">Company</a>
        </div>
        <div className="nav-actions">
          <a href={getAppUrl('/login')} className="btn-secondary" style={{ padding: '9px 20px', fontSize: '14px' }}>Login</a>
          <a href={getAppUrl('/signup')} className="btn-primary" style={{ padding: '9px 20px', fontSize: '14px' }}>Get Started</a>
        </div>
        <button
          className="nav-hamburger"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>
      {menuOpen && (
        <div style={{ background: 'var(--dark2)', borderTop: '1px solid var(--border)', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sectionLinks.map(([id, label]) => (
            <button key={id} className="nav-item" style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }} onClick={() => { setMenuOpen(false); scrollTo(id); }}>{label}</button>
          ))}
          <a href="/about" className="nav-item" onClick={() => setMenuOpen(false)}>Company</a>
          <div style={{ display: 'flex', gap: '10px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
            <a href={getAppUrl('/login')} className="btn-secondary" style={{ flex: 1, justifyContent: 'center', padding: '10px', fontSize: '14px' }}>Login</a>
            <a href={getAppUrl('/signup')} className="btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '10px', fontSize: '14px' }}>Get Started</a>
          </div>
        </div>
      )}
    </nav>
  );
}
