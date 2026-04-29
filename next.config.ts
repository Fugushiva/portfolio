import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const config: NextConfig = {
  reactStrictMode: true,

  // Strip console.* in prod (keeps error/warn) — small but every byte matters.
  compiler: {
    removeConsole: { exclude: ['error', 'warn'] },
  },

  // Ship modern JS — avoids the polyfills.js bundle for evergreen browsers.
  // (Next 15 picks this up via .browserslistrc / package.json#browserslist.)
  // Tailwind is fine with it.

  experimental: {
    // Tree-shake big libraries: only the icons / motion components we
    // actually use end up in the bundle. Massive win for framer-motion
    // and lucide-style libs without code changes.
    optimizePackageImports: [
      'framer-motion',
      'next-intl',
      'lenis',
      'gsap',
    ],
    // Faster dev / smaller server payload for next-intl messages.
    serverActions: { bodySizeLimit: '2mb' },
  },

  images: {
    formats: ['image/avif', 'image/webp'],
    // Reasonable device + image sizes — avoid generating 9 useless variants.
    deviceSizes: [640, 750, 828, 1080, 1280, 1536, 1920],
    imageSizes: [16, 32, 64, 96, 128, 256, 384],
    // Cache aggressively — images are content-hashed via path.
    minimumCacheTTL: 60 * 60 * 24 * 365,
  },

  // Tighter prod build.
  productionBrowserSourceMaps: false,

  // HTTP-level perf: long-lived caching for static assets, security headers
  // pinned cheaply so they don't fight perf.
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|jpeg|png|webp|avif|gif|ico|woff2?)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },
}

export default withNextIntl(config)
