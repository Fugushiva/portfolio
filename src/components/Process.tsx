'use client'

import { useRef } from 'react'
import { motion } from 'framer-motion'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import { useTranslations } from 'next-intl'

const STEP_ICONS = [
  (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 2a8 8 0 100 16A8 8 0 0010 2zM10 6v4l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="2" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="11" y="2" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="2" y="11" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M14.5 11v7M11 14.5h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <polyline points="4,10 8,14 16,6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 2l2 6h6l-5 3.6 2 6L10 14l-5 3.6 2-6L2 8h6L10 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  ),
]

export default function Process() {
  const t = useTranslations('process')
  const steps = t.raw('steps') as Array<{ title: string; duration: string; description: string }>
  const classicItems = t.raw('classic_items') as string[]
  const myItems = t.raw('my_items') as string[]

  const containerRef = useRef<HTMLElement>(null)
  useScrollReveal(containerRef, { stagger: 0.1 })

  return (
    <section
      id="process"
      ref={containerRef}
      className="section-pad px-6 md:px-12 lg:px-20 relative"
    >
      {/* Section label */}
      <div className="flex items-center gap-4 mb-16 md:mb-20" data-reveal>
        <span className="font-mono text-xs text-accent tracking-widest uppercase">{t('section')}</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <div className="max-w-[1600px] grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
        {/* Left — headline */}
        <div className="flex flex-col justify-center" data-reveal>
          <h2
            className="font-black text-foreground leading-tight tracking-tighter mb-6"
            style={{ fontSize: 'clamp(2rem, 4.5vw, 4.5rem)' }}
          >
            {t('headline')}
          </h2>
          <p className="text-muted text-base md:text-lg leading-relaxed max-w-[440px]">
            {t('subheadline')}
          </p>

          {/* Diff block */}
          <div className="mt-10 p-6 border border-border bg-surface rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-3">{t('classic_label')}</p>
                <ul className="flex flex-col gap-2">
                  {classicItems.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-muted/60">
                      <span className="w-3 h-px bg-muted/30 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-mono text-[10px] text-accent uppercase tracking-widest mb-3">{t('my_label')}</p>
                <ul className="flex flex-col gap-2">
                  {myItems.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-foreground/80">
                      <span className="w-3 h-px bg-accent shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Right — steps */}
        <div className="flex flex-col gap-0">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              data-reveal
              className="flex gap-6 py-6 border-t border-border group hover:bg-surface/30 px-4 -mx-4 rounded transition-colors duration-300"
              initial={false}
            >
              {/* Number line */}
              <div className="flex flex-col items-center shrink-0">
                <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted group-hover:border-accent group-hover:text-accent transition-colors duration-300">
                  {STEP_ICONS[i]}
                </div>
                {i < steps.length - 1 && (
                  <div className="flex-1 w-px bg-border mt-3 min-h-[24px]" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pb-2">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-bold text-foreground text-base">{step.title}</h3>
                  <span className="font-mono text-[10px] text-muted border border-border rounded-full px-2 py-0.5 uppercase tracking-wider">
                    {step.duration}
                  </span>
                </div>
                <p className="text-muted text-sm leading-relaxed">{step.description}</p>
              </div>
            </motion.div>
          ))}
          <div className="border-t border-border" />
        </div>
      </div>
    </section>
  )
}
