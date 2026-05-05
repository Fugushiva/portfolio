'use client'

/**
 * Hero — cinematic world-class opening screen.
 *
 * Visual hierarchy:
 *   - Deep galaxy background (HeroParticles WebGL)
 *   - Subtle radial vignette to frame the content
 *   - Eyebrow: availability badge with pulsing dot
 *   - Name: massive letter-stagger reveal, gradient accent on first name
 *   - Role line: rotating words with clip-mask transition
 *   - CTA row: ghost button + filled pill
 *   - Vertical scroll indicator with animated line
 *   - Floating stat chips (years exp / projects / satisfaction)
 *
 * Effects:
 *   - Multi-layer orb parallax on mousemove (2 orbs at different depths)
 *   - Name letters: y + rotateZ + opacity stagger via Framer Motion
 *   - Gradient text on "Jérome" via CSS background-clip
 *   - Ambient vignette: radial-gradient overlay
 *   - Bottom horizon glow (like stars reflecting off atmosphere)
 */

import { useEffect, useRef } from 'react'
import { m } from 'framer-motion'
import { useTranslations } from 'next-intl'
import HeroParticles from './HeroParticles'

interface HeroProps {
  isReady: boolean
}

const JEROME   = ['J', 'é', 'r', 'ô', 'm', 'e']
const DELODDER = ['D', 'e', 'l', 'o', 'd', 'd', 'e', 'r']

export default function Hero({ isReady }: HeroProps) {
  const t     = useTranslations('hero')
  const words = t.raw('words') as string[]

  const containerRef = useRef<HTMLDivElement>(null)
  const orbRef       = useRef<HTMLDivElement>(null)
  const orb2Ref      = useRef<HTMLDivElement>(null)
  const wordRef      = useRef<HTMLSpanElement>(null)

  // ── Multi-orb mouse parallax ──────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (window.matchMedia('(pointer: coarse)').matches) return

    const orb  = orbRef.current
    const orb2 = orb2Ref.current
    if (!orb || !orb2) return

    let targetX = 0, targetY = 0
    let cX = 0, cY = 0, cX2 = 0, cY2 = 0
    let rafId = 0

    const onMove = (e: MouseEvent) => {
      targetX = (e.clientX / window.innerWidth  - 0.5) * 70
      targetY = (e.clientY / window.innerHeight - 0.5) * 50
      if (rafId === 0) rafId = requestAnimationFrame(loop)
    }

    const loop = () => {
      cX  += (targetX        - cX)  * 0.055
      cY  += (targetY        - cY)  * 0.055
      cX2 += (targetX * 1.7  - cX2) * 0.028
      cY2 += (targetY * 1.7  - cY2) * 0.028

      orb.style.transform  = `translate3d(${cX.toFixed(2)}px,${cY.toFixed(2)}px,0)`
      orb2.style.transform = `translate3d(${(-cX2 * 0.55).toFixed(2)}px,${(-cY2 * 0.55).toFixed(2)}px,0)`

      const d = Math.abs(targetX - cX) + Math.abs(targetY - cY)
      if (d < 0.05) { rafId = 0; return }
      rafId = requestAnimationFrame(loop)
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    return () => {
      window.removeEventListener('mousemove', onMove)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [])

  // ── Rotating words ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isReady) return
    const el = wordRef.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let index = 0
    let timer: ReturnType<typeof setTimeout> | null = null
    let cancelled = false

    el.style.transition = 'transform 400ms cubic-bezier(0.55,0,0.55,0.2), opacity 400ms ease'
    el.textContent = words[0]

    const tick = () => {
      if (cancelled) return
      el.style.transform = 'translate3d(0,-110%,0)'
      el.style.opacity   = '0'
      timer = setTimeout(() => {
        if (cancelled) return
        index = (index + 1) % words.length
        el.textContent     = words[index]
        el.style.transition = 'none'
        el.style.transform  = 'translate3d(0,60%,0)'
        el.style.opacity    = '0'
        void el.offsetWidth
        el.style.transition = 'transform 500ms cubic-bezier(0.19,1,0.22,1), opacity 500ms ease-out'
        el.style.transform  = 'translate3d(0,0,0)'
        el.style.opacity    = '1'
        timer = setTimeout(tick, 2400)
      }, 400)
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

  // ── Animation variants ────────────────────────────────────────────────────
  const letterVariants = {
    hidden: { y: '115%', opacity: 0, rotateZ: -8 },
    visible: (i: number) => ({
      y: '0%', opacity: 1, rotateZ: 0,
      transition: {
        delay: 0.04 + i * 0.038,
        duration: 1.05,
        ease: [0.19, 1, 0.22, 1] as [number, number, number, number],
      },
    }),
  }

  const itemVariants = {
    hidden:   { y: 50, opacity: 0 },
    visible: {
      y: 0, opacity: 1,
      transition: { duration: 1.1, ease: [0.19, 1, 0.22, 1] as [number, number, number, number] },
    },
  }

  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1, delayChildren: 0.08 } },
  }

  const isVisible = isReady ? 'visible' : 'hidden'

  return (
    <section
      id="hero"
      ref={containerRef}
      className="relative min-h-screen flex flex-col justify-end overflow-hidden px-6 pb-16 md:px-12 md:pb-24 lg:px-20 lg:pb-28"
    >
      {/* ── Background layers ── */}

      {/* Deep space background gradient */}
      <div className="hero-galaxy-bg" aria-hidden="true" />

      {/* WebGL galaxy */}
      <HeroParticles isReady={isReady} />

      {/* Radial vignette — frames content, darkens edges */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 70% at 50% 100%, transparent 30%, rgba(10,10,10,0.55) 70%, rgba(10,10,10,0.92) 100%)',
          zIndex: 2,
        }}
        aria-hidden="true"
      />

      {/* Top vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(10,10,10,0.85) 0%, transparent 30%)',
          zIndex: 2,
        }}
        aria-hidden="true"
      />

      {/* Orb 1 — close/warm violet, large */}
      <div
        ref={orbRef}
        className="absolute top-[10%] right-[-5%] md:right-[5%] pointer-events-none"
        style={{
          width:  'clamp(400px, 70vw, 1000px)',
          height: 'clamp(400px, 70vw, 1000px)',
          borderRadius: '50%',
          background: 'radial-gradient(circle at 40% 40%, rgba(139,92,246,0.22) 0%, rgba(124,58,237,0.08) 40%, transparent 70%)',
          filter: 'blur(70px)',
          willChange: 'transform',
          transform: 'translate3d(0,0,0)',
          zIndex: 2,
        }}
      />

      {/* Orb 2 — distant/cool indigo */}
      <div
        ref={orb2Ref}
        className="absolute bottom-[10%] left-[-5%] pointer-events-none"
        style={{
          width:  'clamp(250px, 40vw, 600px)',
          height: 'clamp(250px, 40vw, 600px)',
          borderRadius: '50%',
          background: 'radial-gradient(circle at 60% 60%, rgba(99,102,241,0.14) 0%, rgba(67,56,202,0.05) 50%, transparent 75%)',
          filter: 'blur(90px)',
          willChange: 'transform',
          transform: 'translate3d(0,0,0)',
          zIndex: 2,
        }}
      />

      {/* Horizon glow — atmospheric bottom edge */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{
          height: 'clamp(120px, 20vh, 280px)',
          background: 'linear-gradient(to top, rgba(124,58,237,0.08) 0%, rgba(99,102,241,0.04) 40%, transparent 100%)',
          zIndex: 2,
        }}
        aria-hidden="true"
      />

      {/* ── Content ── */}
      <m.div
        variants={containerVariants}
        initial="hidden"
        animate={isVisible}
        className="relative max-w-[1600px] w-full"
        style={{ zIndex: 10 }}
      >
        {/* Availability badge */}
        <m.div variants={itemVariants} className="mb-6 md:mb-8">
          <div className="inline-flex items-center gap-2.5 font-mono text-[11px] md:text-xs text-muted tracking-widest uppercase">
            <span className="hero-availability-dot" aria-hidden="true" />
            {t('availability')}
          </div>
        </m.div>

        {/* Name block */}
        <div className="mb-8 md:mb-10">
          {/* JÉROME — gradient accent */}
          <div
            className="overflow-hidden"
            style={{ lineHeight: 1 }}
          >
            <div
              className="flex flex-wrap leading-none tracking-tighter font-black"
              style={{ fontSize: 'clamp(3.8rem, 11.5vw, 12rem)' }}
            >
              {JEROME.map((char, i) => (
                <span key={i} style={{ overflow: 'hidden', display: 'inline-block', lineHeight: 1.05 }}>
                  <m.span
                    custom={i}
                    variants={letterVariants}
                    initial="hidden"
                    animate={isVisible}
                    className="hero-name-gradient"
                    style={{ display: 'inline-block', willChange: 'transform, opacity' }}
                  >
                    {char}
                  </m.span>
                </span>
              ))}
            </div>
          </div>

          {/* DELODDER — plain white */}
          <div
            className="overflow-hidden"
            style={{ lineHeight: 1, marginTop: '-0.04em' }}
          >
            <div
              className="flex flex-wrap leading-none tracking-tighter font-black text-foreground"
              style={{ fontSize: 'clamp(3.8rem, 11.5vw, 12rem)' }}
            >
              {DELODDER.map((char, i) => (
                <span key={i} style={{ overflow: 'hidden', display: 'inline-block', lineHeight: 1.05 }}>
                  <m.span
                    custom={JEROME.length + i}
                    variants={letterVariants}
                    initial="hidden"
                    animate={isVisible}
                    style={{ display: 'inline-block', willChange: 'transform, opacity' }}
                  >
                    {char}
                  </m.span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Tagline + CTAs */}
        <m.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row sm:items-end gap-6 sm:gap-10"
        >
          <div className="max-w-[480px]">
            <p className="font-sans text-muted text-base md:text-lg leading-relaxed mb-1">
              {t('tagline')}
            </p>
            <p className="font-sans text-muted text-base md:text-lg leading-relaxed">
              {t('buildPrefix')}{' '}
              <span
                className="inline-block overflow-hidden align-bottom"
                style={{ height: '1.25em', verticalAlign: 'bottom' }}
              >
                <span
                  ref={wordRef}
                  className="inline-block text-accent-light font-semibold"
                  style={{ willChange: 'transform, opacity' }}
                >
                  {words[0]}
                </span>
              </span>
            </p>
          </div>

          <div className="flex items-center gap-5 sm:ml-auto">
            {/* Ghost CTA */}
            <a
              href="#work"
              data-magnetic
              className="magnetic-wrap group relative inline-flex items-center gap-2.5 font-mono text-xs uppercase tracking-widest text-foreground transition-colors duration-300 hover:text-accent"
            >
              <span className="absolute -inset-3 rounded-full border border-border/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              {t('cta_work')}
              <svg
                width="14" height="14" viewBox="0 0 14 14" fill="none"
                className="transition-transform duration-300 group-hover:translate-x-1.5"
                aria-hidden="true"
              >
                <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>

            {/* Filled pill CTA */}
            <a
              href="#contact"
              data-magnetic
              data-cursor="cta"
              className="magnetic-wrap hero-cta-pill"
            >
              {t('cta_contact')}
            </a>
          </div>
        </m.div>

        {/* Scroll indicator — right side */}
        <m.div
          variants={itemVariants}
          className="absolute bottom-0 right-0 hidden md:flex flex-col items-center gap-2"
          aria-hidden="true"
        >
          <span className="font-mono text-[10px] text-muted uppercase tracking-[0.18em] [writing-mode:vertical-rl]">
            {t('scroll')}
          </span>
          <m.div
            className="w-px h-14 origin-top"
            style={{
              background: 'linear-gradient(to bottom, #7c3aed, rgba(167,139,250,0.4), transparent)',
            }}
            animate={{ scaleY: [0, 1, 0] }}
            transition={{ duration: 2.0, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
          />
        </m.div>
      </m.div>

      {/* Bottom divider */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(to right, transparent, rgba(124,58,237,0.3), rgba(99,102,241,0.2), transparent)', zIndex: 10 }}
      />
    </section>
  )
}
