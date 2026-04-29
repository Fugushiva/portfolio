'use client'

import { useEffect, useRef } from 'react'
import { m } from 'framer-motion'
import { useTranslations } from 'next-intl'
import HeroParticles from './HeroParticles'

// HeroParticles is imported statically. Although Three.js is browser-only,
// the component itself guards every browser API behind useEffect (which only
// runs client-side). SiteShell's mounted-gate ensures Hero never renders on
// the server anyway — by the time HeroParticles instantiates, we're 100%
// in the browser. Static import avoids the Next.js 15.5 webpack bug where
// dynamic chunks can lose their react module reference.

interface HeroProps {
  isReady: boolean
}

export default function Hero({ isReady }: HeroProps) {
  const t = useTranslations('hero')
  const words = t.raw('words') as string[]

  const containerRef = useRef<HTMLDivElement>(null)
  const orbRef = useRef<HTMLDivElement>(null)
  const wordRef = useRef<HTMLSpanElement>(null)

  // ── Mouse parallax on the orb ─────────────────────────────────────────
  // Previously this called gsap.to(orb, ...) on every mousemove — that
  // imported all of GSAP and queued a tween per pointer event (60+/s).
  // Now: we throttle to one rAF per frame and animate via translate3d
  // directly, no library involved. Smooth, GPU-only, zero deps.
  useEffect(() => {
    if (!orbRef.current) return
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (window.matchMedia('(pointer: coarse)').matches) return

    const orb = orbRef.current
    let targetX = 0
    let targetY = 0
    let currentX = 0
    let currentY = 0
    let rafId = 0

    const onMove = (e: MouseEvent) => {
      targetX = (e.clientX / window.innerWidth - 0.5) * 60
      targetY = (e.clientY / window.innerHeight - 0.5) * 40
      if (rafId === 0) rafId = requestAnimationFrame(loop)
    }

    const loop = () => {
      currentX += (targetX - currentX) * 0.06
      currentY += (targetY - currentY) * 0.06
      orb.style.transform = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0)`
      if (Math.abs(targetX - currentX) + Math.abs(targetY - currentY) < 0.05) {
        rafId = 0
        return
      }
      rafId = requestAnimationFrame(loop)
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    return () => {
      window.removeEventListener('mousemove', onMove)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [])

  // ── Rotating words ────────────────────────────────────────────────────
  // Replaced GSAP tween with a CSS transition + scheduled rAF tick.
  // One transitionend listener swaps text after fade-out, no setInterval
  // race conditions, and the loop pauses when the page is hidden.
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
      // Fade up + out
      el.style.transform = 'translate3d(0, -110%, 0)'
      el.style.opacity = '0'

      timer = setTimeout(() => {
        if (cancelled) return
        index = (index + 1) % words.length
        el.textContent = words[index]
        // Snap below
        el.style.transition = 'none'
        el.style.transform = 'translate3d(0, 60%, 0)'
        el.style.opacity = '0'
        // Force reflow then animate up
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
        clearTimeout(timer)
        timer = null
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

  const containerVariants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: 0.1, delayChildren: 0.1 },
    },
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

      {/* Ambient depth orb — kept very faint behind particles for colour warmth */}
      <div
        ref={orbRef}
        className="absolute top-1/4 right-0 md:right-[10%] w-[clamp(300px,60vw,800px)] h-[clamp(300px,60vw,800px)] rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at center, rgba(124,58,237,0.10) 0%, rgba(124,58,237,0.03) 50%, transparent 75%)',
          filter: 'blur(80px)',
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

        {/* Name headline */}
        <div className="overflow-hidden mb-2 md:mb-4">
          <m.h1
            variants={itemVariants}
            className="font-black text-foreground leading-none tracking-tighter"
            style={{ fontSize: 'clamp(3.5rem, 11vw, 11.5rem)' }}
          >
            Jérôme
          </m.h1>
        </div>

        <div className="overflow-hidden mb-8 md:mb-10">
          <m.h1
            variants={itemVariants}
            className="font-black text-foreground leading-none tracking-tighter"
            style={{ fontSize: 'clamp(3.5rem, 11vw, 11.5rem)' }}
          >
            Delodder
          </m.h1>
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
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="transition-transform duration-300 group-hover:translate-x-1">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>

            <a
              href="#contact"
              data-magnetic
              className="magnetic-wrap relative inline-flex items-center justify-center px-6 py-3 font-mono text-xs uppercase tracking-widest border border-accent text-accent rounded-full transition-all duration-400 hover:bg-accent hover:text-bg"
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
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </m.div>
      </m.div>

      {/* Bottom divider */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </section>
  )
}
