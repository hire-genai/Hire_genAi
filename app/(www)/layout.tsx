import type { Metadata } from 'next'

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'HireGenAI - AI-Powered Recruitment',
  description: 'AI-powered recruitment platform that pre-screens and interviews candidates',
}

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <div className="dark w-full overflow-x-hidden bg-[#03110A] text-[#F8FAFC]">{children}</div>
}
