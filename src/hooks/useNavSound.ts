'use client'

/**
 * useNavSound — optional WebAudio click feedback.
 *
 * Features:
 *   - OFF by default (never surprise users with audio)
 *   - Toggle persisted in localStorage ('jd-nav-sound')
 *   - Pure WebAudio API — no library dependency
 *   - AudioContext created lazily on first use (respects autoplay policy)
 *   - Context closed after each click to avoid leaking nodes
 *   - click(): 600Hz oscillator, 30ms fade-out — "digital click" feel
 *   - hover(): 800Hz oscillator, 15ms fade-out — lighter "hover ping"
 *   - Both no-ops if disabled or prefers-reduced-motion
 *
 * Usage:
 *   const { enabled, toggle, click, hover } = useNavSound()
 *   <button onClick={click} onMouseEnter={hover}>...</button>
 *   <button onClick={toggle}>Sound: {enabled ? 'ON' : 'OFF'}</button>
 */

import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'jd-nav-sound'

function playTone(freq: number, gainPeak: number, decayMs: number) {
  try {
    const ctx  = new AudioContext()
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.value = freq

    gain.gain.setValueAtTime(gainPeak, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      ctx.currentTime + decayMs / 1000,
    )

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + decayMs / 1000 + 0.02)

    // Clean up context after tone completes
    setTimeout(() => ctx.close().catch(() => {}), decayMs + 100)
  } catch {
    // AudioContext blocked (e.g. no user gesture) — silently ignore
  }
}

export function useNavSound() {
  const [enabled, setEnabled] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Hydrate from localStorage after mount (SSR-safe)
  useEffect(() => {
    setMounted(true)
    try {
      setEnabled(localStorage.getItem(STORAGE_KEY) === '1')
    } catch {
      // localStorage not available (private mode, etc.)
    }
  }, [])

  const toggle = useCallback(() => {
    setEnabled(prev => {
      const next = !prev
      try { localStorage.setItem(STORAGE_KEY, next ? '1' : '0') } catch {}
      return next
    })
  }, [])

  const isReducedMotion = useCallback(() => {
    if (typeof window === 'undefined') return true
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  const click = useCallback(() => {
    if (!enabled || isReducedMotion()) return
    playTone(600, 0.06, 30)
  }, [enabled, isReducedMotion])

  const hover = useCallback(() => {
    if (!enabled || isReducedMotion()) return
    playTone(800, 0.025, 15)
  }, [enabled, isReducedMotion])

  return { enabled: mounted ? enabled : false, toggle, click, hover }
}
