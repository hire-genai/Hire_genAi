"use client"

export const dynamic = 'force-dynamic';

import { useEffect } from "react"
import Navbar from "@/components/layout/Navbar"
import Link from "next/link"
import Footer from "@/components/layout/Footer"

export default function TermsAndConditionsPage() {
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const scrollTo = urlParams.get('scroll')
    if (scrollTo) {
      const timer = setTimeout(() => {
        const element = document.getElementById(scrollTo)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' })
        }
        window.history.replaceState({}, '', '/terms')
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Terms and Conditions Content */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-16">
            <h1 className="text-5xl font-bold text-emerald-600 mb-4">Terms and Conditions</h1>
            <p className="text-lg text-slate-600">
              Last updated: November 2024
            </p>
          </div>

          <div className="space-y-12 text-slate-700 leading-relaxed">
            {/* Responsible Party */}
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-4">Responsible Party</h2>
              <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                <p className="font-semibold text-slate-800 mb-2">HireGenAI by SKYGENAI</p>
                <p className="text-slate-600">support@hire-genai.com</p>
              </div>
            </div>

            {/* Section 1 */}
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-4">1. Collection and Storage of Personal Data</h2>
              <p className="mb-4">
                When you access our AI-powered recruitment platform and use our services, the browser on your device automatically sends information to our servers. This information is temporarily stored in log files.
              </p>
              <p className="font-semibold text-slate-800 mb-3">Purpose of Data Processing:</p>
              <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
                <li>Ensuring seamless connection to our AI recruitment platform</li>
                <li>Providing optimal user experience across all features</li>
                <li>Evaluating system security and platform stability</li>
                <li>Improving our AI interview and CV parsing services</li>
                <li>Administrative and analytical purposes</li>
              </ul>
            </div>

            {/* Section 2 */}
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-4">2. Data Transfer and Sharing</h2>
              <p className="mb-4">
                Your personal data will not be transferred to third parties except in the following circumstances:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>You have provided explicit consent in accordance with Art. 6 Para. 1 S. 1 lit. a GDPR</li>
                <li>There is an overriding legitimate interest that does not conflict with your data protection rights</li>
                <li>Legal disclosure is required under Art. 6 Para. 1 S. 1 lit. c GDPR</li>
                <li>Transfer is necessary for fulfilling contractual obligations with you</li>
              </ul>
            </div>

            {/* Section 3 */}
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-4">3. Cookies</h2>
              <p className="mb-4">
                HireGenAI uses session cookies on our platform. These are small files automatically created by your browser and stored on your device when you visit our site. Cookies do not harm your device and contain no viruses, trojans, or malware.
              </p>
              <p>
                Most browsers accept cookies automatically. You can configure your browser to reject cookies or notify you before creating new ones. Disabling cookies may limit your ability to use certain features of our AI recruitment platform.
              </p>
            </div>

            {/* Section 4 */}
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-4">4. Your Rights as a Data Subject</h2>
              <p className="mb-4">Under applicable data protection laws, you have the following rights:</p>
              <ul className="list-disc list-inside space-y-3 ml-4">
                <li><span className="font-semibold">Right to Information (Art. 15 GDPR):</span> Request details about your personal data we process.</li>
                <li><span className="font-semibold">Right to Rectification (Art. 16 GDPR):</span> Request immediate correction of inaccurate data.</li>
                <li><span className="font-semibold">Right to Erasure (Art. 17 GDPR):</span> Request deletion of your personal data.</li>
                <li><span className="font-semibold">Right to Restriction (Art. 18 GDPR):</span> Request restriction of processing.</li>
                <li><span className="font-semibold">Right to Data Portability (Art. 20 GDPR):</span> Receive your data in a structured format.</li>
                <li><span className="font-semibold">Right to Withdraw Consent (Art. 7 Para. 3 GDPR):</span> Revoke your consent at any time.</li>
              </ul>
            </div>

            {/* Section 5 */}
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-4">5. AI-Powered Recruitment Services</h2>
              <p className="mb-4">
                HireGenAI provides AI-powered recruitment services including CV parsing, automated candidate screening, and AI video interviews. By using these services, you acknowledge and agree to the following:
              </p>
              <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
                <li>AI algorithms analyze candidate data to provide recruitment insights</li>
                <li>Video interviews are recorded and processed using AI for evaluation</li>
                <li>CV and resume data is parsed and analyzed to match candidates with job requirements</li>
                <li>All AI processing is conducted in compliance with GDPR</li>
                <li>Human oversight is maintained in all final hiring decisions</li>
              </ul>
            </div>

            {/* Section 6 */}
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-4">6. Platform Usage Terms</h2>
              <p className="mb-4">By accessing and using HireGenAI, you agree to:</p>
              <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
                <li>Provide accurate and truthful information when creating accounts</li>
                <li>Use the platform only for legitimate recruitment purposes</li>
                <li>Not attempt to circumvent platform security features</li>
                <li>Respect the intellectual property rights of HireGenAI</li>
                <li>Comply with all applicable laws and regulations</li>
                <li>Not use the platform for discriminatory hiring practices</li>
              </ul>
            </div>

            {/* Section 7 */}
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-4">7. Data Security</h2>
              <p className="mb-4">
                HireGenAI implements SSL encryption across our entire platform, using the highest encryption level supported by your browser—typically 256-bit encryption.
              </p>
              <p>
                We employ comprehensive technical and organizational security measures to protect your data against accidental or intentional manipulation, loss, destruction, or unauthorized access.
              </p>
            </div>

            {/* Contact */}
            <div className="bg-emerald-50 p-8 rounded-lg border border-emerald-200">
              <h2 className="text-2xl font-bold text-slate-800 mb-4">Questions?</h2>
              <p className="text-slate-700 mb-4">
                If you have any questions about these Terms and Conditions, please contact us at:
              </p>
              <p className="text-lg font-semibold text-emerald-600">support@hire-genai.com</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
