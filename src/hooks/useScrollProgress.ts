'use client'

/**
 * useScrollProgress — singleton RAF scroll driver.
 *
 * Writes three CSS custom properties to <html> so all Nav sub-components
 * and CSS can react purely in the compositor without any React re-renders:
 *
 *   --nav-progress  0..1   page scroll progress (drives logo ring)
 *   --nav-blur      0..12  backdrop-filter blur value in px
 *   --nav-pill      0..1   hero→pill transition coefficient (crosses at 60px)
 *
 * Also calls onScrollStateChange when the state crosses the 60px boundary.
 *
 * Integration with Lenis:
 *   Reads getLenis()?.scroll (Lenis smoothed position) when available, else
 *   falls back to window.scrollY. This guarantees the ring + pill track the
 *   same smooth position that the rest of the page uses.
 *
 * Performance:
 *   - One passive scroll listener + one RAF (self-suspending when idle)
 *   - setProperty is skipped when the delta < 0.0005 → no compositor flush
 *   - will-change lifecycle managed by the CSS, not here
 */

import { useEffect, useRef, useCallback } from 'react'
import { getLenis } from '@/hooks/useLenis'

type ScrollState = 'hero' | 'pill'

interface UseScrollProgressOptions {
  threshold?: number                                       // px to cross (default 60)
  onScrollStateChange?: (state: ScrollState) => void
}

// ─── CSS property helpers ─────────────────────────────────────────────────────

function setProp(name: string, value: string) {
  document.documentElement.style.setProperty(name, value)
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useScrollProgress({
  threshold = 60,
  onScrollStateChange,
}: UseScrollProgressOptions = {}) {
  const rafRef       = useRef<number>(0)
  const stateRef     = useRef<ScrollState>('hero')
  const prevProgressRef = useRef(-1)
  const prevBlurRef  = useRef(-1)
  const prevPillRef  = useRef(-1)
  const cbRef        = useRef(onScrollStateChange)
  cbRef.current      = onScrollStateChange

  const loop = useCallback(() => {
    rafRef.current = 0

    // ── Raw scroll position ───────────────────────────────────────────────────
    const lenis   = getLenis()
    const scrollY = lenis ? lenis.scroll : window.scrollY
    const docH    = document.documentElement.scrollHeight - window.innerHeight

    // ── Progress (page %) ─────────────────────────────────────────────────────
    const rawProgress = docH > 0 ? Math.min(scrollY / docH, 1) : 0

    // ── Pill coefficient — smooth step between threshold and threshold+40px ───
    // smoothstep(edge0, edge1, x) gives a perceptually-linear S-curve entry.
    const edge0   = threshold
    const edge1   = threshold + 40
    const t       = Math.max(0, Math.min(1, (scrollY - edge0) / (edge1 - edge0)))
    const rawPill = t * t * (3 - 2 * t)            // smoothstep

    // ── Blur: 0px at hero → 14px at full pill ────────────────────────────────
    const rawBlur = rawPill * 14

    // ── Write CSS props only on meaningful change (saves compositor flushes) ──
    if (Math.abs(rawProgress - prevProgressRef.current) > 0.0005) {
      setProp('--nav-progress', rawProgress.toFixed(4))
      prevProgressRef.current = rawProgress

      // Drive the SVG ring dashoffset directly — CSS calc on stroke-dashoffset
      // is not well-supported as a presentation attribute, so we use JS.
      // C = 2π*20 ≈ 125.664
      const CIRCUMFERENCE = 125.664
      const ring = document.querySelector<SVGCircleElement>('.nav-logo-ring-circle')
      if (ring) {
        const offset = CIRCUMFERENCE * (1 - rawProgress)
        ring.style.strokeDashoffset = offset.toFixed(3)
      }
    }
    if (Math.abs(rawPill - prevPillRef.current) > 0.0005) {
      setProp('--nav-pill', rawPill.toFixed(4))
      prevPillRef.current = rawPill
    }
    if (Math.abs(rawBlur - prevBlurRef.current) > 0.05) {
      setProp('--nav-blur', `${rawBlur.toFixed(2)}px`)
      prevBlurRef.current = rawBlur
    }

    // ── State machine (hero ↔ pill) ───────────────────────────────────────────
    const newState: ScrollState = scrollY > threshold ? 'pill' : 'hero'
    if (newState !== stateRef.current) {
      stateRef.current = newState
      cbRef.current?.(newState)
    }
  }, [threshold])

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Init values immediately (before first scroll)
    setProp('--nav-progress', '0')
    setProp('--nav-pill',     '0')
    setProp('--nav-blur',     '0px')

    const scheduleLoop = () => {
      if (rafRef.current === 0) {
        rafRef.current = requestAnimationFrame(loop)
      }
    }

    window.addEventListener('scroll', scheduleLoop, { passive: true })
    // Also tick on Lenis scroll events (fires on smooth virtual position)
    const lenis = getLenis()
    lenis?.on('scroll', scheduleLoop)

    // Initial tick
    scheduleLoop()

    return () => {
      window.removeEventListener('scroll', scheduleLoop)
      lenis?.off('scroll', scheduleLoop)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
  }, [loop])
}
