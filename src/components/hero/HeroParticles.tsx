'use client'

/**
 * HeroParticles — 5 ambient floating particles.
 *
 * Pure CSS — no JS, no RAF, no resize listener.
 * Each particle is a tiny `<span>` with:
 *   - Fixed position (bottom/left or bottom/right in %)
 *   - CSS animation `hero-drift-N` (28–38s ease-in-out infinite)
 *   - Negative animation-delay so they start mid-cycle (no simultaneous burst)
 *
 * CSS keyframes are in globals.css:
 *   @keyframes hero-drift-1 … hero-drift-5
 *
 * Reduced motion:
 *   `.hero-particle { display: none }` in globals.css
 *   hides all particles entirely — defined in the
 *   `@media (prefers-reduced-motion: reduce)` block.
 *
 * z-index: 0 (below content at z-10, below grid at z-0).
 */

export default function HeroParticles() {
  return (
    <>
      <span className="hero-particle hero-particle-1" aria-hidden="true" />
      <span className="hero-particle hero-particle-2" aria-hidden="true" />
      <span className="hero-particle hero-particle-3" aria-hidden="true" />
      <span className="hero-particle hero-particle-4" aria-hidden="true" />
      <span className="hero-particle hero-particle-5" aria-hidden="true" />
    </>
  )
}
