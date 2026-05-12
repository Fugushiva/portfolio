import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import PrivacyPolicy from '@/components/PrivacyPolicy'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'privacyPolicy' })

  const BASE_URL = 'https://jeromedelodder.com'
  const canonicalUrl = `${BASE_URL}/${locale}/privacy-policy`

  return {
    metadataBase: new URL(BASE_URL),
    title: t('meta_title'),
    description: t('meta_description'),
    alternates: {
      canonical: canonicalUrl,
      languages: {
        fr: `${BASE_URL}/fr/privacy-policy`,
        en: `${BASE_URL}/en/privacy-policy`,
        'x-default': `${BASE_URL}/fr/privacy-policy`,
      },
    },
    robots: {
      index: true,
      follow: true,
    },
  }
}

export default function PrivacyPolicyPage() {
  return <PrivacyPolicy />
}
