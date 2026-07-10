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
      { src: '/icon',       sizes: '32x32',   type: 'image/png' },
      { src: '/apple-icon', sizes: '180x180',  type: 'image/png' },
    ],
  }
}
