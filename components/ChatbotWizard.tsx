'use client';
import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'bot' | 'user';
  text: string;
  navActions?: { label: string; href: string }[];
}

const QUICK_CHIPS = [
  { label: '🔍 Features', key: 'features' },
  { label: '💰 Pricing', key: 'pricing' },
  { label: '📈 ROI', key: 'roi' },
  { label: '🎬 Demo', key: 'demo' },
  { label: '🏢 About', key: 'company' },
  { label: '🚀 Free Trial', key: 'freetrial' },
  { label: '📅 Book a Meeting', key: 'meeting' },
  { label: '📩 Contact Us', key: 'contact' },
];

type ResponseKey = 'features' | 'pricing' | 'roi' | 'demo' | 'company' | 'contact' | 'freetrial' | 'meeting' | 'testimonials' | 'fallback';

const RESPONSES: Record<ResponseKey, { text: string; navActions?: { label: string; href: string }[] }> = {
  features: {
    text: 'Hire-GenAI helps you hire 10× faster with AI-powered tools:\n\n✓ Smart job posting & candidate attraction\n✓ Automated CV screening & AI scoring\n✓ AI-driven interview assessments\n✓ Real-time hiring analytics\n\nWant to see it in action?',
    navActions: [
      { label: '→ Explore Features', href: '#features' },
      { label: '🎬 View Demo', href: '#demo' },
    ],
  },
  pricing: {
    text: 'We offer 6 flexible plans to fit any team:\n\n• Starter — small teams\n• Professional — growing companies\n• Business — scaling orgs\n• Large (Popular) — established teams\n• Ultra — high-volume hiring\n• Enterprise — fully custom\n\nAll plans start with a free trial!',
    navActions: [{ label: '→ View All Plans', href: '#pricing' }],
  },
  roi: {
    text: 'Our customers see remarkable results:\n\n📉 80% reduction in time-to-hire\n💰 60% lower cost-per-hire\n📈 40% improvement in hire quality\n\nUse our ROI Calculator to see YOUR projected savings!',
    navActions: [
      { label: '→ Calculate Your ROI', href: '#roi' },
      { label: '📊 Take Assessment', href: '#assessment' },
    ],
  },
  demo: {
    text: 'Our interactive demo walks you through the full hiring workflow:\n\n1. Post jobs with AI-generated descriptions\n2. Auto-screen hundreds of CVs\n3. Run AI-powered interviews\n4. Make data-driven decisions\n\nFrom job post to offer in days, not weeks.',
    navActions: [{ label: '→ View Live Demo', href: '#demo' }],
  },
  company: {
    text: 'Hire-GenAI is trusted by 500+ companies worldwide. Built by hiring experts and AI engineers, we transform recruitment from a slow manual process into a fast AI-powered operation.',
    navActions: [
      { label: '→ About Us', href: '#company' },
      { label: '🏆 Customer Stories', href: '#testimonials' },
    ],
  },
  contact: {
    text: 'We\'d love to hear from you! Reach out to our team for any questions, support, or partnership enquiries.\n\n📧 Our team typically responds within a few hours during business days.',
    navActions: [
      { label: '📩 Send Us a Message', href: '#contact' },
      { label: '→ About Us', href: '#company' },
    ],
  },
  freetrial: {
    text: 'Start your free trial today — no credit card required!\n\n✓ Full platform access for 7 days\n✓ Unlimited job postings\n✓ AI CV screening included\n✓ Dedicated onboarding support\n\nJoin 500+ companies already hiring smarter!',
    navActions: [
      { label: '🚀 Start Free Trial', href: 'https://hire-genai.com/signup' },
      { label: '💰 View Pricing', href: '#pricing' },
    ],
  },
  meeting: {
    text: 'Book a personalised 30-minute demo with one of our hiring experts.\n\nWe\'ll walk you through:\n• The full AI hiring workflow\n• ROI projections for your team\n• Custom pricing & enterprise options\n\nPick a time that works for you!',
    navActions: [
      { label: '📅 Book Your Free Demo', href: '#book-meeting' },
      { label: '🎬 View Live Demo First', href: '#demo' },
    ],
  },
  testimonials: {
    text: 'Don\'t just take our word for it! Our customers love Hire-GenAI:\n\n"Cut time-to-hire from 6 weeks to 4 days!"\n"80% reduction in CV screening time"\n"Found our best hire yet via the AI assessment"\n\nSee all customer stories below.',
    navActions: [{ label: '→ Read Testimonials', href: '#testimonials' }],
  },
  fallback: {
    text: 'Great question! I can help you with information about Hire-GenAI. Here are some popular topics:',
    navActions: [
      { label: '🔍 Features', href: '#features' },
      { label: '💰 Pricing', href: '#pricing' },
      { label: '📈 ROI', href: '#roi' },
      { label: '🎬 Demo', href: '#demo' },
    ],
  },
};

function classify(text: string): ResponseKey {
  const t = text.toLowerCase();
  if (/book|meeting|schedule|calendar|call|appointment|talk to|speak/.test(t)) return 'meeting';
  if (/free trial|try|sign.?up|get started|begin|no credit/.test(t)) return 'freetrial';
  if (/contact|reach out|email|enquir|inquiry|support|help desk/.test(t)) return 'contact';
  if (/price|pricing|plan|cost|subscri|pay|cheap|expensive|how much/.test(t)) return 'pricing';
  if (/roi|return|invest|saving|cost.reduc|benefit|money|value|calculat/.test(t)) return 'roi';
  if (/demo|see.*work|how.*work|watch|video|show me|walkthrough/.test(t)) return 'demo';
  if (/feature|product|screen|interview|cv|resume|job post|hire|recruit|assess|attract/.test(t)) return 'features';
  if (/testimonial|review|customer|case study|success story/.test(t)) return 'testimonials';
  if (/company|about|who are|who you|founded|mission|sales|team/.test(t)) return 'company';
  return 'fallback';
}

const WELCOME: Message = {
  role: 'bot',
  text: "Hi! 👋 I'm your Hire-GenAI assistant.\n\nI can help you explore the platform, answer questions about pricing, ROI, and more. Here are some popular options to get you started:",
  navActions: [
    { label: '📈 ROI Calculator', href: '#roi' },
    { label: '💰 View Pricing', href: '#pricing' },
    { label: '🎬 Live Demo', href: '#demo' },
    { label: '🔍 Features', href: '#features' },
    { label: '📅 Book a Meeting', href: '#book-meeting' },
    { label: '📩 Contact Us', href: '#contact' },
  ],
};

export default function ChatbotWizard() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const addBotResponse = (key: ResponseKey) => {
    const resp = RESPONSES[key];
    setMessages(prev => [...prev, { role: 'bot', ...resp }]);
  };

  const handleChip = (key: string) => {
    const chip = QUICK_CHIPS.find(c => c.key === key);
    if (!chip) return;
    setMessages(prev => [...prev, { role: 'user', text: chip.label }]);
    addBotResponse(key as ResponseKey);
  };

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setMessages(prev => [...prev, { role: 'user', text: trimmed }]);
    addBotResponse(classify(trimmed));
    setInput('');
  };

  const handleNavClick = () => setOpen(false);

  return (
    <>
      {open && (
        <div className="chatbot-window" role="dialog" aria-label="Hire-GenAI Chat Assistant">
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <div className="chatbot-avatar">🤖</div>
              <div>
                <div className="chatbot-name">Hire-GenAI Assistant</div>
                <div className="chatbot-status">● Online</div>
              </div>
            </div>
            <button className="chatbot-close" onClick={() => setOpen(false)} aria-label="Close chat">✕</button>
          </div>

          <div className="chatbot-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chatbot-msg ${msg.role}`}>
                <div className="chatbot-bubble">
                  {msg.text.split('\n').map((line, j) => (
                    <span key={j}>{line}{j < msg.text.split('\n').length - 1 && <br />}</span>
                  ))}
                </div>
                {msg.navActions && (
                  <div className="chatbot-nav-actions">
                    {msg.navActions.map((action, j) => (
                      <a
                        key={j}
                        href={action.href}
                        className="chatbot-nav-btn"
                        onClick={handleNavClick}
                        target={action.href.startsWith('http') ? '_blank' : undefined}
                        rel={action.href.startsWith('http') ? 'noopener' : undefined}
                      >
                        {action.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="chatbot-chips" aria-label="Quick questions">
            {QUICK_CHIPS.map(chip => (
              <button key={chip.key} className="chatbot-chip" onClick={() => handleChip(chip.key)}>
                {chip.label}
              </button>
            ))}
          </div>

          <div className="chatbot-input-row">
            <input
              className="chatbot-input"
              placeholder="Ask me anything..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              aria-label="Type your question"
            />
            <button className="chatbot-send-btn" onClick={handleSend} aria-label="Send message">→</button>
          </div>
        </div>
      )}

      <button
        className={`chatbot-toggle${open ? ' open' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close chat' : 'Open chat assistant'}
        title="Chat with us"
      >
        <span className="chatbot-toggle-icon">{open ? '✕' : '💬'}</span>
        {!open && <span className="chatbot-pulse" />}
      </button>
    </>
  );
}
