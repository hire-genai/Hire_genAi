"use client"

export const dynamic = 'force-dynamic';

import { useEffect } from "react"
import Link from "next/link"
import { Users, Zap, Brain, MessageSquare, Target } from "lucide-react"
import WwwFooter from "@/components/layout/www-footer"
import { WwwNavbar } from "@/components/layout/www-nav"
import { getAppUrl } from "@/lib/domain-config"

const fadeIn = { animation: 'fadeIn 0.7s ease-out both' } as React.CSSProperties;
const fadeIn2 = { animation: 'fadeIn 0.7s ease-out 0.15s both' } as React.CSSProperties;
const fadeIn3 = { animation: 'fadeIn 0.7s ease-out 0.3s both' } as React.CSSProperties;

const darkCard: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,177,79,0.2)', borderRadius: '20px', padding: '32px' };
const darkCardAlt: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '24px' };
const chip: React.CSSProperties = { display: 'inline-block', padding: '4px 14px', borderRadius: '100px', fontSize: '13px', fontWeight: 600 };

export default function AboutPage() {
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const scrollTo = urlParams.get('scroll')
    if (scrollTo) {
      const timer = setTimeout(() => {
        const element = document.getElementById(scrollTo)
        if (element) element.scrollIntoView({ behavior: 'smooth' })
        window.history.replaceState({}, '', '/about')
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#03110A', color: '#fff' }}>
      <WwwNavbar />

      <section style={{ paddingTop: '68px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '60px 24px' }}>

          {/* Title */}
          <div style={{ marginBottom: '60px', ...fadeIn }}>
            <div style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#00B14F', marginBottom: '12px' }}>Our Story</div>
            <h1 style={{ fontSize: 'clamp(36px,5vw,64px)', fontWeight: 900, lineHeight: 1.1, marginBottom: '16px' }}>
              About <span style={{ background: 'linear-gradient(135deg,#00B14F,#06B6D4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Hire-GenAI</span>
            </h1>
            <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.55)', maxWidth: '560px', lineHeight: 1.7 }}>
              Revolutionizing recruitment through AI innovation — making hiring faster, fairer, and more human.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>

            {/* Mission */}
            <div style={{ ...darkCard, background: 'linear-gradient(135deg,rgba(0,177,79,0.12),rgba(6,182,212,0.06))', borderColor: 'rgba(0,177,79,0.3)', ...fadeIn }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                <div style={{ width: 48, height: 48, background: 'rgba(0,177,79,0.15)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Target style={{ width: 24, height: 24, color: '#00B14F' }} />
                </div>
                <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#fff' }}>Our Mission</h2>
              </div>
              <p style={{ fontSize: '20px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.7, marginBottom: '16px', fontWeight: 500 }}>
                We empower the generation of tomorrow for a brighter future and hope for every individual.
              </p>
              <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.8 }}>
                Hire-GenAI is a visionary project aimed at revolutionizing the recruitment industry through Voice AI, with a strong emphasis on enhancing the candidate experience. This is just the beginning — we envision a future where Voice AI transforms how humans interact across domains like customer service, education, and healthcare.
              </p>
            </div>

            {/* What We Build */}
            <div style={{ ...fadeIn2 }}>
              <h2 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '32px' }}>What We Build</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px', alignItems: 'start' }}>
                <div>
                  <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.6)', marginBottom: '20px', lineHeight: 1.8 }}>
                    We&rsquo;re building an AI recruiter that automates candidate screening using the Voice API. Once a candidate applies, our AI conducts a real-time voice-based screening interview.
                  </p>
                  <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.6)', marginBottom: '24px', lineHeight: 1.8 }}>
                    It integrates with LinkedIn, Microsoft Teams, Outlook, and SharePoint to fetch candidate insights, schedule follow-ups, and log interview notes. The goal is to reduce recruiter workload and increase screening accuracy, especially for high-volume roles.
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {[['Voice AI','rgba(0,177,79,0.15)','#6EE7B7'],['LinkedIn Integration','rgba(59,130,246,0.15)','#93C5FD'],['Microsoft Teams','rgba(168,85,247,0.15)','#C084FC'],['Outlook Integration','rgba(245,158,11,0.15)','#FCD34D']].map(([label,bg,color]) => (
                      <span key={label as string} style={{ ...chip, background: bg as string, color: color as string }}>{label as string}</span>
                    ))}
                  </div>
                </div>
                <div style={{ ...darkCardAlt }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <Zap style={{ width: 24, height: 24, color: '#00B14F' }} />
                    <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Key Features</h3>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {['Real-time voice-based candidate screening','Automated scheduling and follow-ups','Integration with major business platforms','Reduced recruiter workload by 80%','Enhanced screening accuracy'].map(item => (
                      <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
                        <span style={{ width: 6, height: 6, background: '#00B14F', borderRadius: '50%', marginTop: '7px', flexShrink: 0 }} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div style={{ background: 'linear-gradient(135deg,rgba(0,177,79,0.15),rgba(6,182,212,0.1))', border: '1px solid rgba(0,177,79,0.25)', borderRadius: '24px', padding: '56px 40px', textAlign: 'center', ...fadeIn3 }}>
              <h2 style={{ fontSize: 'clamp(24px,3vw,40px)', fontWeight: 800, marginBottom: '12px' }}>Join Our Journey</h2>
              <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.55)', marginBottom: '36px', maxWidth: '480px', margin: '0 auto 36px' }}>
                We&rsquo;re building the future of recruitment. Be part of the revolution.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <a href="/contact" className="btn-primary" style={{ padding: '14px 28px', fontSize: '15px' }}>Get in Touch</a>
                <a href="/book-meeting" className="btn-secondary" style={{ padding: '13px 27px', fontSize: '15px' }}>📅 Book a Meeting</a>
                <a href={getAppUrl('/login')} className="btn-secondary" style={{ padding: '13px 27px', fontSize: '15px' }}>Login</a>
                <a href="/pricing" className="btn-secondary" style={{ padding: '13px 27px', fontSize: '15px' }}>Pricing</a>
              </div>
            </div>

            {/* Founders */}
            <div style={{ ...fadeIn }}>
              <h2 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '40px', textAlign: 'center' }}>Meet Our Founders</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '24px' }}>
                {[
                  { name:'Sandeep Yadav', role:'Founder / CEO / CTO', Icon:Users, color:'rgba(0,177,79,0.15)', iconColor:'#00B14F', bio:'I am a builder at heart — someone who turns vision into reality. For over 15 years, I have been designing and scaling intelligent automation systems at a leading global consulting firm, where I specialized in AI, robotics, and cognitive automation. My role was never just about strategy — it was about building: from architecting enterprise-wide automation frameworks and designing virtual assistants to reengineering processes that saved thousands of hours and millions in operational costs.\n\nNow, I\'m channelling that same builder\'s mindset into Hire-GenAI, a Voice AI platform set to redefine recruitment by focusing on the human experience. I build. I scale. I transform.' },
                  { name:'Dheeraj Yadav', role:'Co-founder & COO', Icon:Zap, color:'rgba(59,130,246,0.15)', iconColor:'#60A5FA', bio:'I\'m building the future of recruitment from the ground up. As a cofounder at Hire-GenAI, I partner with industry veteran Sandeep to turn our vision of a human-centric, voice-powered hiring platform into reality.\n\nMy journey started not in a corporate boardroom, but in a college dorm where we first prototyped the idea. I bring a fresh, user-centric perspective — the perspective of a new generation entering the workforce — to tackle the archaic challenges of recruitment. While Sandeep brings 15 years of scaling enterprise AI, I bring the relentless execution, agile learning, and digital-native insight needed to build and iterate at startup speed.' },
                  { name:'Jyoti Yadav', role:'Business Partner', Icon:MessageSquare, color:'rgba(168,85,247,0.15)', iconColor:'#C084FC', bio:'A seasoned Talent Acquisition Lead with expertise in social media recruiting, employer branding, and sourcing strategies across APAC.\n\nShe specializes in hiring technical talent across Banking, IT, Healthcare, and Retail sectors, partnering closely with business managers to drive impactful hiring outcomes. Backed by an MBA, she is passionate about process improvement, talent management, and inclusive hiring.' },
                ].map(({ name, role, Icon, color, iconColor, bio }) => (
                  <div key={name} style={{ ...darkCard, display: 'flex', flexDirection: 'column', transition: 'transform 0.2s, box-shadow 0.2s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 20px 40px rgba(0,0,0,0.3)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = '' }}
                  >
                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                      <div style={{ width: 72, height: 72, background: color, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <Icon style={{ width: 36, height: 36, color: iconColor }} />
                      </div>
                      <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '4px' }}>{name}</h3>
                      <p style={{ fontSize: '13px', color: '#00B14F', fontWeight: 600 }}>{role}</p>
                    </div>
                    {bio.split('\n\n').map((para, i) => (
                      <p key={i} style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.8, marginBottom: i < bio.split('\n\n').length - 1 ? '12px' : 0 }}>{para}</p>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Vision */}
            <div style={{ ...darkCardAlt, background: 'rgba(255,255,255,0.03)', ...fadeIn2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                <div style={{ width: 48, height: 48, background: 'rgba(6,182,212,0.15)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Brain style={{ width: 24, height: 24, color: '#06B6D4' }} />
                </div>
                <h2 style={{ fontSize: '28px', fontWeight: 800 }}>Our Vision for the Future</h2>
              </div>
              <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.8, marginBottom: '28px' }}>
                Hire-GenAI represents just the beginning of a transformative journey. We envision a future where Voice AI becomes the cornerstone of human-AI interaction across multiple domains:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '16px' }}>
                {[
                  { title:'Customer Service', desc:'Natural, empathetic conversations that understand context and emotion', icon:'🎧' },
                  { title:'Education', desc:'Personalized learning experiences with adaptive voice-based tutoring', icon:'📚' },
                  { title:'Healthcare', desc:'Compassionate virtual assistants for patient support and mental health', icon:'🏥' },
                ].map(({ title, desc, icon }) => (
                  <div key={title} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px' }}>
                    <div style={{ fontSize: '28px', marginBottom: '10px' }}>{icon}</div>
                    <h4 style={{ fontWeight: 700, fontSize: '15px', marginBottom: '8px' }}>{title}</h4>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>{desc}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      <WwwFooter />
    </div>
  )
}
