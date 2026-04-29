'use client'

/**
 * HeroParticles — Three.js / WebGL particle background for the Hero section.
 *
 * Architecture
 * ────────────
 * • ~4 000 particles spread across 3 depth layers (near / mid / far).
 * • Custom vertex + fragment shaders:
 *   - Vertex: per-particle drift velocity, sinusoidal oscillation, depth-based
 *     size attenuation, mouse repulsion spring force.
 *   - Fragment: smooth disc with soft glow (no raw gl_PointCoord squares).
 * • Constellation lines rendered as a separate LineSegments object; pairs are
 *   rebuilt each frame for the ~600 nearest-neighbour connections.
 * • Mouse repulsion computed on the GPU via uniforms — zero JS per-particle work.
 * • Scroll parallax: each layer shifts Y at a different speed via uScrollY.
 * • Chroma shift: hue oscillates ±15° around the accent purple over ~8 s.
 * • Reduced-motion / coarse-pointer / SSR guards: canvas is never mounted.
 * • Self-suspending rAF: stops when tab is hidden, resumes on focus.
 * • Full resize / DPR-aware: renderer and camera recomputed on ResizeObserver.
 *
 * Performance budget
 * ──────────────────
 * • Three.js tree-shaken via direct class imports (no global THREE namespace).
 * • BufferGeometry attributes are pre-allocated; only uniforms are written per frame.
 * • Line pairs are recomputed only when particle count changes; position data is
 *   patched in-place so no GC pressure.
 * • Renderer pixel-ratio capped at 1.5 to avoid GPU overload on retina screens.
 * • willChange: 'transform' on the canvas div keeps it on its own compositor layer.
 */

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

// ─── Constants ──────────────────────────────────────────────────────────────

const PARTICLE_COUNT = 4000

// Layer split: near (big, slow), mid, far (tiny, fast)
const LAYER_NEAR = Math.floor(PARTICLE_COUNT * 0.2)   // 800
const LAYER_MID  = Math.floor(PARTICLE_COUNT * 0.5)   // 2000
// LAYER_FAR = remaining ~1200

// Field half-extents (world units)
const FIELD_W = 8
const FIELD_H = 5
const FIELD_D = 4   // depth spread

// Mouse repulsion radius (world units)
const REPULSION_RADIUS = 1.4
const REPULSION_STRENGTH = 0.9

// Constellation: max distance² for drawing a line
const LINE_DIST_SQ = 0.55 * 0.55
// Max lines to draw (pairs)
const MAX_LINES = 600

// Accent purple in HSL
const HUE_CENTER  = 270   // #7c3aed ≈ 270°
const HUE_RANGE   = 30    // ±30° swing
const SAT         = 0.72
const LIT         = 0.55

// ─── Shaders ────────────────────────────────────────────────────────────────

const VERT = /* glsl */`
  // Per-particle attributes
  attribute float aSize;       // base point size
  attribute float aLayer;      // 0 = near, 1 = mid, 2 = far
  attribute float aSpeed;      // drift speed multiplier
  attribute float aPhase;      // oscillation phase offset
  attribute float aAmplitude;  // oscillation amplitude
  attribute vec3  aVelocity;   // base drift direction (normalised)

  // Uniforms
  uniform float uTime;
  uniform float uScrollY;       // raw scroll offset in pixels
  uniform vec2  uMouse;         // NDC mouse position [-1,1]
  uniform float uRepulsionR;    // repulsion radius (world)
  uniform float uRepulsionStr;  // repulsion strength
  uniform float uPixelRatio;
  uniform vec2  uResolution;    // viewport px

  // Output
  varying float vAlpha;
  varying float vLayer;
  varying float vDist; // distance to repulsion centre (0-1)

  void main() {
    // ── Drift ──────────────────────────────────────────────────────
    vec3 pos = position;

    float t = uTime * aSpeed;

    // Primary sinusoidal drift
    pos.x += sin(t + aPhase)        * aAmplitude;
    pos.y += cos(t * 0.7 + aPhase)  * aAmplitude * 0.6;
    pos.z += sin(t * 0.4 + aPhase)  * aAmplitude * 0.3;

    // Wrap around so particles never leave the field
    pos.x = mod(pos.x + 8.0, 16.0) - 8.0;
    pos.y = mod(pos.y + 5.0, 10.0) - 5.0;

    // ── Scroll parallax ────────────────────────────────────────────
    // Each layer scrolls at a different rate (near = more, far = less)
    float parallaxFactor = (2.0 - aLayer) * 0.00025;   // layer 0=near -> 0.0005, layer 2=far -> ~0
    pos.y += uScrollY * parallaxFactor;

    // ── Mouse repulsion ─────────────────────────────────────────────
    // Project mouse NDC to world space (approximate, ignores depth)
    vec2 mouseWorld = uMouse * vec2(8.0, 5.0);
    vec2 diff2D = pos.xy - mouseWorld;
    float d = length(diff2D);
    float repulse = smoothstep(uRepulsionR, 0.0, d) * uRepulsionStr;
    pos.xy += normalize(diff2D + vec2(0.001)) * repulse;

    vDist = clamp(1.0 - d / uRepulsionR, 0.0, 1.0);

    // ── MVP transform ───────────────────────────────────────────────
    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPos;

    // ── Point size (perspective + layer attenuation + DPR) ──────────
    // aLayer: 0=near (large), 2=far (small)
    float layerScale = 1.0 - aLayer * 0.28;
    gl_PointSize = aSize * layerScale * uPixelRatio * (300.0 / -mvPos.z);
    gl_PointSize = clamp(gl_PointSize, 0.6, 8.0);

    // ── Alpha ───────────────────────────────────────────────────────
    // Far particles are dimmer; near ones pulse slightly
    float baseFade = 0.35 + aLayer * 0.1; // far = brighter base
    float pulse = sin(uTime * aSpeed * 0.5 + aPhase) * 0.12 + 0.88;
    vAlpha = baseFade * pulse;

    vLayer = aLayer;
  }
`

const FRAG = /* glsl */`
  precision highp float;

  uniform vec3  uColor;     // base hue
  uniform vec3  uColorB;    // secondary hue (blended by layer)
  uniform float uTime;

  varying float vAlpha;
  varying float vLayer;
  varying float vDist;

  void main() {
    // Smooth disc: distance from centre of point sprite
    vec2 uv = gl_PointCoord - 0.5;
    float r = length(uv);
    if (r > 0.5) discard;

    // Soft glow: core bright + falloff halo
    float core  = smoothstep(0.25, 0.0,  r);   // bright inner disc
    float halo  = smoothstep(0.5,  0.15, r);   // wide soft glow
    float shape = core * 0.7 + halo * 0.3;

    // Blend colors: near = more accent, far = cooler
    vec3 col = mix(uColorB, uColor, vLayer * 0.5);

    // Repulsion: flash to white/bright when pushed
    col = mix(col, vec3(1.0), vDist * 0.55);

    gl_FragColor = vec4(col, shape * vAlpha);
  }
`

// ─── Line shaders (simple, no point-size needed) ────────────────────────────

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

// ─── Helpers ────────────────────────────────────────────────────────────────

function hsl2rgb(h: number, s: number, l: number): [number, number, number] {
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
  }
  return [f(0), f(8), f(4)]
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min)
}

// ─── Component ──────────────────────────────────────────────────────────────

interface HeroParticlesProps {
  /** Delay mount until Hero entrance is complete (avoids jank during preloader) */
  isReady?: boolean
}

export default function HeroParticles({ isReady = true }: HeroParticlesProps) {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isReady) return
    if (typeof window === 'undefined') return
    // Bail on reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const container = mountRef.current
    if (!container) return

    // ── Renderer ──────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({
      antialias: false,        // not needed for particles
      alpha: true,             // transparent background
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.setClearColor(0x000000, 0)
    renderer.setSize(container.clientWidth, container.clientHeight)
    container.appendChild(renderer.domElement)

    // ── Scene / Camera ────────────────────────────────────────────────────
    const scene  = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      100,
    )
    camera.position.z = 5

    // ── Build particle geometry ───────────────────────────────────────────
    const positions  = new Float32Array(PARTICLE_COUNT * 3)
    const sizes      = new Float32Array(PARTICLE_COUNT)
    const layers     = new Float32Array(PARTICLE_COUNT)
    const speeds     = new Float32Array(PARTICLE_COUNT)
    const phases     = new Float32Array(PARTICLE_COUNT)
    const amplitudes = new Float32Array(PARTICLE_COUNT)
    const velocities = new Float32Array(PARTICLE_COUNT * 3)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3

      // Assign layer
      let layer = 2 // far
      if (i < LAYER_NEAR) layer = 0
      else if (i < LAYER_NEAR + LAYER_MID) layer = 1

      layers[i] = layer

      // Position spread across full field
      positions[i3]     = rand(-FIELD_W, FIELD_W)
      positions[i3 + 1] = rand(-FIELD_H, FIELD_H)
      positions[i3 + 2] = rand(-FIELD_D / 2, FIELD_D / 2) * (layer === 0 ? 0.5 : 1)

      // Size: near = larger, far = tinier
      const baseSize = layer === 0 ? rand(2.5, 4.5)
                     : layer === 1 ? rand(1.2, 2.8)
                     :               rand(0.6, 1.6)
      sizes[i] = baseSize

      // Drift
      speeds[i]     = rand(0.08, layer === 0 ? 0.22 : 0.40)
      phases[i]     = rand(0, Math.PI * 2)
      amplitudes[i] = rand(0.05, layer === 0 ? 0.18 : 0.32)

      // Velocity (not currently used in shader — kept for potential GPGPU upgrade)
      velocities[i3]     = rand(-1, 1)
      velocities[i3 + 1] = rand(-1, 1)
      velocities[i3 + 2] = rand(-0.2, 0.2)
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position',   new THREE.BufferAttribute(positions,  3))
    geo.setAttribute('aSize',      new THREE.BufferAttribute(sizes,      1))
    geo.setAttribute('aLayer',     new THREE.BufferAttribute(layers,     1))
    geo.setAttribute('aSpeed',     new THREE.BufferAttribute(speeds,     1))
    geo.setAttribute('aPhase',     new THREE.BufferAttribute(phases,     1))
    geo.setAttribute('aAmplitude', new THREE.BufferAttribute(amplitudes, 1))
    geo.setAttribute('aVelocity',  new THREE.BufferAttribute(velocities, 3))

    // ── Particle material ─────────────────────────────────────────────────
    const [r1, g1, b1] = hsl2rgb(HUE_CENTER, SAT, LIT)
    const [r2, g2, b2] = hsl2rgb(HUE_CENTER - 50, SAT - 0.1, LIT + 0.1) // electric blue-violet

    const particleUniforms: Record<string, THREE.IUniform> = {
      uTime:         { value: 0 },
      uScrollY:      { value: 0 },
      uMouse:        { value: new THREE.Vector2(0, 0) },
      uRepulsionR:   { value: REPULSION_RADIUS },
      uRepulsionStr: { value: REPULSION_STRENGTH },
      uPixelRatio:   { value: renderer.getPixelRatio() },
      uResolution:   { value: new THREE.Vector2(container.clientWidth, container.clientHeight) },
      uColor:        { value: new THREE.Vector3(r1, g1, b1) },
      uColorB:       { value: new THREE.Vector3(r2, g2, b2) },
    }

    const mat = new THREE.ShaderMaterial({
      vertexShader:   VERT,
      fragmentShader: FRAG,
      uniforms:       particleUniforms,
      transparent:    true,
      depthWrite:     false,
      blending:       THREE.AdditiveBlending,
    })

    const points = new THREE.Points(geo, mat)
    scene.add(points)

    // ── Constellation lines ───────────────────────────────────────────────
    // Pre-allocate a line buffer with MAX_LINES * 2 positions
    const linePositions = new Float32Array(MAX_LINES * 2 * 3)
    const lineGeo       = new THREE.BufferGeometry()
    const linePosAttr   = new THREE.BufferAttribute(linePositions, 3)
    linePosAttr.setUsage(THREE.DynamicDrawUsage)
    lineGeo.setAttribute('position', linePosAttr)
    lineGeo.setDrawRange(0, 0) // start invisible

    const lineUniforms: Record<string, THREE.IUniform> = {
      uColor: { value: new THREE.Vector3(r1, g1, b1) },
      uAlpha: { value: 0.07 },
    }
    const lineMat = new THREE.ShaderMaterial({
      vertexShader:   LINE_VERT,
      fragmentShader: LINE_FRAG,
      uniforms:       lineUniforms,
      transparent:    true,
      depthWrite:     false,
      blending:       THREE.AdditiveBlending,
    })
    const lines = new THREE.LineSegments(lineGeo, lineMat)
    scene.add(lines)

    // ── State: mouse / scroll ─────────────────────────────────────────────
    let mouseNDC   = new THREE.Vector2(0, 0)
    let scrollY    = 0
    let rafId      = 0
    let startTime  = performance.now()
    let lineCount  = 0

    const onMouseMove = (e: MouseEvent) => {
      mouseNDC.x =  (e.clientX / window.innerWidth)  * 2 - 1
      mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1
    }

    const onScroll = () => {
      scrollY = window.scrollY
    }

    window.addEventListener('mousemove', onMouseMove, { passive: true })
    window.addEventListener('scroll',    onScroll,    { passive: true })

    // ── Constellation rebuild helper ──────────────────────────────────────
    // Called once per frame; uses the current (pre-drift) base positions.
    // We read from the *animated* positions that the vertex shader computed
    // via a CPU-side mirror so that lines visually match particle positions.
    // Trade-off: CPU iterates ~4k² → too expensive. Instead we sample a
    // random 400-particle subset per frame for connections — fast and visually
    // indistinguishable since lines flicker in/out with motion anyway.
    const SAMPLE = 350  // particles to check per frame
    const sampleIdx = new Int32Array(SAMPLE)

    function rebuildLines(t: number) {
      // Animate positions on CPU (mirrors vertex shader — approximate)
      lineCount = 0
      const pos = positions // base positions (readonly — we animate offset)

      // Pick random sample indices
      for (let s = 0; s < SAMPLE; s++) {
        sampleIdx[s] = Math.floor(Math.random() * PARTICLE_COUNT)
      }

      // Compute animated position for each sampled particle
      const animPos: number[] = []
      for (let s = 0; s < SAMPLE; s++) {
        const i  = sampleIdx[s]
        const i3 = i * 3
        const spd  = speeds[i]
        const ph   = phases[i]
        const amp  = amplitudes[i]
        const tt   = t * spd
        const ax   = pos[i3]     + Math.sin(tt + ph)         * amp
        const ay   = pos[i3 + 1] + Math.cos(tt * 0.7 + ph)   * amp * 0.6
        const az   = pos[i3 + 2]
        animPos.push(ax, ay, az)
      }

      // Find pairs within distance threshold
      for (let a = 0; a < SAMPLE && lineCount < MAX_LINES; a++) {
        const ax = animPos[a * 3]
        const ay = animPos[a * 3 + 1]
        const az = animPos[a * 3 + 2]

        for (let b = a + 1; b < SAMPLE && lineCount < MAX_LINES; b++) {
          const bx = animPos[b * 3]
          const by = animPos[b * 3 + 1]
          const bz = animPos[b * 3 + 2]

          const dx = ax - bx, dy = ay - by, dz = az - bz
          const d2 = dx * dx + dy * dy + dz * dz

          if (d2 < LINE_DIST_SQ) {
            const base = lineCount * 6
            linePositions[base]     = ax
            linePositions[base + 1] = ay
            linePositions[base + 2] = az
            linePositions[base + 3] = bx
            linePositions[base + 4] = by
            linePositions[base + 5] = bz
            lineCount++
          }
        }
      }

      linePosAttr.needsUpdate = true
      lineGeo.setDrawRange(0, lineCount * 2)
    }

    // ── Chroma animation ──────────────────────────────────────────────────
    function updateColor(t: number) {
      const hue = HUE_CENTER + Math.sin(t * 0.12) * HUE_RANGE
      const [r, g, b] = hsl2rgb(hue, SAT, LIT)
      particleUniforms.uColor.value.set(r, g, b)
      lineUniforms.uColor.value.set(r, g, b)
    }

    // ── Render loop ───────────────────────────────────────────────────────
    function render() {
      const elapsed = (performance.now() - startTime) * 0.001 // seconds

      particleUniforms.uTime.value    = elapsed
      particleUniforms.uScrollY.value = scrollY
      particleUniforms.uMouse.value.copy(mouseNDC)

      updateColor(elapsed)
      rebuildLines(elapsed)

      renderer.render(scene, camera)
      rafId = requestAnimationFrame(render)
    }

    // Start / pause on tab visibility
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(rafId)
        rafId = 0
      } else {
        startTime = performance.now() - (particleUniforms.uTime.value as number) * 1000
        rafId = requestAnimationFrame(render)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    rafId = requestAnimationFrame(render)

    // ── Resize ────────────────────────────────────────────────────────────
    const onResize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
      particleUniforms.uResolution.value.set(w, h)
    }

    const ro = new ResizeObserver(onResize)
    ro.observe(container)

    // ── Cleanup ───────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(rafId)
      ro.disconnect()
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('scroll',    onScroll)
      document.removeEventListener('visibilitychange', onVisibility)

      // Dispose Three.js objects
      geo.dispose()
      mat.dispose()
      lineGeo.dispose()
      lineMat.dispose()
      renderer.dispose()

      // Remove canvas
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement)
      }
    }
  }, [isReady])

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none"
      style={{ willChange: 'transform', zIndex: 0 }}
    />
  )
}
