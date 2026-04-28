'use client'

import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useScrollReveal } from '@/hooks/useScrollReveal'
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

export default function Contact() {
  const t = useTranslations('contact')
  const containerRef = useRef<HTMLElement>(null)
  const [copied, setCopied] = useState(false)
  useScrollReveal(containerRef, { stagger: 0.1 })

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
      className="section-pad px-6 md:px-12 lg:px-20 relative overflow-hidden"
    >
      {/* Background glow */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 glow-accent"
        style={{ width: '80vw', height: '40vw', opacity: 0.3 }}
      />

      {/* Section label */}
      <div className="flex items-center gap-4 mb-16 md:mb-20" data-reveal>
        <span className="font-mono text-xs text-accent tracking-widest uppercase">{t('section')}</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <div className="max-w-[1600px] relative z-10">
        {/* Big CTA text */}
        <div className="mb-16 md:mb-24" data-reveal>
          <h2
            className="font-black text-foreground leading-tight tracking-tighter"
            style={{ fontSize: 'clamp(2.5rem, 7vw, 8rem)' }}
          >
            {t('headline1')}
          </h2>
          <h2
            className="font-black leading-tight tracking-tighter"
            style={{
              fontSize: 'clamp(2.5rem, 7vw, 8rem)',
              WebkitTextStroke: '1px rgba(245,245,240,0.3)',
              color: 'transparent',
            }}
          >
            {t('headline2')}
          </h2>
        </div>

        {/* CTA + links row */}
        <div className="flex flex-col md:flex-row md:items-end gap-12 md:gap-24">
          {/* Primary CTA */}
          <div data-reveal>
            <p className="text-muted text-sm leading-relaxed mb-8 max-w-[360px]">
              {t('description')}
            </p>
            <div className="flex items-center gap-4">
              <motion.a
                href="mailto:jerome@delodder.dev"
                data-magnetic
                className="magnetic-wrap relative inline-flex items-center gap-3 px-8 py-4 bg-accent text-bg font-mono text-sm uppercase tracking-widest rounded-full font-bold transition-all duration-300 hover:bg-accent-light overflow-hidden group"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <motion.span
                  className="absolute inset-0 bg-white/10 origin-left"
                  initial={{ scaleX: 0 }}
                  whileHover={{ scaleX: 1 }}
                  transition={{ duration: 0.4, ease: [0.19, 1, 0.22, 1] }}
                />
                <span className="relative">{t('cta_email')}</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="relative">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </motion.a>

              <button
                onClick={copyEmail}
                data-magnetic
                className="magnetic-wrap inline-flex items-center gap-2 font-mono text-xs text-muted border border-border rounded-full px-4 py-3 hover:border-foreground/40 hover:text-foreground transition-all duration-300"
              >
                {copied ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <polyline points="2.5,7 5.5,10 11.5,4" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
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
              </button>
            </div>
          </div>

          {/* Social links */}
          <div className="flex flex-col gap-4 md:ml-auto" data-reveal>
            {LINKS.map(({ label, href, display, icon }) => (
              <a
                key={label}
                href={href}
                target={href.startsWith('http') ? '_blank' : undefined}
                rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
                data-magnetic
                className="magnetic-wrap flex items-center gap-3 text-muted hover:text-foreground transition-colors duration-300 group"
              >
                <span className="w-8 h-8 rounded-full border border-border flex items-center justify-center group-hover:border-accent group-hover:text-accent transition-all duration-300">
                  {icon}
                </span>
                <span>
                  <span className="font-mono text-[10px] uppercase tracking-wider block text-muted/60">{label}</span>
                  <span className="font-mono text-xs">{display}</span>
                </span>
              </a>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-24 pt-8 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" data-reveal>
          <span className="font-mono text-xs text-muted/50">
            {t('footer_copy')}
          </span>
          <span className="font-mono text-xs text-muted/30 uppercase tracking-wider">
            {t('footer_availability')}
          </span>
        </div>
      </div>
    </section>
  )
}
