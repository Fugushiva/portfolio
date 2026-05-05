'use client'

/**
 * NavLink — double-layer split-text nav link with active section indicator.
 *
 * Replaces the text-scramble effect with a premium double-layer split:
 *   - Layer 1 (rest)  : muted, exits upward on hover (translateY -100%)
 *   - Layer 2 (hover) : accent, enters from below (translateY 0%)
 *   - 280ms cubic-bezier(0.19, 1, 0.22, 1) — premium expo easing
 *
 * Active state indicator:
 *   - 16px horizontal dash, scaleX 0→1 origin-left when active
 *   - Exiting: scaleX 1→0 origin-right = "passes the baton" visual effect
 *
 * data-cursor="link" signals the magnetic cursor to compress the ring
 * into a horizontal bar (cf. useMagneticCursor).
 *
 * data-magnetic enables the cursor's magnetic attraction.
 */

interface NavLinkProps {
  label: string
  href: string
  section: string
  activeSection: string
  onClick: (href: string) => void
}

export function NavLink({ label, href, section, activeSection, onClick }: NavLinkProps) {
  const isActive = activeSection === section

  return (
    <a
      href={href}
      onClick={(e) => { e.preventDefault(); onClick(href) }}
      aria-current={isActive ? 'true' : undefined}
      className="nav-link"
      data-section={section}
      data-active={isActive ? 'true' : 'false'}
      data-magnetic
      data-cursor="link"
    >
      <span className="nav-link-stack" aria-hidden="true">
        <span className="nav-link-layer nav-link-layer--rest">{label}</span>
        <span className="nav-link-layer nav-link-layer--hover">{label}</span>
      </span>
      {/* Screen-reader label */}
      <span className="sr-only">{label}</span>
      {/* Active dash */}
      <span className="nav-link-dash" aria-hidden="true" />
    </a>
  )
}
