import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const config: NextConfig = {
  reactStrictMode: true,

  // Strip console.* in prod (keeps error/warn) — small but every byte matters.
  compiler: {
    removeConsole: { exclude: ['error', 'warn'] },
  },

  experimental: {
    // Tree-shake big libraries: only the icons / motion components we
    // actually use end up in the bundle.
    optimizePackageImports: [
      'framer-motion',
      'next-intl',
      'lenis',
      'gsap',
    ],
    serverActions: { bodySizeLimit: '2mb' },
  },

  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1280, 1536, 1920],
    imageSizes: [16, 32, 64, 96, 128, 256, 384],
    // Cache aggressively — images are content-hashed via path.
    minimumCacheTTL: 60 * 60 * 24 * 365,
  },

  productionBrowserSourceMaps: false,

  async headers() {
    return [
      // ── Static asset cache ─────────────────────────────────────
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

      // ── Security + SEO headers (all routes) ────────────────────
      // These improve Google's trust signals (HTTPS enforcement,
      // clickjacking prevention) and are now part of Core Web Vitals
      // best-practices audits via Lighthouse.
      {
        source: '/:path*',
        headers: [
          // Prevent MIME-sniffing — security + signals to Google bot
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Prevent clickjacking
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Referrer policy — privacy-safe, passes origin on same-origin
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Permissions policy — minimal surface
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          // HSTS — enforce HTTPS, improves trust + avoids HTTP crawl
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          // CSP — strict but compatible with Next.js inline styles / scripts
          // Adjust if you add 3rd-party embeds.
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js needs unsafe-eval in dev; tighten in prod if desired
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              "connect-src 'self'",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ]
  },

  // next-intl middleware already redirects / → /fr (defaultLocale).
  // No explicit redirect needed here — avoids double-redirect chain.
}

export default withNextIntl(config)
