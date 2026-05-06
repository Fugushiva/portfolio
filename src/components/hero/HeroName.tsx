'use client'

/**
 * HeroName — Animated name display.
 *
 * Architecture (avoids React / DOM conflict):
 * ─────────────────────────────────────────────
 * Phases driven by state:
 *
 *   'idle'    → React renders final text (also rendered during SSR)
 *   'letters' → React renders per-letter spans with CSS animations
 *   'scramble'→ React renders EMPTY content; JS owns textContent via setInterval
 *   'done'    → React renders final text strings (hover scramble allowed)
 *
 * Invariant: React never renders children into a span while JS is mutating
 * textContent. When entering 'scramble', React commits empty content first,
 * then a fresh useEffect runs the scramble on a clean element.
 *
 * Why setInterval and not requestAnimationFrame:
 * ──────────────────────────────────────────────
 * After the preloader fades out, the browser sometimes throttles or
 * suspends RAF callbacks until the user interacts (cursor move, click).
 * This caused the scramble to freeze mid-progress with random chars
 * stuck on screen — only a mouse hover would unstick it.
 *
 * setInterval is NOT throttled in the same way and guarantees progression
 * regardless of input activity. We tick at ~50Hz (20ms) which is visually
 * indistinguishable from RAF for 700ms of text scramble, and we always
 * commit the final text in a `finally` block as a safety net.
 *
 * Width stability:
 * ──────────────────
 * Random characters in the scramble pool have wildly varying widths
 * ("W" vs "i" vs "@"). Without width reservation the heading visually
 * jumps and reflows. Solutions applied:
 *
 *   1. Wrap each name span in a fixed `min-width` based on the final
 *      text rendered invisibly underneath (CSS-only via ::before trick
 *      would require attr() with type — not supported widely; instead
 *      we just rely on the scramble pool below).
 *
 *   2. Use a scramble pool of MONOSPACE-LIKE characters (similar widths
 *      in most fonts: 0OQGCo, etc.) to minimise jitter.
 *
 *   3. h1 has display: block + min-height to never collapse vertically.
 *
 * Reduced motion: skip directly to 'done', no animation, no scramble.
 */

import { useEffect, useRef, useCallback, useState } from 'react'

interface HeroNameProps {
  isReady: boolean
}

const FIRST_NAME = 'Jérôme'
const LAST_NAME  = 'Delodder'

// Scramble pool: characters with relatively similar widths in
// most sans-serif display fonts. Reduces width jitter during scramble.
// Excludes "i", "l", "I", "1" (too narrow) and "W", "M", "@" (too wide).
const SCRAMBLE_POOL = 'ABCDEFGHKLNOPQRSTUVXYZabcdefghknopqrstuvxyz23456789'

const SCRAMBLE_DURATION = 700  // ms
const SCRAMBLE_TICK     = 20   // ms — ~50Hz, smooth enough for 700ms
const HOVER_COOLDOWN    = 800  // ms

type Phase = 'idle' | 'scramble' | 'done'

// ── setInterval-based scramble (RAF-throttle proof) ─────────────────────────
function runScramble(
  el: HTMLElement,
  finalText: string,
  duration: number,
  reduced: boolean,
  onDone?: () => void,
): () => void {
  if (reduced) {
    el.textContent = finalText
    onDone?.()
    return () => { /* noop */ }
  }

  const len = finalText.length
  const startedAt = performance.now()
  let intervalId: ReturnType<typeof setInterval> | null = null
  let finished = false

  const finish = () => {
    if (finished) return
    finished = true
    if (intervalId !== null) {
      clearInterval(intervalId)
      intervalId = null
    }
    el.textContent = finalText
    onDone?.()
  }

  const tick = () => {
    const elapsed  = performance.now() - startedAt
    const progress = Math.min(elapsed / duration, 1)
    const resolvedCount = Math.floor(progress * len)

    let result = ''
    for (let i = 0; i < len; i++) {
      if (i < resolvedCount) {
        result += finalText[i]
      } else {
        result += SCRAMBLE_POOL[Math.floor(Math.random() * SCRAMBLE_POOL.length)]
      }
    }
    el.textContent = result

    if (progress >= 1) finish()
  }

  // Render first frame immediately (no waiting for first interval tick)
  tick()
  intervalId = setInterval(tick, SCRAMBLE_TICK)

  // Watchdog: hard guarantee of completion at 1.5× duration even if
  // the tab is throttled and tick() doesn't run on schedule.
  const watchdog = setTimeout(finish, duration * 1.5 + 100)

  // Returns a cancel function
  return () => {
    clearTimeout(watchdog)
    finish()
  }
}

export default function HeroName({ isReady }: HeroNameProps) {
  const jeromeRef   = useRef<HTMLSpanElement>(null)
  const delodderRef = useRef<HTMLSpanElement>(null)

  const [phase, setPhase] = useState<Phase>('idle')

  // Cooldown flags for hover scramble
  const jeromeCooldown   = useRef(false)
  const delodderCooldown = useRef(false)

  // Cancel funcs for in-flight hover scrambles (prevent leak / overlap)
  const jeromeCancel   = useRef<(() => void) | null>(null)
  const delodderCancel = useRef<(() => void) | null>(null)

  // Detect reduced motion once on mount
  const [reducedMotion] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  )

  // ── Phase machine: idle → letters → scramble ───────────────────────────────
  useEffect(() => {
    if (!isReady) return

    if (reducedMotion) {
      setPhase('done')
      return
    }

    setPhase('scramble')

    return undefined
  }, [isReady, reducedMotion])

  // ── Run scramble after React commits 'scramble' phase (empty spans) ────────
  useEffect(() => {
    if (phase !== 'scramble') return

    let cancelled = false
    const cancellers: Array<() => void> = []

    const elJ = jeromeRef.current
    const elD = delodderRef.current

    if (!elJ || !elD) {
      // Refs missing — skip directly to done
      setPhase('done')
      return
    }

    // Scramble Jérôme first
    cancellers.push(
      runScramble(elJ, FIRST_NAME, SCRAMBLE_DURATION, reducedMotion, () => {
        if (cancelled) return
        // Then scramble Delodder
        cancellers.push(
          runScramble(elD, LAST_NAME, SCRAMBLE_DURATION, reducedMotion, () => {
            if (cancelled) return
            // Hand control back to React permanently
            setPhase('done')
          }),
        )
      }),
    )

    // Hard fallback: if anything goes wrong, force phase to done at 4s
    const fallback = setTimeout(() => {
      if (cancelled) return
      if (elJ) elJ.textContent = FIRST_NAME
      if (elD) elD.textContent = LAST_NAME
      setPhase('done')
    }, 4000)

    return () => {
      cancelled = true
      clearTimeout(fallback)
      cancellers.forEach(c => c())
    }
  }, [phase, reducedMotion])

  // ── Hover scramble (only in 'done' phase) ─────────────────────────────────
  const handleJeromeHover = useCallback(() => {
    if (phase !== 'done' || jeromeCooldown.current || reducedMotion) return
    const el = jeromeRef.current
    if (!el) return

    jeromeCooldown.current = true
    // Cancel any in-flight hover scramble first
    if (jeromeCancel.current) jeromeCancel.current()
    jeromeCancel.current = runScramble(el, FIRST_NAME, SCRAMBLE_DURATION, false, () => {
      jeromeCancel.current = null
    })
    setTimeout(() => { jeromeCooldown.current = false }, HOVER_COOLDOWN)
  }, [phase, reducedMotion])

  const handleDelodderHover = useCallback(() => {
    if (phase !== 'done' || delodderCooldown.current || reducedMotion) return
    const el = delodderRef.current
    if (!el) return

    delodderCooldown.current = true
    if (delodderCancel.current) delodderCancel.current()
    delodderCancel.current = runScramble(el, LAST_NAME, SCRAMBLE_DURATION, false, () => {
      delodderCancel.current = null
    })
    setTimeout(() => { delodderCooldown.current = false }, HOVER_COOLDOWN)
  }, [phase, reducedMotion])

  // ── Render ─────────────────────────────────────────────────────────────────
  // INVARIANT: same JSX shape across all phases (avoids webpack chunk bug).
  //
  // Width stability strategy:
  // ─────────────────────────
  // Each name uses a `.hero-name-slot` wrapper with `position: relative`
  // that contains TWO children:
  //   1. `.hero-name-spacer` — final text rendered with visibility:hidden,
  //      reserving the layout width forever. NEVER changes.
  //   2. The actual `.hero-name-gradient` / `.hero-name-plain` span,
  //      positioned absolutely over the spacer. Its content can scramble
  //      freely without affecting layout.
  //
  // This 100% prevents any reflow during scramble or hover scramble.
  return (
    <h1
      className="hero-name-h1 mb-2 font-black leading-none tracking-tighter text-foreground"
      style={{ fontSize: 'clamp(3rem, 9vw, 8rem)' }}
      aria-label={`${FIRST_NAME} ${LAST_NAME}`}
    >
      {/* ── First name slot — gradient ── */}
      <span className="hero-name-slot">
        <span className="hero-name-spacer" aria-hidden="true">{FIRST_NAME}</span>
        <span
          className="hero-name-gradient hero-name-overlay"
          ref={jeromeRef}
          onMouseEnter={handleJeromeHover}
          role="text"
        >
          {phase === 'scramble' ? '' : FIRST_NAME}
        </span>
      </span>

      <span className="hero-name-space" aria-hidden="true">&nbsp;</span>

      {/* ── Last name slot — plain white ── */}
      <span className="hero-name-slot">
        <span className="hero-name-spacer" aria-hidden="true">{LAST_NAME}</span>
        <span
          className="hero-name-plain hero-name-overlay"
          ref={delodderRef}
          onMouseEnter={handleDelodderHover}
          role="text"
        >
          {phase === 'scramble' ? '' : LAST_NAME}
        </span>
      </span>
    </h1>
  )
}
