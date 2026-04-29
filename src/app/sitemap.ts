import type { MetadataRoute } from 'next'

const BASE_URL = 'https://jerome-delodder.com'

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  return [
    {
      url: BASE_URL,
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
      url: `${BASE_URL}/fr`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: `${BASE_URL}/en`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
  ]
}
