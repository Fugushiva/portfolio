'use client'

/**
 * Memoized GPU classifier.
 *
 * Returns 'low' on:
 *   - prefers-reduced-motion users
 *   - missing or software-fallback WebGL (SwiftShader, llvmpipe, Microsoft Basic)
 *   - WebGL context creation fails
 *
 * Returns 'ok' on real hardware. Memoized at module level so multiple
 * consumers (HeroParticles, HeroAurora, HeroShootingStars) all see the
 * same value within a page-load — and the test only runs once.
 */

let _cached: 'low' | 'ok' | null = null

export function detectGPUClass(): 'low' | 'ok' {
  // URL override is checked BEFORE the cache so a query-string flip during
  // dev (HMR / soft nav) is honored. Override resets the cache.
  if (typeof window !== 'undefined') {
    const sp  = new URLSearchParams(window.location.search)
    const ovr = sp.get('gpu')
    if (ovr === 'force' || ovr === 'ok' || ovr === 'high') return (_cached = 'ok')
    if (ovr === 'low')                                      return (_cached = 'low')
  }
  if (_cached !== null) return _cached
  if (typeof window === 'undefined') return 'ok'  // SSR — assume ok

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return (_cached = 'low')
  }
  try {
    const c  = document.createElement('canvas')
    const gl = c.getContext('webgl') as WebGLRenderingContext | null
    if (!gl) return (_cached = 'low')
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    const renderer = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : ''
    if (/SwiftShader|llvmpipe|Software|Microsoft Basic/i.test(renderer)) {
      return (_cached = 'low')
    }
  } catch {
    return (_cached = 'low')
  }
  return (_cached = 'ok')
}

export function isLowEndGPU(): boolean { return detectGPUClass() === 'low' }
