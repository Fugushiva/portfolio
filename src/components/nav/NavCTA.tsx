'use client'

/**
 * NavCTA — "Hire me" button with morphing border + sweep + label flip.
 *
 * Hover choreography (pure CSS, no JS):
 *   1. Diagonal light sweep traverses the button (400ms)
 *   2. Label flips vertically via rotateX perspective trick (320ms)
 *   3. box-shadow blooms to glow (400ms)
 *   4. border-color intensifies (400ms)
 *
 * data-cursor="cta" signals the cursor to morph into the solid "MAIL" circle.
 */

interface NavCTAProps {
  label: string
}

export function NavCTA({ label }: NavCTAProps) {
  return (
    <a
      href="mailto:jerome@delodder.dev"
      className="nav-cta"
      data-magnetic
      data-cursor="cta"
      aria-label={`${label} — jerome@delodder.dev`}
    >
      <span className="nav-cta-sweep" aria-hidden="true" />

      <span className="nav-cta-label-wrap">
        <span className="nav-cta-label">{label}</span>
        <span className="nav-cta-label-alt" aria-hidden="true">{label}</span>
      </span>

      <span className="nav-cta-arrow" aria-hidden="true">↗</span>
    </a>
  )
}
