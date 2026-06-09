const testimonials = [
  {
    stars: '★★★★★',
    quote: '"The AI CV scoring is genuinely impressive. We used to spend 3 hours shortlisting per role — now it\'s under 20 minutes. The interview questions generated are exactly what we would have written ourselves."',
    result: '⚡ CV shortlisting time: 3h → 20 min',
    avatar: 'RS', avatarBg: 'rgba(0,177,79,0.2)', avatarColor: 'var(--primary-light)',
    name: 'Rachel Sullivan', role: 'Senior Recruiter · TalentBridge Recruitment, London',
  },
  {
    stars: '★★★★★',
    quote: '"The AI video interview experience is smooth and professional. Candidates are comfortable with it, and the evaluation report we get after is detailed enough to make a confident hire/pass decision."',
    result: '📈 Interview-to-shortlist: 4x faster',
    avatar: 'JP', avatarBg: 'rgba(6,182,212,0.2)', avatarColor: 'var(--accent)',
    name: 'James Patel', role: 'Head of HR · CodeCraft Technologies',
  },
  {
    stars: '★★★★★',
    quote: '"Wallet-based billing is a breath of fresh air — we only pay for what we actually use. The ATS pipeline is clean, the auto-schedule feature saves hours, and support responds within the day."',
    result: '💰 Pay-as-you-use — no seat-fee waste',
    avatar: 'ET', avatarBg: 'rgba(0,177,79,0.2)', avatarColor: 'var(--green)',
    name: 'Emma Thompson', role: 'Director of Talent · Swift Staffing Group',
  },
];

export default function Testimonials() {
  return (
    <section className="testimonials reveal" id="testimonials">
      <div className="container">
        <div className="testimonials-header">
          <div className="section-label">Customer Stories</div>
          <h2 className="section-title">Teams hiring smarter with <span className="highlight">Hire-GenAI</span></h2>
          <p className="section-subtitle" style={{ margin: '16px auto 0' }}>
            Recruitment agencies, HR teams, and staffing firms use Hire-GenAI to cut screening time and improve hire quality.
          </p>
        </div>
        <div className="testimonials-grid">
          {testimonials.map((t) => (
            <div key={t.name} className="testimonial-card">
              <div className="testimonial-stars">{t.stars}</div>
              <div className="testimonial-quote">{t.quote}</div>
              <div className="testimonial-result">{t.result}</div>
              <div className="testimonial-author">
                <div className="testimonial-avatar" style={{ background: t.avatarBg, color: t.avatarColor }}>{t.avatar}</div>
                <div>
                  <div className="testimonial-name">{t.name}</div>
                  <div className="testimonial-role">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: '32px', fontSize: '13px', color: 'var(--text-dim)' }}>
          Trusted by 50+ teams worldwide ·{' '}
          <a href="mailto:support@hire-genai.com" style={{ color: 'var(--green)', textDecoration: 'underline' }}>support@hire-genai.com</a>{' '}
          ·{' '}
          <a href="https://hire-genai.com/book-meeting" style={{ color: 'var(--green)', textDecoration: 'underline' }} target="_blank" rel="noopener">Book a Meeting</a>
        </div>
      </div>
    </section>
  );
}
