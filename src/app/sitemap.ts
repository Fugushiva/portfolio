import type { MetadataRoute } from 'next'

const BASE_URL = 'https://jeromedelodder.com'

// Use today's date for lastModified — update manually after content changes.
// A fixed date prevents crawlers from re-crawling on every request.
const lastModified = new Date('2025-04-30')

// hreflang alternates shared by every URL entry.
// x-default points to the French version (primary market).
const hreflangAlternates = {
  languages: {
    'fr': `${BASE_URL}/fr`,
    'en': `${BASE_URL}/en`,
    'x-default': `${BASE_URL}/fr`,
  },
}

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    // Root URL — next-intl redirects / → /fr, but Google still crawls it.
    // Including it ensures crawlers discover the canonical entry point.
    {
      url: BASE_URL,
      lastModified,
      changeFrequency: 'monthly',
      priority: 1,
      alternates: hreflangAlternates,
    },
    // French version — primary locale, highest priority
    {
      url: `${BASE_URL}/fr`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 1,
      alternates: hreflangAlternates,
    },
    // English version — secondary locale
    {
      url: `${BASE_URL}/en`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.9,
      alternates: hreflangAlternates,
    },
  ]
}
