'use client'

/**
 * usePointerNDC — shared global pointer state in normalized device coords.
 *
 * Returns refs (mutable) read inside RAF loops without React re-render cost:
 *   - ndc:        Vec2 in [-1, 1] (x right+, y up+)
 *   - smooth:     low-pass filtered NDC (lerp 0.10/frame) — used by gravity
 *   - velocity:   px/ms 2D velocity, decays naturally
 *   - active:     true if mouse moved within last 1500ms (hide gravity when idle)
 *   - inside:     true if pointer is inside hero element bounds
 *   - hasPointer: false on coarse pointers / touch
 *
 * The hook is a singleton: multiple consumers share the same listener.
 */

import { useEffect, useRef } from 'react'

export interface PointerNDC {
  ndc:        { x: number; y: number }
  smooth:     { x: number; y: number }
  velocity:   { x: number; y: number; mag: number }
  active:     { current: boolean }
  inside:     { current: boolean }
  hasPointer: { current: boolean }
}

// Module-level singleton shared across consumers.
const _state = {
  raw:    { x: 0, y: 0 },
  smooth: { x: 0, y: 0 },
  vel:    { x: 0, y: 0, mag: 0 },
  active: { current: false },
  inside: { current: false },
  hasPointer: { current: true },
  lastT:  0,
  lastX:  0,
  lastY:  0,
  refCount: 0,
  rafId: 0,
  lastMoveTs: 0,
  attached: false,
}

function tickSmooth() {
  // Low-pass + velocity decay
  _state.smooth.x += (_state.raw.x - _state.smooth.x) * 0.10
  _state.smooth.y += (_state.raw.y - _state.smooth.y) * 0.10
  _state.vel.x   *= 0.92
  _state.vel.y   *= 0.92
  _state.vel.mag = Math.hypot(_state.vel.x, _state.vel.y)

  const now = performance.now()
  _state.active.current = (now - _state.lastMoveTs) < 1500

  _state.rafId = requestAnimationFrame(tickSmooth)
}

function onMouseMove(e: MouseEvent) {
  const w = window.innerWidth
  const h = window.innerHeight
  _state.raw.x =  (e.clientX / w) * 2 - 1
  _state.raw.y = -(e.clientY / h) * 2 + 1

  const now = performance.now()
  if (_state.lastT) {
    const dt = Math.max(1, now - _state.lastT)
    _state.vel.x = (e.clientX - _state.lastX) / dt
    _state.vel.y = (e.clientY - _state.lastY) / dt
  }
  _state.lastT = now
  _state.lastX = e.clientX
  _state.lastY = e.clientY
  _state.lastMoveTs = now
}

function onMouseEnter() { _state.inside.current = true }
function onMouseLeave() { _state.inside.current = false }

function attach() {
  if (_state.attached) return
  _state.attached = true
  if (typeof window === 'undefined') return
  _state.hasPointer.current = window.matchMedia('(hover: hover) and (pointer: fine)').matches
  if (!_state.hasPointer.current) return
  window.addEventListener('mousemove', onMouseMove, { passive: true })
  window.addEventListener('mouseenter', onMouseEnter)
  window.addEventListener('mouseleave', onMouseLeave)
  _state.rafId = requestAnimationFrame(tickSmooth)
}

function detach() {
  if (!_state.attached) return
  _state.attached = false
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseenter', onMouseEnter)
  window.removeEventListener('mouseleave', onMouseLeave)
  cancelAnimationFrame(_state.rafId)
}

export function usePointerNDC(): PointerNDC {
  const ref = useRef<PointerNDC>({
    ndc:    _state.raw,
    smooth: _state.smooth,
    velocity: _state.vel,
    active: _state.active,
    inside: _state.inside,
    hasPointer: _state.hasPointer,
  })

  useEffect(() => {
    _state.refCount++
    if (_state.refCount === 1) attach()
    return () => {
      _state.refCount--
      if (_state.refCount === 0) detach()
    }
  }, [])

  return ref.current
}
