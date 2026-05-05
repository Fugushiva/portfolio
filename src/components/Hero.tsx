'use client'

import { useEffect, useRef } from 'react'
import { m } from 'framer-motion'
import { useTranslations } from 'next-intl'
import HeroParticles from './HeroParticles'

interface HeroProps {
  isReady: boolean
}

export default function Hero({ isReady }: HeroProps) {
  const t = useTranslations('hero')
  const words = t.raw('words') as string[]

  const containerRef = useRef<HTMLDivElement>(null)
  const orbRef = useRef<HTMLDivElement>(null)
  const orb2Ref = useRef<HTMLDivElement>(null)
  const wordRef = useRef<HTMLSpanElement>(null)

  // ── Multi-orb mouse parallax ──────────────────────────────────────────────
  // Two orbs at different depths create a parallax sense of 3D space.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (window.matchMedia('(pointer: coarse)').matches) return

    const orb  = orbRef.current
    const orb2 = orb2Ref.current
    if (!orb || !orb2) return

    let targetX = 0, targetY = 0
    let currentX = 0, currentY = 0
    let currentX2 = 0, currentY2 = 0
    let rafId = 0

    const onMove = (e: MouseEvent) => {
      targetX = (e.clientX / window.innerWidth - 0.5) * 60
      targetY = (e.clientY / window.innerHeight - 0.5) * 40
      if (rafId === 0) rafId = requestAnimationFrame(loop)
    }

    const loop = () => {
      // Orb 1: fast lerp — feels close
      currentX  += (targetX  - currentX)  * 0.06
      currentY  += (targetY  - currentY)  * 0.06
      // Orb 2: slow lerp + deeper magnitude — feels far away
      currentX2 += (targetX * 1.6 - currentX2) * 0.03
      currentY2 += (targetY * 1.6 - currentY2) * 0.03

      orb.style.transform  = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0)`
      orb2.style.transform = `translate3d(${(-currentX2 * 0.6).toFixed(2)}px, ${(-currentY2 * 0.6).toFixed(2)}px, 0)`

      const delta = Math.abs(targetX - currentX) + Math.abs(targetY - currentY)
      if (delta < 0.05) { rafId = 0; return }
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

    el.style.transition =
      'transform 380ms cubic-bezier(0.55, 0, 0.55, 0.2), opacity 380ms ease'
    el.textContent = words[0]

    const tick = () => {
      if (cancelled) return
      el.style.transform = 'translate3d(0, -110%, 0)'
      el.style.opacity = '0'

      timer = setTimeout(() => {
        if (cancelled) return
        index = (index + 1) % words.length
        el.textContent = words[index]
        el.style.transition = 'none'
        el.style.transform = 'translate3d(0, 60%, 0)'
        el.style.opacity = '0'
        void el.offsetWidth
        el.style.transition =
          'transform 480ms cubic-bezier(0.19, 1, 0.22, 1), opacity 480ms ease-out'
        el.style.transform = 'translate3d(0, 0, 0)'
        el.style.opacity = '1'
        timer = setTimeout(tick, 2200)
      }, 380)
    }

    timer = setTimeout(tick, 2200)

    const onVisibility = () => {
      if (document.hidden && timer) {
        clearTimeout(timer); timer = null
      } else if (!document.hidden && !timer && !cancelled) {
        timer = setTimeout(tick, 2200)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [isReady, words])

  // ─── Letter-level stagger for the name  ──────────────────────────────────
  const JEROME = ['J', 'é', 'r', 'ô', 'm', 'e']
  const DELODDER = ['D', 'e', 'l', 'o', 'd', 'd', 'e', 'r']

  const letterVariants = {
    hidden: { y: '110%', opacity: 0, rotateZ: -6 },
    visible: (i: number) => ({
      y: '0%',
      opacity: 1,
      rotateZ: 0,
      transition: {
        delay: 0.05 + i * 0.04,
        duration: 1.0,
        ease: [0.19, 1, 0.22, 1] as [number, number, number, number],
      },
    }),
  }

  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
  }

  const itemVariants = {
    hidden: { y: 60, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 1.1, ease: [0.19, 1, 0.22, 1] as [number, number, number, number] },
    },
  }

  return (
    <section
      id="hero"
      ref={containerRef}
      className="relative min-h-screen flex flex-col justify-end overflow-hidden px-6 pb-16 md:px-12 md:pb-24 lg:px-20 lg:pb-28"
    >
      {/* WebGL particle background */}
      <HeroParticles isReady={isReady} />

      {/* Orb 1 — close/warm */}
      <div
        ref={orbRef}
        className="absolute top-1/4 right-0 md:right-[10%] pointer-events-none"
        style={{
          width:  'clamp(300px, 60vw, 800px)',
          height: 'clamp(300px, 60vw, 800px)',
          borderRadius: '50%',
          background:
            'radial-gradient(circle at center, rgba(124,58,237,0.12) 0%, rgba(124,58,237,0.04) 50%, transparent 75%)',
          filter: 'blur(80px)',
          willChange: 'transform',
          transform: 'translate3d(0,0,0)',
          zIndex: 1,
        }}
      />

      {/* Orb 2 — distant/cool, opposite parallax */}
      <div
        ref={orb2Ref}
        className="absolute bottom-[15%] left-[5%] pointer-events-none"
        style={{
          width:  'clamp(200px, 35vw, 500px)',
          height: 'clamp(200px, 35vw, 500px)',
          borderRadius: '50%',
          background:
            'radial-gradient(circle at center, rgba(59,130,246,0.07) 0%, rgba(59,130,246,0.02) 50%, transparent 75%)',
          filter: 'blur(90px)',
          willChange: 'transform',
          transform: 'translate3d(0,0,0)',
          zIndex: 1,
        }}
      />

      {/* Content */}
      <m.div
        variants={containerVariants}
        initial="hidden"
        animate={isReady ? 'visible' : 'hidden'}
        className="relative z-10 max-w-[1600px] w-full"
      >
        {/* Eyebrow */}
        <m.div variants={itemVariants} className="split-line mb-6 md:mb-8">
          <span className="font-mono text-xs md:text-sm text-muted tracking-widest uppercase">
            {t('availability')}
          </span>
        </m.div>

        {/* Name — letter-by-letter stagger with overflow:hidden mask */}
        <div
          className="overflow-hidden mb-1 md:mb-2"
          style={{ lineHeight: 1 }}
        >
          <div
            className="flex flex-wrap leading-none tracking-tighter font-black text-foreground"
            style={{ fontSize: 'clamp(3.5rem, 11vw, 11.5rem)' }}
          >
            {JEROME.map((char, i) => (
              <span key={i} style={{ overflow: 'hidden', display: 'inline-block', lineHeight: 1.05 }}>
                <m.span
                  custom={i}
                  variants={letterVariants}
                  initial="hidden"
                  animate={isReady ? 'visible' : 'hidden'}
                  style={{ display: 'inline-block', willChange: 'transform, opacity' }}
                >
                  {char}
                </m.span>
              </span>
            ))}
          </div>
        </div>

        <div
          className="overflow-hidden mb-8 md:mb-10"
          style={{ lineHeight: 1 }}
        >
          <div
            className="flex flex-wrap leading-none tracking-tighter font-black text-foreground"
            style={{ fontSize: 'clamp(3.5rem, 11vw, 11.5rem)' }}
          >
            {DELODDER.map((char, i) => (
              <span key={i} style={{ overflow: 'hidden', display: 'inline-block', lineHeight: 1.05 }}>
                <m.span
                  custom={JEROME.length + i}
                  variants={letterVariants}
                  initial="hidden"
                  animate={isReady ? 'visible' : 'hidden'}
                  style={{ display: 'inline-block', willChange: 'transform, opacity' }}
                >
                  {char}
                </m.span>
              </span>
            ))}
          </div>
        </div>

        {/* Tagline row */}
        <m.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-8"
        >
          <p className="font-sans text-muted text-base md:text-lg max-w-[420px] leading-relaxed">
            {t('tagline')}<br />
            {t('buildPrefix')}{' '}
            <span
              className="inline-block overflow-hidden align-bottom"
              style={{ height: '1.2em', verticalAlign: 'bottom' }}
            >
              <span
                ref={wordRef}
                className="inline-block text-accent font-semibold"
                style={{ willChange: 'transform, opacity' }}
              >
                {words[0]}
              </span>
            </span>
          </p>

          <div className="flex items-center gap-6 sm:ml-auto">
            <a
              href="#work"
              data-magnetic
              className="magnetic-wrap group relative inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-foreground transition-colors duration-300 hover:text-accent"
            >
              <span
                className="absolute -inset-3 rounded-full border border-border opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              />
              {t('cta_work')}
              <m.svg
                width="16" height="16" viewBox="0 0 16 16" fill="none"
                className="transition-transform duration-300 group-hover:translate-x-1"
                whileHover={{ x: 3 }}
                transition={{ duration: 0.3 }}
              >
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </m.svg>
            </a>

            <a
              href="#contact"
              data-magnetic
              className="magnetic-wrap liquid-btn relative inline-flex items-center justify-center px-6 py-3 font-mono text-xs uppercase tracking-widest border border-accent text-accent rounded-full transition-all duration-400 hover:bg-accent hover:text-bg"
            >
              {t('cta_contact')}
            </a>
          </div>
        </m.div>

        {/* Scroll indicator */}
        <m.div
          variants={itemVariants}
          className="absolute bottom-0 right-0 hidden md:flex flex-col items-center gap-2"
        >
          <div className="flex flex-col items-center gap-1">
            <span className="font-mono text-[10px] text-muted uppercase tracking-widest [writing-mode:vertical-rl]">
              {t('scroll')}
            </span>
            <m.div
              className="w-px h-12 bg-gradient-to-b from-accent to-transparent origin-top"
              animate={{ scaleY: [0, 1, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
            />
          </div>
        </m.div>
      </m.div>

      {/* Bottom divider */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </section>
  )
}
