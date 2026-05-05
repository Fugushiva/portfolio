'use client'

/**
 * Hero — cinematic world-class opening screen ("Galaxy Engine v2").
 *
 * Composition (back to front, by z-index):
 *   z 0  HeroParticles        WebGL galaxy (stars, nebula, dust, lines)
 *   z 1  HeroShootingStars    Canvas2D comets w/ chromatic trails
 *   z 2  Vignettes / orbs / godrays / aurora
 *   z 10 Foreground content (badge, name, taglines, CTAs)
 *
 * Cursor gravity & click ripple live in HeroParticles (shader uniforms).
 * Name effects live in HeroName (gradient/shimmer/chromatic/tilt/scramble).
 *
 * The whole hero gracefully degrades on prefers-reduced-motion and on
 * coarse pointers — see each child component.
 */

import { useEffect, useRef, useState } from 'react'
import { m } from 'framer-motion'
import { useTranslations } from 'next-intl'
import HeroParticles     from './HeroParticles'
import HeroShootingStars from './HeroShootingStars'
import HeroAurora        from './HeroAurora'
import HeroName          from './HeroName'

interface HeroProps {
  isReady: boolean
}

export default function Hero({ isReady }: HeroProps) {
  const t     = useTranslations('hero')
  const words = t.raw('words') as string[]

  const containerRef = useRef<HTMLDivElement>(null)
  const orbRef       = useRef<HTMLDivElement>(null)
  const orb2Ref      = useRef<HTMLDivElement>(null)
  const wordRef      = useRef<HTMLSpanElement>(null)

  // Pause heavy children when hero leaves viewport
  const [active, setActive] = useState(true)

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

  // ── Pause heavy children when hero leaves viewport ────────────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting),
      { threshold: 0 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // ── Animation variants ────────────────────────────────────────────────────
  const itemVariants = {
    hidden:  { y: 50, opacity: 0 },
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

      {/* Deep space background gradient (z 0) */}
      <div className="hero-galaxy-bg" aria-hidden="true" />

      {/* WebGL galaxy (z 0) */}
      <HeroParticles isReady={isReady} />

      {/* Comets (z 1) */}
      <HeroShootingStars isReady={isReady} active={active} />

      {/* Aurora ribbon (z 2) — lazy mounted after idle */}
      <HeroAurora isReady={isReady} />

      {/* Volumetric godrays from top-right (z 2) */}
      <div className="hero-godrays" aria-hidden="true" />

      {/* Radial vignette — frames content, darkens edges (z 2) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 70% at 50% 100%, transparent 30%, rgba(10,10,10,0.55) 70%, rgba(10,10,10,0.92) 100%)',
          zIndex: 2,
        }}
        aria-hidden="true"
      />

      {/* Top vignette (z 2) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(10,10,10,0.85) 0%, transparent 30%)',
          zIndex: 2,
        }}
        aria-hidden="true"
      />

      {/* Orb 1 — close/warm violet, large (z 2) */}
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

      {/* Orb 2 — distant/cool indigo (z 2) */}
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

      {/* Horizon glow — atmospheric bottom edge (z 2) */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{
          height: 'clamp(120px, 20vh, 280px)',
          background: 'linear-gradient(to top, rgba(124,58,237,0.08) 0%, rgba(99,102,241,0.04) 40%, transparent 100%)',
          zIndex: 2,
        }}
        aria-hidden="true"
      />

      {/* ── Content (z 10) ── */}
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

        {/* Name block — extracted */}
        <HeroName isReady={isReady} />

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
