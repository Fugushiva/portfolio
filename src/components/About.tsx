'use client'

import { useRef } from 'react'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import { useTranslations } from 'next-intl'

export default function About() {
  const t = useTranslations('about')
  const stats = t.raw('stats') as Array<{ value: string; label: string }>

  const containerRef = useRef<HTMLElement>(null)
  useScrollReveal(containerRef, { stagger: 0.1 })

  return (
    <section
      id="about"
      ref={containerRef}
      className="section-pad px-6 md:px-12 lg:px-20 relative"
    >
      {/* Section label */}
      <div className="flex items-center gap-4 mb-16 md:mb-20" data-reveal>
        <span className="font-mono text-xs text-accent tracking-widest uppercase">{t('section')}</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 max-w-[1600px]">
        {/* Left — Text */}
        <div className="flex flex-col justify-center">
          <h2
            data-reveal
            className="font-black text-foreground leading-tight tracking-tighter mb-8"
            style={{ fontSize: 'clamp(2rem, 4.5vw, 4.5rem)' }}
          >
            {t('headline')}
          </h2>

          <p data-reveal className="text-muted text-base md:text-lg leading-relaxed mb-6 max-w-[480px]">
            {t('p1')}
          </p>

          <p data-reveal className="text-muted text-base md:text-lg leading-relaxed max-w-[480px]">
            {t('p2')}
          </p>

          <div data-reveal className="mt-10">
            <a
              href="#contact"
              data-magnetic
              className="magnetic-wrap inline-flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-foreground border-b border-foreground/20 pb-1 transition-all duration-300 hover:border-accent hover:text-accent"
            >
              {t('cta')}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </div>
        </div>

        {/* Right — Stats grid */}
        <div className="grid grid-cols-2 gap-px bg-border" data-reveal>
          {stats.map(({ value, label }) => (
            <div
              key={label}
              className="bg-bg p-8 md:p-10 flex flex-col justify-between group hover:bg-surface transition-colors duration-300"
            >
              <span
                className="font-black text-foreground leading-none tracking-tighter group-hover:text-accent transition-colors duration-300"
                style={{ fontSize: 'clamp(2.5rem, 5vw, 5rem)' }}
              >
                {value}
              </span>
              <span className="font-mono text-xs text-muted uppercase tracking-wider mt-4">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
