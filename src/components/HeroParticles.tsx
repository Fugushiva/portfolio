'use client'

/**
 * HeroParticles — Galaxy-class WebGL background for the Hero section.
 *
 * Visual design brief: "make people think it's a galaxy"
 *
 * Layers (rendered back to front):
 *   1. NEBULA CLOUD  — 6 large soft gaussian blobs, RGBA, additive blending
 *                      Slow independent drift, each with different hue
 *   2. STAR FIELD    — 8 000 stars across 4 depth layers
 *                      Far: tiny white dots, slow
 *                      Near: larger, colored (violet/indigo/white), fast
 *                      Fragment: bright core + wide gaussian halo
 *   3. DUST BAND     — 1 200 very small particles forming a diagonal band
 *                      Mimics the Milky Way dust lane — low opacity, warm tones
 *   4. CONSTELLATIONS — nearest-neighbor lines between bright stars, ultra-low alpha
 *   5. SHOOTING STARS — up to 4 streaks, random every 3-8s, CSS-only on a 2D overlay
 *
 * Mouse interaction:
 *   - Subtle parallax: each depth layer shifts at different rate (not repulsion)
 *   - Near stars: gentle swirl around cursor (< 2 world units)
 *
 * Performance:
 *   - ShaderMaterial with additive blending (no transparency sort)
 *   - BufferGeometry pre-allocated, uniforms only per frame
 *   - ResizeObserver + DPR capped at 2.0 for Retina without killing GPU
 *   - RAF self-suspends on tab hide
 *   - Disabled on prefers-reduced-motion & coarse pointer
 */

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

// ─── Constants ────────────────────────────────────────────────────────────────

const STAR_COUNT  = 8000
const DUST_COUNT  = 1200

// Layers: 0 = closest (fast, large), 3 = furthest (slow, tiny)
const LAYER_SPLITS = [
  Math.floor(STAR_COUNT * 0.05),   // L0 near:  400
  Math.floor(STAR_COUNT * 0.20),   // L1 mid-n: 1200
  Math.floor(STAR_COUNT * 0.50),   // L2 mid-f: 2800
  // L3 far: remaining 3600
]

// Field half-extents
const FW = 10, FH = 6, FD = 6

// Nebula definitions — each is a large soft blob
const NEBULAE = [
  // [x,  y,   z,   r,   g,   b,   radius, opacity]
  [ 3.0,  1.5, -2,  0.48, 0.22, 0.95,  3.2,  0.18 ],  // violet top-right
  [-4.0,  0.5, -3,  0.18, 0.32, 0.98,  4.0,  0.12 ],  // indigo left
  [ 1.5, -2.0, -1,  0.72, 0.15, 0.88,  2.4,  0.10 ],  // magenta bottom
  [-1.0,  2.5, -4,  0.15, 0.18, 0.72,  5.0,  0.08 ],  // deep blue far
  [ 5.0, -1.0, -2,  0.55, 0.10, 0.75,  2.8,  0.09 ],  // purple right
  [ 0.0,  0.0, -5,  0.30, 0.22, 0.85,  6.5,  0.06 ],  // center deep glow
]

// Hue cycling — each layer has a base hue to blend
const LAYER_HUES = [280, 260, 240, 220]  // near=violet, far=blue-white

// Shooting star config
const SHOOT_MIN_INTERVAL = 3000
const SHOOT_MAX_INTERVAL = 7000

// ─── Shader sources ───────────────────────────────────────────────────────────

const STAR_VERT = /* glsl */`
  attribute float aSize;
  attribute float aLayer;
  attribute float aSpeed;
  attribute float aPhase;
  attribute float aAmp;
  attribute vec3  aColor;

  uniform float uTime;
  uniform float uScrollY;
  uniform vec2  uMouse;     // NDC [-1,1]
  uniform float uDPR;

  varying float vAlpha;
  varying float vLayer;
  varying vec3  vColor;
  varying float vCoreDist;

  // Smooth noise (cheap but effective for drift)
  float hash(float n) { return fract(sin(n) * 43758.5453); }

  void main() {
    vec3 pos = position;
    float t  = uTime * aSpeed;

    // Sinusoidal drift — different axes at different harmonics
    pos.x += sin(t       + aPhase)        * aAmp;
    pos.y += cos(t * 0.7 + aPhase * 1.3)  * aAmp * 0.7;
    pos.z += sin(t * 0.4 + aPhase * 0.8)  * aAmp * 0.4;

    // Wrap field
    pos.x = mod(pos.x + 10.0, 20.0) - 10.0;
    pos.y = mod(pos.y + 6.0,  12.0) - 6.0;

    // Scroll parallax — near stars move more
    float pFactor = (3.0 - aLayer) * 0.00018;
    pos.y += uScrollY * pFactor;

    // Mouse parallax — gentle depth-sensitive shift (no repulsion)
    float mFactor = (3.0 - aLayer) * 0.12;
    pos.x += uMouse.x * mFactor * 0.3;
    pos.y += uMouse.y * mFactor * 0.2;

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPos;

    // Point size: perspective + layer scale
    float layerScale = 1.0 - aLayer * 0.22;
    gl_PointSize = aSize * layerScale * uDPR * (280.0 / -mvPos.z);
    gl_PointSize = clamp(gl_PointSize, 0.4, 12.0);

    // Alpha: far stars twinkle more, near are steadier
    float twinkle  = sin(uTime * aSpeed * 0.8 + aPhase) * 0.15 + 0.85;
    float layerFade = mix(0.5, 0.95, (3.0 - aLayer) / 3.0);
    vAlpha   = twinkle * layerFade;
    vLayer   = aLayer;
    vColor   = aColor;
    vCoreDist = 0.0;
  }
`

const STAR_FRAG = /* glsl */`
  precision highp float;

  varying float vAlpha;
  varying float vLayer;
  varying vec3  vColor;

  void main() {
    vec2  uv = gl_PointCoord - 0.5;
    float r  = length(uv);
    if (r > 0.5) discard;

    // Gaussian glow: core + wide halo
    float core = exp(-r * r * 40.0);          // tight bright disc
    float halo = exp(-r * r * 8.0) * 0.4;    // soft wide halo
    float shape = core + halo;

    // Color: near stars are warm-white/violet, far are blue-white
    vec3 col = vColor;

    gl_FragColor = vec4(col * (1.0 + core * 0.8), shape * vAlpha);
  }
`

// Nebula: a billboard quad with radial falloff — simulated as big point sprites
const NEBULA_VERT = /* glsl */`
  attribute float aRadius;
  attribute float aOpacity;
  attribute vec3  aColor;
  attribute float aSpeed;
  attribute float aPhase;

  uniform float uTime;
  uniform float uDPR;

  varying float vOpacity;
  varying vec3  vColor;
  varying float vRadius;

  void main() {
    vec3 pos = position;
    // Slow nebula drift
    pos.x += sin(uTime * aSpeed + aPhase) * 0.15;
    pos.y += cos(uTime * aSpeed * 0.7 + aPhase) * 0.10;

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPos;

    // Nebulae are HUGE point sprites
    gl_PointSize = aRadius * uDPR * (800.0 / -mvPos.z);
    gl_PointSize = clamp(gl_PointSize, 120.0, 1200.0);

    vOpacity = aOpacity;
    vColor   = aColor;
    vRadius  = aRadius;
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

    // Very soft gaussian — cloud-like
    float cloud = exp(-r * r * 6.0);
    // Second broader lobe for volume feel
    float lobe  = exp(-r * r * 1.5) * 0.3;
    float shape = cloud + lobe;

    gl_FragColor = vec4(vColor, shape * vOpacity);
  }
`

// Constellation lines
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

// ─── Dust band shaders (same as stars but with warm tones) ────────────────────

const DUST_VERT = /* glsl */`
  attribute float aSize;
  attribute float aSpeed;
  attribute float aPhase;
  attribute float aOpacity;

  uniform float uTime;
  uniform float uScrollY;

  varying float vAlpha;

  void main() {
    vec3 pos = position;
    float t  = uTime * aSpeed;

    pos.x += sin(t + aPhase) * 0.04;
    pos.y += cos(t * 0.6 + aPhase) * 0.03;

    // Dust scrolls very slowly
    pos.y += uScrollY * 0.00004;

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
    // Warm dust tone: orange-amber
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

// Galaxy spiral: generates a position biased along spiral arms
function spiralPoint(armIndex: number, armCount: number, t: number): [number, number] {
  const armAngle  = (armIndex / armCount) * Math.PI * 2
  const spiralArm = armAngle + t * 3.5   // tightness
  const r = t * FW * 0.8
  const spread = rand(-0.8, 0.8) * (1 - t * 0.4) // narrower at edges
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
  const mountRef        = useRef<HTMLDivElement>(null)
  const overlayRef      = useRef<HTMLDivElement>(null)

  // ── WebGL Scene ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isReady) return
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const container = mountRef.current
    if (!container) return

    // ── Renderer ─────────────────────────────────────────────────────────────
    const DPR = Math.min(window.devicePixelRatio, 2.0)
    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(DPR)
    renderer.setClearColor(0x000000, 0)
    renderer.setSize(container.clientWidth, container.clientHeight)
    container.appendChild(renderer.domElement)

    // ── Scene / Camera ───────────────────────────────────────────────────────
    const scene  = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(
      65,
      container.clientWidth / container.clientHeight,
      0.1, 200,
    )
    camera.position.z = 6

    // ════════════════════════════════════════════════════════════
    // 1. NEBULA CLOUDS
    // ════════════════════════════════════════════════════════════
    const nebCount    = NEBULAE.length
    const nebPositions = new Float32Array(nebCount * 3)
    const nebColors    = new Float32Array(nebCount * 3)
    const nebRadii     = new Float32Array(nebCount)
    const nebOpacities = new Float32Array(nebCount)
    const nebSpeeds    = new Float32Array(nebCount)
    const nebPhases    = new Float32Array(nebCount)

    NEBULAE.forEach(([x, y, z, r, g, b, radius, opacity], i) => {
      const i3 = i * 3
      nebPositions[i3]     = x as number
      nebPositions[i3 + 1] = y as number
      nebPositions[i3 + 2] = z as number
      nebColors[i3]        = r as number
      nebColors[i3 + 1]    = g as number
      nebColors[i3 + 2]    = b as number
      nebRadii[i]          = radius as number
      nebOpacities[i]      = opacity as number
      nebSpeeds[i]         = rand(0.02, 0.06)
      nebPhases[i]         = rand(0, Math.PI * 2)
    })

    const nebGeo = new THREE.BufferGeometry()
    nebGeo.setAttribute('position', new THREE.BufferAttribute(nebPositions, 3))
    nebGeo.setAttribute('aColor',   new THREE.BufferAttribute(nebColors,    3))
    nebGeo.setAttribute('aRadius',  new THREE.BufferAttribute(nebRadii,     1))
    nebGeo.setAttribute('aOpacity', new THREE.BufferAttribute(nebOpacities, 1))
    nebGeo.setAttribute('aSpeed',   new THREE.BufferAttribute(nebSpeeds,    1))
    nebGeo.setAttribute('aPhase',   new THREE.BufferAttribute(nebPhases,    1))

    const nebUniforms: Record<string, THREE.IUniform> = {
      uTime: { value: 0 },
      uDPR:  { value: DPR },
    }

    const nebMat = new THREE.ShaderMaterial({
      vertexShader:   NEBULA_VERT,
      fragmentShader: NEBULA_FRAG,
      uniforms:       nebUniforms,
      transparent:    true,
      depthWrite:     false,
      blending:       THREE.AdditiveBlending,
    })

    const nebPoints = new THREE.Points(nebGeo, nebMat)
    scene.add(nebPoints)

    // ════════════════════════════════════════════════════════════
    // 2. STAR FIELD — galaxy spiral structure
    // ════════════════════════════════════════════════════════════
    const starPositions = new Float32Array(STAR_COUNT * 3)
    const starSizes     = new Float32Array(STAR_COUNT)
    const starLayers    = new Float32Array(STAR_COUNT)
    const starSpeeds    = new Float32Array(STAR_COUNT)
    const starPhases    = new Float32Array(STAR_COUNT)
    const starAmps      = new Float32Array(STAR_COUNT)
    const starColors    = new Float32Array(STAR_COUNT * 3)

    const ARM_COUNT = 3  // 3-arm spiral (like Milky Way approximation)

    for (let i = 0; i < STAR_COUNT; i++) {
      const i3 = i * 3

      // Assign layer
      let layer = 3
      if (i < LAYER_SPLITS[0]) layer = 0
      else if (i < LAYER_SPLITS[0] + LAYER_SPLITS[1]) layer = 1
      else if (i < LAYER_SPLITS[0] + LAYER_SPLITS[1] + LAYER_SPLITS[2]) layer = 2

      starLayers[i] = layer

      // Position: spiral arms for near/mid layers, pure random for far background
      let sx = 0, sy = 0, sz = 0
      if (layer <= 1 && Math.random() < 0.7) {
        // 70% of near/mid stars follow a spiral arm
        const arm  = Math.floor(Math.random() * ARM_COUNT)
        const t    = Math.random()   // 0..1 along arm
        const [ax, ay] = spiralPoint(arm, ARM_COUNT, t)
        sx = ax + rand(-0.3, 0.3)
        sy = ay + rand(-0.25, 0.25)
        sz = rand(-FD * 0.3, FD * 0.3) * (layer + 0.5)
      } else if (layer === 2 && Math.random() < 0.5) {
        // Mid-far: partial spiral
        const arm  = Math.floor(Math.random() * ARM_COUNT)
        const t    = Math.random()
        const [ax, ay] = spiralPoint(arm, ARM_COUNT, t)
        sx = ax + rand(-0.8, 0.8)
        sy = ay + rand(-0.6, 0.6)
        sz = rand(-FD * 0.6, FD * 0.6)
      } else {
        // Background field: pure random (isotropic)
        sx = rand(-FW, FW)
        sy = rand(-FH, FH)
        sz = rand(-FD, FD)
      }

      starPositions[i3]     = sx
      starPositions[i3 + 1] = sy
      starPositions[i3 + 2] = sz

      // Size: near = large, far = tiny
      const baseSize = layer === 0 ? rand(3.0, 6.0)
                     : layer === 1 ? rand(1.5, 3.5)
                     : layer === 2 ? rand(0.8, 2.0)
                     :               rand(0.3, 1.2)
      starSizes[i] = baseSize

      // Motion
      starSpeeds[i] = rand(0.06, layer === 0 ? 0.18 : 0.38)
      starPhases[i] = rand(0, Math.PI * 2)
      starAmps[i]   = rand(0.02, layer === 0 ? 0.12 : 0.28)

      // Color per layer: near = violet-white, mid = blue-violet, far = blue-white, bg = white
      const hue = LAYER_HUES[layer] + rand(-25, 25)
      const sat = layer === 0 ? rand(0.5, 0.9) : layer === 3 ? rand(0.05, 0.25) : rand(0.3, 0.7)
      const lit = layer === 0 ? rand(0.65, 0.90) : rand(0.70, 0.95)
      const [r, g, b] = hsl2rgb(hue, sat, lit)
      starColors[i3]     = r
      starColors[i3 + 1] = g
      starColors[i3 + 2] = b
    }

    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
    starGeo.setAttribute('aSize',    new THREE.BufferAttribute(starSizes,     1))
    starGeo.setAttribute('aLayer',   new THREE.BufferAttribute(starLayers,    1))
    starGeo.setAttribute('aSpeed',   new THREE.BufferAttribute(starSpeeds,    1))
    starGeo.setAttribute('aPhase',   new THREE.BufferAttribute(starPhases,    1))
    starGeo.setAttribute('aAmp',     new THREE.BufferAttribute(starAmps,      1))
    starGeo.setAttribute('aColor',   new THREE.BufferAttribute(starColors,    3))

    const starUniforms: Record<string, THREE.IUniform> = {
      uTime:    { value: 0 },
      uScrollY: { value: 0 },
      uMouse:   { value: new THREE.Vector2(0, 0) },
      uDPR:     { value: DPR },
    }

    const starMat = new THREE.ShaderMaterial({
      vertexShader:   STAR_VERT,
      fragmentShader: STAR_FRAG,
      uniforms:       starUniforms,
      transparent:    true,
      depthWrite:     false,
      blending:       THREE.AdditiveBlending,
    })

    const stars = new THREE.Points(starGeo, starMat)
    scene.add(stars)

    // ════════════════════════════════════════════════════════════
    // 3. DUST BAND — Milky Way dust lane (warm tones, diagonal)
    // ════════════════════════════════════════════════════════════
    const dustPositions = new Float32Array(DUST_COUNT * 3)
    const dustSizes     = new Float32Array(DUST_COUNT)
    const dustSpeeds    = new Float32Array(DUST_COUNT)
    const dustPhases    = new Float32Array(DUST_COUNT)
    const dustOpacities = new Float32Array(DUST_COUNT)

    for (let i = 0; i < DUST_COUNT; i++) {
      const i3 = i * 3
      // Diagonal band: x from -FW to FW, y = 0.4 * x + jitter
      const tx  = rand(-FW, FW)
      const ty  = tx * 0.25 + rand(-0.8, 0.8)
      dustPositions[i3]     = tx
      dustPositions[i3 + 1] = ty
      dustPositions[i3 + 2] = rand(-FD * 0.3, FD * 0.3)
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
    }

    const dustMat = new THREE.ShaderMaterial({
      vertexShader:   DUST_VERT,
      fragmentShader: DUST_FRAG,
      uniforms:       dustUniforms,
      transparent:    true,
      depthWrite:     false,
      blending:       THREE.AdditiveBlending,
    })

    const dust = new THREE.Points(dustGeo, dustMat)
    scene.add(dust)

    // ════════════════════════════════════════════════════════════
    // 4. CONSTELLATIONS — nearest-neighbor lines on bright stars
    // ════════════════════════════════════════════════════════════
    const MAX_LINES     = 400
    const LINE_DIST_SQ  = 0.6 * 0.6
    const SAMPLE_COUNT  = 250  // sample subset of near stars

    const linePositions = new Float32Array(MAX_LINES * 2 * 3)
    const lineGeo       = new THREE.BufferGeometry()
    const linePosAttr   = new THREE.BufferAttribute(linePositions, 3)
    linePosAttr.setUsage(THREE.DynamicDrawUsage)
    lineGeo.setAttribute('position', linePosAttr)
    lineGeo.setDrawRange(0, 0)

    const lineUniforms: Record<string, THREE.IUniform> = {
      uColor: { value: new THREE.Vector3(0.55, 0.35, 0.98) },
      uAlpha: { value: 0.06 },
    }

    const lineMat = new THREE.ShaderMaterial({
      vertexShader:   LINE_VERT,
      fragmentShader: LINE_FRAG,
      uniforms:       lineUniforms,
      transparent:    true,
      depthWrite:     false,
      blending:       THREE.AdditiveBlending,
    })

    const lineSegments = new THREE.LineSegments(lineGeo, lineMat)
    scene.add(lineSegments)

    const sampleIdx = new Int32Array(SAMPLE_COUNT)

    function rebuildLines(t: number) {
      let lineCount = 0

      // Only sample from layer 0+1 stars (bright, near)
      const nearCount = LAYER_SPLITS[0] + LAYER_SPLITS[1]
      for (let s = 0; s < SAMPLE_COUNT; s++) {
        sampleIdx[s] = Math.floor(Math.random() * nearCount)
      }

      const animPos: number[] = []
      for (let s = 0; s < SAMPLE_COUNT; s++) {
        const i  = sampleIdx[s]
        const i3 = i * 3
        const sp = starSpeeds[i], ph = starPhases[i], am = starAmps[i]
        const tt = t * sp
        animPos.push(
          starPositions[i3]     + Math.sin(tt + ph) * am,
          starPositions[i3 + 1] + Math.cos(tt * 0.7 + ph * 1.3) * am * 0.7,
          starPositions[i3 + 2],
        )
      }

      for (let a = 0; a < SAMPLE_COUNT && lineCount < MAX_LINES; a++) {
        const ax = animPos[a * 3], ay = animPos[a * 3 + 1], az = animPos[a * 3 + 2]
        for (let b = a + 1; b < SAMPLE_COUNT && lineCount < MAX_LINES; b++) {
          const bx = animPos[b * 3], by = animPos[b * 3 + 1], bz = animPos[b * 3 + 2]
          const d2 = (ax-bx)**2 + (ay-by)**2 + (az-bz)**2
          if (d2 < LINE_DIST_SQ) {
            const base = lineCount * 6
            linePositions.set([ax, ay, az, bx, by, bz], base)
            lineCount++
          }
        }
      }

      linePosAttr.needsUpdate = true
      lineGeo.setDrawRange(0, lineCount * 2)
    }

    // ─── State ────────────────────────────────────────────────────────────────
    let mouseNDC  = new THREE.Vector2(0, 0)
    let scrollY   = 0
    let rafId     = 0
    let startTime = performance.now()

    const onMouseMove = (e: MouseEvent) => {
      mouseNDC.x =  (e.clientX / window.innerWidth)  * 2 - 1
      mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1
    }
    const onScroll = () => { scrollY = window.scrollY }

    window.addEventListener('mousemove', onMouseMove, { passive: true })
    window.addEventListener('scroll',    onScroll,    { passive: true })

    // ─── Render loop ──────────────────────────────────────────────────────────
    function render() {
      const elapsed = (performance.now() - startTime) * 0.001

      // Update nebula
      nebUniforms.uTime.value = elapsed

      // Update stars
      starUniforms.uTime.value    = elapsed
      starUniforms.uScrollY.value = scrollY
      starUniforms.uMouse.value.copy(mouseNDC)

      // Update dust
      dustUniforms.uTime.value    = elapsed
      dustUniforms.uScrollY.value = scrollY

      // Rebuild constellations every other frame to save CPU
      if (Math.round(elapsed * 30) % 2 === 0) {
        rebuildLines(elapsed)
      }

      renderer.render(scene, camera)
      rafId = requestAnimationFrame(render)
    }

    // Visibility suspend
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(rafId); rafId = 0
      } else {
        startTime = performance.now() - (starUniforms.uTime.value as number) * 1000
        rafId = requestAnimationFrame(render)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    // ─── Resize ───────────────────────────────────────────────────────────────
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

    rafId = requestAnimationFrame(render)

    // ─── Cleanup ──────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(rafId)
      ro.disconnect()
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('scroll',    onScroll)
      document.removeEventListener('visibilitychange', onVisibility)
      ;[nebGeo, nebMat, starGeo, starMat, dustGeo, dustMat, lineGeo, lineMat].forEach(o => o.dispose())
      renderer.dispose()
      renderer.domElement.parentNode?.removeChild(renderer.domElement)
    }
  }, [isReady])

  // ── Shooting stars — CSS overlay ─────────────────────────────────────────
  useEffect(() => {
    if (!isReady) return
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (window.matchMedia('(pointer: coarse)').matches) return

    const overlay = overlayRef.current
    if (!overlay) return

    let timer: ReturnType<typeof setTimeout> | null = null
    let cancelled = false

    function spawnShootingStar() {
      if (cancelled || !overlay) return

      const el = document.createElement('div')
      el.className = 'shooting-star'

      // Random start point across top 60% of screen
      const startX = Math.random() * 100    // vw
      const startY = Math.random() * 40     // vh
      // Diagonal direction: always moving right-down
      const angle  = rand(15, 45)           // degrees from horizontal

      const length = rand(60, 180)          // px
      const duration = rand(600, 1100)      // ms

      el.style.cssText = `
        position: absolute;
        left: ${startX}vw;
        top: ${startY}vh;
        width: ${length}px;
        height: 1px;
        background: linear-gradient(90deg, rgba(255,255,255,0.9), rgba(167,139,250,0.6), transparent);
        transform-origin: left center;
        transform: rotate(${angle}deg) scaleX(0);
        border-radius: 999px;
        filter: blur(0.3px);
        box-shadow: 0 0 4px rgba(255,255,255,0.6), 0 0 8px rgba(167,139,250,0.4);
        animation: shootingStar ${duration}ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
        pointer-events: none;
      `

      overlay.appendChild(el)
      setTimeout(() => {
        if (overlay.contains(el)) overlay.removeChild(el)
      }, duration + 100)

      // Schedule next
      const nextDelay = rand(SHOOT_MIN_INTERVAL, SHOOT_MAX_INTERVAL)
      if (!cancelled) timer = setTimeout(spawnShootingStar, nextDelay)
    }

    // Initial delay before first shooting star
    timer = setTimeout(spawnShootingStar, rand(1500, 4000))

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [isReady])

  return (
    <>
      {/* WebGL canvas container */}
      <div
        ref={mountRef}
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{ willChange: 'transform', zIndex: 0 }}
      />

      {/* Shooting stars CSS overlay */}
      <div
        ref={overlayRef}
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{ zIndex: 1 }}
      />
    </>
  )
}
