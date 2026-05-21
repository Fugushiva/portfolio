'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { m, useInView } from 'framer-motion'
import { useGSAPReveal } from '@/hooks/useGSAPReveal'
import { useTilt3D } from '@/hooks/useTilt3D'
import { useCountUp } from '@/hooks/useCountUp'
import { useTranslations } from 'next-intl'

// ─── Stat card with animated counter ─────────────────────────────────────────
function StatCard({ value, label }: { value: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const displayed = useCountUp(value, isInView, 1200)

  return (
    <div
      ref={ref}
      className="shimmer-wrap bg-bg p-8 flex flex-col justify-between group hover:bg-surface transition-colors duration-300 cursor-default"
    >
      <span
        className="ticker font-black text-foreground leading-none tracking-tighter group-hover:text-accent transition-colors duration-300"
        style={{ fontSize: 'clamp(2.5rem, 3.5vw, 4.5rem)' }}
      >
        {displayed}
      </span>
      <span className="font-mono text-xs text-muted uppercase tracking-wider mt-4">
        {label}
      </span>
    </div>
  )
}

export default function About() {
  const t = useTranslations('about')
  const stats = t.raw('stats') as Array<{ value: string; label: string }>

  const containerRef = useRef<HTMLElement>(null)
  const portraitRef = useRef<HTMLDivElement>(null)
  useGSAPReveal(containerRef, { stagger: 0.12, duration: 1.1, y: 50, start: 'top 86%' })
  useTilt3D(portraitRef, { maxRot: 8, lerp: 0.06, scale: 1.02 })

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

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr_1fr] gap-12 lg:gap-16 max-w-[1600px] items-start">

        {/* Col 1 — Portrait with 3D tilt */}
        <div className="relative" data-reveal>
          {/* Accent border frame */}
          <m.div
            className="absolute -bottom-3 -right-3 w-full h-full border border-accent/30 pointer-events-none"
            aria-hidden="true"
            initial={{ opacity: 0, x: 10, y: 10 }}
            whileInView={{ opacity: 1, x: 0, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ delay: 0.4, duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
          />
          <div
            ref={portraitRef}
            className="relative overflow-hidden aspect-[3/4] bg-surface tilt-card"
          >
            <Image
              src="/projects/owner/img/jerome delodder.jpg"
              alt="Jérôme Delodder"
              fill
              sizes="(max-width: 1024px) 100vw, 33vw"
              className="object-cover object-top grayscale hover:grayscale-0 transition-[filter] duration-700 ease-out"
              priority={false}
            />
            {/* Cinematic vignette */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(to top, rgba(10,10,10,0.6) 0%, transparent 50%)',
              }}
              aria-hidden="true"
            />
            {/* Shimmer on hover */}
            <div
              className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, transparent 30%, rgba(124,58,237,0.08) 50%, transparent 70%)',
              }}
            />
          </div>
          {/* Name tag below photo */}
          <p className="mt-4 font-mono text-xs text-muted uppercase tracking-widest">
            Jérôme Delodder — 2025
          </p>
        </div>

        {/* Col 2 — Text */}
        <div className="flex flex-col justify-center lg:pt-4">
          <h2
            data-reveal-text
            className="font-black text-foreground leading-tight tracking-tighter mb-8"
            style={{ fontSize: 'clamp(2rem, 3.5vw, 4rem)' }}
          >
            {t('headline')}
          </h2>

          <p data-reveal-text className="text-muted text-base md:text-lg leading-relaxed mb-6">
            {t('p1')}
          </p>

          <p data-reveal-text className="text-muted text-base md:text-lg leading-relaxed">
            {t('p2')}
          </p>

          <div data-reveal className="mt-10">
            <a
              href="#contact"
              data-magnetic
              className="magnetic-wrap group inline-flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-foreground border-b border-foreground/20 pb-1 transition-all duration-300 hover:border-accent hover:text-accent"
            >
              {t('cta')}
              <svg
                width="16" height="16" viewBox="0 0 16 16" fill="none"
                className="transition-transform duration-300 group-hover:translate-x-1"
              >
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </div>
        </div>

        {/* Col 3 — Stats grid with counter-up */}
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-px bg-border" data-reveal>
          {stats.map(({ value, label }) => (
            <StatCard key={label} value={value} label={label} />
          ))}
        </div>

      </div>
    </section>
  )
}
