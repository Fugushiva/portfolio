import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { notFound } from 'next/navigation'
import { getMessages, getTranslations } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import '../globals.css'

// display:swap → no FOIT, content paints as soon as possible.
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

  return {
    title: t('title'),
    description: t('description'),
    keywords: ['Prompt Engineer', 'Fullstack Developer', 'n8n', 'Automation', 'Next.js', 'AI'],
    authors: [{ name: 'Jérôme Delodder' }],
    icons: {
      icon: [
        { url: '/favicon.svg', type: 'image/svg+xml' },
      ],
      apple: '/favicon.svg',
    },
    openGraph: {
      type: 'website',
      locale: t('ogLocale'),
      title: t('title'),
      description: t('description'),
      siteName: 'Jérôme Delodder',
      images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
      images: ['/opengraph-image'],
    },
    robots: { index: true, follow: true },
    alternates: {
      canonical: `/${locale}`,
      languages: {
        fr: '/fr',
        en: '/en',
      },
    },
  }
}

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  colorScheme: 'dark',
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

  return (
    // No "scroll-smooth" — Lenis handles smooth scrolling, two engines fight.
    <html lang={locale}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-bg text-foreground`}
      >
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
