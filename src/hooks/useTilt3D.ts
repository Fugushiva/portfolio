'use client'

/**
 * useTilt3D — GPU-only 3D card tilt on mouse enter/move/leave.
 *
 * Applies perspective + rotateX/Y to the target element via CSS custom props
 * so the parent controls the perspective context with a single transform.
 * Uses requestAnimationFrame lerp for buttery smoothness.
 */

import { useEffect, useRef } from 'react'

interface TiltOptions {
  /** Max rotation in degrees. Default: 12 */
  maxRot?: number
  /** Lerp factor (0–1). Default: 0.08 */
  lerp?: number
  /** Scale on hover. Default: 1.02 */
  scale?: number
}

export function useTilt3D(
  ref: React.RefObject<HTMLElement | null>,
  opts: TiltOptions = {},
) {
  const { maxRot = 12, lerp = 0.08, scale = 1.02 } = opts
  const stateRef = useRef({ rx: 0, ry: 0, targetRx: 0, targetRy: 0, s: 1, targetS: 1, raf: 0, inside: false })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (window.matchMedia('(pointer: coarse)').matches) return

    const state = stateRef.current

    const loop = () => {
      state.rx += (state.targetRx - state.rx) * lerp
      state.ry += (state.targetRy - state.ry) * lerp
      state.s  += (state.targetS  - state.s)  * lerp

      el.style.transform = `perspective(900px) rotateX(${state.rx.toFixed(2)}deg) rotateY(${state.ry.toFixed(2)}deg) scale3d(${state.s.toFixed(3)},${state.s.toFixed(3)},1)`

      const delta = Math.abs(state.targetRx - state.rx) + Math.abs(state.targetRy - state.ry) + Math.abs(state.targetS - state.s)
      if (delta < 0.01 && !state.inside) {
        state.raf = 0
        return
      }
      state.raf = requestAnimationFrame(loop)
    }

    const startLoop = () => {
      if (state.raf === 0) state.raf = requestAnimationFrame(loop)
    }

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width  - 0.5  // -0.5 → 0.5
      const y = (e.clientY - rect.top)  / rect.height - 0.5
      state.targetRy =  x * maxRot * 2
      state.targetRx = -y * maxRot * 2
      startLoop()
    }

    const onEnter = () => {
      state.inside = true
      state.targetS = scale
      startLoop()
    }

    const onLeave = () => {
      state.inside = false
      state.targetRx = 0
      state.targetRy = 0
      state.targetS  = 1
      startLoop()
    }

    el.addEventListener('mousemove',  onMove,  { passive: true })
    el.addEventListener('mouseenter', onEnter, { passive: true })
    el.addEventListener('mouseleave', onLeave, { passive: true })

    return () => {
      cancelAnimationFrame(state.raf)
      state.raf = 0
      el.removeEventListener('mousemove',  onMove)
      el.removeEventListener('mouseenter', onEnter)
      el.removeEventListener('mouseleave', onLeave)
      el.style.transform = ''
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref])
}
