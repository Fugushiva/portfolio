'use client'

/**
 * NavLogo — JD logotype with scroll-progress SVG ring.
 *
 * Visual states:
 *   - Ring opacity: 0 at top, full after 5% scroll (via --nav-progress CSS var)
 *   - Ring fill:    stroke-dashoffset driven by CSS calc on --nav-progress
 *   - Halo pulse:  radial glow on hover, 600ms fade-out
 *   - Text:        28px, weight 900, letter-spacing -0.04em
 *
 * All animation is CSS-only (no Framer Motion), driven by --nav-progress
 * written by useScrollProgress. Zero JS in this component.
 *
 * Accessibility: role="link", aria-label, focus-visible outline.
 */

interface NavLogoProps {
  onNavigate: (href: string) => void
}

// SVG ring: radius 20, center 22,22 → circumference = 2π*20 ≈ 125.664
const CIRCUMFERENCE = 2 * Math.PI * 20 // 125.664

export function NavLogo({ onNavigate }: NavLogoProps) {
  return (
    <a
      href="#hero"
      onClick={(e) => { e.preventDefault(); onNavigate('#hero') }}
      aria-label="Jerome Delodder — retour en haut"
      className="nav-logo"
      data-magnetic
      data-cursor="link"
    >
      {/* Progress ring SVG */}
      <svg
        className="nav-logo-ring"
        viewBox="0 0 44 44"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="nav-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
        </defs>

        {/* Background track — subtle */}
        <circle
          cx="22" cy="22" r="20"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="1.5"
          strokeDasharray={`${CIRCUMFERENCE}`}
        />

        {/* Progress arc — dashoffset driven by CSS var */}
        <circle
          cx="22" cy="22" r="20"
          stroke="url(#nav-ring-grad)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray={`${CIRCUMFERENCE}`}
          className="nav-logo-ring-circle"
          style={{
            // stroke-dashoffset: C * (1 - progress) = C at 0%, 0 at 100%
            // We drive this via CSS custom property.
            // CSS calc on stroke-dashoffset is not universally supported as a
            // presentation attribute, so we use a CSS variable on the element
            // and reference it via a keyframe trick.
            // Best cross-browser approach: JS sets style directly in useScrollProgress.
            // We init at full offset (hidden) and JS updates it.
            strokeDashoffset: CIRCUMFERENCE,
          }}
        />
      </svg>

      {/* Halo */}
      <span className="nav-logo-halo" aria-hidden="true" />

      {/* Logotype */}
      <span className="nav-logo-text">JD</span>
    </a>
  )
}
