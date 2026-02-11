import { NextRequest, NextResponse } from 'next/server'
import { getAppUrl } from '@/lib/domain-config'

// Marketing routes allowed on www.domain.com
const WWW_ROUTES = new Set([
  '/',
  '/home',
  '/pricing',
  '/about',
  '/contact',
  '/terms',
  '/privacy',
  '/demo-en',
  '/roi',
  '/questionnaire-results',
  '/demo-report',
])

// Application routes allowed on app.domain.com (flat, root-level only)
const APP_ROUTES = new Set([
  '/login',
  '/signup',
  '/dashboard',
  '/candidate',
  '/jobs',
  '/talent-pool',
  '/messages',
  '/delegation',
  '/support',
  '/settings',
])

// API routes are only allowed on app.domain.com
const API_PREFIX = '/api'

function getSubdomain(host: string): 'www' | 'app' | 'local' {
  // Remove port if present
  const hostname = host.split(':')[0]

  // Local development: treat as combined (both routes accessible)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'local'
  }

  // Extract subdomain from hostname
  const parts = hostname.split('.')
  if (parts.length >= 3) {
    const sub = parts[0]
    if (sub === 'app') return 'app'
    if (sub === 'www') return 'www'
  }

  // Bare domain (domain.com without subdomain) → treat as www
  return 'www'
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') || ''
  const subdomain = getSubdomain(host)
  const { pathname } = request.nextUrl

  // Allow static assets, _next, and favicon
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // files with extensions (images, fonts, etc.)
  ) {
    return NextResponse.next()
  }

  // Block any nested dashboard routes (e.g., /dashboard/candidates, /dashboard/*)
  if (pathname.startsWith('/dashboard/')) {
    return NextResponse.rewrite(new URL('/not-found', request.url), { status: 404 })
  }

  // Local development: allow all routes (both www and app)
  if (subdomain === 'local') {
    return NextResponse.next()
  }

  // --- WWW subdomain enforcement ---
  if (subdomain === 'www') {
    // Block API routes on www
    if (pathname.startsWith(API_PREFIX)) {
      return NextResponse.rewrite(new URL('/not-found', request.url), { status: 404 })
    }

    // Block application routes on www
    if (APP_ROUTES.has(pathname)) {
      // Redirect login/signup to app subdomain
      if (pathname === '/login' || pathname === '/signup') {
        const appUrl = new URL(request.url)
        const hostname = appUrl.hostname
        const baseDomain = hostname.replace(/^www\./, '')
        appUrl.hostname = `app.${baseDomain}`
        return NextResponse.redirect(appUrl)
      }
      return NextResponse.rewrite(new URL('/not-found', request.url), { status: 404 })
    }

    return NextResponse.next()
  }

  // --- APP subdomain enforcement ---
  if (subdomain === 'app') {
    // Allow API routes on app
    if (pathname.startsWith(API_PREFIX)) {
      return NextResponse.next()
    }

    // Block marketing routes on app
    if (WWW_ROUTES.has(pathname) && pathname !== '/') {
      // Redirect marketing pages to www subdomain
      const wwwUrl = new URL(request.url)
      const hostname = wwwUrl.hostname
      const baseDomain = hostname.replace(/^app\./, '')
      wwwUrl.hostname = `www.${baseDomain}`
      return NextResponse.redirect(wwwUrl)
    }

    // Root path on app subdomain → redirect to /dashboard
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Allow only known app routes
    if (!APP_ROUTES.has(pathname)) {
      return NextResponse.rewrite(new URL('/not-found', request.url), { status: 404 })
    }

    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match all paths except static files and _next
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
