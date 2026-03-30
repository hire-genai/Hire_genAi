import Link from 'next/link'
import { Facebook, Instagram, Youtube, Linkedin, Lock, Star } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Grid - 2-col on mobile, 12-col on desktop */}
        <div className="grid grid-cols-2 md:grid-cols-12 gap-6 md:gap-12 mb-12">

          {/* Brand Block - full width on mobile */}
          <div className="col-span-2 md:col-span-3">
            <h3 className="text-2xl font-bold mb-2">
              <span className="text-white">Hire</span>
              <span className="text-emerald-400">GenAI</span>
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
            <div className="flex space-x-4">
              <a href="#" className="text-slate-400 hover:text-emerald-400 transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="text-slate-400 hover:text-emerald-400 transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="text-slate-400 hover:text-emerald-400 transition-colors">
                <Youtube className="w-5 h-5" />
              </a>
              <a href="https://www.linkedin.com/company/hire-genai" className="text-slate-400 hover:text-emerald-400 transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Product & Company Section - Side by side */}
          <div className="col-span-2 md:col-span-4">
            <div className="grid grid-cols-2 gap-6 md:gap-12">
              {/* Product Section */}
              <div>
                <h4 className="font-semibold mb-4 text-white text-sm uppercase tracking-wide">Product</h4>
                <ul className="space-y-3 text-slate-400 text-sm">
                  <li>
                    <Link href="/demo-en" className="hover:text-emerald-400 transition-colors">
                      Try the Demo
                    </Link>
                  </li>
                  <li>
                    <Link href="/pricing" className="hover:text-emerald-400 transition-colors">
                      Pricing
                    </Link>
                  </li>
                  <li>
                    <Link href="/?scroll=faq" className="hover:text-emerald-400 transition-colors cursor-pointer">
                      FAQs
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Company Section */}
              <div>
                <h4 className="font-semibold mb-4 text-white text-sm uppercase tracking-wide">Company</h4>
                <ul className="space-y-3 text-slate-400 text-sm">
                  <li>
                    <Link href="/about" className="hover:text-emerald-400 transition-colors">
                      About us
                    </Link>
                  </li>
                  <li>
                    <Link href="/contact" className="hover:text-emerald-400 transition-colors">
                      Contact
                    </Link>
                  </li>
                  <li>
                    <Link href="/book-meeting" className="hover:text-emerald-400 transition-colors">
                      Book a Meeting
                    </Link>
                  </li>
                  <li>
                    <Link href="/owner-login" className="hover:text-emerald-400 transition-colors">
                      Admin
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Legal Section */}
          <div className="col-span-1 md:col-span-2">
            <h4 className="font-semibold mb-4 text-white text-sm uppercase tracking-wide">Legal</h4>
            <ul className="space-y-3 text-slate-400 text-sm">
              <li>
                <Link href="/privacy" className="hover:text-emerald-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-emerald-400 transition-colors">
                  Terms and Conditions
                </Link>
              </li>
            </ul>
          </div>

          {/* Right Section - Badges */}
          <div className="col-span-1 md:col-span-3">
            <div className="space-y-4">
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <p className="text-xs text-slate-400 mb-2 font-semibold">Trustpilot</p>
                <div className="flex items-center gap-2 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm font-semibold text-white">TrustScore 4.5</p>
              </div>
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <p className="text-sm font-semibold text-white">GDPR COMPLIANT</p>
                </div>
                <p className="text-xs text-slate-400">Your data is secure and compliant</p>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Bottom */}
        <div className="border-t border-slate-800 pt-8 text-center text-slate-400 text-sm">
          <p>&copy; 2025 HireGenAI. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
