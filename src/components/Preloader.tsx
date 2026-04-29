'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, m } from 'framer-motion'

const LETTERS = ['J', 'É', 'R', 'Ô', 'M', 'E']

const COUNTER_DURATION = 1300
const EXIT_DURATION    = 400
const VISITED_KEY      = 'jd_seen_preload_v1'

interface PreloaderProps {
  onComplete: () => void
}

export default function Preloader({ onComplete }: PreloaderProps) {
  const [visible, setVisible] = useState(false)
  const counterRef    = useRef<HTMLSpanElement>(null)
  // Stable ref so the effect never re-runs because onComplete changed identity
  const onCompleteRef = useRef(onComplete)
  useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let visited = false
    try { visited = sessionStorage.getItem(VISITED_KEY) === '1' } catch { /* blocked */ }

    // ── Bypass path ────────────────────────────────────────────────────
    if (prefersReducedMotion || visited) {
      setVisible(false)
      document.body.classList.remove('is-loading')
      onCompleteRef.current()
      return
    }

    // ── Show splash ────────────────────────────────────────────────────
    document.body.classList.add('is-loading')
    setVisible(true)

    let start = 0
    let raf = 0
    const step = (ts: number) => {
      if (!counterRef.current) return
      if (start === 0) start = ts
      const progress = Math.min((ts - start) / COUNTER_DURATION, 1)
      counterRef.current.textContent = String(Math.floor(progress * 100)).padStart(3, '0')
      if (progress < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)

    let exitFinishTimer: number | null = null
    const exitTimer = window.setTimeout(() => {
      // Mark visited NOW (not at effect-start) so a StrictMode double-mount
      // never sees a stale "visited" flag mid-sequence and short-circuits.
      try { sessionStorage.setItem(VISITED_KEY, '1') } catch { /* blocked */ }

      document.body.classList.remove('is-loading')
      setVisible(false)
      exitFinishTimer = window.setTimeout(() => onCompleteRef.current(), EXIT_DURATION)
    }, COUNTER_DURATION)

    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(exitTimer)
      if (exitFinishTimer !== null) window.clearTimeout(exitFinishTimer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <AnimatePresence>
      {visible && (
        <m.div
          key="preloader"
          className="fixed inset-0 z-[9998] flex flex-col items-center justify-center bg-bg overflow-hidden"
          exit={{ opacity: 0 }}
          transition={{ duration: EXIT_DURATION / 1000, ease: [0.19, 1, 0.22, 1] }}
        >
          {/* Animated name */}
          <div className="flex overflow-hidden" aria-label="Jérôme">
            {LETTERS.map((letter, i) => (
              <m.span
                key={i}
                className="block font-sans font-black text-foreground"
                style={{
                  fontSize: 'clamp(3.5rem, 10vw, 9rem)',
                  lineHeight: 1,
                  letterSpacing: '-0.04em',
                }}
                initial={{ y: '110%', opacity: 0 }}
                animate={{ y: '0%', opacity: 1 }}
                transition={{ delay: i * 0.05, duration: 0.7, ease: [0.19, 1, 0.22, 1] }}
              >
                {letter}
              </m.span>
            ))}
          </div>

          {/* Tagline */}
          <m.p
            className="mt-4 font-mono text-sm text-muted tracking-widest uppercase"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.6, ease: [0.19, 1, 0.22, 1] }}
          >
            Prompt Engineer &amp; Developer
          </m.p>

          {/* Progress bar */}
          <m.div
            className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="w-32 h-px bg-border overflow-hidden">
              <m.div
                className="h-full bg-accent origin-left"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: COUNTER_DURATION / 1000, ease: [0.19, 1, 0.22, 1] }}
              />
            </div>
            <span ref={counterRef} className="font-mono text-xs text-muted tabular-nums w-8">
              000
            </span>
          </m.div>

          {/* Accent glow */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 glow-accent"
            style={{ width: '60vw', height: '60vw', opacity: 0.4 }}
          />
        </m.div>
      )}
    </AnimatePresence>
  )
}
