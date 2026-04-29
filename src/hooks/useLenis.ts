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
//
// GSAP ScrollTrigger integration:
// - Lenis fires a 'scroll' event on every RAF tick with the interpolated
//   scrollY value. We forward that into ScrollTrigger.update() so
//   ScrollTrigger reads Lenis's smooth position rather than the raw
//   window.scrollY, keeping both systems perfectly in sync.
//   This is the canonical Lenis + ScrollTrigger pattern.

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

    // Connect Lenis scroll events to GSAP ScrollTrigger (if loaded).
    // ScrollTrigger is loaded lazily by useGSAPReveal; we poll until it's
    // available rather than importing it here (avoids GSAP in the main bundle).
    let scrollTriggerProxy: (() => void) | null = null
    const connectScrollTrigger = () => {
      // @ts-expect-error — GSAP is loaded asynchronously, not in types
      const ST = typeof window !== 'undefined' && window.__gsap_ScrollTrigger__
      if (ST) {
        const handler = () => ST.update()
        lenis.on('scroll', handler)
        scrollTriggerProxy = () => lenis.off('scroll', handler)
      }
    }

    // Try immediately (in case GSAP already loaded), then again after a
    // short delay to handle the async chunk case.
    connectScrollTrigger()
    const retryTimer = setTimeout(connectScrollTrigger, 500)

    const raf = (time: number) => {
      lenis.raf(time)
      rafRef.current = requestAnimationFrame(raf)
    }
    rafRef.current = requestAnimationFrame(raf)

    return () => {
      clearTimeout(retryTimer)
      cancelAnimationFrame(rafRef.current)
      scrollTriggerProxy?.()
      lenis.destroy()
      lenisInstance = null
    }
  }, [])
}
