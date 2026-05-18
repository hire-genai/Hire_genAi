/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Empty turbopack config to silence the warning
  turbopack: {},
  // Keep PDF/DOCX parsing libs out of the server bundle so they resolve
  // their own internal files at runtime on Vercel (otherwise pdf-parse's
  // internals get bundled incorrectly and fail with fs lookups).
  serverExternalPackages: ['pdf-parse', 'mammoth', 'puppeteer-core', '@sparticuz/chromium'],
  // ── Vercel bundling fix for @sparticuz/chromium ─────────────────────────
  // The brotli-compressed Chromium binary (.br files in /bin) is read with
  // fs.readFileSync at runtime, NOT via require(). Vercel's file tracer only
  // follows static require/import graphs, so without this hint those .br
  // files are dropped from the function bundle and `chromium.executablePath()`
  // throws: "/var/task/node_modules/@sparticuz/chromium/bin does not exist".
  // Forcing the trace to include the whole package keeps the binary alive.
  // ───────────────────────────────────────────────────────────────────────
  outputFileTracingIncludes: {
    '/api/invoice/generate-pdf': [
      './node_modules/@sparticuz/chromium/**/*',
    ],
  },
  // Experimental: disable static generation
  experimental: {
    // PPR (Partial Prerendering) disabled
    ppr: false,
  },
  // Webpack fallbacks for client-side modules
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      encoding: false,
      net: false,
      tls: false,
    }
    return config
  },
}

export default nextConfig
