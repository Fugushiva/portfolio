import type { MetadataRoute } from 'next'

const BASE_URL = 'https://jerome-delodder.com'

// Fixed date avoids regenerating sitemap on every request (better for crawlers)
const lastModified = new Date('2025-04-29')

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${BASE_URL}/fr`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 1,
      alternates: {
        languages: {
          fr: `${BASE_URL}/fr`,
          en: `${BASE_URL}/en`,
        },
      },
    },
    {
      url: `${BASE_URL}/en`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.9,
      alternates: {
        languages: {
          fr: `${BASE_URL}/fr`,
          en: `${BASE_URL}/en`,
        },
      },
    },
  ]
}
