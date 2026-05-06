'use client'

import { useRef, useState } from 'react'
import { m, useInView } from 'framer-motion'
import { useGSAPReveal } from '@/hooks/useGSAPReveal'
import { useTranslations } from 'next-intl'

const LINKS = [
  {
    label: 'Email',
    href: 'mailto:jerome@delodder.dev',
    display: 'jerome@delodder.dev',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M2 4.5h14v10H2V4.5zM2 4.5l7 5.5 7-5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/j%C3%A9r%C3%B4me-delodder-a12b8a1b1/',
    display: '/jérôme-delodder',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="2" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M5.5 8v4.5M5.5 6v-.5M8.5 12.5V9.5c0-1 .5-1.5 1.5-1.5s1.5.5 1.5 1.5v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: 'GitHub',
    href: 'https://github.com/Fugushiva',
    display: '/Fugushiva',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
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
  const containerRef = useRef<HTMLElement>(null)
  const [copied, setCopied] = useState(false)
  useGSAPReveal(containerRef, { stagger: 0.12, duration: 1.1, y: 60, start: 'top 90%' })

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText('jerome@delodder.dev')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Silently fail if clipboard not available
    }
  }

  return (
    <section
      id="contact"
      ref={containerRef}
      className="section-pad px-6 md:px-12 lg:px-20 relative"
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
        <div className="mb-16 md:mb-24">
          <GlitchHeadline text={t('headline1')} />
          <GlitchHeadline text={t('headline2')} outline />
        </div>

        {/* CTA + links row */}
        <div className="flex flex-col md:flex-row md:items-end gap-12 md:gap-24">
          {/* Primary CTA */}
          <div data-reveal>
            <p className="text-muted text-sm leading-relaxed mb-8 max-w-[360px]">
              {t('description')}
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              <m.a
                href="mailto:jerome@delodder.dev"
                data-magnetic
                className="magnetic-wrap liquid-btn relative !inline-flex items-center gap-3 px-8 py-4 bg-accent text-bg font-mono text-sm uppercase tracking-widest rounded-full font-bold overflow-hidden group"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.3, ease: [0.19, 1, 0.22, 1] }}
              >
                {/* Animated shimmer sweep */}
                <m.span
                  className="absolute inset-0 bg-white/15 origin-left"
                  initial={{ scaleX: 0 }}
                  whileHover={{ scaleX: 1 }}
                  transition={{ duration: 0.4, ease: [0.19, 1, 0.22, 1] }}
                />
                <span className="relative">{t('cta_email')}</span>
                <m.svg
                  width="16" height="16" viewBox="0 0 16 16" fill="none"
                  className="relative"
                  whileHover={{ x: 4 }}
                  transition={{ duration: 0.3, ease: [0.19, 1, 0.22, 1] }}
                >
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </m.svg>
              </m.a>

              <m.button
                onClick={copyEmail}
                data-magnetic
                className="magnetic-wrap !inline-flex items-center gap-2 font-mono text-xs text-muted border border-border rounded-full px-4 py-3 hover:border-foreground/40 hover:text-foreground transition-all duration-300"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {copied ? (
                  <>
                    <m.svg
                      width="14" height="14" viewBox="0 0 14 14" fill="none"
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    >
                      <polyline points="2.5,7 5.5,10 11.5,4" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </m.svg>
                    <span className="text-accent">{t('cta_copied')}</span>
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <rect x="4" y="4" width="8" height="9" rx="1" stroke="currentColor" strokeWidth="1.3"/>
                      <path d="M2 10V2h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                    </svg>
                    {t('cta_copy')}
                  </>
                )}
              </m.button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="mt-24 pt-8 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
          data-reveal
        >
          <span className="font-mono text-xs text-muted/50 order-3 sm:order-1">
            {t('footer_copy')}
          </span>

          {/* Social Links */}
          <div className="flex items-center gap-5 order-2">
            {LINKS.filter(link => link.label !== 'Email').map(({ label, href }) => (
              <m.a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                data-magnetic
                aria-label={label}
                className="magnetic-wrap w-12 h-12 rounded-full border border-foreground/20 !flex items-center justify-center text-foreground/50 transition-all duration-300"
                whileHover={{ scale: 1.1, borderColor: '#7c3aed', color: '#7c3aed', backgroundColor: 'rgba(124,58,237,0.08)' }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                {label === 'LinkedIn' ? (
                  <svg width="22" height="22" viewBox="0 0 18 18" fill="none">
                    <rect x="2" y="2" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M5.5 8v4.5M5.5 6v-.5M8.5 12.5V9.5c0-1 .5-1.5 1.5-1.5s1.5.5 1.5 1.5v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 18 18" fill="none">
                    <path d="M9 2a7 7 0 00-2.21 13.64c.35.06.48-.15.48-.34v-1.19c-1.95.42-2.36-.94-2.36-.94-.32-.81-.78-1.03-.78-1.03-.64-.44.05-.43.05-.43.7.05 1.07.72 1.07.72.63 1.07 1.64.76 2.04.58.06-.45.24-.76.44-.93-1.56-.18-3.2-.78-3.2-3.47 0-.77.27-1.39.72-1.88-.07-.18-.31-.89.07-1.85 0 0 .59-.19 1.92.72a6.7 6.7 0 013.5 0c1.33-.91 1.92-.72 1.92-.72.38.96.14 1.67.07 1.85.45.49.72 1.11.72 1.88 0 2.7-1.65 3.29-3.22 3.47.25.22.48.65.48 1.31v1.95c0 .19.13.4.48.34A7 7 0 009 2z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </m.a>
            ))}
          </div>

          {/* Availability pill */}
          <span className="inline-flex items-center gap-2 font-mono text-xs text-muted/40 uppercase tracking-wider order-1 sm:order-3">
            <span className="relative flex h-1.5 w-1.5 text-accent">
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
