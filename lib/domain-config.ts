// Domain configuration helper
export function getDomainConfig() {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
  
  // For production deployment
  if (hostname.includes('hire-genai.com')) {
    return {
      wwwDomain: 'www.hire-genai.com',
      appDomain: 'app.hire-genai.com'
    }
  }
  
  // For local development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return {
      wwwDomain: 'localhost:3000',
      appDomain: 'localhost:3000' // Same for local dev
    }
  }
  
  // For Vercel deployments - use same domain for both
  if (hostname.includes('vercel.app') || hostname.includes('vercel.com')) {
    return {
      wwwDomain: hostname,
      appDomain: hostname
    }
  }
  
  // For other domains (custom deployment)
  const baseDomain = hostname.replace(/^(www|app)\./, '')
  return {
    wwwDomain: `www.${baseDomain}`,
    appDomain: `app.${baseDomain}`
  }
}

export function getAppUrl(path: string = '') {
  // Server-side: use relative path to avoid hydration mismatch
  if (typeof window === 'undefined') {
    return path || '/'
  }
  // Local dev or Vercel: use relative paths (same origin)
  if (window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.includes('vercel.app') ||
      window.location.hostname.includes('vercel.com')) {
    return path || '/'
  }
  // Production: use full URL with app subdomain
  const { appDomain } = getDomainConfig()
  return `${window.location.protocol}//${appDomain}${path}`
}

export function getWwwUrl(path: string = '') {
  // Server-side: use relative path to avoid hydration mismatch
  if (typeof window === 'undefined') {
    return path || '/'
  }
  // Local dev or Vercel: use relative paths (same origin)
  if (window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.includes('vercel.app') ||
      window.location.hostname.includes('vercel.com')) {
    return path || '/'
  }
  // Production: use full URL with www subdomain
  const { wwwDomain } = getDomainConfig()
  return `${window.location.protocol}//${wwwDomain}${path}`
}
