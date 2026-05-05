'use client'

/**
 * HeroParticles — Galaxy-class WebGL background, v2 ("Galaxy Engine").
 *
 * Visual design brief: "real space, with brighter stars than others, shooting
 * stars, and a form of gravity that pushes stars away from my cursor."
 *
 * Layers (rendered back to front):
 *   1. NEBULA CLOUD  — 6 large soft gaussian blobs, RGBA, additive blending.
 *                      Slow drift. Slight INVERSE attraction toward cursor
 *                      (mass attraction) — opposite of stars.
 *   2. STAR FIELD    — 8 000 stars across 4 depth layers, spiral structure.
 *                      Far: tiny white dots.   Near: larger, colored.
 *                      ~40 of them are HERO STARS — diffraction spikes,
 *                      double bloom, slow breathing pulse.
 *                      All stars are GRAVITATIONALLY PUSHED AWAY from the
 *                      cursor with smooth radial falloff + tangential swirl
 *                      (Coriolis-like). Decay is GPU-only via uniforms.
 *   3. DUST BAND     — 1 200 small particles forming Milky Way dust lane.
 *                      Slight DRAG toward cursor (opposite of stars) so the
 *                      atmosphere feels coherent, not just a void.
 *   4. CONSTELLATIONS — nearest-neighbor lines between bright stars.
 *   5. (shooting stars are now in HeroShootingStars.tsx, canvas2D)
 *
 * Interactions:
 *   - Cursor gravity well: stars pushed outward (radius ~35% screen).
 *   - Cursor swirl: tangential force gives a "gentle vortex" feel.
 *   - Cursor inactive >1.5s: gravity strength fades out smoothly.
 *   - Click on hero: ripple shockwave propagates from click point through
 *     the field — stars get a radial impulse with gaussian falloff in time.
 *   - Scroll velocity: near stars elongate (motion blur via prev pos),
 *     decays in 400ms after scroll stops. "Warp drive" feel.
 *
 * Performance:
 *   - All physics in vertex shader (zero JS per-particle cost).
 *   - LOD: <640px viewport → STAR_COUNT halved, DUST_COUNT halved.
 *   - DPR cap 2.0.
 *   - IntersectionObserver pauses RAF when hero leaves viewport.
 *   - FPS monitor: <40fps for 2s → reduce gravity strength + skip line rebuilds.
 *   - prefers-reduced-motion → static fallback (single-frame render).
 *   - pointer:coarse → no gravity, but field still animates.
 */

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { usePointerNDC } from '@/hooks/usePointerNDC'
import { useScrollVelocity } from '@/hooks/useScrollVelocity'
import { isLowEndGPU } from '@/hooks/useGPUClass'

// ─── LOD-aware constants ──────────────────────────────────────────────────────

function pickCounts() {
  if (typeof window === 'undefined') return { stars: 4500, dust: 600, hero: 28 }
  const w = window.innerWidth
  // Aggressive defaults: prioritize 60fps over raw count.
  // Counts are halved vs v1; visual density compensated by brighter hero stars.
  if (w < 640)  return { stars: 1800, dust: 250, hero: 14 }
  if (w < 1024) return { stars: 3000, dust: 400, hero: 22 }
  return { stars: 4500, dust: 600, hero: 28 }
}



// Field half-extents
const FW = 10, FH = 6, FD = 6

// Nebula definitions — large soft blobs (fewer + smaller than v1, fillrate-aware)
const NEBULAE = [
  // [x,  y,   z,   r,   g,   b,   radius, opacity]
  [ 3.0,  1.5, -2,  0.48, 0.22, 0.95,  2.4,  0.16 ],
  [-4.0,  0.5, -3,  0.18, 0.32, 0.98,  3.0,  0.10 ],
  [ 1.5, -2.0, -1,  0.72, 0.15, 0.88,  1.8,  0.09 ],
  [ 0.0,  0.0, -5,  0.30, 0.22, 0.85,  4.5,  0.05 ],
]

const LAYER_HUES = [280, 260, 240, 220]

// ═══════════════════════════════════════════════════════════════════════════
// SHADERS
// ═══════════════════════════════════════════════════════════════════════════

const STAR_VERT = /* glsl */`
  attribute float aSize;
  attribute float aLayer;
  attribute float aSpeed;
  attribute float aPhase;
  attribute float aAmp;
  attribute vec3  aColor;
  attribute float aHero;        // 0 or 1, marks "hero stars" with diffraction spikes

  uniform float uTime;
  uniform float uScrollY;
  uniform float uScrollVel;     // px/ms — drives warp elongation
  uniform vec2  uMouse;         // smoothed NDC [-1,1]
  uniform float uGravity;       // 0..1, fades when cursor idle
  uniform float uDPR;
  uniform vec3  uRipple;        // x, y NDC; z = age in seconds (negative if inactive)
  uniform float uQuality;       // 0=low (no gravity/ripple/warp), 1=high

  varying float vAlpha;
  varying float vLayer;
  varying vec3  vColor;
  varying float vHero;
  varying float vWarp;          // motion-blur intensity per fragment

  void main() {
    vec3 pos = position;
    float t  = uTime * aSpeed;

    // ── Sinusoidal drift ────────────────────────────────────────────────
    pos.x += sin(t       + aPhase)        * aAmp;
    pos.y += cos(t * 0.7 + aPhase * 1.3)  * aAmp * 0.7;
    pos.z += sin(t * 0.4 + aPhase * 0.8)  * aAmp * 0.4;

    // Wrap field
    pos.x = mod(pos.x + 10.0, 20.0) - 10.0;
    pos.y = mod(pos.y + 6.0,  12.0) - 6.0;

    // Scroll Y parallax — near stars more
    float pFactor = (3.0 - aLayer) * 0.00018;
    pos.y += uScrollY * pFactor;

    // Layer weight cached once (used in multiple branches)
    float layerW = mix(0.25, 1.5, (3.0 - aLayer) / 3.0);

    float warp = 0.0;

    // High-quality path: gravity + ripple + warp.
    // Low-quality path: skip the first projection entirely → 1 matmul per vertex saved.
    if (uQuality > 0.5 && (uGravity > 0.01 || uRipple.z >= 0.0)) {
      // ── Project once to know screen-space position for gravity ───────
      vec4 mvPos0 = modelViewMatrix * vec4(pos, 1.0);
      vec4 clip0  = projectionMatrix * mvPos0;
      vec2 starNDC = clip0.xy / max(clip0.w, 0.0001);

      // ── GRAVITY WELL ────────────────────────────────────────────────
      if (uGravity > 0.01) {
        vec2 dir = starNDC - uMouse;
        float d  = length(dir);
        float fall = smoothstep(0.42, 0.0, d);
        float strength = fall * uGravity * layerW;
        vec2 push  = normalize(dir + vec2(0.00012)) * strength * 1.4;
        vec2 swirl = vec2(-dir.y, dir.x) * strength * 0.55;
        pos.xy += (push + swirl) * clip0.w * 0.5;
      }

      // ── CLICK RIPPLE ────────────────────────────────────────────────
      if (uRipple.z >= 0.0) {
        vec2 rDir = starNDC - uRipple.xy;
        float rd  = length(rDir);
        float wave = uRipple.z * 1.6;
        float band = exp(-pow((rd - wave) * 6.0, 2.0));
        float life = exp(-uRipple.z * 1.3);
        float rstr = band * life * 1.8 * layerW;
        pos.xy += normalize(rDir + vec2(0.0001)) * rstr * clip0.w * 0.5;
      }

      // ── SCROLL WARP — only computed in high-quality mode ────────────
      warp = clamp(abs(uScrollVel) * 0.55, 0.0, 1.5) * (3.0 - aLayer) / 3.0;
    }

    vWarp = warp;

    // Final projection
    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPos;

    // ── Point size ──────────────────────────────────────────────────────
    float layerScale = 1.0 - aLayer * 0.22;
    float size = aSize * layerScale;
    // Hero stars are larger
    size *= mix(1.0, 1.9, aHero);
    // Warp inflates size slightly to fake a streak
    size *= (1.0 + warp * 0.4);

    gl_PointSize = size * uDPR * (260.0 / -mvPos.z);
    // Cap max size lower: hero stars at 14px are still strikingly bright,
    // and overdraw scales as size².
    gl_PointSize = clamp(gl_PointSize, 0.4, 14.0);

    // ── Alpha & varyings ────────────────────────────────────────────────
    float twinkle  = sin(uTime * aSpeed * 0.8 + aPhase) * 0.15 + 0.85;
    float layerFade = mix(0.5, 0.95, (3.0 - aLayer) / 3.0);
    // Hero stars pulse slowly (breathing)
    float heroPulse = mix(1.0, 0.75 + 0.35 * sin(uTime * 0.6 + aPhase), aHero);
    vAlpha = twinkle * layerFade * heroPulse;
    vLayer = aLayer;
    vColor = aColor;
    vHero  = aHero;
  }
`

const STAR_FRAG = /* glsl */`
  precision highp float;

  varying float vAlpha;
  varying float vLayer;
  varying vec3  vColor;
  varying float vHero;
  varying float vWarp;

  void main() {
    vec2  uv = gl_PointCoord - 0.5;
    float r  = length(uv);
    if (r > 0.5) discard;

    // Standard gaussian core+halo
    float core = exp(-r * r * 40.0);
    float halo = exp(-r * r * 8.0) * 0.4;
    float shape = core + halo;

    // ── HERO STARS: diffraction spikes (anamorphic cross) ──────────────
    if (vHero > 0.5) {
      // Two perpendicular spikes via thin gaussian on each axis
      float sx = exp(-pow(uv.y, 2.0) * 600.0) * exp(-pow(uv.x, 2.0) * 6.0);
      float sy = exp(-pow(uv.x, 2.0) * 600.0) * exp(-pow(uv.y, 2.0) * 6.0);
      float spikes = (sx + sy) * 0.55;
      // Wider secondary halo
      float halo2 = exp(-r * r * 3.0) * 0.22;
      shape += spikes + halo2;
    }

    // ── SCROLL WARP: vertical streak ────────────────────────────────────
    if (vWarp > 0.05) {
      float streak = exp(-pow(uv.x, 2.0) * 90.0) * exp(-pow(uv.y, 2.0) * 6.0);
      shape += streak * vWarp * 0.6;
    }

    vec3 col = vColor;
    // Hero stars get a brighter core
    col *= 1.0 + core * (vHero > 0.5 ? 1.4 : 0.8);

    gl_FragColor = vec4(col, shape * vAlpha);
  }
`

const NEBULA_VERT = /* glsl */`
  attribute float aRadius;
  attribute float aOpacity;
  attribute vec3  aColor;
  attribute float aSpeed;
  attribute float aPhase;

  uniform float uTime;
  uniform float uDPR;
  uniform vec2  uMouse;
  uniform float uGravity;

  varying float vOpacity;
  varying vec3  vColor;

  void main() {
    vec3 pos = position;
    pos.x += sin(uTime * aSpeed + aPhase) * 0.15;
    pos.y += cos(uTime * aSpeed * 0.7 + aPhase) * 0.10;

    // Mass attraction: nebulae drift TOWARD cursor (opposite of stars)
    vec4 mvPos0 = modelViewMatrix * vec4(pos, 1.0);
    vec4 clip0  = projectionMatrix * mvPos0;
    vec2 nNDC   = clip0.xy / max(clip0.w, 0.0001);
    vec2 dir    = uMouse - nNDC;
    float d     = length(dir);
    float pull  = smoothstep(0.9, 0.0, d) * uGravity * 0.18;
    pos.xy += normalize(dir + vec2(0.0001)) * pull * clip0.w;

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPos;

    // Fillrate budget: cap point size aggressively. Bigger blobs = more
    // overdraw with additive blending, the #1 cost on integrated GPUs.
    gl_PointSize = aRadius * uDPR * (520.0 / -mvPos.z);
    gl_PointSize = clamp(gl_PointSize, 90.0, 520.0);

    vOpacity = aOpacity;
    vColor   = aColor;
  }
`

const NEBULA_FRAG = /* glsl */`
  precision highp float;
  varying float vOpacity;
  varying vec3  vColor;

  void main() {
    vec2  uv = gl_PointCoord - 0.5;
    float r  = length(uv);
    if (r > 0.5) discard;
    float cloud = exp(-r * r * 6.0);
    float lobe  = exp(-r * r * 1.5) * 0.3;
    gl_FragColor = vec4(vColor, (cloud + lobe) * vOpacity);
  }
`

const LINE_VERT = /* glsl */`
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const LINE_FRAG = /* glsl */`
  precision mediump float;
  uniform vec3  uColor;
  uniform float uAlpha;
  void main() {
    gl_FragColor = vec4(uColor, uAlpha);
  }
`

const DUST_VERT = /* glsl */`
  attribute float aSize;
  attribute float aSpeed;
  attribute float aPhase;
  attribute float aOpacity;

  uniform float uTime;
  uniform float uScrollY;
  uniform vec2  uMouse;
  uniform float uGravity;

  varying float vAlpha;

  void main() {
    vec3 pos = position;
    float t  = uTime * aSpeed;
    pos.x += sin(t + aPhase) * 0.04;
    pos.y += cos(t * 0.6 + aPhase) * 0.03;
    pos.y += uScrollY * 0.00004;

    // Dust slightly drags toward cursor (opposite of star repulsion)
    vec4 mvPos0 = modelViewMatrix * vec4(pos, 1.0);
    vec4 clip0  = projectionMatrix * mvPos0;
    vec2 nNDC   = clip0.xy / max(clip0.w, 0.0001);
    vec2 dir    = uMouse - nNDC;
    float d     = length(dir);
    float pull  = smoothstep(0.5, 0.0, d) * uGravity * 0.10;
    pos.xy += normalize(dir + vec2(0.0001)) * pull * clip0.w * 0.4;

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPos;

    gl_PointSize = aSize * (200.0 / -mvPos.z);
    gl_PointSize = clamp(gl_PointSize, 0.3, 2.5);
    vAlpha = aOpacity * (0.5 + sin(uTime * aSpeed * 0.5 + aPhase) * 0.2);
  }
`
const DUST_FRAG = /* glsl */`
  precision highp float;
  varying float vAlpha;
  void main() {
    vec2  uv = gl_PointCoord - 0.5;
    float r  = length(uv);
    if (r > 0.5) discard;
    float soft = 1.0 - smoothstep(0.0, 0.5, r);
    vec3 col = vec3(0.82, 0.68, 0.52);
    gl_FragColor = vec4(col, soft * vAlpha);
  }
`

// ─── Helpers ─────────────────────────────────────────────────────────────────

function rand(a: number, b: number) { return a + Math.random() * (b - a) }

function hsl2rgb(h: number, s: number, l: number): [number, number, number] {
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
  }
  return [f(0), f(8), f(4)]
}

function spiralPoint(armIndex: number, armCount: number, t: number): [number, number] {
  const armAngle  = (armIndex / armCount) * Math.PI * 2
  const spiralArm = armAngle + t * 3.5
  const r = t * FW * 0.8
  const spread = rand(-0.8, 0.8) * (1 - t * 0.4)
  return [
    Math.cos(spiralArm) * r + Math.cos(spiralArm + Math.PI / 2) * spread,
    Math.sin(spiralArm) * r + Math.sin(spiralArm + Math.PI / 2) * spread * 0.6,
  ]
}

// ─── Component ───────────────────────────────────────────────────────────────

interface HeroParticlesProps {
  isReady?: boolean
}

export default function HeroParticles({ isReady = true }: HeroParticlesProps) {
  const mountRef    = useRef<HTMLDivElement>(null)
  const pointer     = usePointerNDC()
  const scrollVel   = useScrollVelocity()

  useEffect(() => {
    if (!isReady) return
    if (typeof window === 'undefined') return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const isCoarse     = window.matchMedia('(pointer: coarse)').matches
    const lowEndGPU    = isLowEndGPU()

    const container = mountRef.current
    if (!container) return

    // Always start from a clean slate — HMR / StrictMode can leave orphan
    // WebGL canvases attached to the container.
    while (container.firstChild) container.removeChild(container.firstChild)

    // ── CSS fallback for software-renderer / very constrained devices ──
    // Cheap radial-gradient + a few dots; never animates expensive shaders.
    if (lowEndGPU) {
      const fallback = document.createElement('div')
      fallback.setAttribute('aria-hidden', 'true')
      fallback.style.cssText = [
        'position:absolute',
        'inset:0',
        'background:' +
          'radial-gradient(2px 2px at 18% 22%, rgba(255,255,255,0.85), transparent 60%),' +
          'radial-gradient(1.5px 1.5px at 73% 41%, rgba(232,213,255,0.75), transparent 60%),' +
          'radial-gradient(1px 1px at 30% 78%, rgba(167,139,250,0.7), transparent 60%),' +
          'radial-gradient(1px 1px at 88% 62%, rgba(199,178,255,0.6), transparent 60%),' +
          'radial-gradient(1.5px 1.5px at 52% 12%, rgba(255,255,255,0.6), transparent 60%),' +
          'radial-gradient(1px 1px at 12% 55%, rgba(167,139,250,0.55), transparent 60%),' +
          'radial-gradient(1px 1px at 64% 88%, rgba(232,213,255,0.5), transparent 60%)',
      ].join(';')
      container.appendChild(fallback)
      return () => { try { container.removeChild(fallback) } catch {} }
    }

    const COUNTS = pickCounts()
    const STAR_COUNT = COUNTS.stars
    const DUST_COUNT = COUNTS.dust
    const HERO_COUNT = COUNTS.hero

    const LAYER_SPLITS = [
      Math.floor(STAR_COUNT * 0.05),
      Math.floor(STAR_COUNT * 0.20),
      Math.floor(STAR_COUNT * 0.50),
    ]

    // ── Renderer ─────────────────────────────────────────────────────────
    // DPR plafonné à 1.5: divise la fillrate par ~1.78 vs 2.0 (DPR² overdraw).
    // Le canvas n'est qu'un fond — l'œil ne voit pas la différence d'AA mais
    // ressent immédiatement les frame drops.
    const DPR = Math.min(window.devicePixelRatio, 1.5)
    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      powerPreference: 'high-performance',
      stencil: false,
      depth: false,
    })
    renderer.setPixelRatio(DPR)
    renderer.setClearColor(0x000000, 0)
    renderer.setSize(container.clientWidth, container.clientHeight)
    container.appendChild(renderer.domElement)

    const scene  = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(
      65,
      container.clientWidth / container.clientHeight,
      0.1, 200,
    )
    camera.position.z = 6

    // ════════════════════════════════════════════════════════════
    // 1. NEBULA
    // ════════════════════════════════════════════════════════════
    const nebCount = NEBULAE.length
    const nebPositions = new Float32Array(nebCount * 3)
    const nebColors    = new Float32Array(nebCount * 3)
    const nebRadii     = new Float32Array(nebCount)
    const nebOpacities = new Float32Array(nebCount)
    const nebSpeeds    = new Float32Array(nebCount)
    const nebPhases    = new Float32Array(nebCount)
    NEBULAE.forEach(([x, y, z, r, g, b, radius, opacity], i) => {
      const i3 = i * 3
      nebPositions[i3] = x as number; nebPositions[i3+1] = y as number; nebPositions[i3+2] = z as number
      nebColors[i3] = r as number;    nebColors[i3+1]    = g as number; nebColors[i3+2]    = b as number
      nebRadii[i] = radius as number
      nebOpacities[i] = opacity as number
      nebSpeeds[i] = rand(0.02, 0.06)
      nebPhases[i] = rand(0, Math.PI * 2)
    })
    const nebGeo = new THREE.BufferGeometry()
    nebGeo.setAttribute('position', new THREE.BufferAttribute(nebPositions, 3))
    nebGeo.setAttribute('aColor',   new THREE.BufferAttribute(nebColors,    3))
    nebGeo.setAttribute('aRadius',  new THREE.BufferAttribute(nebRadii,     1))
    nebGeo.setAttribute('aOpacity', new THREE.BufferAttribute(nebOpacities, 1))
    nebGeo.setAttribute('aSpeed',   new THREE.BufferAttribute(nebSpeeds,    1))
    nebGeo.setAttribute('aPhase',   new THREE.BufferAttribute(nebPhases,    1))
    const nebUniforms: Record<string, THREE.IUniform> = {
      uTime:    { value: 0 },
      uDPR:     { value: DPR },
      uMouse:   { value: new THREE.Vector2(0, 0) },
      uGravity: { value: 0 },
    }
    const nebMat = new THREE.ShaderMaterial({
      vertexShader: NEBULA_VERT, fragmentShader: NEBULA_FRAG,
      uniforms: nebUniforms, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    scene.add(new THREE.Points(nebGeo, nebMat))

    // ════════════════════════════════════════════════════════════
    // 2. STAR FIELD with HERO subset
    // ════════════════════════════════════════════════════════════
    const starPositions = new Float32Array(STAR_COUNT * 3)
    const starSizes     = new Float32Array(STAR_COUNT)
    const starLayers    = new Float32Array(STAR_COUNT)
    const starSpeeds    = new Float32Array(STAR_COUNT)
    const starPhases    = new Float32Array(STAR_COUNT)
    const starAmps      = new Float32Array(STAR_COUNT)
    const starColors    = new Float32Array(STAR_COUNT * 3)
    const starHero      = new Float32Array(STAR_COUNT)

    const ARM_COUNT = 3

    // Mark random hero star indices (only from layers 0/1 — near/mid)
    const heroIndices = new Set<number>()
    const nearMidCount = LAYER_SPLITS[0] + LAYER_SPLITS[1]
    while (heroIndices.size < HERO_COUNT) {
      heroIndices.add(Math.floor(Math.random() * nearMidCount))
    }

    for (let i = 0; i < STAR_COUNT; i++) {
      const i3 = i * 3
      let layer = 3
      if (i < LAYER_SPLITS[0]) layer = 0
      else if (i < LAYER_SPLITS[0] + LAYER_SPLITS[1]) layer = 1
      else if (i < LAYER_SPLITS[0] + LAYER_SPLITS[1] + LAYER_SPLITS[2]) layer = 2
      starLayers[i] = layer

      let sx = 0, sy = 0, sz = 0
      if (layer <= 1 && Math.random() < 0.7) {
        const arm = Math.floor(Math.random() * ARM_COUNT)
        const t   = Math.random()
        const [ax, ay] = spiralPoint(arm, ARM_COUNT, t)
        sx = ax + rand(-0.3, 0.3)
        sy = ay + rand(-0.25, 0.25)
        sz = rand(-FD * 0.3, FD * 0.3) * (layer + 0.5)
      } else if (layer === 2 && Math.random() < 0.5) {
        const arm = Math.floor(Math.random() * ARM_COUNT)
        const t   = Math.random()
        const [ax, ay] = spiralPoint(arm, ARM_COUNT, t)
        sx = ax + rand(-0.8, 0.8); sy = ay + rand(-0.6, 0.6); sz = rand(-FD * 0.6, FD * 0.6)
      } else {
        sx = rand(-FW, FW); sy = rand(-FH, FH); sz = rand(-FD, FD)
      }

      starPositions[i3] = sx; starPositions[i3+1] = sy; starPositions[i3+2] = sz

      const baseSize = layer === 0 ? rand(3.0, 6.0)
                     : layer === 1 ? rand(1.5, 3.5)
                     : layer === 2 ? rand(0.8, 2.0)
                     :               rand(0.3, 1.2)
      starSizes[i] = baseSize
      starSpeeds[i] = rand(0.06, layer === 0 ? 0.18 : 0.38)
      starPhases[i] = rand(0, Math.PI * 2)
      starAmps[i]   = rand(0.02, layer === 0 ? 0.12 : 0.28)

      // Color: diversified palette
      // 30% violet-warm white, 30% blue-cool white, 10% rare gold, 30% standard violet/indigo
      const palette = Math.random()
      let hue: number, sat: number, lit: number
      if (palette < 0.30) {            // violet-warm white
        hue = 285 + rand(-15, 15); sat = rand(0.30, 0.55); lit = rand(0.85, 0.96)
      } else if (palette < 0.60) {     // blue-cool white
        hue = 220 + rand(-10, 10); sat = rand(0.20, 0.40); lit = rand(0.85, 0.97)
      } else if (palette < 0.70) {     // rare warm gold (K-type)
        hue = 38  + rand(-8, 8);  sat = rand(0.55, 0.75); lit = rand(0.78, 0.92)
      } else {                         // standard layer-based
        hue = LAYER_HUES[layer] + rand(-25, 25)
        sat = layer === 0 ? rand(0.5, 0.9) : layer === 3 ? rand(0.05, 0.25) : rand(0.3, 0.7)
        lit = layer === 0 ? rand(0.65, 0.90) : rand(0.70, 0.95)
      }
      const [r, g, b] = hsl2rgb(hue, sat, lit)
      starColors[i3] = r; starColors[i3+1] = g; starColors[i3+2] = b

      starHero[i] = heroIndices.has(i) ? 1.0 : 0.0
    }

    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
    starGeo.setAttribute('aSize',    new THREE.BufferAttribute(starSizes,     1))
    starGeo.setAttribute('aLayer',   new THREE.BufferAttribute(starLayers,    1))
    starGeo.setAttribute('aSpeed',   new THREE.BufferAttribute(starSpeeds,    1))
    starGeo.setAttribute('aPhase',   new THREE.BufferAttribute(starPhases,    1))
    starGeo.setAttribute('aAmp',     new THREE.BufferAttribute(starAmps,      1))
    starGeo.setAttribute('aColor',   new THREE.BufferAttribute(starColors,    3))
    starGeo.setAttribute('aHero',    new THREE.BufferAttribute(starHero,      1))

    const starUniforms: Record<string, THREE.IUniform> = {
      uTime:      { value: 0 },
      uScrollY:   { value: 0 },
      uScrollVel: { value: 0 },
      uMouse:     { value: new THREE.Vector2(0, 0) },
      uGravity:   { value: 0 },
      uDPR:       { value: DPR },
      uRipple:    { value: new THREE.Vector3(0, 0, -1) },
      uQuality:   { value: 1.0 },
    }

    const starMat = new THREE.ShaderMaterial({
      vertexShader: STAR_VERT, fragmentShader: STAR_FRAG,
      uniforms: starUniforms, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    scene.add(new THREE.Points(starGeo, starMat))

    // ════════════════════════════════════════════════════════════
    // 3. DUST BAND
    // ════════════════════════════════════════════════════════════
    const dustPositions = new Float32Array(DUST_COUNT * 3)
    const dustSizes     = new Float32Array(DUST_COUNT)
    const dustSpeeds    = new Float32Array(DUST_COUNT)
    const dustPhases    = new Float32Array(DUST_COUNT)
    const dustOpacities = new Float32Array(DUST_COUNT)
    for (let i = 0; i < DUST_COUNT; i++) {
      const i3 = i * 3
      const tx = rand(-FW, FW)
      const ty = tx * 0.25 + rand(-0.8, 0.8)
      dustPositions[i3] = tx; dustPositions[i3+1] = ty; dustPositions[i3+2] = rand(-FD * 0.3, FD * 0.3)
      dustSizes[i]     = rand(0.5, 1.8)
      dustSpeeds[i]    = rand(0.02, 0.08)
      dustPhases[i]    = rand(0, Math.PI * 2)
      dustOpacities[i] = rand(0.04, 0.18)
    }
    const dustGeo = new THREE.BufferGeometry()
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3))
    dustGeo.setAttribute('aSize',    new THREE.BufferAttribute(dustSizes,     1))
    dustGeo.setAttribute('aSpeed',   new THREE.BufferAttribute(dustSpeeds,    1))
    dustGeo.setAttribute('aPhase',   new THREE.BufferAttribute(dustPhases,    1))
    dustGeo.setAttribute('aOpacity', new THREE.BufferAttribute(dustOpacities, 1))
    const dustUniforms: Record<string, THREE.IUniform> = {
      uTime:    { value: 0 },
      uScrollY: { value: 0 },
      uMouse:   { value: new THREE.Vector2(0, 0) },
      uGravity: { value: 0 },
    }
    const dustMat = new THREE.ShaderMaterial({
      vertexShader: DUST_VERT, fragmentShader: DUST_FRAG,
      uniforms: dustUniforms, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    scene.add(new THREE.Points(dustGeo, dustMat))

    // ════════════════════════════════════════════════════════════
    // 4. CONSTELLATIONS
    // ════════════════════════════════════════════════════════════
    const MAX_LINES    = 400
    const LINE_DIST_SQ = 0.6 * 0.6
    const SAMPLE_COUNT = 250
    const linePositions = new Float32Array(MAX_LINES * 2 * 3)
    const lineGeo = new THREE.BufferGeometry()
    const linePosAttr = new THREE.BufferAttribute(linePositions, 3)
    linePosAttr.setUsage(THREE.DynamicDrawUsage)
    lineGeo.setAttribute('position', linePosAttr)
    lineGeo.setDrawRange(0, 0)
    const lineUniforms: Record<string, THREE.IUniform> = {
      uColor: { value: new THREE.Vector3(0.55, 0.35, 0.98) },
      uAlpha: { value: 0.06 },
    }
    const lineMat = new THREE.ShaderMaterial({
      vertexShader: LINE_VERT, fragmentShader: LINE_FRAG,
      uniforms: lineUniforms, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    scene.add(new THREE.LineSegments(lineGeo, lineMat))

    const sampleIdx = new Int32Array(SAMPLE_COUNT)
    function rebuildLines(t: number) {
      let lineCount = 0
      const nearCount = LAYER_SPLITS[0] + LAYER_SPLITS[1]
      for (let s = 0; s < SAMPLE_COUNT; s++) sampleIdx[s] = Math.floor(Math.random() * nearCount)
      const animPos: number[] = []
      for (let s = 0; s < SAMPLE_COUNT; s++) {
        const i  = sampleIdx[s]
        const i3 = i * 3
        const sp = starSpeeds[i], ph = starPhases[i], am = starAmps[i]
        const tt = t * sp
        animPos.push(
          starPositions[i3]   + Math.sin(tt + ph) * am,
          starPositions[i3+1] + Math.cos(tt * 0.7 + ph * 1.3) * am * 0.7,
          starPositions[i3+2],
        )
      }
      for (let a = 0; a < SAMPLE_COUNT && lineCount < MAX_LINES; a++) {
        const ax = animPos[a*3], ay = animPos[a*3+1], az = animPos[a*3+2]
        for (let b = a + 1; b < SAMPLE_COUNT && lineCount < MAX_LINES; b++) {
          const bx = animPos[b*3], by = animPos[b*3+1], bz = animPos[b*3+2]
          const d2 = (ax-bx)**2 + (ay-by)**2 + (az-bz)**2
          if (d2 < LINE_DIST_SQ) {
            linePositions.set([ax, ay, az, bx, by, bz], lineCount * 6)
            lineCount++
          }
        }
      }
      linePosAttr.needsUpdate = true
      lineGeo.setDrawRange(0, lineCount * 2)
    }

    // ─── State ────────────────────────────────────────────────────────────
    let scrollY    = 0
    let rafId      = 0
    let startTime  = performance.now()
    let visible    = true
    let inViewport = true
    let lowPerf    = false

    // Gravity strength: smoothly fades in/out
    let gravityTarget = 0
    let gravityCur    = 0

    // Click ripple state
    let rippleT0 = -1
    const rippleNDC = new THREE.Vector2(0, 0)

    const onScroll = () => { scrollY = window.scrollY }
    window.addEventListener('scroll', onScroll, { passive: true })

    // Click ripple — listen on window, hit-test against canvas bounds.
    // We don't capture pointer events on the canvas itself (CTAs sit above).
    const onClick = (e: MouseEvent) => {
      if (reduceMotion) return
      const rect = renderer.domElement.getBoundingClientRect()
      if (
        e.clientX < rect.left || e.clientX > rect.right ||
        e.clientY < rect.top  || e.clientY > rect.bottom
      ) return
      // Skip clicks on interactive elements above
      const target = e.target as HTMLElement | null
      if (target && target.closest('a, button, input, textarea, [role="button"]')) return
      const nx =  ((e.clientX - rect.left) / rect.width)  * 2 - 1
      const ny = -((e.clientY - rect.top)  / rect.height) * 2 + 1
      rippleNDC.set(nx, ny)
      rippleT0 = performance.now() / 1000
    }
    window.addEventListener('click', onClick)

    // FPS monitor
    let fpsAccum = 0
    let fpsFrames = 0
    let fpsLastReport = performance.now()
    let lowPerfStreakStart = 0
    let lastLineRebuild = 0

    function render() {
      const now = performance.now()
      const elapsed = (now - startTime) * 0.001

      // Mouse / gravity
      const px = pointer.smooth.x
      const py = pointer.smooth.y
      const wantGravity = !reduceMotion && !isCoarse && pointer.hasPointer.current && pointer.active.current
      gravityTarget = wantGravity ? 1.0 : 0.0
      // Lower max strength on low-perf devices
      if (lowPerf) gravityTarget *= 0.5
      gravityCur += (gravityTarget - gravityCur) * 0.06

      // Star uniforms
      starUniforms.uTime.value      = elapsed
      starUniforms.uScrollY.value   = scrollY
      starUniforms.uScrollVel.value = scrollVel.current
      ;(starUniforms.uMouse.value as THREE.Vector2).set(px, py)
      starUniforms.uGravity.value   = gravityCur

      // Ripple
      if (rippleT0 > 0) {
        const age = (now / 1000) - rippleT0
        if (age > 2.5) rippleT0 = -1
        ;(starUniforms.uRipple.value as THREE.Vector3).set(rippleNDC.x, rippleNDC.y, age)
      } else {
        ;(starUniforms.uRipple.value as THREE.Vector3).z = -1
      }

      // Nebula uniforms
      nebUniforms.uTime.value = elapsed
      ;(nebUniforms.uMouse.value as THREE.Vector2).set(px, py)
      nebUniforms.uGravity.value = gravityCur

      // Dust uniforms
      dustUniforms.uTime.value = elapsed
      dustUniforms.uScrollY.value = scrollY
      ;(dustUniforms.uMouse.value as THREE.Vector2).set(px, py)
      dustUniforms.uGravity.value = gravityCur

      // Quality switch: low-perf disables gravity/ripple/warp branch in shader
      starUniforms.uQuality.value = lowPerf ? 0.0 : 1.0

      // Constellations: throttle to ~4Hz (250ms). The CPU loop is O(N²)
      // and uploading a buffer to GPU is non-free. Visually invisible at 4Hz.
      if (!lowPerf && now - lastLineRebuild >= 250) {
        rebuildLines(elapsed)
        lastLineRebuild = now
      }

      renderer.render(scene, camera)

      // FPS sampling — auto-downgrade trigger
      fpsFrames++
      if (now - fpsLastReport >= 1000) {
        fpsAccum = fpsFrames * 1000 / (now - fpsLastReport)
        fpsFrames = 0
        fpsLastReport = now
        if (fpsAccum < 45) {
          if (lowPerfStreakStart === 0) lowPerfStreakStart = now
          if (now - lowPerfStreakStart > 1500 && !lowPerf) {
            lowPerf = true
            // Hard downgrade: drop DPR further and clear constellations
            renderer.setPixelRatio(Math.min(DPR, 1.0))
            lineGeo.setDrawRange(0, 0)
          }
        } else {
          lowPerfStreakStart = 0
        }
      }

      rafId = requestAnimationFrame(render)
    }

    function startLoop() {
      if (rafId === 0) {
        startTime = performance.now() - (starUniforms.uTime.value as number) * 1000
        rafId = requestAnimationFrame(render)
      }
    }
    function stopLoop() {
      if (rafId !== 0) { cancelAnimationFrame(rafId); rafId = 0 }
    }

    // Visibility (tab)
    const onVisibility = () => {
      visible = !document.hidden
      if (!visible) stopLoop()
      else if (inViewport) startLoop()
    }
    document.addEventListener('visibilitychange', onVisibility)

    // IntersectionObserver — pause when hero leaves viewport
    const io = new IntersectionObserver((entries) => {
      const e = entries[0]
      inViewport = e.isIntersecting
      if (!inViewport) stopLoop()
      else if (visible) startLoop()
    }, { threshold: 0 })
    io.observe(container)

    // Resize
    const onResize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
      starUniforms.uDPR.value = DPR
      nebUniforms.uDPR.value  = DPR
    }
    const ro = new ResizeObserver(onResize)
    ro.observe(container)

    if (reduceMotion) {
      // Single-frame static render then stop
      renderer.render(scene, camera)
    } else {
      startLoop()
    }

    return () => {
      stopLoop()
      ro.disconnect()
      io.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('click', onClick)
      document.removeEventListener('visibilitychange', onVisibility)
      ;[nebGeo, nebMat, starGeo, starMat, dustGeo, dustMat, lineGeo, lineMat].forEach(o => o.dispose())
      renderer.dispose()
      renderer.domElement.parentNode?.removeChild(renderer.domElement)
    }
  }, [isReady, pointer, scrollVel])

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none"
      style={{ willChange: 'transform', zIndex: 0 }}
    />
  )
}
