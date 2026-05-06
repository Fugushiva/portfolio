'use client'

/**
 * HeroAvatar — Animated violet orb avatar with:
 *
 *  - Breathing glow (CSS keyframe `hero-avatar-breath`, 4s ease-in-out)
 *  - Inner specular highlight (CSS ::before pseudo)
 *  - Inner dashed orbital ring (slow 18s rotation, CSS)
 *  - Outer ghost ring (32s counter-rotation, CSS)
 *  - 3 satellite dots at different orbital radii + speeds (CSS keyframes)
 *  - Parallax cursor: avatar gently tracks pointer in ±12px range
 *    via RAF-driven lerp, self-suspending when idle.
 *
 *  Performance:
 *  - All visual effects: CSS animations — zero JS cost at rest.
 *  - Parallax: single RAF loop, suspended when |Δ| < 0.1px.
 *  - Cleanup: full RAF + event listener removal on unmount.
 *  - Reduced motion: CSS disables all animations; JS parallax skipped.
 */

import { useRef, useEffect } from 'react'

export default function HeroAvatar() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const orbRef  = useRef<HTMLDivElement>(null)
  const rafRef  = useRef<number>(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    // Coarse pointer (touch) — skip parallax
    if (window.matchMedia('(pointer: coarse)').matches) return

    const wrap = wrapRef.current
    const orb  = orbRef.current
    if (!wrap || !orb) return

    let targetX = 0, targetY = 0
    let currentX = 0, currentY = 0
    let dirty = false

    const MAX_OFFSET = 12  // px — maximum parallax displacement

    const onMouseMove = (e: MouseEvent) => {
      const rect = wrap.getBoundingClientRect()
      // Center of orb in viewport coords
      const cx = rect.left + rect.width  / 2
      const cy = rect.top  + rect.height / 2

      // Normalized offset from center (-1..1) clamped
      const nx = Math.max(-1, Math.min(1, (e.clientX - cx) / (window.innerWidth  * 0.4)))
      const ny = Math.max(-1, Math.min(1, (e.clientY - cy) / (window.innerHeight * 0.4)))

      targetX = nx * MAX_OFFSET
      targetY = ny * MAX_OFFSET

      if (!dirty) {
        dirty = true
        if (rafRef.current === 0) rafRef.current = requestAnimationFrame(loop)
      }
    }

    const loop = () => {
      rafRef.current = 0

      currentX += (targetX - currentX) * 0.08
      currentY += (targetY - currentY) * 0.08

      orb.style.transform = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0)`

      const delta = Math.abs(targetX - currentX) + Math.abs(targetY - currentY)
      if (delta > 0.1) {
        rafRef.current = requestAnimationFrame(loop)
      } else {
        dirty = false
      }
    }

    window.addEventListener('mousemove', onMouseMove, { passive: true })

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
  }, [])

  return (
    <div ref={wrapRef} className="hero-avatar-wrap" aria-hidden="true">
      {/* Outer ghost ring — slow counter-rotation */}
      <div className="hero-avatar-ring-outer" />

      {/* Inner dashed orbital ring */}
      <div className="hero-avatar-ring" />

      {/* Satellite dots */}
      <div className="hero-avatar-sat hero-avatar-sat-1" />
      <div className="hero-avatar-sat hero-avatar-sat-2" />
      <div className="hero-avatar-sat hero-avatar-sat-3" />

      {/* Main orb — parallax target */}
      <div ref={orbRef} className="hero-avatar-orb" />
    </div>
  )
}
