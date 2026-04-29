'use client'

import { useEffect, useRef } from 'react'

// ─── Magnetic cursor ───────────────────────────────────────────────────────────
//
// Architecture:
// - Event delegation: 1 mousemove + 1 mouseover/mouseout on document, not
//   N×2 listeners per [data-magnetic] element.
// - Self-suspending RAF loop: stops when ring has caught up to pointer
//   (< 0.3px delta) and resumes on next mousemove. This eliminates the
//   idle compositor hit of an always-on RAF.
// - GPU-only positioning via translate3d — no left/top writes.
//
// Lerp tuning:
// - Cursor dot: 0.40 — fast enough to feel "attached" to the pointer,
//   slow enough to add a tiny bit of personality. 0.45 was slightly
//   jittery on 144Hz displays.
// - Ring: 0.10 — noticeable trail. 0.14 was too snappy and made the ring
//   look like a second cursor rather than a magnetic halo.

export function useMagneticCursor() {
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(pointer: coarse)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const cursor = document.querySelector<HTMLDivElement>('.cursor')
    const ring = document.querySelector<HTMLDivElement>('.cursor-ring')
    if (!cursor || !ring) return

    // Start off-screen so cursor doesn't flash at (0,0) on load.
    let targetX = -200
    let targetY = -200
    let cursorX = -200
    let cursorY = -200
    let ringX = -200
    let ringY = -200
    let dirty = true
    let visible = true

    const onMove = (e: MouseEvent) => {
      targetX = e.clientX
      targetY = e.clientY
      dirty = true
      if (rafRef.current === 0) rafRef.current = requestAnimationFrame(loop)
    }

    const onOver = (e: Event) => {
      const target = (e.target as HTMLElement | null)?.closest?.('[data-magnetic]')
      if (target) {
        cursor.classList.add('is-hovering')
        ring.classList.add('is-hovering')
      }
    }

    const onOut = (e: Event) => {
      // Only remove if we actually left a magnetic element (not a child).
      const relatedTarget = (e as MouseEvent).relatedTarget as HTMLElement | null
      const fromMagnetic = (e.target as HTMLElement | null)?.closest?.('[data-magnetic]')
      if (fromMagnetic && !fromMagnetic.contains(relatedTarget)) {
        cursor.classList.remove('is-hovering')
        ring.classList.remove('is-hovering')
      }
    }

    const onVisibility = () => {
      visible = !document.hidden
      if (visible && dirty && rafRef.current === 0) {
        rafRef.current = requestAnimationFrame(loop)
      }
    }

    const loop = () => {
      // Cursor: fast lerp — feels "attached".
      cursorX += (targetX - cursorX) * 0.40
      cursorY += (targetY - cursorY) * 0.40

      // Ring: slower lerp — magnetic halo with visible trail.
      ringX += (targetX - ringX) * 0.10
      ringY += (targetY - ringY) * 0.10

      cursor.style.transform = `translate3d(${cursorX.toFixed(1)}px, ${cursorY.toFixed(1)}px, 0) translate(-50%, -50%)`
      ring.style.transform   = `translate3d(${ringX.toFixed(1)}px,   ${ringY.toFixed(1)}px,   0) translate(-50%, -50%)`

      const delta = Math.abs(targetX - ringX) + Math.abs(targetY - ringY)
      if (delta < 0.3 || !visible) {
        // Ring has caught up — suspend the loop until next pointer event.
        rafRef.current = 0
        dirty = false
        return
      }
      rafRef.current = requestAnimationFrame(loop)
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    document.addEventListener('mouseover', onOver, { passive: true })
    document.addEventListener('mouseout', onOut, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseover', onOver)
      document.removeEventListener('mouseout', onOut)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])
}
