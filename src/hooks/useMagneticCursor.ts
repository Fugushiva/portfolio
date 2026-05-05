'use client'

/**
 * useMagneticCursor — Premium cursor with:
 *   - Velocity-based cursor stretch (ring squashes/stretches in direction of motion)
 *   - 3 cursor states: default | link | cta
 *     - default : dot + transparent ring with velocity stretch
 *     - link    : ring compresses to horizontal bar (scaleX 2.5, scaleY 0.35)
 *     - cta     : dot expands to solid #7c3aed disc 56px, ring hidden, label "MAIL"
 *   - Magnetic snap: nav links (data-cursor="link") attract the cursor up to 10px
 *     in RAFloop; spring-back on leave
 *   - Self-suspending RAF loop (no idle compositor cost)
 *   - Event delegation: 1 listener each instead of N×element
 *   - Disabled on coarse pointer (touch) and prefers-reduced-motion
 *
 * CSS handles the visual states via data-state attribute:
 *   .cursor[data-state="cta"] { ... }
 *   .cursor-ring[data-state="link"] { ... }
 * (defined in globals.css)
 */

import { useEffect, useRef } from 'react'

// Magnetic snap strength — how strongly the cursor attracts to link targets
const SNAP_STRENGTH = 0.18    // lerp factor (0..1), higher = stronger
const SNAP_MAX_PX   = 10      // maximum snap offset in px
const SNAP_RADIUS   = 80      // px radius within which snap is active

export function useMagneticCursor() {
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(pointer: coarse)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const cursor = document.querySelector<HTMLDivElement>('.cursor')
    const ring   = document.querySelector<HTMLDivElement>('.cursor-ring')
    if (!cursor || !ring) return

    // ── Position tracking ────────────────────────────────────────────────────
    let targetX = -200, targetY = -200
    let cursorX = -200, cursorY = -200
    let ringX   = -200, ringY   = -200

    // ── Velocity tracking for stretch ────────────────────────────────────────
    let prevTargetX = -200, prevTargetY = -200
    let velX = 0, velY = 0

    // ── State ────────────────────────────────────────────────────────────────
    let dirty   = true
    let visible = true
    let currentState: 'default' | 'link' | 'cta' = 'default'

    // ── Magnetic snap state ───────────────────────────────────────────────────
    let snapTargetEl: HTMLElement | null = null
    let snapOffsetX  = 0, snapOffsetY  = 0   // current snap displacement on the link el
    let snapLerpX    = 0, snapLerpY    = 0   // lerped approach

    // ── Helpers ───────────────────────────────────────────────────────────────
    const setState = (state: 'default' | 'link' | 'cta') => {
      if (state === currentState) return
      currentState = state
      cursor.dataset.state = state
      ring.dataset.state   = state
    }

    const scheduleRAF = () => {
      if (rafRef.current === 0) rafRef.current = requestAnimationFrame(loop)
    }

    // ── mousemove ──────────────────────────────────────────────────────────────
    const onMove = (e: MouseEvent) => {
      prevTargetX = targetX
      prevTargetY = targetY
      targetX = e.clientX
      targetY = e.clientY

      const dx = targetX - prevTargetX
      const dy = targetY - prevTargetY
      velX += (dx - velX) * 0.18
      velY += (dy - velY) * 0.18

      dirty = true
      scheduleRAF()
    }

    // ── mouseover delegation ───────────────────────────────────────────────────
    const onOver = (e: Event) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-cursor]')
      if (!el) return

      const cursorType = el.getAttribute('data-cursor') as 'link' | 'cta' | 'default'
      setState(cursorType || 'default')

      if (cursorType === 'link') {
        snapTargetEl = el
      }

      scheduleRAF()
    }

    // ── mouseout delegation ────────────────────────────────────────────────────
    const onOut = (e: Event) => {
      const fromEl = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-cursor]')
      if (!fromEl) return

      const to = (e as MouseEvent).relatedTarget as HTMLElement | null
      if (fromEl.contains(to)) return   // still within element

      // Release magnetic snap — spring back to zero
      if (snapTargetEl === fromEl) {
        snapTargetEl = null
      }

      // Determine new state from whatever we're entering (if any)
      const enterEl = to?.closest<HTMLElement>('[data-cursor]')
      if (enterEl) {
        const cursorType = enterEl.getAttribute('data-cursor') as 'link' | 'cta' | 'default'
        setState(cursorType || 'default')
        if (cursorType === 'link') snapTargetEl = enterEl
      } else {
        setState('default')
      }

      scheduleRAF()
    }

    // ── visibility ────────────────────────────────────────────────────────────
    const onVisibility = () => {
      visible = !document.hidden
      if (visible && dirty) scheduleRAF()
    }

    // ── RAF loop ───────────────────────────────────────────────────────────────
    const loop = () => {
      rafRef.current = 0

      // ── Cursor: fast lerp ───────────────────────────────────────────────────
      cursorX += (targetX - cursorX) * 0.40
      cursorY += (targetY - cursorY) * 0.40

      // ── Ring: slow lerp ─────────────────────────────────────────────────────
      ringX += (targetX - ringX) * 0.10
      ringY += (targetY - ringY) * 0.10

      // ── Velocity stretch on ring ─────────────────────────────────────────────
      const speed   = Math.sqrt(velX * velX + velY * velY)
      const stretch = Math.min(speed * 0.035, 0.45)
      const angle   = speed > 0.5 ? Math.atan2(velY, velX) * (180 / Math.PI) : 0

      velX *= 0.82
      velY *= 0.82

      // ── Apply cursor transform ───────────────────────────────────────────────
      cursor.style.transform = `translate3d(${cursorX.toFixed(1)}px,${cursorY.toFixed(1)}px,0) translate(-50%,-50%)`

      // ── Ring transform — state-dependent ─────────────────────────────────────
      if (currentState === 'link') {
        // Compress to horizontal bar (2.5× wide, 0.35× tall)
        const barScaleX = 2.5
        const barScaleY = 0.35
        ring.style.transform = `translate3d(${ringX.toFixed(1)}px,${ringY.toFixed(1)}px,0) translate(-50%,-50%) scale(${barScaleX},${barScaleY})`
      } else if (currentState === 'cta') {
        ring.style.transform = `translate3d(${ringX.toFixed(1)}px,${ringY.toFixed(1)}px,0) translate(-50%,-50%)`
      } else {
        // Default: velocity stretch
        const scaleX = 1 + stretch
        const scaleY = Math.max(0.6, 1 - stretch * 0.6)
        ring.style.transform = `translate3d(${ringX.toFixed(1)}px,${ringY.toFixed(1)}px,0) translate(-50%,-50%) rotate(${angle.toFixed(1)}deg) scale(${scaleX.toFixed(3)},${scaleY.toFixed(3)})`
      }

      // ── Magnetic snap ────────────────────────────────────────────────────────
      if (snapTargetEl) {
        const rect = snapTargetEl.getBoundingClientRect()
        const cx   = rect.left + rect.width  / 2
        const cy   = rect.top  + rect.height / 2
        const dx   = targetX - cx
        const dy   = targetY - cy
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < SNAP_RADIUS) {
          const factor = 1 - dist / SNAP_RADIUS  // 0 at edge, 1 at center
          const rawMX  = dx * SNAP_STRENGTH * factor
          const rawMY  = dy * SNAP_STRENGTH * factor
          snapLerpX    = rawMX  // could lerp here for extra smoothness
          snapLerpY    = rawMY
          const mx     = Math.max(-SNAP_MAX_PX, Math.min(SNAP_MAX_PX, snapLerpX))
          const my     = Math.max(-SNAP_MAX_PX, Math.min(SNAP_MAX_PX, snapLerpY))
          snapTargetEl.style.setProperty('--mx', `${mx.toFixed(2)}px`)
          snapTargetEl.style.setProperty('--my', `${my.toFixed(2)}px`)
        } else {
          // Gently release snap
          snapTargetEl.style.setProperty('--mx', '0px')
          snapTargetEl.style.setProperty('--my', '0px')
        }
      } else if (snapOffsetX !== 0 || snapOffsetY !== 0) {
        // Spring back any previously snapped element
        snapOffsetX *= 0.75
        snapOffsetY *= 0.75
        if (Math.abs(snapOffsetX) < 0.1) { snapOffsetX = 0; snapOffsetY = 0 }
      }

      // ── Idle suspension ──────────────────────────────────────────────────────
      const delta =
        Math.abs(targetX - ringX) +
        Math.abs(targetY - ringY) +
        Math.abs(velX) +
        Math.abs(velY)

      if (delta < 0.15 || !visible) {
        dirty = false
        return
      }
      rafRef.current = requestAnimationFrame(loop)
    }

    // ── Register listeners ─────────────────────────────────────────────────────
    window.addEventListener('mousemove', onMove, { passive: true })
    document.addEventListener('mouseover', onOver, { passive: true })
    document.addEventListener('mouseout',  onOut,  { passive: true })
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseover', onOver)
      document.removeEventListener('mouseout',  onOut)
      document.removeEventListener('visibilitychange', onVisibility)

      // Clean up any snap offsets
      const snapEls = document.querySelectorAll<HTMLElement>('[data-cursor="link"]')
      snapEls.forEach(el => {
        el.style.removeProperty('--mx')
        el.style.removeProperty('--my')
      })
    }
  }, [])
}
