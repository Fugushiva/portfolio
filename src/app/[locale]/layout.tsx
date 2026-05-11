import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { notFound } from 'next/navigation'
import { getMessages, getTranslations } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import JsonLd from '@/components/JsonLd'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import '../globals.css'

const BASE_URL = 'https://jeromedelodder.com'

// display:swap → no FOIT, content paints as soon as possible.
// metadataBase is set below in the metadata export so Next.js resolves
// relative OG/Twitter image URLs correctly.
// adjustFontFallback (default: true) injects a metric-matched fallback
// to minimize CLS while the real font streams.
const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
  preload: true,
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
  preload: false, // mono only used in small UI labels — don't block paint
})

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'metadata' })

  const isFr = locale === 'fr'

  // Keyword sets tuned for European freelance market 2025.
  // FR: focus on intent "développeur freelance", "prompt engineer freelance", "automatisation n8n"
  // EN: focus on "freelance developer Europe", "AI developer", "n8n automation developer"
  const keywordsFr = [
    'développeur freelance',
    'développeur fullstack freelance',
    'prompt engineer freelance',
    'automatisation n8n',
    'développeur Next.js',
    'développeur React freelance',
    'agent IA développement',
    'développeur AI freelance France',
    'développeur TypeScript',
    'automatisation workflow',
    'LLM orchestration',
    'développeur remote Europe',
    'mission freelance développeur',
    'SaaS développement freelance',
  ]

  const keywordsEn = [
    'freelance developer Europe',
    'freelance fullstack developer',
    'prompt engineer freelance',
    'n8n automation developer',
    'Next.js developer for hire',
    'AI developer freelance',
    'React developer Europe',
    'TypeScript developer remote',
    'LLM orchestration developer',
    'AI automation engineer',
    'hire developer Europe',
    'SaaS developer freelance',
    'workflow automation specialist',
    'remote developer France',
  ]

  const canonicalUrl = `${BASE_URL}/${locale}`

  return {
    // metadataBase: required for Next.js to resolve relative OG / Twitter image URLs
    metadataBase: new URL(BASE_URL),

    // Optimized title: brand + primary keyword (55–60 chars)
    title: t('title'),
    // Meta description: 145–160 chars, includes primary keywords + CTA
    description: t('description'),
    keywords: isFr ? keywordsFr : keywordsEn,
    authors: [{ name: 'Jerome Delodder', url: BASE_URL }],

    // Canonical: absolute URL — critical to avoid duplicate content penalty
    // (fr vs en versions would otherwise compete against each other)
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'fr': `${BASE_URL}/fr`,
        'en': `${BASE_URL}/en`,
        'x-default': `${BASE_URL}/fr`,
      },
    },

    // Open Graph — used by LinkedIn, Facebook, Slack link previews
    openGraph: {
      type: 'website',
      url: canonicalUrl,
      locale: t('ogLocale'),
      alternateLocale: isFr ? 'en_US' : 'fr_FR',
      title: t('title'),
      description: t('description'),
      siteName: 'Jerome Delodder',
      images: [
        {
          url: `${BASE_URL}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: 'Jerome Delodder — Freelance Fullstack Developer & Prompt Engineer',
          type: 'image/png',
        },
      ],
    },

    // Twitter / X Card
    twitter: {
      card: 'summary_large_image',
      site: '@jerome_delodder',
      creator: '@jerome_delodder',
      title: t('title'),
      description: t('description'),
      images: [
        {
          url: `${BASE_URL}/opengraph-image`,
          alt: 'Jerome Delodder — Freelance Fullstack Developer & Prompt Engineer',
        },
      ],
    },

    // Favicons
    icons: {
      icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
      apple: '/favicon.svg',
    },

    // Robots: allow full indexing & link-following
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },

    // Verification tags — fill in when you have Search Console / Bing access
    // verification: {
    //   google: 'YOUR_GOOGLE_VERIFICATION_CODE',
    //   yandex: 'YOUR_YANDEX_CODE', // Yandex is big in Eastern Europe
    //   bing: 'YOUR_BING_CODE',
    // },

    // Misc metadata
    category: 'technology',
    creator: 'Jerome Delodder',
    publisher: 'Jerome Delodder',
    referrer: 'origin-when-cross-origin',
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
  }
}

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  const messages = await getMessages()
  const typedLocale = locale as 'fr' | 'en'

  return (
    // No "scroll-smooth" — Lenis handles smooth scrolling, two engines fight.
    <html lang={locale}>
      <head>
        {/* JSON-LD structured data — injected server-side, zero JS cost */}
        <JsonLd locale={typedLocale} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-bg text-foreground`}
      >
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
