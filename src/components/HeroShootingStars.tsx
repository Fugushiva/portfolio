'use client'

/**
 * HeroShootingStars — canvas2D layer of comets above the WebGL galaxy.
 *
 * Each shooting star is a "comet":
 *   - Quadratic bezier trajectory (start, control, end) — slight curve.
 *   - Glowing head: white core + violet/cyan/gold halo (color drawn from a
 *     small palette per spawn).
 *   - Trail: 30-40 sample points behind the head, alpha falloff + horizontal
 *     chromatic split (R offset +1px, B offset -1px) for a prismatic feel.
 *   - 10% chance: at end-of-life, fragment into 3-5 mini-stars that fade.
 *
 * Cursor gravity:
 *   - When the comet's current position passes within 18% of viewport from
 *     the cursor, it's gently DEFLECTED — a perpendicular component is added
 *     to the velocity, falling off with distance.  Subtle, not a jet.
 *
 * Density:
 *   - 1 spawn every 3.5–7.5s; rare double-salvo (8% chance, 200ms apart).
 *
 * Performance:
 *   - Single canvas, single RAF loop.
 *   - Auto-disabled on prefers-reduced-motion.
 *   - Pauses when document is hidden or hero is out of viewport (via prop).
 *   - DPR-aware up to 2.0.
 */

import { useEffect, useRef } from 'react'
import { usePointerNDC } from '@/hooks/usePointerNDC'
import { isLowEndGPU } from '@/hooks/useGPUClass'

interface HeroShootingStarsProps {
  isReady: boolean
  /** when false, the loop pauses (set by Hero based on viewport intersection) */
  active?: boolean
}

interface Comet {
  // Bezier control points in CSS px
  x0: number; y0: number
  cx: number; cy: number
  x1: number; y1: number
  // Live state
  t: number          // 0..1 progress
  speed: number      // units per ms (in t-space)
  age: number        // ms since spawn
  life: number       // ms total
  trail: Array<{ x: number; y: number; t: number }>  // last positions
  trailMax: number
  hue: number        // 0..360
  width: number      // px head radius
  variant: 'violet' | 'cyan' | 'gold'
  // Final fragments after life
  burstSeed: number  // 0..1
  // Live position (cached)
  px: number; py: number
  // Live velocity unit vector (for trail orientation)
  vx: number; vy: number
}

interface Fragment {
  x: number; y: number; vx: number; vy: number
  age: number; life: number
  hue: number; size: number
}

const SPAWN_MIN = 3500
const SPAWN_MAX = 7500
const DOUBLE_SALVO_PROB = 0.08
const BURST_PROB = 0.10

function rand(a: number, b: number) { return a + Math.random() * (b - a) }
function randPick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

function makeComet(w: number, h: number): Comet {
  // Pick a starting edge — top or top-left preferred (natural meteor sky)
  const startX = rand(-0.1 * w, 1.1 * w)
  const startY = rand(-0.1 * h, 0.4 * h)
  // Diagonal direction, generally down-right
  const angle = rand(15, 50) * (Math.PI / 180)
  const len   = rand(0.55 * w, 1.1 * w)
  const endX = startX + Math.cos(angle) * len
  const endY = startY + Math.sin(angle) * len
  // Control point slightly offset perpendicular for a curve
  const mx = (startX + endX) / 2
  const my = (startY + endY) / 2
  const perp = { x: -Math.sin(angle), y: Math.cos(angle) }
  const curveAmp = rand(-0.12, 0.12) * len
  const cx = mx + perp.x * curveAmp
  const cy = my + perp.y * curveAmp

  const variants: Comet['variant'][] = []
  // 70% violet, 20% cyan-blue, 10% rare gold
  const r = Math.random()
  const variant: Comet['variant'] = r < 0.70 ? 'violet' : r < 0.90 ? 'cyan' : 'gold'

  let hue = 270 // violet default
  if (variant === 'cyan') hue = 200
  else if (variant === 'gold') hue = 42

  const life = rand(700, 1200)
  return {
    x0: startX, y0: startY,
    cx, cy,
    x1: endX, y1: endY,
    t: 0,
    speed: 1 / life,
    age: 0,
    life,
    trail: [],
    trailMax: Math.floor(rand(18, 28)),
    hue,
    width: rand(1.4, 2.4),
    variant,
    burstSeed: Math.random(),
    px: startX, py: startY,
    vx: Math.cos(angle), vy: Math.sin(angle),
  }
}

function bezierPoint(t: number, p0: number, c: number, p1: number) {
  const u = 1 - t
  return u * u * p0 + 2 * u * t * c + t * t * p1
}
function bezierTangent(t: number, p0: number, c: number, p1: number) {
  return 2 * (1 - t) * (c - p0) + 2 * t * (p1 - c)
}

export default function HeroShootingStars({ isReady, active = true }: HeroShootingStarsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointer   = usePointerNDC()

  // Latch a stable ref so the effect doesn't restart when `active` flips.
  const activeRef = useRef(active)
  activeRef.current = active

  useEffect(() => {
    if (!isReady) return
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (isLowEndGPU()) return  // skip on software/constrained GPU

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    // DPR cap 1.5: chromatic split is invisible at higher DPR anyway and
    // halves canvas pixel count vs 2.0.
    const dpr = Math.min(window.devicePixelRatio, 1.5)
    let w = 0, h = 0

    const resize = () => {
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width  = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const comets: Comet[] = []
    const fragments: Fragment[] = []
    let raf = 0
    let cancelled = false
    let spawnTimer: ReturnType<typeof setTimeout> | null = null
    let last = performance.now()

    const scheduleSpawn = (delay: number) => {
      if (cancelled) return
      spawnTimer = setTimeout(() => {
        if (!cancelled && activeRef.current) {
          comets.push(makeComet(w, h))
          // Rare double salvo
          if (Math.random() < DOUBLE_SALVO_PROB) {
            setTimeout(() => {
              if (!cancelled && activeRef.current) comets.push(makeComet(w, h))
            }, 200)
          }
        }
        scheduleSpawn(rand(SPAWN_MIN, SPAWN_MAX))
      }, delay)
    }
    scheduleSpawn(rand(1500, 3500))

    const onVisibility = () => {
      if (document.hidden) {
        if (raf) { cancelAnimationFrame(raf); raf = 0 }
      } else {
        last = performance.now()
        if (raf === 0) raf = requestAnimationFrame(loop)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    const burstFromComet = (c: Comet) => {
      const count = 3 + Math.floor(c.burstSeed * 3) // 3..5
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + Math.random() * 0.5
        const sp = rand(0.05, 0.15)
        fragments.push({
          x: c.px, y: c.py,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          age: 0, life: rand(500, 900),
          hue: c.hue,
          size: rand(0.8, 1.6),
        })
      }
    }

    const loop = (ts: number) => {
      if (cancelled) return
      const dt = Math.min(48, ts - last)
      last = ts

      ctx.clearRect(0, 0, w, h)
      ctx.globalCompositeOperation = 'lighter'

      // ── Cursor px (when available) ─────────────────────────────────
      // Map smoothed NDC back to canvas px
      const cursorX = (pointer.smooth.x * 0.5 + 0.5) * w
      const cursorY = (1 - (pointer.smooth.y * 0.5 + 0.5)) * h
      const cursorOn =
        pointer.hasPointer.current &&
        pointer.active.current &&
        pointer.inside.current

      // ── Draw + update comets ───────────────────────────────────────
      for (let ci = comets.length - 1; ci >= 0; ci--) {
        const c = comets[ci]
        c.age += dt
        c.t   += c.speed * dt

        if (c.t >= 1) {
          if (Math.random() < BURST_PROB) burstFromComet(c)
          comets.splice(ci, 1)
          continue
        }

        // ── Gravity-aware position ──────────────────────────────────
        // Base bezier position
        let px = bezierPoint(c.t, c.x0, c.cx, c.x1)
        let py = bezierPoint(c.t, c.y0, c.cy, c.y1)

        if (cursorOn) {
          const dx = px - cursorX
          const dy = py - cursorY
          const dist = Math.hypot(dx, dy)
          const radius = Math.min(w, h) * 0.18
          if (dist < radius && dist > 0.001) {
            // Perpendicular deflection: gentle "bend around" the cursor.
            const fall = 1 - dist / radius
            const push = fall * 22
            const nx = dx / dist
            const ny = dy / dist
            px += nx * push
            py += ny * push
          }
        }

        // Velocity unit (for chromatic trail direction)
        const tx = bezierTangent(c.t, c.x0, c.cx, c.x1)
        const ty = bezierTangent(c.t, c.y0, c.cy, c.y1)
        const tm = Math.hypot(tx, ty) || 1
        c.vx = tx / tm; c.vy = ty / tm
        c.px = px; c.py = py

        // ── Update trail ────────────────────────────────────────────
        c.trail.unshift({ x: px, y: py, t: c.t })
        if (c.trail.length > c.trailMax) c.trail.pop()

        // ── Draw trail ──────────────────────────────────────────────
        // Single batched path per color — slashes draw calls from
        // (3 × N segments) to just 2: one for the colored halo, one core.
        const trail = c.trail
        if (trail.length > 1) {
          // Colored halo (single stroke, full trail)
          ctx.strokeStyle = `hsla(${c.hue}, 100%, 70%, ${(1 - c.t) * 0.45})`
          ctx.lineWidth = c.width * 1.2
          ctx.lineCap = 'round'
          ctx.beginPath()
          ctx.moveTo(trail[0].x, trail[0].y)
          for (let i = 1; i < trail.length; i++) ctx.lineTo(trail[i].x, trail[i].y)
          ctx.stroke()
          // White core
          ctx.strokeStyle = `hsla(${c.hue}, 100%, 95%, ${(1 - c.t) * 0.9})`
          ctx.lineWidth = c.width * 0.55
          ctx.beginPath()
          ctx.moveTo(trail[0].x, trail[0].y)
          for (let i = 1; i < trail.length; i++) ctx.lineTo(trail[i].x, trail[i].y)
          ctx.stroke()
        }

        // ── Draw head ───────────────────────────────────────────────
        const headAlpha = 1 - c.t
        const head = ctx.createRadialGradient(px, py, 0, px, py, c.width * 8)
        head.addColorStop(0,   `hsla(${c.hue}, 100%, 95%, ${headAlpha})`)
        head.addColorStop(0.3, `hsla(${c.hue}, 100%, 75%, ${headAlpha * 0.8})`)
        head.addColorStop(1,   `hsla(${c.hue}, 100%, 50%, 0)`)
        ctx.fillStyle = head
        ctx.beginPath()
        ctx.arc(px, py, c.width * 8, 0, Math.PI * 2)
        ctx.fill()

        // Bright pinpoint
        ctx.fillStyle = `rgba(255, 255, 255, ${headAlpha})`
        ctx.beginPath()
        ctx.arc(px, py, c.width * 0.85, 0, Math.PI * 2)
        ctx.fill()
      }

      // ── Draw fragments ─────────────────────────────────────────────
      for (let i = fragments.length - 1; i >= 0; i--) {
        const f = fragments[i]
        f.age += dt
        if (f.age > f.life) { fragments.splice(i, 1); continue }
        f.x += f.vx * dt
        f.y += f.vy * dt
        f.vy += 0.0002 * dt   // slight gravity for flair
        const a = (1 - f.age / f.life) * 0.9
        const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.size * 6)
        grad.addColorStop(0,   `hsla(${f.hue}, 100%, 90%, ${a})`)
        grad.addColorStop(0.4, `hsla(${f.hue}, 100%, 70%, ${a * 0.5})`)
        grad.addColorStop(1,   `hsla(${f.hue}, 100%, 50%, 0)`)
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(f.x, f.y, f.size * 6, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = `rgba(255, 255, 255, ${a})`
        ctx.beginPath()
        ctx.arc(f.x, f.y, f.size * 0.6, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.globalCompositeOperation = 'source-over'

      raf = requestAnimationFrame(loop)
    }

    raf = requestAnimationFrame(loop)

    return () => {
      cancelled = true
      if (raf) cancelAnimationFrame(raf)
      if (spawnTimer) clearTimeout(spawnTimer)
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [isReady, pointer])

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
    </div>
  )
}
