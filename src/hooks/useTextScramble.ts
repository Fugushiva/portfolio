'use client'

/**
 * useTextScramble — classic "hacker" text scramble effect.
 *
 * Usage: attach ref to element, call scramble() to trigger.
 * The element text is randomised character-by-character then
 * resolved to the target string over `duration` ms.
 */

import { useRef, useCallback } from 'react'

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&'

function rand(n: number) { return Math.floor(Math.random() * n) }

export function useTextScramble(duration = 600) {
  const rafRef = useRef<number>(0)

  const scramble = useCallback(
    (el: HTMLElement | null, finalText: string) => {
      if (!el) return
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        el.textContent = finalText
        return
      }

      const len = finalText.length
      let start = 0
      let resolvedCount = 0

      cancelAnimationFrame(rafRef.current)

      const step = (ts: number) => {
        if (start === 0) start = ts
        const progress = Math.min((ts - start) / duration, 1)
        resolvedCount = Math.floor(progress * len)

        let result = ''
        for (let i = 0; i < len; i++) {
          if (i < resolvedCount) {
            result += finalText[i]
          } else {
            result += CHARS[rand(CHARS.length)]
          }
        }
        el.textContent = result

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(step)
        } else {
          el.textContent = finalText
        }
      }

      rafRef.current = requestAnimationFrame(step)
    },
    [duration],
  )

  return scramble
}
