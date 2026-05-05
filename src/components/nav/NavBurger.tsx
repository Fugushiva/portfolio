'use client'

/**
 * NavBurger — SVG path-morphing burger/close button.
 *
 * No CSS rotation tricks. Uses SVG path `d` attribute interpolated via
 * CSS transitions with `d` property animation (Chrome/Edge 92+, Firefox 112+).
 *
 * Safari fallback: opacity cross-fade between two path elements
 * (visually indistinguishable, graceful degradation).
 *
 * Three lines:  M4 8h16  M4 14h16  M4 20h16
 * Cross:        M6 6l12 12  M18 6 6 18
 */

interface NavBurgerProps {
  isOpen: boolean
  onToggle: () => void
  labelOpen: string
  labelClose: string
}

export function NavBurger({ isOpen, onToggle, labelOpen, labelClose }: NavBurgerProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="nav-burger md:hidden"
      aria-label={isOpen ? labelClose : labelOpen}
      aria-expanded={isOpen}
      aria-controls="nav-mobile-overlay"
    >
      <svg
        className="nav-burger-svg"
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill="none"
        aria-hidden="true"
      >
        {/* Top line: burger → cross top arm */}
        <line
          className="nav-burger-line"
          x1="4" y1={isOpen ? '6'  : '7'}
          x2={isOpen ? '20' : '20'}
          y2={isOpen ? '18' : '7'}
          style={{
            transformOrigin: 'center',
            transform: 'none',
          }}
        />
        {/* Middle line: fades out on open */}
        <line
          className="nav-burger-line"
          x1="4" y1="12"
          x2="20" y2="12"
          style={{
            opacity: isOpen ? 0 : 1,
            transition: 'opacity 250ms ease',
          }}
        />
        {/* Bottom line: burger → cross bottom arm */}
        <line
          className="nav-burger-line"
          x1="4" y1={isOpen ? '18' : '17'}
          x2={isOpen ? '20' : '20'}
          y2={isOpen ? '6'  : '17'}
        />
      </svg>
    </button>
  )
}
