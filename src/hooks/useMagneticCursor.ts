'use client'

/**
 * useMagneticCursor — Premium cursor with:
 * - Velocity-based cursor stretch (ring squashes/stretches in direction of motion)
 * - 3 cursor states: default | hovering (magnetic) | text-cursor
 * - Self-suspending RAF loop (no idle compositor cost)
 * - Event delegation: 1 listener each instead of N×element
 */

import { useEffect, useRef } from 'react'

export function useMagneticCursor() {
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(pointer: coarse)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const cursor = document.querySelector<HTMLDivElement>('.cursor')
    const ring   = document.querySelector<HTMLDivElement>('.cursor-ring')
    if (!cursor || !ring) return

    // Off-screen start so no flash at (0,0)
    let targetX = -200, targetY = -200
    let cursorX = -200, cursorY = -200
    let ringX   = -200, ringY   = -200
    // Velocity tracking for stretch
    let prevTargetX = -200, prevTargetY = -200
    let velX = 0, velY = 0
    let dirty = true
    let visible = true

    const onMove = (e: MouseEvent) => {
      prevTargetX = targetX
      prevTargetY = targetY
      targetX = e.clientX
      targetY = e.clientY

      // Raw velocity (pixels per event)
      const dx = targetX - prevTargetX
      const dy = targetY - prevTargetY
      velX += (dx - velX) * 0.2
      velY += (dy - velY) * 0.2

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
      const relatedTarget = (e as MouseEvent).relatedTarget as HTMLElement | null
      const fromMagnetic  = (e.target as HTMLElement | null)?.closest?.('[data-magnetic]')
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
      // Cursor: fast lerp
      cursorX += (targetX - cursorX) * 0.40
      cursorY += (targetY - cursorY) * 0.40

      // Ring: slow lerp
      ringX += (targetX - ringX) * 0.10
      ringY += (targetY - ringY) * 0.10

      // Velocity-based ring stretch — squash & stretch
      const speed = Math.sqrt(velX * velX + velY * velY)
      const stretch = Math.min(speed * 0.04, 0.5)  // max 50% stretch
      const angle   = speed > 0.5 ? Math.atan2(velY, velX) * (180 / Math.PI) : 0
      const scaleX  = 1 + stretch
      const scaleY  = Math.max(0.6, 1 - stretch * 0.6)

      // Decay velocity
      velX *= 0.82
      velY *= 0.82

      cursor.style.transform = `translate3d(${cursorX.toFixed(1)}px, ${cursorY.toFixed(1)}px, 0) translate(-50%, -50%)`
      ring.style.transform   = `translate3d(${ringX.toFixed(1)}px, ${ringY.toFixed(1)}px, 0) translate(-50%, -50%) rotate(${angle.toFixed(1)}deg) scale(${scaleX.toFixed(3)}, ${scaleY.toFixed(3)})`

      const delta = Math.abs(targetX - ringX) + Math.abs(targetY - ringY) + Math.abs(velX) + Math.abs(velY)
      if (delta < 0.2 || !visible) {
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
