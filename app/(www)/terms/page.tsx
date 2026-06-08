"use client"

export const dynamic = 'force-dynamic';

import { useEffect } from "react"
import { WwwNavbar } from "@/components/layout/www-nav"
import WwwFooter from "@/components/layout/www-footer"

const h2Style = { fontSize: '1.3rem', fontWeight: 600, color: '#fff', marginBottom: '16px' } as const;
const ulStyle = { listStyle: 'disc', paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '8px' } as const;

export default function TermsAndConditionsPage() {
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const scrollTo = urlParams.get('scroll')
    if (scrollTo) {
      const timer = setTimeout(() => {
        const element = document.getElementById(scrollTo)
        if (element) element.scrollIntoView({ behavior: 'smooth' })
        window.history.replaceState({}, '', '/terms')
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#03110A', color: '#e2e8f0' }}>
      <WwwNavbar />
      <section style={{ paddingTop: '100px', paddingBottom: '80px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ marginBottom: '48px' }}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 700, color: '#00B14F', marginBottom: '12px' }}>Terms and Conditions</h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '15px' }}>Last updated: November 2024</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', color: 'rgba(255,255,255,0.75)', lineHeight: '1.8' }}>
            <div>
              <h2 style={h2Style}>Responsible Party</h2>
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,177,79,0.2)', borderRadius: '12px', padding: '20px' }}>
                <p style={{ fontWeight: 600, color: '#fff', marginBottom: '6px' }}>HireGenAI by SKYGENAI</p>
                <p style={{ color: 'rgba(255,255,255,0.5)' }}>support@hire-genai.com</p>
              </div>
            </div>

            <div>
              <h2 style={h2Style}>1. Collection and Storage of Personal Data</h2>
              <p style={{ marginBottom: '16px' }}>When you access our AI-powered recruitment platform and use our services, the browser on your device automatically sends information to our servers. This information is temporarily stored in log files.</p>
              <p style={{ fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginBottom: '12px' }}>Purpose of Data Processing:</p>
              <ul style={ulStyle}>
                <li>Ensuring seamless connection to our AI recruitment platform</li>
                <li>Providing optimal user experience across all features</li>
                <li>Evaluating system security and platform stability</li>
                <li>Improving our AI interview and CV parsing services</li>
                <li>Administrative and analytical purposes</li>
              </ul>
            </div>

            <div>
              <h2 style={h2Style}>2. Data Transfer and Sharing</h2>
              <p style={{ marginBottom: '16px' }}>Your personal data will not be transferred to third parties except in the following circumstances:</p>
              <ul style={ulStyle}>
                <li>You have provided explicit consent in accordance with Art. 6 Para. 1 S. 1 lit. a GDPR</li>
                <li>There is an overriding legitimate interest that does not conflict with your data protection rights</li>
                <li>Legal disclosure is required under Art. 6 Para. 1 S. 1 lit. c GDPR</li>
                <li>Transfer is necessary for fulfilling contractual obligations with you</li>
              </ul>
            </div>

            <div>
              <h2 style={h2Style}>3. Cookies</h2>
              <p style={{ marginBottom: '16px' }}>HireGenAI uses session cookies on our platform. These are small files automatically created by your browser and stored on your device when you visit our site. Cookies do not harm your device and contain no viruses, trojans, or malware.</p>
              <p>Most browsers accept cookies automatically. You can configure your browser to reject cookies or notify you before creating new ones. Disabling cookies may limit your ability to use certain features of our AI recruitment platform.</p>
            </div>

            <div>
              <h2 style={h2Style}>4. Your Rights as a Data Subject</h2>
              <p style={{ marginBottom: '16px' }}>Under applicable data protection laws, you have the following rights:</p>
              <ul style={ulStyle}>
                <li><span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>Right to Information (Art. 15 GDPR):</span> Request details about your personal data we process.</li>
                <li><span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>Right to Rectification (Art. 16 GDPR):</span> Request immediate correction of inaccurate data.</li>
                <li><span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>Right to Erasure (Art. 17 GDPR):</span> Request deletion of your personal data.</li>
                <li><span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>Right to Restriction (Art. 18 GDPR):</span> Request restriction of processing.</li>
                <li><span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>Right to Data Portability (Art. 20 GDPR):</span> Receive your data in a structured format.</li>
                <li><span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>Right to Withdraw Consent (Art. 7 Para. 3 GDPR):</span> Revoke your consent at any time.</li>
              </ul>
            </div>

            <div>
              <h2 style={h2Style}>5. AI-Powered Recruitment Services</h2>
              <p style={{ marginBottom: '16px' }}>HireGenAI provides AI-powered recruitment services including CV parsing, automated candidate screening, and AI video interviews. By using these services, you acknowledge and agree to the following:</p>
              <ul style={ulStyle}>
                <li>AI algorithms analyze candidate data to provide recruitment insights</li>
                <li>Video interviews are recorded and processed using AI for evaluation</li>
                <li>CV and resume data is parsed and analyzed to match candidates with job requirements</li>
                <li>All AI processing is conducted in compliance with GDPR</li>
                <li>Human oversight is maintained in all final hiring decisions</li>
              </ul>
            </div>

            <div>
              <h2 style={h2Style}>6. Platform Usage Terms</h2>
              <p style={{ marginBottom: '16px' }}>By accessing and using HireGenAI, you agree to:</p>
              <ul style={ulStyle}>
                <li>Provide accurate and truthful information when creating accounts</li>
                <li>Use the platform only for legitimate recruitment purposes</li>
                <li>Not attempt to circumvent platform security features</li>
                <li>Respect the intellectual property rights of HireGenAI</li>
                <li>Comply with all applicable laws and regulations</li>
                <li>Not use the platform for discriminatory hiring practices</li>
              </ul>
            </div>

            <div>
              <h2 style={h2Style}>7. Data Security</h2>
              <p style={{ marginBottom: '16px' }}>HireGenAI implements SSL encryption across our entire platform, using the highest encryption level supported by your browser—typically 256-bit encryption.</p>
              <p>We employ comprehensive technical and organizational security measures to protect your data against accidental or intentional manipulation, loss, destruction, or unauthorized access.</p>
            </div>

            <div style={{ background: 'rgba(0,177,79,0.08)', border: '1px solid rgba(0,177,79,0.25)', borderRadius: '12px', padding: '28px' }}>
              <h2 style={h2Style}>Questions?</h2>
              <p style={{ marginBottom: '16px' }}>If you have any questions about these Terms and Conditions, please contact us at:</p>
              <p style={{ fontSize: '1.05rem', fontWeight: 600, color: '#00B14F' }}>support@hire-genai.com</p>
            </div>
          </div>
        </div>
      </section>
      <WwwFooter />
    </div>
  )
}
