'use client'

/**
 * HeroGrid3D — Interactive 3D-perspective grid using Canvas 2D.
 *
 * Visual effect:
 *   - A grid of glowing dots is drawn on a `<canvas>` element.
 *   - The canvas is tilted via CSS `rotateX(48deg) scale(1.6)` to create
 *     a faux-3D vanishing-point floor plane.
 *   - An edge mask (`mask-image: radial-gradient`) fades the grid into the
 *     background naturally.
 *   - When the cursor moves over the hero, a ripple wave propagates from
 *     the cursor position: dots near the cursor are displaced vertically
 *     (perceived as lifting off the plane) and lit more brightly.
 *
 * Architecture:
 *   - Single RAF loop, fully self-suspending.
 *   - Idle suspension: if cursor hasn't moved AND all wave energy < epsilon,
 *     the RAF stops. Resume on next mousemove.
 *   - IntersectionObserver: pause when hero is off-screen.
 *   - visibilitychange: pause on hidden tab.
 *   - Resize: debounced 150ms, recomputes grid and DPR.
 *   - GPU gating: if `detectGPUClass() === 'low'`, canvas stays hidden
 *     and the CSS fallback div is shown instead.
 *   - prefers-reduced-motion: same gate as low-end GPU (no canvas).
 *
 * JSX structure invariant (important for webpack):
 *   This component ALWAYS returns the same JSX shape. The canvas and the
 *   CSS fallback are both in the DOM; visibility is controlled via the
 *   `hidden` attribute and CSS display. This avoids the Next.js 15 webpack
 *   bug where conditional JSX roots cause `__webpack_modules__[moduleId]
 *   is not a function` errors in components with conditional rendering.
 */

import { useRef, useEffect, useState } from 'react'
import { detectGPUClass } from '@/hooks/useGPUClass'

// ── Constants ───────────────────────────────────────────────────────────────
const CELL        = 40     // grid cell size in logical pixels
const WAVE_RADIUS = 220    // px — cursor influence radius
const WAVE_AMP    = 9      // px — max vertical displacement
const BASE_ALPHA  = 0.18   // base dot opacity
const BASE_R      = 0.85   // base dot radius in px
const MAX_DPR     = 1.5    // DPR cap to avoid 3× pixel blowup on retina

interface HeroGrid3DProps {
  /** Ref to the hero section for scoping the mousemove listener */
  sectionRef: React.RefObject<HTMLElement | null>
}

export default function HeroGrid3D({ sectionRef }: HeroGrid3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>(0)

  // null = SSR (not yet determined), false = CSS fallback, true = canvas
  // Resolved client-side only to avoid hydration mismatch.
  const [useCanvas, setUseCanvas] = useState<boolean | null>(null)

  // ── Determine canvas capability (client-only) ─────────────────────────────
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const capable = !reduced && detectGPUClass() === 'ok'
    setUseCanvas(capable)
  }, [])

  // ── Canvas effect ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (useCanvas !== true) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const section = sectionRef.current

    // ── State ─────────────────────────────────────────────────────────────────
    let cols = 0
    let rows = 0
    let cursorX = -9999
    let cursorY = -9999
    let time    = 0
    let isVisible   = true
    let isTabActive = !document.hidden
    let idleFrames  = 0
    let cursorMoved = false

    // ── Resize handler ────────────────────────────────────────────────────────
    let resizeTimer: ReturnType<typeof setTimeout> | null = null

    const setupCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
      const w   = canvas.offsetWidth
      const h   = canvas.offsetHeight
      canvas.width  = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.resetTransform()
      ctx.scale(dpr, dpr)
      cols = Math.ceil(w / CELL) + 2
      rows = Math.ceil(h / CELL) + 2
    }

    setupCanvas()

    const onResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        setupCanvas()
        cursorMoved = true
        resume()
      }, 150)
    }
    window.addEventListener('resize', onResize, { passive: true })

    // ── Cursor tracking ───────────────────────────────────────────────────────
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      cursorX = e.clientX - rect.left
      cursorY = e.clientY - rect.top
      cursorMoved = true
      idleFrames  = 0
      resume()
    }

    const onMouseLeave = () => {
      cursorX = -9999
      cursorY = -9999
      cursorMoved = true
    }

    const target: EventTarget = section ?? window
    target.addEventListener('mousemove', onMouseMove as EventListener, { passive: true })
    target.addEventListener('mouseleave', onMouseLeave as EventListener, { passive: true })

    // ── Draw frame ────────────────────────────────────────────────────────────
    const draw = () => {
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight

      ctx.clearRect(0, 0, w, h)
      time++

      const offsetX = (w % CELL) / 2
      const offsetY = (h % CELL) / 2

      let hasActivity = false

      for (let c = -1; c < cols; c++) {
        for (let r = -1; r < rows; r++) {
          const dotX = c * CELL + offsetX
          const dotY = r * CELL + offsetY

          const dx   = dotX - cursorX
          const dy   = dotY - cursorY
          const dist = Math.sqrt(dx * dx + dy * dy)

          let dispY  = 0
          let alpha  = BASE_ALPHA
          let radius = BASE_R

          if (dist < WAVE_RADIUS && cursorX > -999) {
            const influence = 1 - dist / WAVE_RADIUS
            dispY   = Math.sin(dist * 0.025 - time * 0.003) * influence * WAVE_AMP
            alpha   = BASE_ALPHA + influence * 0.42
            radius  = BASE_R + influence * 1.7
            hasActivity = true
          }

          ctx.beginPath()
          ctx.arc(dotX, dotY + dispY, radius, 0, Math.PI * 2)

          const t = Math.max(0, (alpha - BASE_ALPHA) / 0.42)
          const r_c = Math.round(124 + (167 - 124) * t)
          const g_c = Math.round(58  + (139 - 58)  * t)
          const b_c = Math.round(237 + (250 - 237) * t)

          ctx.fillStyle = `rgba(${r_c},${g_c},${b_c},${Math.min(alpha, 0.7).toFixed(3)})`
          ctx.fill()
        }
      }

      return hasActivity
    }

    // ── RAF loop ──────────────────────────────────────────────────────────────
    const loop = () => {
      rafRef.current = 0
      if (!isVisible || !isTabActive) return

      const hasActivity = draw()

      if (!hasActivity && !cursorMoved) {
        idleFrames++
        if (idleFrames > 60) return
      } else {
        idleFrames = 0
      }

      cursorMoved = false
      rafRef.current = requestAnimationFrame(loop)
    }

    const resume = () => {
      if (rafRef.current === 0 && isVisible && isTabActive) {
        rafRef.current = requestAnimationFrame(loop)
      }
    }

    draw()
    resume()

    // ── IntersectionObserver ──────────────────────────────────────────────────
    const io = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting
        if (isVisible) resume()
        else if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0 }
      },
      { threshold: 0.01 },
    )
    io.observe(canvas)

    // ── visibilitychange ──────────────────────────────────────────────────────
    const onVisChange = () => {
      isTabActive = !document.hidden
      if (isTabActive) resume()
      else if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0 }
    }
    document.addEventListener('visibilitychange', onVisChange)

    // ── Cleanup ───────────────────────────────────────────────────────────────
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
      if (resizeTimer) clearTimeout(resizeTimer)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onVisChange)
      target.removeEventListener('mousemove', onMouseMove as EventListener)
      target.removeEventListener('mouseleave', onMouseLeave as EventListener)
      io.disconnect()
    }
  }, [sectionRef, useCanvas])

  // ── Render ────────────────────────────────────────────────────────────────
  // INVARIANT: always return the same JSX shape to avoid Next.js 15 webpack
  // bug (`__webpack_modules__[moduleId] is not a function`).
  //
  // Both the canvas wrapper AND the CSS fallback are always in the DOM.
  // Visibility is toggled via `display` style driven by `useCanvas` state.
  // The canvas is sized by its parent (100% width/height via CSS).
  return (
    <>
      {/* Canvas layer — visible when useCanvas=true */}
      <div
        className="hero-grid-canvas"
        aria-hidden="true"
        style={{ display: useCanvas === true ? undefined : 'none' }}
      >
        <canvas ref={canvasRef} />
      </div>

      {/* CSS fallback — visible until canvas is ready or on low-end GPU */}
      <div
        className="hero-grid-css-fallback"
        aria-hidden="true"
        style={{ display: useCanvas === true ? 'none' : undefined }}
      />
    </>
  )
}
