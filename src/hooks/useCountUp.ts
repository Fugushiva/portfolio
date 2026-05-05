'use client'

/**
 * useCountUp — animates a numeric value from 0 to target when in view.
 * Returns the current display value as a string (preserves suffix like "+", "x", "%").
 */

import { useEffect, useRef, useState } from 'react'

function parseValue(raw: string): { num: number; suffix: string; prefix: string } {
  const match = raw.match(/^([^0-9]*)([0-9.,]+)([^0-9]*)$/)
  if (!match) return { num: 0, suffix: raw, prefix: '' }
  const num = parseFloat(match[2].replace(',', '.'))
  return { num: isNaN(num) ? 0 : num, prefix: match[1], suffix: match[3] }
}

export function useCountUp(
  rawValue: string,
  inView: boolean,
  duration = 1400,
): string {
  const [display, setDisplay] = useState('0')
  const rafRef = useRef<number>(0)
  const startRef = useRef<number>(0)

  useEffect(() => {
    if (!inView) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(rawValue)
      return
    }

    const { num, prefix, suffix } = parseValue(rawValue)

    // Reset
    startRef.current = 0
    cancelAnimationFrame(rafRef.current)

    const step = (ts: number) => {
      if (!startRef.current) startRef.current = ts
      const progress = Math.min((ts - startRef.current) / duration, 1)
      // Expo ease out
      const eased = 1 - Math.pow(1 - progress, 4)
      const current = num * eased

      const formatted = Number.isInteger(num)
        ? Math.round(current).toString()
        : current.toFixed(1)

      setDisplay(`${prefix}${formatted}${suffix}`)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        setDisplay(rawValue)
      }
    }

    rafRef.current = requestAnimationFrame(step)

    return () => { cancelAnimationFrame(rafRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, rawValue])

  return display
}
