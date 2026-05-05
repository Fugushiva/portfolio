'use client'

/**
 * useScrollVelocity — exposes a mutable ref carrying the current scroll
 * velocity in pixels/ms, updated each scroll event with low-pass smoothing
 * and exponential decay between events.
 *
 * Consumers read .current inside RAF without triggering React re-renders.
 *
 * Used to drive a "warp drive" effect on the hero starfield: when the user
 * scrolls fast, near stars elongate in their motion direction.
 */

import { useEffect, useRef } from 'react'

export function useScrollVelocity() {
  const ref = useRef(0)

  useEffect(() => {
    if (typeof window === 'undefined') return

    let lastY = window.scrollY
    let lastT = performance.now()
    let raf = 0

    const onScroll = () => {
      const now = performance.now()
      const dt  = Math.max(1, now - lastT)
      const dy  = window.scrollY - lastY
      const v   = dy / dt          // px/ms
      // Low-pass smoothing
      ref.current = ref.current * 0.6 + v * 0.4
      lastY = window.scrollY
      lastT = now
    }

    const decay = () => {
      ref.current *= 0.90
      if (Math.abs(ref.current) < 0.001) ref.current = 0
      raf = requestAnimationFrame(decay)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    raf = requestAnimationFrame(decay)

    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  return ref
}
