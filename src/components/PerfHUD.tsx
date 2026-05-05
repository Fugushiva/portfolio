'use client'

/**
 * PerfHUD — opt-in floating FPS / frame-time / memory display.
 *
 * Activate by adding ?fps=1 to the URL. Stays dormant otherwise (zero cost).
 *
 * Reports:
 *   - FPS (rolling 1s avg)
 *   - p50 / p95 / max frame time (over a rolling 1s window)
 *   - JS heap MB (Chromium only)
 *   - GPU renderer string
 */

import { useEffect, useRef, useState } from 'react'

export default function PerfHUD() {
  const [enabled, setEnabled] = useState(false)
  const [stats, setStats] = useState<{
    fps: string; p50: string; p95: string; max: string; mem: string; gpu: string
  } | null>(null)
  const rafRef = useRef(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const sp = new URLSearchParams(window.location.search)
    if (sp.get('fps') !== '1') return
    setEnabled(true)
  }, [])

  useEffect(() => {
    if (!enabled) return

    let last = performance.now()
    const samples: number[] = []
    let lastReport = last
    let frames = 0

    // GPU info (computed once)
    let gpu = '?'
    try {
      const c = document.createElement('canvas')
      const gl = c.getContext('webgl') as WebGLRenderingContext | null
      const ext = gl?.getExtension('WEBGL_debug_renderer_info')
      gpu = ext && gl ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : 'unknown'
    } catch { /* ignore */ }

    const loop = (t: number) => {
      const dt = t - last
      last = t
      samples.push(dt)
      if (samples.length > 90) samples.shift()
      frames++

      if (t - lastReport > 500) {
        const sorted = [...samples].sort((a, b) => a - b)
        const p50 = sorted[Math.floor(sorted.length / 2)] ?? 0
        const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0
        const mx  = sorted[sorted.length - 1] ?? 0
        const fps = (frames * 1000) / (t - lastReport)
        frames = 0
        lastReport = t

        type PerfWithMem = Performance & { memory?: { usedJSHeapSize: number } }
        const mem = (performance as PerfWithMem).memory
        const memStr = mem ? `${Math.round(mem.usedJSHeapSize / 1048576)}M` : '—'

        setStats({
          fps: fps.toFixed(0),
          p50: p50.toFixed(1),
          p95: p95.toFixed(1),
          max: mx.toFixed(1),
          mem: memStr,
          gpu: gpu.length > 60 ? gpu.slice(0, 57) + '…' : gpu,
        })
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [enabled])

  if (!enabled || !stats) return null

  const fpsNum = Number(stats.fps)
  const color =
    fpsNum >= 55 ? '#7CFFB2' :
    fpsNum >= 40 ? '#FFD27A' :
                   '#FF7A8E'

  return (
    <div
      style={{
        position: 'fixed', top: 12, right: 12, zIndex: 9999,
        font: '11px/1.35 ui-monospace, Menlo, monospace',
        color: '#fff', background: 'rgba(0,0,0,0.78)',
        padding: '10px 12px', borderRadius: 8,
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        pointerEvents: 'none',
        border: '1px solid rgba(255,255,255,0.08)',
        minWidth: 220,
      }}
    >
      <div style={{ color, fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
        {stats.fps} FPS
      </div>
      <div>p50: {stats.p50}ms · p95: {stats.p95}ms · max: {stats.max}ms</div>
      <div>heap: {stats.mem}</div>
      <div style={{ opacity: 0.65, marginTop: 4, fontSize: 10 }}>{stats.gpu}</div>
    </div>
  )
}
