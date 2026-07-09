import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/toaster'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });

export const metadata: Metadata = {
  metadataBase: new URL('https://hire-genai.com'),
  title: {
    default: 'HireGenAI - AI-Powered Recruitment',
    template: '%s | HireGenAI',
  },
  description: 'Hire 10x faster with AI. HireGenAI automates CV screening, AI video interviews, and candidate scoring — so your team focuses on what matters most.',
  keywords: ['AI recruitment', 'AI hiring', 'CV screening', 'video interviews', 'ATS', 'applicant tracking', 'recruiting software'],
  authors: [{ name: 'HireGenAI' }],
  creator: 'HireGenAI',
  publisher: 'HireGenAI',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/icon-light-32x32.png', sizes: '32x32', type: 'image/png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png',  sizes: '32x32', type: 'image/png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.ico',
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  manifest: '/manifest.webmanifest',
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
  twitter: {
    card: 'summary_large_image',
    site: '@hiregenai',
    creator: '@hiregenai',
    title: 'HireGenAI - Hire Smarter. 10× Faster with AI.',
    description: 'Transform your recruitment pipeline with generative AI that screens, scores, and schedules.',
    images: ['/og-image.png'],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased">
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
