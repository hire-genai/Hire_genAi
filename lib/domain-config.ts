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
  
  // For other domains (custom deployment)
  const baseDomain = hostname.replace(/^(www|app)\./, '')
  return {
    wwwDomain: `www.${baseDomain}`,
    appDomain: `app.${baseDomain}`
  }
}

export function getAppUrl(path: string = '') {
  const { appDomain } = getDomainConfig()
  const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http'
  return `${protocol}//${appDomain}${path}`
}

export function getWwwUrl(path: string = '') {
  const { wwwDomain } = getDomainConfig()
  const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http'
  return `${protocol}//${wwwDomain}${path}`
}
