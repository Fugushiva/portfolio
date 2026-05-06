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

  webpack(config, { isServer, nextRuntime }) {
    // The Edge Runtime (middleware) forbids eval() — which webpack's default
    // devtool `eval-source-map` uses for source maps in development.
    // Switch to `cheap-module-source-map` for Edge chunks: same line-level
    // accuracy, no eval(), middleware works in both dev and prod.
    if (nextRuntime === 'edge') {
      config.devtool = 'cheap-module-source-map'
    }

    // Resend imports @react-email/render as an optional peer dep for HTML emails.
    // We only send text/plain — stub the module to silence the build warning.
    if (isServer) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const externals = config.externals as any
      config.externals = [
        ...(Array.isArray(externals) ? externals : externals ? [externals] : []),
        ({ request }: { request?: string }, callback: (err?: Error | null, result?: string) => void) => {
          if (request === '@react-email/render') {
            return callback(null, 'commonjs @react-email/render')
          }
          callback()
        },
      ]
    }

    return config
  },

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
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com", // unsafe-eval: Next.js dev; challenges.cloudflare.com: Turnstile widget
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' https://challenges.cloudflare.com", // Turnstile siteverify is server-side; widget may ping CF
              "frame-src https://challenges.cloudflare.com", // Turnstile renders in an iframe
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
