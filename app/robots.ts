import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin-hiregenai/',
          '/support-hiregenai/',
          '/owner-login/',
          '/interview/',
          '/report/',
        ],
      },
    ],
    sitemap: 'https://hire-genai.com/sitemap.xml',
    host: 'https://hire-genai.com',
  }
}
