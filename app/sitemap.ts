import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://hire-genai.com'
  const now = new Date()

  return [
    { url: base,               lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${base}/pricing`,  lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/about`,    lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/roi`,      lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/contact`,  lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/privacy`,  lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${base}/terms`,    lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
  ]
}
