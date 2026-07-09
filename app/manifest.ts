import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'HireGenAI - AI-Powered Recruitment',
    short_name: 'HireGenAI',
    description: 'Hire 10x faster with AI. Automate CV screening, AI video interviews, and candidate scoring.',
    start_url: '/',
    display: 'standalone',
    background_color: '#03110A',
    theme_color: '#00B14F',
    icons: [
      { src: '/icon-light-32x32.png', sizes: '32x32', type: 'image/png' },
      { src: '/apple-icon.png',       sizes: '180x180', type: 'image/png' },
      { src: '/icon.svg',             sizes: 'any',     type: 'image/svg+xml', purpose: 'any maskable' },
    ],
  }
}
