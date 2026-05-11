/**
 * JsonLd -- injects structured data (JSON-LD) into <head>.
 *
 * Schemas:
 *  - Person (identity branding, knowledge panel)
 *  - WebSite
 *  - FAQPage (People Also Ask rich results)
 *  - BreadcrumbList
 */

const BASE_URL = 'https://jeromedelodder.com'

interface JsonLdProps {
  locale: 'fr' | 'en'
}

// Helpers to avoid TypeScript choking on curly apostrophes inside strings
const d = "\u2019" // right single quotation mark (apostrophe typographique)

export default function JsonLd({ locale }: JsonLdProps) {
  const isFr = locale === 'fr'

  /* ── Person ──────────────────────────────────────────────────── */
  const person = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${BASE_URL}/#person`,
    name: 'Jerome Delodder',
    url: BASE_URL,
    image: {
      '@type': 'ImageObject',
      url: `${BASE_URL}/opengraph-image`,
      width: 1200,
      height: 630,
    },
    jobTitle: isFr
      ? 'Developpeur Fullstack & Prompt Engineer Freelance'
      : 'Freelance Fullstack Developer & Prompt Engineer',
    description: isFr
      ? `Developpeur Fullstack freelance specialise en prompt engineering, automatisation n8n et applications Next.js. Disponible en remote pour des missions en Europe.`
      : `Freelance Fullstack Developer specialized in prompt engineering, n8n automation, and Next.js applications. Available remotely for projects across Europe.`,
    knowsAbout: [
      'Prompt Engineering',
      'Next.js',
      'TypeScript',
      'n8n Automation',
      'AI Agents',
      'Fullstack Development',
      'React',
      'Supabase',
      'PostgreSQL',
      'SaaS Development',
      'LLM Orchestration',
    ],
    knowsLanguage: [
      { '@type': 'Language', name: 'French' },
      { '@type': 'Language', name: 'English' },
    ],
    sameAs: [
      'https://www.linkedin.com/in/jerome-delodder-a12b8a1b1',
      'https://github.com/jerome-delodder',
    ],
    worksFor: {
      '@type': 'Organization',
      name: 'Freelance',
    },
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'FR',
      addressRegion: 'Europe',
    },
  }

  /* ── WebSite ─────────────────────────────────────────────────── */
  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${BASE_URL}/#website`,
    url: BASE_URL,
    name: 'Jerome Delodder',
    description: isFr
      ? `Portfolio de Jerome Delodder -- Developpeur Fullstack Freelance & Prompt Engineer`
      : `Portfolio of Jerome Delodder -- Freelance Fullstack Developer & Prompt Engineer`,
    inLanguage: isFr ? 'fr-FR' : 'en-US',
    author: { '@id': `${BASE_URL}/#person` },
    publisher: { '@id': `${BASE_URL}/#person` },
  }

  /* ── FAQ (FR) ────────────────────────────────────────────────── */
  const faqFr = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Quels services propose Jerome Delodder en freelance ?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Jerome Delodder propose des services de developpement fullstack (Next.js, React, TypeScript, Supabase), de prompt engineering et conception d${d}agents IA, et d${d}automatisation de workflows via n8n. Disponible en remote pour des missions en Europe.`,
        },
      },
      {
        '@type': 'Question',
        name: 'Jerome Delodder est-il disponible pour des missions freelance ?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Oui, Jerome Delodder est disponible pour des missions freelance en remote. Il accepte des projets de developpement web, d${d}automatisation IA et de prompt engineering pour des clients en France et en Europe.`,
        },
      },
      {
        '@type': 'Question',
        name: 'Quelle est la specialite de Jerome Delodder en tant que developpeur ?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Jerome Delodder est specialise en prompt engineering, LLM orchestration, automatisation n8n et developpement d${d}applications SaaS avec Next.js 15, React 19 et TypeScript. Il livre des projets jusqu${d}a 10x plus vite grace a Claude.`,
        },
      },
      {
        '@type': 'Question',
        name: 'Comment contacter Jerome Delodder pour un projet ?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Contactez Jerome Delodder via le formulaire sur son portfolio ou par email. Il repond sous 24h et est disponible en remote sur toute l${d}Europe.`,
        },
      },
    ],
  }

  /* ── FAQ (EN) ────────────────────────────────────────────────── */
  const faqEn = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What freelance services does Jerome Delodder offer?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Jerome Delodder offers fullstack development (Next.js, React, TypeScript, Supabase), prompt engineering and AI agent design, and workflow automation via n8n. Available remotely for projects across Europe.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is Jerome Delodder available for freelance projects?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, Jerome Delodder is available for remote freelance missions. He accepts web development, AI automation, and prompt engineering projects for clients in France and across Europe.',
        },
      },
      {
        '@type': 'Question',
        name: 'What is Jerome Delodder\'s developer specialty?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Jerome Delodder specializes in prompt engineering, LLM orchestration, n8n automation, and SaaS development with Next.js 15, React 19, and TypeScript. He uses Claude as a permanent co-pilot to deliver projects up to 10x faster.',
        },
      },
      {
        '@type': 'Question',
        name: 'How can I contact Jerome Delodder for a project?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Contact Jerome Delodder via the contact form on his portfolio or by email. He typically responds within 24 hours and is open to remote missions across Europe.',
        },
      },
    ],
  }

  /* ── BreadcrumbList ──────────────────────────────────────────── */
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: isFr ? 'Accueil' : 'Home',
        item: `${BASE_URL}/${locale}`,
      },
    ],
  }

  const faq = isFr ? faqFr : faqEn

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(person) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
    </>
  )
}
