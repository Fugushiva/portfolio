'use client'

/**
 * HeroName — "Jérome Delodder" with full kit of micro-interactions.
 *
 * Effects (all gracefully degrade on prefers-reduced-motion / coarse pointer):
 *
 * 1. Letter-stagger reveal (y + rotateZ + opacity) via Framer Motion.
 *    On Jérome each letter ALSO does an 80ms char-flicker scramble before
 *    settling on its final glyph (Awwwards-grade signature reveal).
 *
 * 2. JÉROME — gradient text with multiple synergistic layers:
 *      a) Animated shimmer (background-position pan, 8s loop)
 *      b) Mouse-tracked iridescence: a conic gradient is offset by the
 *         live cursor position so the "highlight" follows the user.
 *      c) Hover chromatic aberration: ::before red-shifted, ::after
 *         blue-shifted, both at low opacity.
 *      d) Per-letter magnetic tilt: each letter rotates Y/X up to ~10°
 *         based on cursor proximity (chained-wave: closest = strongest).
 *
 * 3. DELODDER — volumetric depth shadow:
 *    Fill is off-white. A multi-stop violet drop-shadow is projected
 *    behind, giving a 3D-relief feel without competing with Jérome's
 *    gradient.  Reacts subtly to cursor: the shadow direction shifts
 *    inverse to cursor position (parallax light source).
 *
 * 4. Stardust on hover (hover anywhere on the name): a small canvas
 *    overlay emits ~12 sparkle particles per second from random points
 *    along the name bounding box. Particles drift up + fade out 1.5s.
 *
 * Layout:
 *    Two flex rows of inline-block letters. Each letter has its own
 *    overflow:hidden wrapper for the reveal mask.
 */

import {
  useEffect, useRef, useState, useCallback,
  type CSSProperties,
} from 'react'
import { m } from 'framer-motion'

const JEROME   = ['J', 'é', 'r', 'ô', 'm', 'e']
const DELODDER = ['D', 'e', 'l', 'o', 'd', 'd', 'e', 'r']

const SCRAMBLE_CHARS = '!@#$%^&*<>{}[]?/\\=+-ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

interface HeroNameProps {
  isReady: boolean
}

export default function HeroName({ isReady }: HeroNameProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const stardustCanvasRef = useRef<HTMLCanvasElement>(null)
  const letterRefs = useRef<Array<HTMLSpanElement | null>>([])

  const [hovered, setHovered]       = useState(false)
  const reduceMotionRef             = useRef(false)
  const isCoarseRef                 = useRef(false)

  // ── Detect motion preferences once ───────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    reduceMotionRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    isCoarseRef.current     = window.matchMedia('(pointer: coarse)').matches
  }, [])

  // ── Live mouse position written as CSS vars on the wrapper ──────────
  // Drives iridescence + per-letter magnetic tilt without React re-renders.
  // Perf-aware: per-letter rects are cached and only refreshed on resize.
  useEffect(() => {
    if (!isReady) return
    if (typeof window === 'undefined') return
    const wrap = wrapRef.current
    if (!wrap) return
    if (reduceMotionRef.current || isCoarseRef.current) return

    let raf = 0
    let targetX = 0, targetY = 0
    let curX = 0, curY = 0
    let absX = 0, absY = 0
    let inside = false

    // Cached layout rects — refreshed only on resize / scroll, NOT each frame.
    let wrapRect = wrap.getBoundingClientRect()
    let letterRects: Array<{ cx: number; cy: number }> = []
    const recomputeRects = () => {
      wrapRect = wrap.getBoundingClientRect()
      letterRects = letterRefs.current.map(el => {
        if (!el) return { cx: 0, cy: 0 }
        const r = el.getBoundingClientRect()
        return {
          cx: r.left + r.width / 2 - wrapRect.left,
          cy: r.top  + r.height / 2 - wrapRect.top,
        }
      })
    }
    recomputeRects()

    const onResize = () => recomputeRects()
    window.addEventListener('resize', onResize, { passive: true })
    window.addEventListener('scroll', onResize, { passive: true })

    const onMove = (e: MouseEvent) => {
      absX = e.clientX
      absY = e.clientY
      const cx = wrapRect.left + wrapRect.width / 2
      const cy = wrapRect.top  + wrapRect.height / 2
      targetX = (e.clientX - cx) / (wrapRect.width / 2)
      targetY = (e.clientY - cy) / (wrapRect.height / 2)
      targetX = Math.max(-1.4, Math.min(1.4, targetX))
      targetY = Math.max(-1.4, Math.min(1.4, targetY))
      inside =
        e.clientX >= wrapRect.left && e.clientX <= wrapRect.right &&
        e.clientY >= wrapRect.top  && e.clientY <= wrapRect.bottom
      if (raf === 0) raf = requestAnimationFrame(loop)
    }

    const loop = () => {
      const prevX = curX, prevY = curY
      curX += (targetX - curX) * 0.12
      curY += (targetY - curY) * 0.12

      // Only write to DOM if the value actually moved — avoids style-recalc churn
      if (Math.abs(prevX - curX) > 0.001 || Math.abs(prevY - curY) > 0.001) {
        wrap.style.setProperty('--mx', curX.toFixed(3))
        wrap.style.setProperty('--my', curY.toFixed(3))
      }

      // Per-letter tilt — uses CACHED rects (no getBoundingClientRect per frame)
      const letters = letterRefs.current
      const cxL = absX - wrapRect.left
      const cyL = absY - wrapRect.top
      for (let i = 0; i < letters.length; i++) {
        const el = letters[i]
        const r  = letterRects[i]
        if (!el || !r) continue
        const dx = cxL - r.cx
        const dy = cyL - r.cy
        // Squared distance comparison avoids sqrt for the early-out path
        const distSq = dx * dx + dy * dy
        if (distSq > 320 * 320) {
          // Out of range: only reset if needed
          if (el.style.getPropertyValue('--lz') !== '0px' && el.style.getPropertyValue('--lz') !== '') {
            el.style.setProperty('--lrx', '0deg')
            el.style.setProperty('--lry', '0deg')
            el.style.setProperty('--lz',  '0px')
          }
          continue
        }
        const dist = Math.sqrt(distSq)
        const w = 1 - dist / 320
        const ry = (dx / 80) * w * 10
        const rx = -(dy / 80) * w * 10
        el.style.setProperty('--lrx', rx.toFixed(2) + 'deg')
        el.style.setProperty('--lry', ry.toFixed(2) + 'deg')
        el.style.setProperty('--lz',  (w * 18).toFixed(2) + 'px')
      }

      // Stop the RAF when motion is fully settled and pointer outside
      const settled = Math.abs(targetX - curX) < 0.005 && Math.abs(targetY - curY) < 0.005
      if (!inside && settled) {
        raf = 0
        return
      }
      raf = requestAnimationFrame(loop)
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onResize)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [isReady])

  // ── Char-flicker reveal for JEROME letters ──────────────────────────
  // Each letter scrambles for ~80ms before its final char appears.
  // Triggered with a delay matching Framer Motion's stagger.
  const scrambleLetter = useCallback((el: HTMLElement, finalChar: string, ms = 80) => {
    if (reduceMotionRef.current) {
      el.textContent = finalChar
      return
    }
    let start = 0
    let raf = 0
    const tick = (ts: number) => {
      if (start === 0) start = ts
      const t = ts - start
      if (t >= ms) {
        el.textContent = finalChar
        cancelAnimationFrame(raf)
        return
      }
      el.textContent = SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
  }, [])

  // Trigger scramble when isReady flips true
  useEffect(() => {
    if (!isReady) return
    if (reduceMotionRef.current) return
    // Match the framer stagger: child i starts at 0.04 + i*0.038s, plus a
    // small overlap so the scramble visible BEFORE the y reveal completes.
    JEROME.forEach((ch, i) => {
      const el = letterRefs.current[i]
      if (!el) return
      const delay = (0.04 + i * 0.038) * 1000 + 200
      setTimeout(() => scrambleLetter(el, ch, 80), delay)
    })
  }, [isReady, scrambleLetter])

  // ── Stardust hover canvas ───────────────────────────────────────────
  useEffect(() => {
    if (!isReady) return
    if (reduceMotionRef.current) return
    if (!hovered) return
    const wrap = wrapRef.current
    const canvas = stardustCanvasRef.current
    if (!wrap || !canvas) return

    const dpr = Math.min(window.devicePixelRatio, 2)
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const r = wrap.getBoundingClientRect()
      canvas.width  = Math.floor(r.width * dpr)
      canvas.height = Math.floor(r.height * dpr)
      canvas.style.width  = r.width + 'px'
      canvas.style.height = r.height + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    interface P { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; hue: number }
    const particles: P[] = []
    const r = wrap.getBoundingClientRect()

    let raf = 0
    let cancelled = false
    let lastSpawn = 0

    const loop = (ts: number) => {
      if (cancelled) return
      // Spawn ~12/s
      if (ts - lastSpawn > 80) {
        lastSpawn = ts
        const px = Math.random() * r.width
        const py = Math.random() * r.height
        particles.push({
          x: px, y: py,
          vx: (Math.random() - 0.5) * 0.4,
          vy: -0.4 - Math.random() * 0.6,
          life: 0,
          max: 1200 + Math.random() * 600,
          size: 1 + Math.random() * 1.6,
          hue: 270 + Math.random() * 30,
        })
      }
      ctx.clearRect(0, 0, r.width, r.height)
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.life += 16
        if (p.life > p.max) { particles.splice(i, 1); continue }
        p.x += p.vx
        p.y += p.vy
        p.vy *= 0.995
        const a = (1 - p.life / p.max) * 0.8
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${p.hue}, 80%, 80%, ${a})`
        ctx.shadowBlur = 8
        ctx.shadowColor = `hsla(${p.hue}, 90%, 70%, ${a})`
        ctx.fill()
      }
      ctx.shadowBlur = 0
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    const ro = new ResizeObserver(resize)
    ro.observe(wrap)

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [hovered, isReady])

  // ── Animation variants (Framer Motion) ───────────────────────────────
  const letterVariants = {
    hidden: { y: '115%', opacity: 0, rotateZ: -8 },
    visible: (i: number) => ({
      y: '0%', opacity: 1, rotateZ: 0,
      transition: {
        delay: 0.04 + i * 0.038,
        duration: 1.05,
        ease: [0.19, 1, 0.22, 1] as [number, number, number, number],
      },
    }),
  }
  const isVisible = isReady ? 'visible' : 'hidden'

  // Build a styled span used for both names. We pass per-letter ref only for
  // Jérome (where scrambling and tilt-target ordering matter).
  return (
    <div
      ref={wrapRef}
      className="hero-name-wrap relative mb-8 md:mb-10"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        // Init CSS vars — overwritten in RAF
        ['--mx' as string]: '0',
        ['--my' as string]: '0',
      } as CSSProperties}
    >
      {/* Stardust canvas overlay (wrapped div for reliable sizing) */}
      <div
        aria-hidden="true"
        className="hero-name-stardust pointer-events-none absolute inset-0"
        style={{ opacity: hovered ? 1 : 0 }}
      >
        <canvas ref={stardustCanvasRef} className="absolute inset-0 w-full h-full" />
      </div>

      {/* JÉROME — gradient + iridescence + chromatic + tilt + scramble */}
      <div className="overflow-hidden" style={{ lineHeight: 1 }}>
        <div
          className="hero-name-jerome flex flex-wrap leading-none tracking-tighter font-black"
          style={{ fontSize: 'clamp(3.8rem, 11.5vw, 12rem)' }}
        >
          {JEROME.map((char, i) => (
            <span
              key={`j-${i}`}
              style={{ overflow: 'hidden', display: 'inline-block', lineHeight: 1.05 }}
            >
              <m.span
                custom={i}
                variants={letterVariants}
                initial="hidden"
                animate={isVisible}
                className="hero-name-letter hero-name-jerome-letter"
                style={{
                  display: 'inline-block',
                  willChange: 'transform, opacity',
                }}
              >
                <span
                  ref={el => { letterRefs.current[i] = el }}
                  className="hero-name-tilt"
                  style={{ display: 'inline-block' }}
                  aria-hidden="true"
                >
                  {char}
                </span>
              </m.span>
            </span>
          ))}
          {/* Visually-hidden text for SR / a11y */}
          <span className="sr-only">Jérome</span>
        </div>
      </div>

      {/* DELODDER — volumetric depth + light parallax */}
      <div className="overflow-hidden" style={{ lineHeight: 1, marginTop: '-0.04em' }}>
        <div
          className="hero-name-delodder flex flex-wrap leading-none tracking-tighter font-black"
          style={{ fontSize: 'clamp(3.8rem, 11.5vw, 12rem)' }}
        >
          {DELODDER.map((char, i) => (
            <span
              key={`d-${i}`}
              style={{ overflow: 'hidden', display: 'inline-block', lineHeight: 1.05 }}
            >
              <m.span
                custom={JEROME.length + i}
                variants={letterVariants}
                initial="hidden"
                animate={isVisible}
                className="hero-name-letter hero-name-delodder-letter"
                style={{
                  display: 'inline-block',
                  willChange: 'transform, opacity',
                }}
              >
                <span
                  ref={el => { letterRefs.current[JEROME.length + i] = el }}
                  className="hero-name-tilt"
                  style={{ display: 'inline-block' }}
                  aria-hidden="true"
                >
                  {char}
                </span>
              </m.span>
            </span>
          ))}
          <span className="sr-only">Delodder</span>
        </div>
      </div>
    </div>
  )
}
