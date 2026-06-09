'use client';
import { useState, useEffect } from 'react';

const NAV_GROUPS = [
  {
    label: 'Platform',
    items: [
      { icon: '🏠', label: 'Home', href: '#' },
      { icon: '🔍', label: 'Product & Features', href: '#features' },
      { icon: '🎬', label: 'Live Demo', href: '#demo' },
      { icon: '📊', label: 'Key Metrics', href: '#metrics' },
    ],
  },
  {
    label: 'Value',
    items: [
      { icon: '📈', label: 'ROI Calculator', href: '#roi' },
      { icon: '📝', label: 'ROI Assessment', href: '#assessment' },
      { icon: '💰', label: 'Pricing', href: '#pricing' },
    ],
  },
  {
    label: 'Company',
    items: [
      { icon: '⭐', label: 'Testimonials', href: '#testimonials' },
      { icon: '🏢', label: 'About Us', href: '#company' },
      { icon: '📅', label: 'Book a Meeting', href: '#book-meeting' },
      { icon: '📩', label: 'Contact Us', href: '#contact' },
      { icon: '📚', label: 'Resources', href: '#' },
    ],
  },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const close = () => setMenuOpen(false);

  return (
    <>
      <nav style={{ background: scrolled ? 'rgba(15,15,26,0.97)' : 'rgba(3,17,10,0.9)' }}>
        <div className="nav-inner">
          <a className="logo" href="#">
            <div className="logo-icon">🤖</div>Hire-<span>GenAI</span>
          </a>

          {/* Desktop dropdown navigation */}
          <div className="nav-links">
            {NAV_GROUPS.map(group => (
              <div key={group.label} className="nav-group">
                <button className="nav-group-btn">
                  {group.label}
                  <svg className="nav-group-arrow" width="10" height="6" viewBox="0 0 10 6" fill="none">
                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <div className="nav-dropdown">
                  <div className="nav-dropdown-label">{group.label}</div>
                  {group.items.map(item => (
                    <a key={item.label} className="nav-dropdown-item" href={item.href}>
                      <span className="nav-dropdown-icon">{item.icon}</span>
                      {item.label}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="nav-actions">
            <a className="nav-login" href="https://hire-genai.com/login">Login</a>
            <a className="btn-primary" style={{ padding: '9px 20px', fontSize: '14px' }} href="https://hire-genai.com/signup" target="_blank" rel="noopener">
              Get Started →
            </a>
          </div>

          <button
            className="nav-hamburger"
            onClick={() => setMenuOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={menuOpen}
          >
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* Mobile full-screen menu */}
      <div className={`mobile-menu${menuOpen ? ' open' : ''}`} role="dialog" aria-label="Navigation menu">
        <div className="mobile-menu-header">
          <div className="mobile-menu-logo">
            <div className="logo-icon">🤖</div>Hire-<span>GenAI</span>
          </div>
          <button className="mobile-close" onClick={close} aria-label="Close menu">✕</button>
        </div>

        <div className="mobile-nav-links">
          <div className="mobile-nav-section-label">Platform</div>
          <a className="mobile-nav-item" href="#" onClick={close}>🏠 Home</a>
          <a className="mobile-nav-item" href="#features" onClick={close}>🔍 Product &amp; Features</a>
          <a className="mobile-nav-item" href="#demo" onClick={close}>🎬 Live Demo</a>
          <a className="mobile-nav-item" href="#metrics" onClick={close}>📊 Key Metrics</a>

          <div className="mobile-nav-divider" />
          <div className="mobile-nav-section-label">Value</div>
          <a className="mobile-nav-item" href="#roi" onClick={close}>📈 ROI Calculator</a>
          <a className="mobile-nav-item" href="#assessment" onClick={close}>📝 ROI Assessment</a>
          <a className="mobile-nav-item" href="#pricing" onClick={close}>💰 Pricing</a>

          <div className="mobile-nav-divider" />
          <div className="mobile-nav-section-label">Company</div>
          <a className="mobile-nav-item" href="#testimonials" onClick={close}>⭐ Testimonials</a>
          <a className="mobile-nav-item" href="#company" onClick={close}>🏢 About Us</a>
          <a className="mobile-nav-item" href="#book-meeting" onClick={close}>📅 Book a Meeting</a>
          <a className="mobile-nav-item" href="#contact" onClick={close}>📩 Contact Us</a>
          <a className="mobile-nav-item" href="#" onClick={close}>📚 Resources</a>
        </div>

        <div className="mobile-actions">
          <a className="btn-secondary" style={{ justifyContent: 'center' }} href="https://hire-genai.com/login">Login</a>
          <a className="btn-primary" style={{ justifyContent: 'center' }} href="https://hire-genai.com/signup" target="_blank" rel="noopener">
            🚀 Get Started Free →
          </a>
        </div>
      </div>
    </>
  );
}
