'use client'

import { useRef } from 'react'
import { m, useInView } from 'framer-motion'
import { useGSAPReveal } from '@/hooks/useGSAPReveal'
import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'
import ContactForm from './contact/ContactForm'

const SOCIAL_LINKS = [
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/j%C3%A9r%C3%B4me-delodder-a12b8a1b1/',
    icon: (
      <svg width="22" height="22" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <rect x="2" y="2" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M5.5 8v4.5M5.5 6v-.5M8.5 12.5V9.5c0-1 .5-1.5 1.5-1.5s1.5.5 1.5 1.5v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: 'GitHub',
    href: 'https://github.com/Fugushiva',
    icon: (
      <svg width="22" height="22" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <path d="M9 2a7 7 0 00-2.21 13.64c.35.06.48-.15.48-.34v-1.19c-1.95.42-2.36-.94-2.36-.94-.32-.81-.78-1.03-.78-1.03-.64-.44.05-.43.05-.43.7.05 1.07.72 1.07.72.63 1.07 1.64.76 2.04.58.06-.45.24-.76.44-.93-1.56-.18-3.2-.78-3.2-3.47 0-.77.27-1.39.72-1.88-.07-.18-.31-.89.07-1.85 0 0 .59-.19 1.92.72a6.7 6.7 0 013.5 0c1.33-.91 1.92-.72 1.92-.72.38.96.14 1.67.07 1.85.45.49.72 1.11.72 1.88 0 2.7-1.65 3.29-3.22 3.47.25.22.48.65.48 1.31v1.95c0 .19.13.4.48.34A7 7 0 009 2z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
]

// ─── Glitch headline wrapper ───────────────────────────────────────────────────
function GlitchHeadline({ text, outline = false }: { text: string; outline?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '0px' })

  return (
    <m.div
      ref={ref}
      className="glitch-wrap relative"
      initial={{ opacity: 0, y: 40, clipPath: 'inset(0 0 100% 0)' }}
      animate={isInView ? { opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0)' } : {}}
      transition={{ duration: 0.9, ease: [0.19, 1, 0.22, 1] }}
    >
      <h2
        className="font-black leading-tight tracking-tighter"
        style={{
          fontSize: 'clamp(2.5rem, 7vw, 8rem)',
          ...(outline
            ? {
                WebkitTextStroke: '1px rgba(245,245,240,0.3)',
                color: 'transparent',
              }
            : { color: '#f5f5f0' }),
        }}
      >
        {text}
      </h2>
      {/* Glitch layers */}
      <h2
        className="glitch-layer-1 font-black leading-tight tracking-tighter"
        style={{
          fontSize: 'clamp(2.5rem, 7vw, 8rem)',
          ...(outline
            ? { WebkitTextStroke: '1px rgba(255,45,85,0.5)', color: 'transparent' }
            : {}),
        }}
        aria-hidden="true"
      >
        {text}
      </h2>
      <h2
        className="glitch-layer-2 font-black leading-tight tracking-tighter"
        style={{
          fontSize: 'clamp(2.5rem, 7vw, 8rem)',
          ...(outline
            ? { WebkitTextStroke: '1px rgba(0,170,255,0.5)', color: 'transparent' }
            : {}),
        }}
        aria-hidden="true"
      >
        {text}
      </h2>
    </m.div>
  )
}

export default function Contact() {
  const t = useTranslations('contact')
  const locale = useLocale()
  const containerRef = useRef<HTMLElement>(null)
  useGSAPReveal(containerRef, { stagger: 0.12, duration: 1.1, y: 60, start: 'top 90%' })

  return (
    <section
      id="contact"
      ref={containerRef}
      className="section-pad px-6 md:px-12 lg:px-20 xl:px-24 2xl:px-32 relative"
    >
      {/* Background glow */}
      <div
        className="absolute bottom-0 left-1/2 pointer-events-none"
        style={{
          width: '80vw',
          height: '50vw',
          background: 'radial-gradient(circle at 50% 100%, rgba(124,58,237,0.18) 0%, rgba(124,58,237,0.06) 40%, transparent 70%)',
          filter: 'blur(60px)',
          transform: 'translate(-50%, 20%)',
          willChange: 'transform',
        }}
        aria-hidden="true"
      />

      {/* Section label */}
      <div className="flex items-center gap-4 mb-16 md:mb-20" data-reveal>
        <span className="font-mono text-xs text-accent tracking-widest uppercase">{t('section')}</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <div className="max-w-[1600px] relative z-10">
        {/* Big glitch headlines */}
        <div className="mb-12 md:mb-16">
          <GlitchHeadline text={t('headline1')} />
          <GlitchHeadline text={t('headline2')} outline />
        </div>

        {/* Description + Form */}
        <div className="flex flex-col gap-8 md:gap-10" data-reveal>
          <p className="text-muted text-sm leading-relaxed max-w-[480px]">
            {t('description')}
          </p>

          {/* Contact form — replaces mailto CTA */}
          <ContactForm />
        </div>

        {/* Footer */}
        <div
          className="mt-24 pt-8 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
          data-reveal
        >
          <div className="flex flex-col gap-1 order-3 sm:order-1">
            <span className="font-mono text-xs text-muted/50">
              {t('footer_copy')}
            </span>
            <Link
              href={`/${locale}/privacy-policy`}
              className="font-mono text-xs text-muted/40 hover:text-accent transition-colors duration-200 w-fit"
            >
              {t('footer_privacy')}
            </Link>
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-5 order-2">
            {SOCIAL_LINKS.map(({ label, href, icon }) => (
              <m.a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                data-magnetic
                aria-label={label}
                className="magnetic-wrap w-12 h-12 rounded-full border border-foreground/20 !flex items-center justify-center text-foreground/50 transition-all duration-300 cursor-pointer"
                whileHover={{ scale: 1.1, borderColor: '#7c3aed', color: '#7c3aed', backgroundColor: 'rgba(124,58,237,0.08)' }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                {icon}
              </m.a>
            ))}
          </div>

          {/* Availability pill */}
          <span className="inline-flex items-center gap-2 font-mono text-xs text-muted/40 uppercase tracking-wider order-1 sm:order-3">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-60" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent" />
            </span>
            {t('footer_availability')}
          </span>
        </div>
      </div>
    </section>
  )
}
