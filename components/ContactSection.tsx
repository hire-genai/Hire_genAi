'use client';
import { useState } from 'react';

export default function ContactSection() {
  const [form, setForm] = useState({ name: '', email: '', company: '', message: '' });
  const [sent, setSent] = useState(false);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  const channels = [
    { icon: '📧', label: 'Email Us', value: 'hello@hire-genai.com', href: 'mailto:hello@hire-genai.com' },
    { icon: '💬', label: 'Live Chat', value: 'Available 9am – 6pm GMT', href: '#' },
    { icon: '📞', label: 'Call Us', value: '+1 (800) 123-4567', href: 'tel:+18001234567' },
    { icon: '🏢', label: 'Head Office', value: 'London, United Kingdom', href: '#' },
  ];

  return (
    <section className="contact-section reveal" id="contact">
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <div className="section-label">GET IN TOUCH</div>
          <h2 className="section-title">
            Have Questions? <span className="highlight">We&apos;re Here.</span>
          </h2>
          <p className="section-subtitle" style={{ margin: '16px auto 0' }}>
            Our team typically responds within a few hours. Reach out for product questions, enterprise pricing, or partnership enquiries.
          </p>
        </div>

        <div className="contact-grid">
          <div className="contact-channels">
            {channels.map(c => (
              <a key={c.label} href={c.href} className="contact-channel-card">
                <div className="contact-channel-icon">{c.icon}</div>
                <div>
                  <div className="contact-channel-label">{c.label}</div>
                  <div className="contact-channel-value">{c.value}</div>
                </div>
              </a>
            ))}
          </div>

          <div className="contact-form-card">
            {sent ? (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
                <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '10px' }}>Message Sent!</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.6 }}>
                  Thanks for reaching out. We&apos;ll get back to you within a few hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '22px' }}>Send Us a Message</h3>
                <div className="contact-form-row">
                  <div className="contact-field">
                    <label>Your Name</label>
                    <input required value={form.name} onChange={set('name')} placeholder="Jane Smith" />
                  </div>
                  <div className="contact-field">
                    <label>Work Email</label>
                    <input required type="email" value={form.email} onChange={set('email')} placeholder="jane@company.com" />
                  </div>
                </div>
                <div className="contact-field">
                  <label>Company</label>
                  <input value={form.company} onChange={set('company')} placeholder="Acme Corp" />
                </div>
                <div className="contact-field">
                  <label>How can we help?</label>
                  <textarea required rows={4} value={form.message} onChange={set('message')} placeholder="Tell us about your hiring challenges..." />
                </div>
                <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '4px', padding: '14px' }}>
                  Send Message →
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
