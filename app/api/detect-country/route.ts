import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function detectCountryFromIP(ip: string): Promise<string> {
  // Try multiple geolocation services for better accuracy
  
  // Method 1: ipapi.co
  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: { 'User-Agent': 'HireGenAI' },
      signal: AbortSignal.timeout(3000)
    })
    if (res.ok) {
      const data = await res.json()
      const country = data.country_code || data.country
      console.log('[Detect Country] ipapi.co result:', country)
      return country || 'US'
    }
  } catch (err: any) {
    console.warn('[Detect Country] ipapi.co failed:', err?.message)
  }

  // Method 2: ip-api.com (more reliable for India)
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}`, {
      signal: AbortSignal.timeout(3000)
    })
    if (res.ok) {
      const data = await res.json()
      const country = data.countryCode
      console.log('[Detect Country] ip-api.com result:', country)
      return country || 'US'
    }
  } catch (err: any) {
    console.warn('[Detect Country] ip-api.com failed:', err?.message)
  }

  // Method 3: ipinfo.io
  try {
    const res = await fetch(`https://ipinfo.io/${ip}/json`, {
      headers: { 'User-Agent': 'HireGenAI' },
      signal: AbortSignal.timeout(3000)
    })
    if (res.ok) {
      const data = await res.json()
      const country = data.country
      console.log('[Detect Country] ipinfo.io result:', country)
      return country || 'US'
    }
  } catch (err: any) {
    console.warn('[Detect Country] ipinfo.io failed:', err?.message)
  }

  return 'US'
}

export async function GET(request: NextRequest) {
  try {
    // Method 1: Vercel built-in country header (most reliable)
    const vercelCountry = request.headers.get('x-vercel-ip-country')
    if (vercelCountry) {
      console.log('[Detect Country] Vercel header:', vercelCountry)
      return NextResponse.json({
        ok: true,
        countryCode: vercelCountry,
        country: '',
        city: '',
      })
    }

    // Method 2: Get IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
               request.headers.get('x-real-ip') ||
               '0.0.0.0'

    console.log('[Detect Country] Client IP:', ip)

    // Check localhost/development
    const isLocalhost = ip === '::1' || ip === '127.0.0.1' || ip === 'localhost' || ip === '0.0.0.0'

    if (isLocalhost) {
      const manualCountry = request.headers.get('x-force-country')
      if (manualCountry === 'IN' || manualCountry === 'INTERNATIONAL') {
        console.log('[Detect Country] Manual override:', manualCountry)
        return NextResponse.json({ ok: true, countryCode: manualCountry, country: '', city: '' })
      }
      console.log('[Detect Country] Defaulting to India for development')
      return NextResponse.json({ ok: true, countryCode: 'IN', country: 'India', city: '' })
    }

    // Method 3: External API fallback
    const countryCode = await detectCountryFromIP(ip)
    console.log('[Detect Country] Final detected:', countryCode)
    return NextResponse.json({ ok: true, countryCode, country: '', city: '' })

  } catch (err: any) {
    console.warn('[Detect Country] Error:', err?.message)
    return NextResponse.json({ ok: true, countryCode: 'US', country: 'United States', city: '' })
  }
}
