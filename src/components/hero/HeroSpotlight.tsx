'use client'

/**
 * HeroSpotlight — Radial light halo that follows the cursor.
 *
 * Technique:
 *   - One `<div>` with a CSS radial-gradient whose center is driven by
 *     two CSS custom properties: `--sx` (X%) and `--sy` (Y%).
 *   - On mousemove over the hero section, we update those vars via
 *     `style.setProperty` — the browser repaint is minimal (gradient only).
 *   - No RAF loop needed: we batch the CSS var update directly in the
 *     mousemove handler (already debounced by the browser's input event rate).
 *
 * Performance:
 *   - Zero JS at rest (no RAF, no interval).
 *   - On move: single `style.setProperty` × 2 per frame — negligible.
 *   - Reduced motion: spotlight frozen at 50% 50% (center).
 *   - Touch: listener still works (touch users see static center light).
 *
 * Usage:
 *   Rendered inside `<section id="hero">` as a sibling to the background
 *   layers. Must be z-index 1 (above grid, below content at z-10).
 */

import { useRef, useEffect } from 'react'

interface HeroSpotlightProps {
  /** Ref to the hero section so we can scope the mousemove listener */
  sectionRef: React.RefObject<HTMLElement | null>
}

export default function HeroSpotlight({ sectionRef }: HeroSpotlightProps) {
  const spotRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const section = sectionRef.current
    const spot    = spotRef.current
    if (!section || !spot) return

    const onMove = (e: MouseEvent) => {
      const rect = section.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width  * 100).toFixed(1)
      const y = ((e.clientY - rect.top)  / rect.height * 100).toFixed(1)
      spot.style.setProperty('--sx', `${x}%`)
      spot.style.setProperty('--sy', `${y}%`)
    }

    const onLeave = () => {
      // Fade spotlight back to center on mouse leave
      spot.style.setProperty('--sx', '50%')
      spot.style.setProperty('--sy', '40%')
    }

    section.addEventListener('mousemove', onMove, { passive: true })
    section.addEventListener('mouseleave', onLeave, { passive: true })

    return () => {
      section.removeEventListener('mousemove', onMove)
      section.removeEventListener('mouseleave', onLeave)
    }
  }, [sectionRef])

  return (
    <div
      ref={spotRef}
      className="hero-spotlight"
      aria-hidden="true"
      style={{
        // Initial position: slightly above center (where the name lives)
        '--sx': '50%',
        '--sy': '40%',
      } as React.CSSProperties}
    />
  )
}
