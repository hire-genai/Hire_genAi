"use client"

export const dynamic = 'force-dynamic';

import { WwwNavbar } from "@/components/layout/www-nav"
import WwwFooter from "@/components/layout/www-footer"

const h2Style = { fontSize: '1.3rem', fontWeight: 600, color: '#fff', marginBottom: '16px' } as const;
const ulStyle = { listStyle: 'disc', paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '8px' } as const;

export default function PrivacyPolicyPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#03110A', color: '#e2e8f0' }}>
      <WwwNavbar />
      <section style={{ paddingTop: '100px', paddingBottom: '80px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ marginBottom: '48px' }}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 700, color: '#00B14F', marginBottom: '12px' }}>Privacy Policy</h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '15px' }}>Last updated: November 2024</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', color: 'rgba(255,255,255,0.75)', lineHeight: '1.8' }}>
            <div>
              <h2 style={h2Style}>Responsible Party under Data Protection Laws</h2>
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,177,79,0.2)', borderRadius: '12px', padding: '20px' }}>
                <p style={{ fontWeight: 600, color: '#fff', marginBottom: '6px' }}>HireGenAI</p>
                <p style={{ color: 'rgba(255,255,255,0.5)' }}>support@hire-genai.com</p>
              </div>
            </div>

            <div>
              <h2 style={h2Style}>1. Collection and Storage of Personal Data</h2>
              <p style={{ marginBottom: '16px' }}>When you access our websites and use our AI-powered recruitment services, the browser on your device automatically sends information to our website server. This information is temporarily stored in a log file.</p>
              <ul style={{ ...ulStyle, marginBottom: '16px' }}>
                <li>IP address of the requesting computer</li>
                <li>Date and time of access</li>
                <li>Name and URL of the accessed file</li>
                <li>Website from which access was made (referrer URL)</li>
                <li>Browser used and operating system of your computer</li>
              </ul>
              <p style={{ fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginBottom: '12px' }}>Data Processing Purposes:</p>
              <ul style={ulStyle}>
                <li>Ensuring smooth connection establishment with the website</li>
                <li>Ensuring comfortable use of our website and AI recruitment platform</li>
                <li>Evaluating system security and stability</li>
                <li>Conducting recruitment analytics and service optimization</li>
              </ul>
            </div>

            <div>
              <h2 style={h2Style}>2. Data Transfer</h2>
              <p style={{ marginBottom: '16px' }}>Your personal data will not be transferred to third parties for purposes other than those listed below. We only pass on your personal data to third parties if:</p>
              <ul style={ulStyle}>
                <li>You have given your express consent in accordance with Art. 6 Para. 1 S. 1 lit. a GDPR</li>
                <li>Disclosure is necessary for the assertion, exercise or defense of legal claims</li>
                <li>There is a legal obligation to disclose in accordance with Art. 6 Para. 1 S. 1 lit. c GDPR</li>
                <li>This is legally permissible and necessary for the processing of contractual relationships</li>
              </ul>
            </div>

            <div>
              <h2 style={h2Style}>3. Cookies</h2>
              <p style={{ marginBottom: '16px' }}>We use session cookies on our site. These are small files that your browser automatically creates and stores on your device when you visit our site. Cookies do not damage your device and do not contain viruses, Trojans, or other malware.</p>
              <p>Most browsers accept cookies automatically. However, you can configure your browser so that no cookies are stored or you receive a notification before new cookies are created. Completely disabling cookies may prevent you from using all functions of our website.</p>
            </div>

            <div>
              <h2 style={h2Style}>4. Rights of Data Subjects</h2>
              <p style={{ marginBottom: '16px' }}>You have the right:</p>
              <ul style={ulStyle}>
                <li>Pursuant to Art. 15 GDPR, to request information about your personal data processed by us</li>
                <li>Pursuant to Art. 16 GDPR, to request immediate correction of incorrect data</li>
                <li>Pursuant to Art. 17 GDPR, to request deletion of your personal data under certain conditions</li>
                <li>Pursuant to Art. 18 GDPR, to request restriction of processing under certain conditions</li>
                <li>Pursuant to Art. 20 GDPR, to receive your data in a structured, machine-readable format</li>
                <li>Pursuant to Art. 7 Para. 3 GDPR, to revoke your consent at any time</li>
                <li>To lodge a complaint with a supervisory authority pursuant to Art. 77 GDPR</li>
              </ul>
            </div>

            <div>
              <h2 style={h2Style}>5. Right to Object</h2>
              <p>If your personal data is processed based on legitimate interests pursuant to Art. 6 Para. 1 S. 1 lit. f GDPR, you have the right to object to this processing at any time for reasons arising from your particular situation. If you wish to exercise your right of revocation or objection, please send an email to support@hire-genai.com.</p>
            </div>

            <div>
              <h2 style={h2Style}>6. Data Security</h2>
              <p style={{ marginBottom: '16px' }}>We use SSL (Secure Socket Layer) encryption on our website with the highest encryption level supported by your browser (usually 256-bit). You can recognize encrypted transmission by the lock symbol in your browser address bar.</p>
              <p>We implement appropriate technical and organizational security measures to protect your data against accidental or intentional manipulation, loss, destruction, or unauthorized access.</p>
            </div>

            <div>
              <h2 style={h2Style}>7. Third-Party Integrations and User Data</h2>
              <p style={{ marginBottom: '16px' }}>When you connect third-party accounts (such as Google) to our services for features like sign-in, calendar integration, or document processing, we access the following data only with your explicit consent:</p>
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
                <p style={{ fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginBottom: '6px' }}>Profile Information:</p>
                <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '14px' }}>Name, email address, profile picture</p>
                <p style={{ fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginBottom: '6px' }}>Authentication Data:</p>
                <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '14px' }}>Account ID, access tokens</p>
                <p style={{ fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginBottom: '6px' }}>Service-Specific Data:</p>
                <p style={{ color: 'rgba(255,255,255,0.5)' }}>Depending on the integration (calendar events, documents, etc.)</p>
              </div>
              <p style={{ fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginBottom: '8px' }}>Data Deletion:</p>
              <p>You can disconnect third-party integrations anytime through your account settings or by contacting support@hire-genai.com. We delete associated data within 30 days.</p>
            </div>

            <div style={{ background: 'rgba(0,177,79,0.08)', border: '1px solid rgba(0,177,79,0.25)', borderRadius: '12px', padding: '28px' }}>
              <h2 style={h2Style}>Questions?</h2>
              <p style={{ marginBottom: '16px' }}>If you have any questions about this Privacy Policy or our data practices, please contact us at:</p>
              <p style={{ fontSize: '1.05rem', fontWeight: 600, color: '#00B14F' }}>support@hire-genai.com</p>
            </div>
          </div>
        </div>
      </section>
      <WwwFooter />
    </div>
  )
}
