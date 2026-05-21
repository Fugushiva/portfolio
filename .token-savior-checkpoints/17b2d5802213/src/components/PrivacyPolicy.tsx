import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

type Subsection = {
  subtitle: string
  content: string
  list?: string[]
}

type Section = {
  title: string
  content?: string
  list?: string[]
  subsections?: Subsection[]
}

export default function PrivacyPolicy() {
  const t = useTranslations('privacyPolicy')
  const locale = useLocale()
  const sections = t.raw('sections') as Section[]
  const homeHref = `/${locale}`

  return (
    <main className="min-h-screen bg-bg text-foreground px-6 md:px-12 lg:px-20 py-24">
      {/* Back link */}
      <div className="max-w-3xl mx-auto mb-12">
        <Link
          href={homeHref}
          className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted hover:text-accent transition-colors duration-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t('back')}
        </Link>
      </div>

      <article className="max-w-3xl mx-auto">
        {/* Header */}
        <header className="mb-16">
          <p className="font-mono text-xs text-accent uppercase tracking-widest mb-4">
            {t('last_updated')}
          </p>
          <h1
            className="font-black tracking-tighter text-foreground mb-8"
            style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', lineHeight: 1.1 }}
          >
            {t('meta_title').split(' — ')[0]}
          </h1>
          <p className="text-muted text-sm leading-relaxed max-w-2xl">
            {t('intro')}
          </p>
        </header>

        {/* Divider */}
        <div
          className="mb-16 h-px w-full"
          style={{
            background:
              'linear-gradient(to right, rgba(124,58,237,0.4), rgba(99,102,241,0.2), transparent)',
          }}
        />

        {/* Sections */}
        <div className="space-y-14">
          {sections.map((section, i) => (
            <section key={i} className="space-y-6">
              <h2 className="font-bold text-foreground text-lg tracking-tight">
                {section.title}
              </h2>

              {/* Direct content without subsections */}
              {section.content && !section.subsections && (
                <p
                  className="text-muted text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: section.content }}
                />
              )}
              {section.list && !section.subsections && (
                <ul className="space-y-2 pl-4 border-l border-border/60">
                  {section.list.map((item, j) => (
                    <li
                      key={j}
                      className="text-muted text-sm leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: item }}
                    />
                  ))}
                </ul>
              )}

              {/* Subsections */}
              {section.subsections?.map((sub, j) => (
                <div key={j} className="space-y-3 pl-0">
                  <h3 className="font-semibold text-foreground/80 text-sm tracking-wide">
                    {sub.subtitle}
                  </h3>
                  <p
                    className="text-muted text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: sub.content }}
                  />
                  {sub.list && (
                    <ul className="space-y-2 pl-4 border-l border-border/60 mt-3">
                      {sub.list.map((item, k) => (
                        <li
                          key={k}
                          className="text-muted text-sm leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: item }}
                        />
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </section>
          ))}
        </div>

        {/* Footer divider */}
        <div
          className="mt-20 mb-10 h-px w-full"
          style={{
            background:
              'linear-gradient(to right, rgba(124,58,237,0.4), rgba(99,102,241,0.2), transparent)',
          }}
        />

        <div className="flex items-center justify-between">
          <Link
            href={homeHref}
            className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted hover:text-accent transition-colors duration-200"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('back')}
          </Link>
          <span className="font-mono text-xs text-muted/40">jeromedelodder.com</span>
        </div>
      </article>
    </main>
  )
}
