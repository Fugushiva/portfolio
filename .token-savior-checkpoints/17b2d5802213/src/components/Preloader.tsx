'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, m } from 'framer-motion'

const LETTERS = ['J', 'É', 'R', 'Ô', 'M', 'E']

const COUNTER_DURATION = 1600
const EXIT_DURATION    = 700
const VISITED_KEY      = 'jd_seen_preload_v1'

interface PreloaderProps {
  onComplete: () => void
}

export default function Preloader({ onComplete }: PreloaderProps) {
  const [visible, setVisible] = useState(false)
  const [phase, setPhase] = useState<'entering' | 'counting' | 'exiting'>('entering')
  const counterRef    = useRef<HTMLSpanElement>(null)
  const onCompleteRef = useRef(onComplete)
  useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let visited = false
    try { visited = sessionStorage.getItem(VISITED_KEY) === '1' } catch { /* blocked */ }

    if (prefersReducedMotion || visited) {
      setVisible(false)
      document.body.classList.remove('is-loading')
      onCompleteRef.current()
      return
    }

    document.body.classList.add('is-loading')
    setVisible(true)

    // Phase 1: letters enter (400ms), then counting phase
    const phaseTimer = window.setTimeout(() => {
      setPhase('counting')

      // Phase 2: count up
      let start = 0
      let raf = 0
      const step = (ts: number) => {
        if (!counterRef.current) return
        if (start === 0) start = ts
        const progress = Math.min((ts - start) / COUNTER_DURATION, 1)
        // Eased progress for more cinematic feel
        const eased = 1 - Math.pow(1 - progress, 3)
        counterRef.current.textContent = String(Math.floor(eased * 100)).padStart(3, '0')
        if (progress < 1) raf = requestAnimationFrame(step)
      }
      raf = requestAnimationFrame(step)

      // Phase 3: exit
      let exitFinishTimer: number | null = null
      const exitTimer = window.setTimeout(() => {
        try { sessionStorage.setItem(VISITED_KEY, '1') } catch { /* blocked */ }
        document.body.classList.remove('is-loading')
        setPhase('exiting')
        setVisible(false)
        exitFinishTimer = window.setTimeout(() => onCompleteRef.current(), EXIT_DURATION + 100)
      }, COUNTER_DURATION + 200)

      return () => {
        cancelAnimationFrame(raf)
        window.clearTimeout(exitTimer)
        if (exitFinishTimer !== null) window.clearTimeout(exitFinishTimer)
      }
    }, 350)

    return () => {
      window.clearTimeout(phaseTimer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <AnimatePresence>
      {visible && (
        <m.div
          key="preloader"
          className="fixed inset-0 z-[9998] flex flex-col items-center justify-center bg-bg overflow-hidden"
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: EXIT_DURATION / 1000, ease: [0.76, 0, 0.24, 1] }}
        >
          {/* Scan line atmosphere */}
          <div className="scan-line" aria-hidden="true" />
          <div
            className="scan-line"
            aria-hidden="true"
            style={{ animationDelay: '1s', opacity: 0.4 }}
          />

          {/* Corner decorations */}
          <div className="absolute top-8 left-8 flex flex-col gap-1" aria-hidden="true">
            <div className="w-8 h-px bg-accent/50" />
            <div className="w-px h-8 bg-accent/50" />
          </div>
          <div className="absolute top-8 right-8 flex flex-col items-end gap-1" aria-hidden="true">
            <div className="w-8 h-px bg-accent/50" />
            <div className="w-px h-8 bg-accent/50 ml-auto" />
          </div>
          <div className="absolute bottom-8 left-8 flex flex-col gap-1" aria-hidden="true">
            <div className="w-px h-8 bg-accent/50" />
            <div className="w-8 h-px bg-accent/50" />
          </div>
          <div className="absolute bottom-8 right-8 flex flex-col items-end gap-1" aria-hidden="true">
            <div className="w-px h-8 bg-accent/50 ml-auto" />
            <div className="w-8 h-px bg-accent/50" />
          </div>

          {/* Tagline — top */}
          <m.p
            className="absolute top-10 left-1/2 -translate-x-1/2 font-mono text-[10px] text-muted/40 tracking-[0.35em] uppercase whitespace-nowrap"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            Loading experience
          </m.p>

          {/* Main name — letters stagger in from below */}
          <div className="relative flex overflow-visible" aria-label="Jérôme">
            {LETTERS.map((letter, i) => (
              <m.span
                key={i}
                className="block font-sans font-black text-foreground relative"
                style={{
                  fontSize: 'clamp(3.5rem, 10vw, 9rem)',
                  lineHeight: 1,
                  letterSpacing: '-0.04em',
                }}
                initial={{ y: '120%', opacity: 0, rotateZ: -8 }}
                animate={{ y: '0%', opacity: 1, rotateZ: 0 }}
                transition={{
                  delay: 0.05 + i * 0.06,
                  duration: 0.85,
                  ease: [0.19, 1, 0.22, 1],
                }}
              >
                {letter}
              </m.span>
            ))}

            {/* Accent underline draws after letters */}
            <m.div
              className="absolute -bottom-2 left-0 right-0 h-px origin-left"
              style={{
                background: 'linear-gradient(90deg, #7c3aed, #a78bfa, transparent)',
              }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.55, duration: 0.9, ease: [0.19, 1, 0.22, 1] }}
            />
          </div>

          {/* Subtitle */}
          <m.p
            className="mt-5 font-mono text-xs text-muted tracking-[0.25em] uppercase"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.7, ease: [0.19, 1, 0.22, 1] }}
          >
            Prompt Engineer &amp; Developer
          </m.p>

          {/* Bottom: progress bar + counter */}
          <m.div
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-5 w-48"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <div className="flex-1 h-px bg-border/60 overflow-hidden relative">
              {/* Track */}
              <m.div
                className="absolute inset-y-0 left-0 bg-accent origin-left"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: phase === 'counting' ? 1 : 0 }}
                transition={{
                  duration: COUNTER_DURATION / 1000,
                  ease: [0.19, 1, 0.22, 1],
                  delay: phase === 'counting' ? 0 : 0,
                }}
              />
              {/* Glowing head */}
              <m.div
                className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-accent-light blur-[1px]"
                initial={{ left: '0%' }}
                animate={{ left: phase === 'counting' ? '100%' : '0%' }}
                transition={{
                  duration: COUNTER_DURATION / 1000,
                  ease: [0.19, 1, 0.22, 1],
                  delay: phase === 'counting' ? 0 : 0,
                }}
              />
            </div>
            <span
              ref={counterRef}
              className="font-mono text-xs text-muted tabular-nums w-8 shrink-0"
            >
              000
            </span>
          </m.div>

          {/* Background radial glow */}
          <m.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none rounded-full"
            style={{
              width: '70vw',
              height: '70vw',
              background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)',
              filter: 'blur(40px)',
            }}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 1.2, ease: [0.19, 1, 0.22, 1] }}
          />
        </m.div>
      )}
    </AnimatePresence>
  )
}
