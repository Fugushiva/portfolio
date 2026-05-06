'use client'

/**
 * HeroSimple — Dynamic hero with animated sub-systems.
 *
 * Sub-systems (each isolated in src/components/hero/):
 *   HeroAvatar    — breathing orb + 3 satellites + parallax cursor
 *   HeroName      — per-letter reveal + scramble on mount + hover scramble
 *   HeroGrid3D    — Canvas 2D interactive 3D grid (GPU-gated, falls back to CSS)
 *   HeroSpotlight — Radial light that follows the cursor
 *   HeroParticles — 5 ambient CSS-only floating dots
 *
 * Kept from original:
 *   - Framer Motion stagger entry (LazyMotion-safe <m.*>)
 *   - Rotating words (single setTimeout loop, native DOM)
 *   - Scroll indicator (CSS bounce animation)
 *   - Availability badge
 *   - Social icons
 *   - Lenis scroll-to on CTAs
 *   - Full i18n via next-intl (FR / EN)
 *   - prefers-reduced-motion respected throughout
 *
 * Fixes vs original:
 *   - data-cursor="link" added to "see work" CTA so magnetic snap works
 *   - Name baseline alignment fixed via hero-name-gradient display:inline-block
 *   - Avatar orb replaced by HeroAvatar (animated)
 *   - Grid replaced by HeroGrid3D (interactive Canvas or CSS fallback)
 */

import { useEffect, useRef } from 'react'
import { m } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { ArrowDown, Mail } from 'lucide-react'
import { getLenis } from '@/hooks/useLenis'

import HeroAvatar    from '@/components/hero/HeroAvatar'
import HeroName      from '@/components/hero/HeroName'
import HeroGrid3D    from '@/components/hero/HeroGrid3D'
import HeroSpotlight from '@/components/hero/HeroSpotlight'
import HeroParticles from '@/components/hero/HeroParticles'

interface HeroSimpleProps {
  isReady: boolean
}

// ── Social icon SVGs (lucide-react doesn't ship brand logos) ──────────────

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  )
}

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 23.2 24 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

function MailIcon({ className }: { className?: string }) {
  return <Mail className={className} />
}

// Social links — single source of truth
const SOCIALS = [
  {
    Icon: GithubIcon,
    label: 'GitHub',
    href: 'https://github.com/Fugushiva',
  },
  {
    Icon: LinkedinIcon,
    label: 'LinkedIn',
    href: 'https://linkedin.com/in/jerome-delodder',
  },
  {
    Icon: MailIcon,
    label: 'Contact',
    href: '#contact',
  },
]

// ── Framer Motion variants — same pattern as original ─────────────────────
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.08 } },
}
const itemVariants = {
  hidden: { y: 40, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 1.0,
      ease: [0.19, 1, 0.22, 1] as [number, number, number, number],
    },
  },
}

export default function HeroSimple({ isReady }: HeroSimpleProps) {
  const t     = useTranslations('hero')
  const words = t.raw('words') as string[]

  const wordRef    = useRef<HTMLSpanElement>(null)
  const sectionRef = useRef<HTMLElement>(null)

  // ── Rotating words (native DOM — zero Framer Motion overhead) ─────────────
  useEffect(() => {
    if (!isReady) return
    const el = wordRef.current
    if (!el) return
    if (typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let index    = 0
    let timer: ReturnType<typeof setTimeout> | null = null
    let cancelled = false

    el.style.transition = 'transform 380ms cubic-bezier(0.55,0,0.55,0.2), opacity 380ms ease'
    el.textContent = words[0]

    const tick = () => {
      if (cancelled) return
      el.style.transform = 'translate3d(0,-110%,0)'
      el.style.opacity   = '0'

      timer = setTimeout(() => {
        if (cancelled) return
        index = (index + 1) % words.length
        el.textContent      = words[index]
        el.style.transition = 'none'
        el.style.transform  = 'translate3d(0,60%,0)'
        el.style.opacity    = '0'
        void el.offsetWidth // force reflow
        el.style.transition = 'transform 480ms cubic-bezier(0.19,1,0.22,1), opacity 480ms ease-out'
        el.style.transform  = 'translate3d(0,0,0)'
        el.style.opacity    = '1'
        timer = setTimeout(tick, 2400)
      }, 380)
    }

    timer = setTimeout(tick, 2400)

    const onVis = () => {
      if (document.hidden && timer) { clearTimeout(timer); timer = null }
      else if (!document.hidden && !timer && !cancelled) { timer = setTimeout(tick, 2400) }
    }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [isReady, words])

  // ── Lenis scroll-to helper ────────────────────────────────────────────────
  const scrollTo = (href: string) => {
    const target = document.querySelector(href)
    if (!target) return
    const doScroll = () => {
      const lenis = getLenis()
      if (lenis) {
        lenis.scrollTo(target as HTMLElement, { offset: -80, duration: 1.0 })
      } else {
        target.scrollIntoView({ behavior: 'smooth' })
      }
    }
    if ('startViewTransition' in document) {
      (document as Document & { startViewTransition: (cb: () => void) => void })
        .startViewTransition(doScroll)
    } else {
      doScroll()
    }
  }

  const isVisible = isReady ? 'visible' : 'hidden'

  return (
    <section
      id="hero"
      ref={sectionRef}
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pb-20 pt-32"
    >
      {/* ── Background layers (z-0) ── */}

      {/* Deep dark base + purple glows */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background: [
            'radial-gradient(ellipse 100% 60% at 70% 20%, rgba(88,28,135,0.12) 0%, transparent 60%)',
            'radial-gradient(ellipse 70% 70% at 20% 80%, rgba(49,46,129,0.08) 0%, transparent 60%)',
            'linear-gradient(180deg, #020208 0%, #060318 50%, #020208 100%)',
          ].join(','),
        }}
      />

      {/* ── Interactive 3D grid (Canvas on capable GPUs, CSS fallback otherwise) */}
      <HeroGrid3D sectionRef={sectionRef} />

      {/* ── Cursor-following spotlight (z-1) ── */}
      <HeroSpotlight sectionRef={sectionRef} />

      {/* ── Orb violet — large ambient glow, top-right ── */}
      <div
        className="absolute pointer-events-none"
        aria-hidden="true"
        style={{
          top: '-10%',
          right: '-5%',
          width: 'clamp(350px, 55vw, 750px)',
          height: 'clamp(350px, 55vw, 750px)',
          borderRadius: '50%',
          background: 'radial-gradient(circle at 40% 40%, rgba(124,58,237,0.18) 0%, rgba(99,102,241,0.06) 45%, transparent 70%)',
          filter: 'blur(60px)',
          zIndex: 1,
        }}
      />
      {/* Orb accent secondary — bottom left */}
      <div
        className="absolute pointer-events-none"
        aria-hidden="true"
        style={{
          bottom: '5%',
          left: '-8%',
          width: 'clamp(200px, 35vw, 500px)',
          height: 'clamp(200px, 35vw, 500px)',
          borderRadius: '50%',
          background: 'radial-gradient(circle at 60% 60%, rgba(99,102,241,0.11) 0%, rgba(67,56,202,0.04) 55%, transparent 75%)',
          filter: 'blur(80px)',
          zIndex: 1,
        }}
      />

      {/* ── Ambient particles (z-1, CSS-only) ── */}
      <HeroParticles />

      {/* ── Main content ── */}
      <m.div
        variants={containerVariants}
        initial="hidden"
        animate={isVisible}
        className="relative z-10 mx-auto w-full max-w-4xl text-center"
      >
        {/* Avatar orb — animated (breathing + orbitals + parallax) */}
        <m.div variants={itemVariants} className="mb-8 flex justify-center">
          <HeroAvatar />
        </m.div>

        {/* Availability badge */}
        <m.div variants={itemVariants} className="mb-6">
          <div className="inline-flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-widest text-muted">
            <span className="hero-availability-dot" aria-hidden="true" />
            {t('availability')}
          </div>
        </m.div>

        {/* Name — per-letter reveal + scramble + hover scramble */}
        <m.div variants={itemVariants} className="mb-2">
          <HeroName isReady={isReady} />
        </m.div>

        {/* Tagline */}
        <m.p
          variants={itemVariants}
          className="mb-2 font-mono text-sm uppercase tracking-widest text-muted"
        >
          {t('tagline')}
        </m.p>

        {/* Rotating words line */}
        <m.p
          variants={itemVariants}
          className="mb-10 font-sans text-base text-muted md:text-lg"
        >
          {t('buildPrefix')}{' '}
          <span
            className="inline-block overflow-hidden"
            style={{ height: '1.25em', verticalAlign: '-0.25em' }}
          >
            <span
              ref={wordRef}
              className="inline-block font-semibold text-accent-light"
              style={{ willChange: 'transform, opacity' }}
            >
              {words[0]}
            </span>
          </span>
        </m.p>

        {/* CTAs */}
        <m.div
          variants={itemVariants}
          className="mb-10 flex flex-wrap items-center justify-center gap-4"
        >
          <button
            type="button"
            onClick={() => scrollTo('#contact')}
            data-magnetic
            data-cursor="cta"
            className="magnetic-wrap hero-cta-pill"
          >
            {t('cta_contact')}
          </button>

          {/* Fix: added data-cursor="link" so useMagneticCursor snap activates */}
          <button
            type="button"
            onClick={() => scrollTo('#work')}
            data-magnetic
            data-cursor="link"
            className="magnetic-wrap group relative inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-foreground transition-colors duration-300 hover:text-accent"
          >
            <span className="absolute -inset-3 rounded-full border border-border/60 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            {t('cta_work')}
            <svg
              width="14" height="14" viewBox="0 0 14 14" fill="none"
              className="transition-transform duration-300 group-hover:translate-x-1.5"
              aria-hidden="true"
            >
              <path
                d="M2 7h10M8 3l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </m.div>

        {/* Social icons */}
        <m.div
          variants={itemVariants}
          className="flex justify-center gap-3"
        >
          {SOCIALS.map(({ Icon, label, href }) => (
            <m.a
              key={label}
              href={href}
              target={href.startsWith('mailto') ? undefined : '_blank'}
              rel={href.startsWith('mailto') ? undefined : 'noopener noreferrer'}
              aria-label={label}
              whileHover={{ scale: 1.1, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border/60 bg-surface text-muted transition-colors duration-200 hover:border-accent/60 hover:bg-accent/10 hover:text-accent-light"
            >
              <Icon className="h-4 w-4" />
            </m.a>
          ))}
        </m.div>
      </m.div>

      {/* ── Scroll indicator — pure CSS bounce, no Framer Motion loop ── */}
      {isReady && (
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce"
          aria-hidden="true"
        >
          <ArrowDown className="h-5 w-5 text-muted/60" />
        </div>
      )}

      {/* Bottom divider */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
        style={{
          background: 'linear-gradient(to right, transparent, rgba(124,58,237,0.3), rgba(99,102,241,0.2), transparent)',
          zIndex: 10,
        }}
      />
    </section>
  )
}
