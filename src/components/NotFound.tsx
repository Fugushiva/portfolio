'use client'

// ─── NotFound — "Lost in the Void" 404 ────────────────────────────────────────
//
// Full rewrite fixing:
//  1. LazyMotion missing  → wraps its own <LazyMotion domMax>
//  2. Cursor missing      → runs useMagneticCursor() + hides native cursor
//  3. Parallax invisible  → was depth*0.008px, now depth*30px (visible)
//  4. useTransform in JSX → all hooks at component top level
//  5. Text barely visible → white/violet gradient, high-contrast, proper z-index

import { useEffect, useRef, useState, useCallback } from 'react'
import { LazyMotion, domMax, m, AnimatePresence, useSpring, useTransform } from 'framer-motion'
import Link from 'next/link'
import { useMagneticCursor } from '@/hooks/useMagneticCursor'
import { useLenis } from '@/hooks/useLenis'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Particle {
  id: number
  x: number
  y: number
  size: number
  opacity: number
  depth: number // 1–5, higher = closer / more parallax
}

interface DebrisItem {
  id: number
  x: number
  y: number
  rotate: number
  size: number
  opacity: number
  duration: number
  delay: number
  depth: number
  shape: number
}

// ─── Deterministic LCG PRNG (identical on server + client — no hydration diff) ─

function makePRNG(seed: number) {
  let s = seed
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) | 0
    return (s >>> 0) / 0xffffffff
  }
}

function buildParticles(count: number): Particle[] {
  const r = makePRNG(0xdeadbeef)
  return Array.from({ length: count }, (_, id) => ({
    id,
    x: r() * 100,
    y: r() * 100,
    size: r() * 2.5 + 0.8,
    opacity: r() * 0.55 + 0.15,
    depth: Math.floor(r() * 5) + 1,
  }))
}

function buildDebris(count: number): DebrisItem[] {
  const r = makePRNG(0xc0ffee42)
  return Array.from({ length: count }, (_, id) => ({
    id,
    x: r() * 100,
    y: r() * 100,
    rotate: r() * 360,
    size: r() * 10 + 3,
    opacity: r() * 0.3 + 0.06,
    duration: r() * 40 + 20,
    delay: r() * -40,
    depth: Math.floor(r() * 3) + 1,
    shape: id % 3,
  }))
}

const PARTICLES = buildParticles(70)
const DEBRIS = buildDebris(22)

// ─── Parallax pixel strength per depth level ──────────────────────────────────
//  depth 1 → ±14px   depth 5 → ±70px
const DEPTH_PX = (depth: number) => depth * 14

// ─── Main component ───────────────────────────────────────────────────────────

export default function NotFound() {
  return (
    // LazyMotion MUST wrap <m.*> — the main site's Providers doesn't
    // reach this page because not-found renders outside the normal tree.
    <LazyMotion features={domMax} strict>
      <NotFoundInner />
    </LazyMotion>
  )
}

function NotFoundInner() {
  // Wire up the same cursor + smooth scroll as the main site
  useMagneticCursor()
  useLenis()

  const containerRef = useRef<HTMLDivElement>(null)
  const [isReady, setIsReady] = useState(false)
  const [glitchActive, setGlitch] = useState(false)
  const reducedMotion = useRef(false)

  // Spring-smoothed mouse: stiffness/damping tuned for cinematic lag
  const springCfg = { stiffness: 55, damping: 18, mass: 1 }
  const mx = useSpring(0, springCfg)
  const my = useSpring(0, springCfg)

  // ── All parallax transforms declared at top level (hooks rules) ────────────

  // Star particles — 5 depth tiers, pre-built arrays
  // We compute per-particle transforms inside the subcomponent (that's fine —
  // hooks in a component, not conditionally). See ParticleDot.

  // Glyph parallax — each digit has its own depth multiplier
  const g0x = useTransform(mx, [-1, 1], [-DEPTH_PX(1.0) * 1, DEPTH_PX(1.0) * 1])
  const g0y = useTransform(my, [-1, 1], [-DEPTH_PX(1.0) * 0.5, DEPTH_PX(1.0) * 0.5])
  const g1x = useTransform(mx, [-1, 1], [-DEPTH_PX(2.8) * 1, DEPTH_PX(2.8) * 1])
  const g1y = useTransform(my, [-1, 1], [-DEPTH_PX(2.8) * 0.5, DEPTH_PX(2.8) * 0.5])
  const g2x = useTransform(mx, [-1, 1], [-DEPTH_PX(1.8) * 1, DEPTH_PX(1.8) * 1])
  const g2y = useTransform(my, [-1, 1], [-DEPTH_PX(1.8) * 0.5, DEPTH_PX(1.8) * 0.5])

  // Ghost layer (behind, subtle)
  const ghostX = useTransform(mx, [-1, 1], [-18, 18])
  const ghostY = useTransform(my, [-1, 1], [-10, 10])

  // 3-D card tilt
  const cardRX = useTransform(my, [-1, 1], [8, -8])
  const cardRY = useTransform(mx, [-1, 1], [-8, 8])

  // Chromatic aberration offset
  const chromaRedX = useTransform(mx, [-1, 1], [-20, 20])
  const chromaRedY = useTransform(my, [-1, 1], [-14, 14])
  const chromaBlueX = useTransform(mx, [-1, 1], [20, -20])
  const chromaBlueY = useTransform(my, [-1, 1], [14, -14])

  // Orb glow follows mouse at moderate speed
  const orbX = useTransform(mx, [-1, 1], [-60, 60])
  const orbY = useTransform(my, [-1, 1], [-40, 40])

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  useEffect(() => {
    reducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const t = setTimeout(() => setIsReady(true), 80)
    return () => clearTimeout(t)
  }, [])

  // Random glitch burst every 3–7 s
  useEffect(() => {
    if (reducedMotion.current) return
    let outer: ReturnType<typeof setTimeout>
    let inner: ReturnType<typeof setTimeout>
    const schedule = () => {
      outer = setTimeout(() => {
        setGlitch(true)
        inner = setTimeout(() => { setGlitch(false); schedule() }, 100 + Math.random() * 180)
      }, 3000 + Math.random() * 4000)
    }
    schedule()
    return () => { clearTimeout(outer); clearTimeout(inner) }
  }, [])

  // Mouse → spring
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (reducedMotion.current) return
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    mx.set(((e.clientX - rect.left) / rect.width - 0.5) * 2)
    my.set(((e.clientY - rect.top) / rect.height - 0.5) * 2)
  }, [mx, my])

  // Glitch per-digit offsets
  const GO = [{ x: -6, y: 3 }, { x: 5, y: -4 }, { x: -3, y: 5 }] as const
  const glyphXArr = [g0x, g1x, g2x]
  const glyphYArr = [g0y, g1y, g2y]

  return (
    // Decorative parallax tracker: onMouseMove drives the chromatic aberration
    // and digit tilt for sighted users. There is no keyboard equivalent because
    // the effect is purely visual; the page's accessible content (heading, CTAs)
    // is reachable independently. The role="main" + aria-label give AT users a
    // proper landmark instead of an unlabelled <div>.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- decorative parallax on landmark; no keyboard analog needed
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="nf-root"
      role="main"
      aria-label="Erreur 404, page introuvable"
    >
      {/* ── Grain overlay (same as site) ─── */}
      <div className="grain-overlay" aria-hidden="true" />

      {/* ── Custom cursor (same as site) ─── */}
      <div className="cursor" aria-hidden="true" />
      <div className="cursor-ring" aria-hidden="true" />

      {/* ── Deep void: layered radial gradients ─── */}
      <div className="nf-void" aria-hidden="true">
        <div className="nf-void-core" />
        <m.div
          className="nf-void-glow"
          animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0.85, 0.5] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Orb that loosely follows mouse */}
        <m.div className="nf-void-orb" style={{ x: orbX, y: orbY }} />
      </div>

      {/* ── Star field — 5 depth planes ─── */}
      <div className="nf-stars" aria-hidden="true">
        {PARTICLES.map(p => (
          <ParticleDot key={p.id} p={p} mx={mx} my={my} />
        ))}
      </div>

      {/* ── Debris field ─── */}
      <div className="nf-debris" aria-hidden="true">
        {DEBRIS.map(d => (
          <DebrisPiece key={d.id} d={d} mx={mx} my={my} />
        ))}
      </div>

      {/* ── Chromatic aberration glows (move in opposite dirs) ─── */}
      <m.div
        className="nf-chroma nf-chroma--red"
        style={{ x: chromaRedX, y: chromaRedY }}
        aria-hidden="true"
      />
      <m.div
        className="nf-chroma nf-chroma--blue"
        style={{ x: chromaBlueX, y: chromaBlueY }}
        aria-hidden="true"
      />

      {/* ── Ghost 404 — huge blurred layer behind numerals ─── */}
      <m.div
        className="nf-ghost"
        style={{ x: ghostX, y: ghostY }}
        aria-hidden="true"
      >
        404
      </m.div>

      {/* ── Scan lines CRT overlay ─── */}
      <div className="nf-scanlines" aria-hidden="true" />

      {/* ────────────── MAIN CONTENT ────────────── */}
      <div className="nf-content">

        {/* ── Big 404 numerals ─── */}
        <m.div
          className="nf-stage"
          style={{ rotateX: cardRX, rotateY: cardRY, perspective: 1400, transformStyle: 'preserve-3d' }}
        >
          {/* Digit 4 — depth 1.0 */}
          <m.span
            className="nf-digit"
            style={{ x: glyphXArr[0], y: glyphYArr[0] }}
            initial={{ opacity: 0, y: -80, rotateX: -50 }}
            animate={{
              opacity: isReady ? 1 : 0,
              y: glitchActive ? GO[0].y : 0,
              rotateX: 0,
              filter: glitchActive
                ? 'drop-shadow(-8px 0 0 rgba(6,182,212,0.95)) drop-shadow(8px 0 0 rgba(239,68,68,0.95))'
                : 'drop-shadow(0 0 60px rgb(var(--accent-rgb) / 0.55))',
            }}
            transition={glitchActive
              ? { duration: 0.04 }
              : { opacity: { duration: 0.9, delay: 0.1, ease: [0.19, 1, 0.22, 1] }, rotateX: { duration: 1.3, delay: 0.1, ease: [0.19, 1, 0.22, 1] }, filter: { duration: 0.25 }, y: { duration: 0.25 } }
            }
          >4</m.span>

          {/* Digit 0 — depth 2.8 (most parallax — visual anchor) */}
          <m.span
            className="nf-digit nf-digit--zero"
            style={{ x: glyphXArr[1], y: glyphYArr[1] }}
            initial={{ opacity: 0, y: -80, rotateX: -50 }}
            animate={{
              opacity: isReady ? 1 : 0,
              y: glitchActive ? GO[1].y : 0,
              rotateX: 0,
              filter: glitchActive
                ? 'drop-shadow(-6px 0 0 rgba(239,68,68,0.95)) drop-shadow(6px 0 0 rgba(6,182,212,0.95))'
                : 'drop-shadow(0 0 80px rgb(var(--accent-rgb) / 0.65))',
            }}
            transition={glitchActive
              ? { duration: 0.04 }
              : { opacity: { duration: 0.9, delay: 0.22, ease: [0.19, 1, 0.22, 1] }, rotateX: { duration: 1.3, delay: 0.22, ease: [0.19, 1, 0.22, 1] }, filter: { duration: 0.25 }, y: { duration: 0.25 } }
            }
          >0</m.span>

          {/* Digit 4 — depth 1.8 */}
          <m.span
            className="nf-digit"
            style={{ x: glyphXArr[2], y: glyphYArr[2] }}
            initial={{ opacity: 0, y: -80, rotateX: -50 }}
            animate={{
              opacity: isReady ? 1 : 0,
              y: glitchActive ? GO[2].y : 0,
              rotateX: 0,
              filter: glitchActive
                ? 'drop-shadow(-5px 0 0 rgba(6,182,212,0.95)) drop-shadow(5px 0 0 rgba(239,68,68,0.95))'
                : 'drop-shadow(0 0 60px rgb(var(--accent-rgb) / 0.55))',
            }}
            transition={glitchActive
              ? { duration: 0.04 }
              : { opacity: { duration: 0.9, delay: 0.34, ease: [0.19, 1, 0.22, 1] }, rotateX: { duration: 1.3, delay: 0.34, ease: [0.19, 1, 0.22, 1] }, filter: { duration: 0.25 }, y: { duration: 0.25 } }
            }
          >4</m.span>

          {/* Glitch horizontal bars */}
          <AnimatePresence>
            {glitchActive && (
              <m.div
                className="nf-glitch-bars"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.04 }}
                aria-hidden="true"
              >
                {[
                  // Cyan + red are intentional non-brand "channel separation"
                  // colors for the CRT-style glitch fringe; purple is brand.
                  { top: '12%', left: '5%', w: '70%', h: 2, c: 'rgba(6,182,212,0.8)' },
                  { top: '31%', left: '20%', w: '45%', h: 1, c: 'rgba(239,68,68,0.7)' },
                  { top: '49%', left: '8%', w: '82%', h: 3, c: 'rgb(var(--foreground-rgb) / 0.15)' },
                  { top: '63%', left: '30%', w: '35%', h: 1, c: 'rgb(var(--accent-rgb) / 0.8)' },
                  { top: '77%', left: '12%', w: '60%', h: 2, c: 'rgba(6,182,212,0.6)' },
                  { top: '88%', left: '42%', w: '28%', h: 1, c: 'rgba(239,68,68,0.5)' },
                ].map((bar, i) => (
                  <m.span
                    key={i}
                    className="nf-glitch-bar"
                    style={{ top: bar.top, left: bar.left, width: bar.w, height: bar.h, background: bar.c }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: [0, 1, 0.6, 1, 0] }}
                    transition={{ duration: 0.1, ease: 'linear' }}
                  />
                ))}
              </m.div>
            )}
          </AnimatePresence>
        </m.div>

        {/* ── Horizon line ─── */}
        <m.div
          className="nf-horizon"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: isReady ? 1 : 0, opacity: isReady ? 1 : 0 }}
          transition={{ duration: 2, delay: 0.5, ease: [0.19, 1, 0.22, 1] }}
          aria-hidden="true"
        />

        {/* ── Message ─── */}
        <m.div
          className="nf-message"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: isReady ? 1 : 0, y: isReady ? 0 : 32 }}
          transition={{ duration: 1, delay: 0.7, ease: [0.19, 1, 0.22, 1] }}
        >
          <span className="nf-status">
            <span className="nf-status-dot" aria-hidden="true" />
            SIGNAL_PERDU · ERR_404
          </span>

          <p className="nf-headline">
            Cette page a dérivé dans le vide.
          </p>
          <p className="nf-sub">
            The coordinates you requested no longer exist in this dimension.
          </p>

          <div className="nf-cta-row">
            <Link href="/" className="nf-cta" data-magnetic>
              <span className="nf-cta-inner">
                <svg width="14" height="10" viewBox="0 0 14 10" fill="none" aria-hidden="true" className="nf-cta-arrow">
                  <path d="M13 5H1M1 5L5 1M1 5L5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Retourner à l&apos;accueil
              </span>
              <span className="nf-cta-bg" aria-hidden="true" />
            </Link>
          </div>

          <p className="nf-coords" aria-hidden="true">
            {`SECTOR_NULL · COORD_0x${Math.floor(Date.now() / 1000).toString(16).toUpperCase()} · /dev/null`}
          </p>
        </m.div>
      </div>

      <style>{STYLES}</style>
    </div>
  )
}

// ─── ParticleDot ──────────────────────────────────────────────────────────────
// Hook calls at component top level — valid per React rules.

function ParticleDot({ p, mx, my }: { p: Particle; mx: ReturnType<typeof useSpring>; my: ReturnType<typeof useSpring> }) {
  const px = DEPTH_PX(p.depth)
  const x = useTransform(mx, [-1, 1], [-px, px])
  const y = useTransform(my, [-1, 1], [-px, px])
  return (
    <m.span
      className="nf-star"
      style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, opacity: p.opacity, x, y }}
    />
  )
}

// ─── DebrisPiece ──────────────────────────────────────────────────────────────

function DebrisPiece({ d, mx, my }: { d: DebrisItem; mx: ReturnType<typeof useSpring>; my: ReturnType<typeof useSpring> }) {
  const px = DEPTH_PX(d.depth) * 1.3
  const x = useTransform(mx, [-1, 1], [-px, px])
  const y = useTransform(my, [-1, 1], [-px, px])
  const cls = `nf-debris-piece ${d.shape === 0 ? 'nf-debris--sq' : d.shape === 1 ? 'nf-debris--di' : 'nf-debris--ln'}`
  return (
    <m.span
      className={cls}
      style={{ left: `${d.x}%`, top: `${d.y}%`, width: d.size, height: d.size, opacity: d.opacity, x, y }}
      animate={{ rotate: [d.rotate, d.rotate + 360] }}
      transition={{ duration: d.duration, delay: d.delay, repeat: Infinity, ease: 'linear' }}
    />
  )
}

// ─── Styles (scoped with nf- prefix) ─────────────────────────────────────────

const STYLES = `
/* ── Root: full viewport, dark void ── */
.nf-root {
  position: fixed;
  inset: 0;
  background: #050508;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-family: var(--font-geist-sans, system-ui, sans-serif);
  color: #f5f5f0;
  /* Hide native cursor — JS cursor takes over */
  cursor: none !important;
}

/* Allow native cursor in inputs if somehow present */
.nf-root input, .nf-root textarea { cursor: text !important; }

/* ── Void ── */
.nf-void {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}
.nf-void-core {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 65% 55% at 50% 50%, #16082e 0%, #050508 68%),
    radial-gradient(ellipse 100% 100% at 50% 50%, #05080e 0%, #050508 100%);
}
.nf-void-glow {
  position: absolute;
  inset: -15%;
  background: radial-gradient(ellipse 45% 40% at 50% 50%, rgba(124,58,237,0.22) 0%, transparent 65%);
  filter: blur(50px);
  will-change: transform;
}
.nf-void-orb {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 500px;
  height: 500px;
  margin: -250px 0 0 -250px;
  background: radial-gradient(circle, rgba(124,58,237,0.14) 0%, rgba(6,182,212,0.04) 50%, transparent 70%);
  filter: blur(70px);
  will-change: transform;
}

/* ── Stars ── */
.nf-stars {
  position: absolute;
  inset: -8%;
  pointer-events: none;
  z-index: 1;
}
.nf-star {
  position: absolute;
  border-radius: 50%;
  background: #fff;
  will-change: transform;
}

/* ── Debris ── */
.nf-debris {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
}
.nf-debris-piece {
  position: absolute;
  will-change: transform;
  border: 1px solid rgba(167,139,250,0.35);
}
.nf-debris--sq { border-radius: 1px; }
.nf-debris--di { border-radius: 1px; transform: rotate(45deg); }
.nf-debris--ln { height: 1px !important; width: 14px !important; }

/* ── Chromatic aberration glows ── */
.nf-chroma {
  position: absolute;
  inset: -20%;
  pointer-events: none;
  will-change: transform;
  z-index: 3;
  mix-blend-mode: screen;
  opacity: 0.055;
}
.nf-chroma--red  { background: radial-gradient(ellipse 55% 45% at 50% 50%, rgba(239,68,68,1) 0%, transparent 60%); }
.nf-chroma--blue { background: radial-gradient(ellipse 55% 45% at 50% 50%, rgba(6,182,212,1) 0%, transparent 60%); }

/* ── Ghost 404 ── */
.nf-ghost {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: clamp(20rem, 42vw, 52rem);
  font-weight: 900;
  letter-spacing: -0.06em;
  line-height: 1;
  color: #ffffff;
  opacity: 0.028;
  filter: blur(14px);
  pointer-events: none;
  user-select: none;
  will-change: transform;
  z-index: 1;
  white-space: nowrap;
}

/* ── Scan lines CRT ── */
.nf-scanlines {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 4;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 3px,
    rgba(0,0,0,0.06) 3px,
    rgba(0,0,0,0.06) 4px
  );
}

/* ── Content wrapper ── */
.nf-content {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  width: 100%;
}

/* ── 404 stage ── */
.nf-stage {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(0.2rem, 1.5vw, 1.5rem);
  will-change: transform;
  padding: 0 clamp(1rem, 4vw, 4rem);
  line-height: 0.82;
}

/* ── Digits ── */
.nf-digit {
  display: inline-block;
  font-size: clamp(9rem, 23vw, 24rem);
  font-weight: 900;
  letter-spacing: -0.07em;
  will-change: transform, filter;
  user-select: none;
  /* Gradient fill: bright white at top → violet at bottom */
  background: linear-gradient(
    175deg,
    #ffffff   0%,
    #e8d9ff  25%,
    #c4a0ff  55%,
    #7c3aed  85%,
    #5b1fc8 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Centre "0" — slightly larger + brighter glow to be the anchor */
.nf-digit--zero {
  font-size: clamp(10rem, 26vw, 27rem);
  background: linear-gradient(
    175deg,
    #ffffff   0%,
    #f0e6ff  20%,
    #d8b4ff  50%,
    #a078f0  80%,
    #7c3aed 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* ── Glitch bars overlay ── */
.nf-glitch-bars {
  position: absolute;
  inset: -8%;
  pointer-events: none;
  z-index: 20;
  overflow: hidden;
}
.nf-glitch-bar {
  position: absolute;
  display: block;
  transform-origin: left center;
  mix-blend-mode: screen;
}

/* ── Horizon separator line ── */
.nf-horizon {
  width: 60%;
  max-width: 600px;
  height: 1px;
  margin: clamp(1.2rem, 2.5vw, 2rem) 0 clamp(1.5rem, 3vw, 2.5rem);
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(124,58,237,0.7) 25%,
    rgba(200,170,255,0.9) 50%,
    rgba(124,58,237,0.7) 75%,
    transparent 100%
  );
  transform-origin: center;
  box-shadow: 0 0 12px 0 rgba(124,58,237,0.4);
}

/* ── Message block ── */
.nf-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(0.7rem, 1.4vw, 1.1rem);
  text-align: center;
  padding: 0 clamp(1.5rem, 6vw, 4rem);
  max-width: 680px;
}

/* Status badge */
.nf-status {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-geist-mono, monospace);
  font-size: clamp(0.6rem, 1vw, 0.72rem);
  font-weight: 500;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(167,139,250,0.95);
}
.nf-status-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #7c3aed;
  box-shadow: 0 0 0 2px rgba(124,58,237,0.25), 0 0 12px 3px rgba(124,58,237,0.9);
  animation: nf-dot-pulse 2.2s ease-in-out infinite;
  flex-shrink: 0;
}
@keyframes nf-dot-pulse {
  0%, 100% { box-shadow: 0 0 0 2px rgba(124,58,237,0.25), 0 0 12px 3px rgba(124,58,237,0.9); }
  50%       { box-shadow: 0 0 0 3px rgba(124,58,237,0.15), 0 0 22px 6px rgba(124,58,237,1); }
}

/* Headline */
.nf-headline {
  font-size: clamp(1.1rem, 2.2vw, 1.5rem);
  font-weight: 300;
  line-height: 1.5;
  color: rgba(245,245,240,0.9);
  letter-spacing: -0.01em;
}

/* Sub-text */
.nf-sub {
  font-size: clamp(0.8rem, 1.3vw, 0.95rem);
  line-height: 1.65;
  color: rgba(245,245,240,0.42);
  font-weight: 300;
  max-width: 46ch;
  font-style: italic;
}

/* ── CTA button ── */
.nf-cta-row {
  margin-top: clamp(0.4rem, 1.2vw, 0.9rem);
}
.nf-cta {
  position: relative;
  display: inline-flex;
  align-items: center;
  padding: 0.85rem 2.2rem;
  border: 1px solid rgba(124,58,237,0.55);
  color: #f5f5f0;
  text-decoration: none;
  font-size: clamp(0.78rem, 1.1vw, 0.88rem);
  font-weight: 500;
  letter-spacing: 0.06em;
  overflow: hidden;
  isolation: isolate;
  transition: border-color 0.3s ease, color 0.3s ease;
}
.nf-cta:hover {
  border-color: rgba(167,139,250,1);
  color: #fff;
}
.nf-cta:hover .nf-cta-bg {
  opacity: 1;
  transform: scaleX(1);
}
.nf-cta:hover .nf-cta-arrow {
  transform: translateX(-5px);
}
.nf-cta-inner {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.nf-cta-arrow {
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.nf-cta-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(124,58,237,0.18), rgba(167,139,250,0.12));
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.45s cubic-bezier(0.19,1,0.22,1), opacity 0.3s;
  opacity: 0;
  z-index: 1;
}

/* ── Coordinate footer ── */
.nf-coords {
  font-family: var(--font-geist-mono, monospace);
  font-size: clamp(0.52rem, 0.85vw, 0.62rem);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(245,245,240,0.16);
  margin-top: clamp(0.4rem, 0.8vw, 0.6rem);
}

/* ── Touch devices: keep native cursor ── */
@media (pointer: coarse) {
  .nf-root { cursor: auto !important; }
}

/* ── Reduced motion ── */
@media (prefers-reduced-motion: reduce) {
  .nf-void-glow, .nf-status-dot { animation: none !important; }
  .nf-digit, .nf-ghost, .nf-star, .nf-debris-piece { will-change: auto; }
}

/* ── Mobile ── */
@media (max-width: 640px) {
  .nf-ghost    { font-size: clamp(12rem, 60vw, 20rem); }
  .nf-digit    { font-size: clamp(5.5rem, 28vw, 9rem); letter-spacing: -0.05em; }
  .nf-digit--zero { font-size: clamp(6.5rem, 32vw, 10rem); }
  .nf-horizon  { width: 80%; }
  .nf-chroma   { opacity: 0.03; }
}
`
