'use client';
import { getAppUrl } from '@/lib/domain-config';

const scrollOrNavigate = (sectionId: string) => {
  if (typeof window === 'undefined') return;
  if (window.location.pathname.match(/^\/?$/)) {
    const el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  } else {
    window.location.href = '/?scroll=' + sectionId;
  }
};

export default function WwwFooter() {
  return (
    <footer className="bg-slate-900 text-white py-16">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="grid grid-cols-2 md:grid-cols-12 gap-6 md:gap-12 mb-12">

          {/* Brand */}
          <div className="col-span-2 md:col-span-3">
            <h3 className="text-2xl font-bold mb-2">
              <span className="text-white">Hire</span><span className="text-emerald-400">-GenAI</span>
            </h3>
            <p className="text-sm text-slate-400 mb-4">By SKYGENAI</p>
            <p className="text-slate-400 mb-6 text-sm leading-relaxed">
              HireGenAI pre-screens and interviews candidates, helping you shortlist talent 20x faster and more efficiently.
            </p>
            <p className="text-slate-400 mb-6 text-sm font-medium">
              Email:{' '}
              <a href="mailto:support@hire-genai.com" className="text-emerald-400 hover:text-emerald-300 transition-colors">
                support@hire-genai.com
              </a>
            </p>
            <div className="flex space-x-3">
              {[
                { href: '#', label: 'f' },
                { href: '#', label: 'ig' },
                { href: '#', label: 'yt' },
                { href: 'https://www.linkedin.com/company/hire-genai', label: 'in' },
              ].map(({ href, label }) => (
                <a key={label} href={href} className="w-9 h-9 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:text-emerald-400 hover:bg-slate-700 transition-colors text-xs font-bold">
                  {label}
                </a>
              ))}
            </div>
          </div>

          {/* Product */}
          <div className="col-span-1 md:col-span-2">
            <h4 className="font-semibold mb-4 text-white text-sm uppercase tracking-wide">Product</h4>
            <ul className="space-y-3 text-slate-400 text-sm">
              <li>
                <button onClick={() => scrollOrNavigate('demo')} className="hover:text-emerald-400 transition-colors bg-transparent border-none cursor-pointer text-slate-400 text-sm p-0">
                  Try the Demo
                </button>
              </li>
              <li>
                <button onClick={() => scrollOrNavigate('pricing')} className="hover:text-emerald-400 transition-colors bg-transparent border-none cursor-pointer text-slate-400 text-sm p-0">
                  Pricing
                </button>
              </li>
              <li>
                <button onClick={() => scrollOrNavigate('assessment')} className="hover:text-emerald-400 transition-colors bg-transparent border-none cursor-pointer text-slate-400 text-sm p-0">
                  Assessment
                </button>
              </li>
              <li>
                <button onClick={() => scrollOrNavigate('faq')} className="hover:text-emerald-400 transition-colors bg-transparent border-none cursor-pointer text-slate-400 text-sm p-0">
                  FAQs
                </button>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div className="col-span-1 md:col-span-2">
            <h4 className="font-semibold mb-4 text-white text-sm uppercase tracking-wide">Company</h4>
            <ul className="space-y-3 text-slate-400 text-sm">
              {[
                ['/about', 'About us'],
                ['/contact', 'Contact'],
                ['/book-meeting', 'Book a Meeting'],
                ['/owner-login', 'Admin'],
              ].map(([href, label]) => (
                <li key={label}><a href={href} className="hover:text-emerald-400 transition-colors">{label}</a></li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div className="col-span-1 md:col-span-2">
            <h4 className="font-semibold mb-4 text-white text-sm uppercase tracking-wide">Legal</h4>
            <ul className="space-y-3 text-slate-400 text-sm">
              {[
                ['/privacy', 'Privacy Policy'],
                ['/terms', 'Terms and Conditions'],
              ].map(([href, label]) => (
                <li key={label}><a href={href} className="hover:text-emerald-400 transition-colors">{label}</a></li>
              ))}
            </ul>
          </div>

          {/* Badges */}
          <div className="col-span-1 md:col-span-3">
            <div className="space-y-4">
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <p className="text-xs text-slate-400 mb-1 font-semibold">Trustpilot</p>
                <div className="flex items-center gap-0.5 mb-1">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} style={{ color: '#f5a623', fontSize: '11px' }}>★</span>
                  ))}
                  <span className="text-xs text-slate-400 ml-1">4.5/5</span>
                </div>
                <p className="text-xs text-slate-400">TrustScore 4.5</p>
              </div>
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-emerald-400">🔒</span>
                  <p className="text-sm font-semibold text-white">GDPR COMPLIANT</p>
                </div>
                <p className="text-xs text-slate-400">Your data is secure and compliant</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-8 text-center text-slate-400 text-sm">
          <p>&copy; 2025 Hire-GenAI. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
