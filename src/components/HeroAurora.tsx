'use client'

/**
 * HeroAurora — subtle bottom aurora ribbon on canvas2D.
 *
 * Performance budget: ≤0.5ms/frame on iGPU desktop.
 *
 * Strategy:
 *   - Canvas rendered at HALF resolution (CSS-scaled 2x): 4x fewer pixels.
 *     The blur from CSS upscaling + the soft gradient stops makes it feel
 *     more diffuse, not less. No `filter: blur()` runtime call.
 *   - 2 ribbons (was 3). Each is a single filled path with a vertical
 *     gradient of the band color.
 *   - Update at ~30Hz (skip every other RAF).
 *   - Skipped entirely on prefers-reduced-motion, coarse pointer + small
 *     screens, or when WebGL detected as software-rasterized.
 *   - Lazy-mounted via requestIdleCallback.
 */

import { useEffect, useRef } from 'react'
import { isLowEndGPU } from '@/hooks/useGPUClass'

interface HeroAuroraProps {
  isReady: boolean
}

interface Ribbon {
  amp: number
  freq: number
  phase: number
  speed: number
  thickness: number
  yOffset: number
  hue: number
  sat: number
  alpha: number
}

const RIBBONS: Ribbon[] = [
  { amp: 28, freq: 0.0028, phase: 0,   speed: 0.00012, thickness: 80, yOffset: 0.65, hue: 268, sat: 80, alpha: 0.14 },
  { amp: 36, freq: 0.0022, phase: 1.4, speed: 0.00009, thickness: 100, yOffset: 0.82, hue: 232, sat: 75, alpha: 0.10 },
]

export default function HeroAurora({ isReady }: HeroAuroraProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mountedRef = useRef(false)

  useEffect(() => {
    if (!isReady) return
    if (typeof window === 'undefined') return
    if (mountedRef.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (window.innerWidth < 768) return  // skip on small screens (perf + visual)
    if (isLowEndGPU()) return            // skip on software/constrained GPU

    let cancelled = false
    let raf = 0

    const start = () => {
      if (cancelled) return
      mountedRef.current = true

      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d', { alpha: true })
      if (!ctx) return

      // Half-resolution: dpr fixed to 1, canvas pixel size = client / 2.
      // CSS will upscale it 2x, which acts as a free blur.
      let w = 0, h = 0
      const SCALE = 0.5

      const resize = () => {
        const cw = canvas.clientWidth
        const ch = canvas.clientHeight
        w = Math.max(1, Math.floor(cw * SCALE))
        h = Math.max(1, Math.floor(ch * SCALE))
        canvas.width  = w
        canvas.height = h
      }
      resize()
      const ro = new ResizeObserver(resize)
      ro.observe(canvas)

      let last = performance.now()
      let phaseT = 0
      let frameSkip = 0

      const loop = (ts: number) => {
        if (cancelled) return
        const dt = ts - last
        last = ts
        phaseT += dt

        // Throttle to ~30Hz: render every other frame
        frameSkip = (frameSkip + 1) % 2
        if (frameSkip !== 0) {
          raf = requestAnimationFrame(loop)
          return
        }

        ctx.clearRect(0, 0, w, h)
        ctx.globalCompositeOperation = 'lighter'

        for (const rb of RIBBONS) {
          const yMid = h * rb.yOffset
          const phaseLocal = rb.phase + rb.speed * phaseT
          const amp       = rb.amp * SCALE
          const thickness = rb.thickness * SCALE

          ctx.beginPath()
          for (let x = 0; x <= w; x += 8) {
            const xWorld = x / SCALE
            const ya =
              Math.sin(xWorld * rb.freq        + phaseLocal)       * amp +
              Math.sin(xWorld * rb.freq * 2.3  + phaseLocal * 1.4) * (amp * 0.4)
            ctx.lineTo(x, yMid + ya - thickness / 2)
          }
          for (let x = w; x >= 0; x -= 8) {
            const xWorld = x / SCALE
            const ya =
              Math.sin(xWorld * rb.freq        + phaseLocal)       * amp +
              Math.sin(xWorld * rb.freq * 2.3  + phaseLocal * 1.4) * (amp * 0.4)
            ctx.lineTo(x, yMid + ya + thickness / 2)
          }
          ctx.closePath()

          const grad = ctx.createLinearGradient(0, yMid - thickness, 0, yMid + thickness)
          grad.addColorStop(0,   `hsla(${rb.hue}, ${rb.sat}%, 70%, 0)`)
          grad.addColorStop(0.5, `hsla(${rb.hue}, ${rb.sat}%, 70%, ${rb.alpha})`)
          grad.addColorStop(1,   `hsla(${rb.hue}, ${rb.sat}%, 70%, 0)`)
          ctx.fillStyle = grad
          ctx.fill()
        }

        ctx.globalCompositeOperation = 'source-over'
        raf = requestAnimationFrame(loop)
      }
      raf = requestAnimationFrame(loop)

      const onVisibility = () => {
        if (document.hidden) {
          if (raf) { cancelAnimationFrame(raf); raf = 0 }
        } else {
          last = performance.now()
          if (raf === 0) raf = requestAnimationFrame(loop)
        }
      }
      document.addEventListener('visibilitychange', onVisibility)

      ;(start as unknown as { cleanup?: () => void }).cleanup = () => {
        cancelled = true
        if (raf) cancelAnimationFrame(raf)
        ro.disconnect()
        document.removeEventListener('visibilitychange', onVisibility)
      }
    }

    const idle = (window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
      cancelIdleCallback?:  (id: number) => void
    })
    let idleId = 0
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    if (typeof idle.requestIdleCallback === 'function') {
      idleId = idle.requestIdleCallback(start, { timeout: 1500 })
    } else {
      timeoutId = setTimeout(start, 1200)
    }

    return () => {
      cancelled = true
      if (idleId && idle.cancelIdleCallback) idle.cancelIdleCallback(idleId)
      if (timeoutId) clearTimeout(timeoutId)
      const cleanup = (start as unknown as { cleanup?: () => void }).cleanup
      if (cleanup) cleanup()
    }
  }, [isReady])

  return (
    <div className="hero-aurora" aria-hidden="true">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ imageRendering: 'auto' }}
      />
    </div>
  )
}
