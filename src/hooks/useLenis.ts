'use client'

import { useEffect, useRef } from 'react'
import Lenis from 'lenis'

// Module-level singleton so Nav can call getLenis() from anywhere.
let lenisInstance: Lenis | null = null

export function getLenis() {
  return lenisInstance
}

// ─── Smooth scroll ─────────────────────────────────────────────────────────────
//
// Design notes:
// - lerp: 0.1 (10% interpolation per frame at 60fps) gives a silky
//   deceleration without feeling "laggy". The old duration:0.9s felt
//   slightly over-damped on fast wheel flicks.
// - smoothWheel: true — required for trackpad momentum on macOS Chrome.
// - wheelMultiplier: 0.85 — slightly less than 1 so one notch on a
//   clicky wheel moves a natural amount without overshooting.
// - We skip Lenis entirely on coarse pointer (touch) — the OS already
//   handles momentum scrolling natively, and double-smooth is nauseating.
// - We also skip on prefers-reduced-motion per WCAG 2.1 SC 2.3.3.

export function useLenis() {
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const isTouch = window.matchMedia('(pointer: coarse)').matches
    if (prefersReducedMotion || isTouch) return

    const lenis = new Lenis({
      // lerp gives momentum feel without the fixed-duration drift.
      // 0.1 = 10% of the delta per frame at 60fps → ~300ms natural settle.
      lerp: 0.1,
      smoothWheel: true,
      wheelMultiplier: 0.85,
      touchMultiplier: 1.2,
      // Sync with overscroll-behavior-y: none on body.
      overscroll: false,
    })

    lenisInstance = lenis

    const raf = (time: number) => {
      lenis.raf(time)
      rafRef.current = requestAnimationFrame(raf)
    }
    rafRef.current = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafRef.current)
      lenis.destroy()
      lenisInstance = null
    }
  }, [])
}
