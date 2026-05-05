'use client'

import { useRef } from 'react'
import { m, useInView } from 'framer-motion'
import { useGSAPReveal } from '@/hooks/useGSAPReveal'
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

// ─── Animated step row ────────────────────────────────────────────────────────
function StepRow({
  step,
  icon,
  index,
  total,
}: {
  step: { title: string; duration: string; description: string }
  icon: React.ReactNode
  index: number
  total: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <m.div
      ref={ref}
      initial={{ opacity: 0, x: 24 }}
      animate={isInView ? { opacity: 1, x: 0 } : {}}
      transition={{ delay: index * 0.12, duration: 0.7, ease: [0.19, 1, 0.22, 1] }}
      className="flex gap-6 py-6 border-t border-border group hover:bg-surface/30 px-4 -mx-4 rounded transition-colors duration-300"
    >
      {/* Number line */}
      <div className="flex flex-col items-center shrink-0">
        <m.div
          className="w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300"
          style={{ borderColor: 'rgba(255,255,255,0.1)', color: '#6b6b6b' }}
          animate={isInView ? {
            borderColor: 'rgba(124,58,237,0.5)',
            color: '#a78bfa',
          } : {}}
          transition={{ delay: index * 0.12 + 0.3, duration: 0.5 }}
          whileHover={{ scale: 1.15, borderColor: '#7c3aed', color: '#7c3aed' }}
        >
          {icon}
        </m.div>

        {/* Animated connecting line */}
        {index < total - 1 && (
          <div className="flex-1 w-px relative mt-3 min-h-[24px] overflow-hidden">
            <div className="absolute inset-0 bg-border" />
            <m.div
              className="absolute top-0 left-0 w-full origin-top"
              style={{ background: 'linear-gradient(to bottom, #7c3aed, transparent)' }}
              initial={{ scaleY: 0 }}
              animate={isInView ? { scaleY: 1 } : {}}
              transition={{ delay: index * 0.12 + 0.5, duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-2">
        <div className="flex items-center gap-3 mb-2">
          <h3 className="font-bold text-foreground text-base">{step.title}</h3>
          <m.span
            className="font-mono text-[10px] text-muted border border-border rounded-full px-2 py-0.5 uppercase tracking-wider"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: index * 0.12 + 0.4, duration: 0.4 }}
          >
            {step.duration}
          </m.span>
        </div>
        <p className="text-muted text-sm leading-relaxed">{step.description}</p>
      </div>
    </m.div>
  )
}

export default function Process() {
  const t = useTranslations('process')
  const steps = t.raw('steps') as Array<{ title: string; duration: string; description: string }>
  const classicItems = t.raw('classic_items') as string[]
  const myItems = t.raw('my_items') as string[]

  const containerRef = useRef<HTMLElement>(null)
  const diffRef = useRef<HTMLDivElement>(null)
  const diffInView = useInView(diffRef, { once: true, margin: '-60px' })
  useGSAPReveal(containerRef, { stagger: 0.1, duration: 1.0, y: 50, start: 'top 88%' })

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
            data-reveal-text
            className="font-black text-foreground leading-tight tracking-tighter mb-6"
            style={{ fontSize: 'clamp(2rem, 4.5vw, 4.5rem)' }}
          >
            {t('headline')}
          </h2>
          <p className="text-muted text-base md:text-lg leading-relaxed max-w-[440px]">
            {t('subheadline')}
          </p>

          {/* Diff block */}
          <m.div
            ref={diffRef}
            className="mt-10 p-6 border border-border bg-surface rounded-lg overflow-hidden relative"
            initial={{ opacity: 0, y: 20 }}
            animate={diffInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, ease: [0.19, 1, 0.22, 1] }}
          >
            {/* Shimmer sweep on mount */}
            <m.div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.06), transparent)',
              }}
              initial={{ x: '-100%' }}
              animate={diffInView ? { x: '200%' } : {}}
              transition={{ delay: 0.5, duration: 1.2, ease: 'easeInOut' }}
            />
            <div className="grid grid-cols-2 gap-4 relative">
              <div>
                <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-3">{t('classic_label')}</p>
                <ul className="flex flex-col gap-2">
                  {classicItems.map((item, i) => (
                    <m.li
                      key={item}
                      className="flex items-center gap-2 text-sm text-muted/60"
                      initial={{ opacity: 0, x: -8 }}
                      animate={diffInView ? { opacity: 1, x: 0 } : {}}
                      transition={{ delay: 0.3 + i * 0.07, duration: 0.4 }}
                    >
                      <span className="w-3 h-px bg-muted/30 shrink-0" />
                      {item}
                    </m.li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-mono text-[10px] text-accent uppercase tracking-widest mb-3">{t('my_label')}</p>
                <ul className="flex flex-col gap-2">
                  {myItems.map((item, i) => (
                    <m.li
                      key={item}
                      className="flex items-center gap-2 text-sm text-foreground/80"
                      initial={{ opacity: 0, x: 8 }}
                      animate={diffInView ? { opacity: 1, x: 0 } : {}}
                      transition={{ delay: 0.4 + i * 0.07, duration: 0.4 }}
                    >
                      <span className="w-3 h-px bg-accent shrink-0" />
                      {item}
                    </m.li>
                  ))}
                </ul>
              </div>
            </div>
          </m.div>
        </div>

        {/* Right — steps with draw-on timeline */}
        <div className="flex flex-col gap-0">
          {steps.map((step, i) => (
            <StepRow
              key={step.title}
              step={step}
              icon={STEP_ICONS[i]}
              index={i}
              total={steps.length}
            />
          ))}
          <div className="border-t border-border" />
        </div>
      </div>
    </section>
  )
}
