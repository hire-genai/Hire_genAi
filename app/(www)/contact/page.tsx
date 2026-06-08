"use client"

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowRight, Mail, MessageSquare, Zap, Loader2 } from "lucide-react"
import { WwwNavbar } from "@/components/layout/www-nav"
import WwwFooter from "@/components/layout/www-footer"

const inp: React.CSSProperties = { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', color: '#fff', fontSize: '15px', padding: '12px 14px', outline: 'none', boxSizing: 'border-box', transition: 'border .2s' };
const lab: React.CSSProperties = { display: 'block', fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '6px' };

export default function ContactPage() {
  const [formData, setFormData] = useState({ fullName: '', workEmail: '', companyName: '', phoneNumber: '', subject: '', message: '' })
  const [agreed, setAgreed] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const scrollTo = urlParams.get('scroll')
    if (scrollTo) {
      const timer = setTimeout(() => {
        const element = document.getElementById(scrollTo)
        if (element) element.scrollIntoView({ behavior: 'smooth' })
        window.history.replaceState({}, '', '/contact')
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agreed || isLoading) return
    setIsLoading(true)
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: formData.fullName, workEmail: formData.workEmail, companyName: formData.companyName, phoneNumber: formData.phoneNumber, subject: formData.subject, message: formData.message, agreedToTerms: agreed })
      })
      if (!response.ok) throw new Error('Failed to submit form')
      await response.json()
      setSubmitted(true)
    } catch (error) {
      alert('Failed to send message. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#03110A', color: '#fff' }}>
      <WwwNavbar />

      <div style={{ paddingTop: '68px' }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', padding: '60px 24px 48px', animation: 'fadeIn 0.7s ease-out both' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#00B14F', marginBottom: '12px' }}>Contact Us</div>
          <h1 style={{ fontSize: 'clamp(32px,4vw,56px)', fontWeight: 900, lineHeight: 1.1, marginBottom: '16px' }}>
            Get in <span style={{ background: 'linear-gradient(135deg,#00B14F,#06B6D4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Touch</span>
          </h1>
          <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.5)', maxWidth: '480px', margin: '0 auto', lineHeight: 1.7 }}>
            Have questions about Hire-GenAI? We&rsquo;d love to hear from you. Send us a message and we&rsquo;ll respond as soon as possible.
          </p>
        </div>

        {/* Main content */}
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px 80px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '40px', alignItems: 'start', animation: 'fadeIn 0.7s ease-out 0.15s both' }}>

          {/* Left: Info */}
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '40px' }}>
              {[
                { Icon: Mail, bg: 'rgba(0,177,79,0.15)', ic: '#00B14F', title: 'Email Us', sub: 'support@hire-genai.com' },
                { Icon: MessageSquare, bg: 'rgba(59,130,246,0.15)', ic: '#60A5FA', title: 'Live Chat', sub: 'Available Mon-Fri, 9am-6pm IST' },
                { Icon: Zap, bg: 'rgba(245,158,11,0.15)', ic: '#FCD34D', title: 'Response Time', sub: 'Within 24 hours' },
              ].map(({ Icon, bg, ic, title, sub }) => (
                <div key={title} style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '20px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', transition: 'border-color .2s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(0,177,79,0.3)') }
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)') }>
                  <div style={{ width: 48, height: 48, background: bg, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon style={{ width: 22, height: 22, color: ic }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>{title}</div>
                    <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>{sub}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: 'linear-gradient(135deg,rgba(0,177,79,0.1),rgba(6,182,212,0.06))', border: '1px solid rgba(0,177,79,0.2)', borderRadius: '16px', padding: '24px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>Prefer to talk directly?</div>
              <a href="/book-meeting" className="btn-primary" style={{ display: 'inline-flex', padding: '12px 22px', fontSize: '14px' }}>📅 Book a Meeting →</a>
            </div>
          </div>

          {/* Right: Form */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,177,79,0.2)', borderRadius: '20px', padding: '36px' }}>
            {!submitted ? (
              <>
                <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '28px' }}>Leave a Message</h2>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {[
                    { id: 'fullName', label: 'Full Name', placeholder: 'Your full name', type: 'text', required: true },
                    { id: 'workEmail', label: 'Work Email', placeholder: 'you@company.com', type: 'email', required: true },
                    { id: 'companyName', label: 'Company Name', placeholder: 'Your company name', type: 'text', required: true },
                    { id: 'phoneNumber', label: 'Phone Number (Optional)', placeholder: '+1 (555) 123-4567', type: 'tel', required: false },
                    { id: 'subject', label: 'Subject', placeholder: 'How can we help?', type: 'text', required: true },
                  ].map(f => (
                    <div key={f.id}>
                      <label style={lab}>{f.label}</label>
                      <input type={f.type} value={(formData as any)[f.id]} onChange={e => setFormData({...formData, [f.id]: e.target.value})} placeholder={f.placeholder} required={f.required} style={inp}
                        onFocus={e => (e.currentTarget.style.borderColor = 'rgba(0,177,79,0.5)')}
                        onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')} />
                    </div>
                  ))}
                  <div>
                    <label style={lab}>Your Message</label>
                    <textarea value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} placeholder="Tell us more about your needs..." required style={{ ...inp, minHeight: '120px', resize: 'vertical' } as React.CSSProperties}
                      onFocus={e => (e.currentTarget.style.borderColor = 'rgba(0,177,79,0.5)')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <input type="checkbox" id="terms" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ marginTop: '2px', flexShrink: 0, cursor: 'pointer' }} />
                    <label htmlFor="terms" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', lineHeight: 1.6 }}>
                      I agree to the <Link href="/terms" style={{ color: '#00B14F' }}>Terms & Conditions</Link> and <Link href="/privacy" style={{ color: '#00B14F' }}>Privacy Policy</Link>
                    </label>
                  </div>
                  <button type="submit" disabled={!agreed || isLoading} style={{ height: '52px', background: 'linear-gradient(135deg,#00B14F,#00C853)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '16px', fontWeight: 700, cursor: agreed && !isLoading ? 'pointer' : 'not-allowed', opacity: agreed && !isLoading ? 1 : 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', transition: 'opacity .2s' }}>
                    {isLoading ? <><Loader2 style={{ width: 18, height: 18, animation: 'spin 0.8s linear infinite' }} /> Sending...</> : <>Send Message <ArrowRight style={{ width: 18, height: 18 }} /></>}
                  </button>
                </form>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ width: 72, height: 72, background: 'rgba(0,177,79,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <svg style={{ width: 36, height: 36, color: '#00B14F' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>Message Sent!</h2>
                <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '28px', lineHeight: 1.7 }}>Thank you for reaching out. We&rsquo;ll get back to you within 24 hours.</p>
                <a href="/" className="btn-primary" style={{ display: 'inline-flex', padding: '12px 28px' }}>Return to Home</a>
              </div>
            )}
          </div>
        </div>
      </div>

      <WwwFooter />
    </div>
  )
}
