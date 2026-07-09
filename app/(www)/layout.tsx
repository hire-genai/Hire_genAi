import type { Metadata } from 'next'
import ChatbotWizard from '@/components/ChatbotWizard'

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: {
    default: 'HireGenAI - AI-Powered Recruitment',
    template: '%s | HireGenAI',
  },
  description: 'Hire 10x faster with AI. HireGenAI automates CV screening, AI video interviews, and candidate scoring — so your team focuses on what matters most.',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://hire-genai.com',
    siteName: 'HireGenAI',
    title: 'HireGenAI - Hire Smarter. 10× Faster with AI.',
    description: 'Transform your recruitment pipeline with generative AI that screens, scores, and schedules — so your team focuses on what matters most.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'HireGenAI - AI-Powered Recruitment Platform',
      },
    ],
  },
}

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="dark w-full overflow-x-hidden bg-[#03110A] text-[#F8FAFC]">
      {children}
      <ChatbotWizard />
    </div>
  )
}
