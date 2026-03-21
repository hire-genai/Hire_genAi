/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Force build to complete faster
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
  // Skip static optimization for faster builds
  experimental: {
    optimizeCss: false,
    optimizePackageImports: [],
  },
  // Minimal config to prevent hanging
  webpack: (config, { isServer }) => {
    // Add fallbacks for Node.js modules that cause warnings
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      encoding: false,
    }
    return config
  },
}

export default nextConfig
