import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'HireGenAI - AI-Powered Recruitment',
  description: 'AI-powered recruitment platform that pre-screens and interviews candidates',
}

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <>{children}</>
}
