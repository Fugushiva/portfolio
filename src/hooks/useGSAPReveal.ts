'use client'

/**
 * useGSAPReveal — Awwwards-grade GSAP ScrollTrigger text + element reveals.
 *
 * Architecture
 * ───────────
 * Two reveal modes are exposed:
 *
 *  1. `data-reveal`           → element slides up from translateY(40px) + fade-in.
 *                               Identical to the old hook but smoother (power4.out,
 *                               80 → 0px default travel, staggered).
 *
 *  2. `data-reveal-text`      → Split-line mask reveal.
 *                               Each text line gets wrapped in a `.reveal-mask`
 *                               overflow:hidden container, then each `.reveal-inner`
 *                               slides up from 100% translateY (fully hidden below
 *                               the mask) to 0 — the signature Awwwards "curtain"
 *                               effect. Works on headings, paragraphs, spans.
 *
 *  3. `data-reveal-word`      → Word-by-word stagger (for big display headings).
 *                               Each word is wrapped and revealed with a tight
 *                               per-word delay for the kinetic "ticker-tape" feel.
 *
 * GSAP plugins registered once at module level via a lazy init gate so this
 * never runs on the server.
 *
 * Performance notes
 * ─────────────────
 * • All tweens use `will-change: transform, opacity` only during the active
 *   animation, then remove it via `onComplete`.
 * • ScrollTrigger.refresh() is called once after all triggers are registered
 *   so Lenis-driven scroll heights are correct.
 * • prefers-reduced-motion is respected — all animations are skipped, elements
 *   rendered visible immediately.
 * • All ScrollTriggers are killed on cleanup to prevent memory leaks.
 */

import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

// ─── GSAP lazy init (browser-only) ───────────────────────────────────────────
let gsapInitialized = false

async function initGSAP() {
  if (gsapInitialized) return
  gsapInitialized = true

  const { gsap } = await import('gsap')
  const { ScrollTrigger } = await import('gsap/ScrollTrigger')
  gsap.registerPlugin(ScrollTrigger)

  // Let Lenis drive the scroll position for ScrollTrigger
  // Lenis dispatches 'scroll' on the window object with a scrollY-compatible API.
  // We proxy that into ScrollTrigger.update() so both systems stay in sync.
  ScrollTrigger.config({ ignoreMobileResize: true })
}

// ─── DOM split-text helper ────────────────────────────────────────────────────
// Wraps each line of text in a <span class="reveal-mask"><span class="reveal-inner">…</span></span>
// Uses a manual "line break detection" approach based on element bounding rects.

interface SplitResult {
  masks: HTMLElement[]
  inners: HTMLElement[]
  /** Call this to restore the original DOM */
  revert: () => void
}

function splitIntoLines(el: HTMLElement, byWord = false): SplitResult {
  const originalHTML = el.innerHTML
  const originalText = el.textContent ?? ''

  if (byWord) {
    // Word-by-word split
    const words = originalText.split(/\s+/).filter(Boolean)
    el.innerHTML = ''
    const masks: HTMLElement[] = []
    const inners: HTMLElement[] = []

    words.forEach((word, i) => {
      const mask = document.createElement('span')
      mask.className = 'reveal-mask'
      mask.style.cssText = 'display:inline-block; overflow:hidden; vertical-align:bottom; padding-bottom: 0.1em; margin-bottom: -0.1em;'

      const inner = document.createElement('span')
      inner.className = 'reveal-inner'
      inner.textContent = word
      inner.style.cssText = 'display:inline-block; will-change:transform,opacity;'

      mask.appendChild(inner)
      el.appendChild(mask)

      // Add a space after each word (except the last)
      if (i < words.length - 1) {
        el.appendChild(document.createTextNode('\u00A0'))
      }

      masks.push(mask)
      inners.push(inner)
    })

    return {
      masks,
      inners,
      revert: () => { el.innerHTML = originalHTML },
    }
  }

  // Line-by-line split
  // Technique: wrap each word in a span, detect line breaks by comparing top offsets,
  // then group words into lines and wrap each line in a mask.
  const words = originalText.split(/\s+/).filter(Boolean)
  el.innerHTML = ''

  const wordSpans: HTMLElement[] = []
  words.forEach((word, i) => {
    const span = document.createElement('span')
    span.textContent = word
    span.style.display = 'inline-block'
    span.style.whiteSpace = 'nowrap'
    el.appendChild(span)
    if (i < words.length - 1) {
      el.appendChild(document.createTextNode(' '))
    }
    wordSpans.push(span)
  })

  // Group words by their top offset (= same line)
  const lines: HTMLElement[][] = []
  let currentTop = -1
  let currentLine: HTMLElement[] = []

  wordSpans.forEach((span) => {
    const top = span.getBoundingClientRect().top
    if (Math.abs(top - currentTop) > 4) {
      if (currentLine.length) lines.push(currentLine)
      currentLine = [span]
      currentTop = top
    } else {
      currentLine.push(span)
    }
  })
  if (currentLine.length) lines.push(currentLine)

  // Now rebuild with mask wrappers
  el.innerHTML = ''
  const masks: HTMLElement[] = []
  const inners: HTMLElement[] = []

  lines.forEach((lineWords, li) => {
    const mask = document.createElement('span')
    mask.className = 'reveal-mask'
    mask.style.cssText = 'display:block; overflow:hidden; padding-bottom: 0.1em; margin-bottom: -0.1em;'

    const inner = document.createElement('span')
    inner.className = 'reveal-inner'
    inner.style.cssText = 'display:block; will-change:transform,opacity;'
    inner.textContent = lineWords.map((w) => w.textContent ?? '').join(' ')

    mask.appendChild(inner)
    el.appendChild(mask)

    if (li < lines.length - 1) {
      el.appendChild(document.createTextNode(' '))
    }

    masks.push(mask)
    inners.push(inner)
  })

  return {
    masks,
    inners,
    revert: () => { el.innerHTML = originalHTML },
  }
}

// ─── Options ─────────────────────────────────────────────────────────────────

export interface GSAPRevealOptions {
  /**
   * translateY travel distance (px) for `data-reveal` elements.
   * Default: 60
   */
  y?: number
  /**
   * Base animation duration (seconds).
   * Default: 1.0
   */
  duration?: number
  /**
   * Stagger delay between sibling `data-reveal` elements (seconds).
   * Default: 0.1
   */
  stagger?: number
  /**
   * ScrollTrigger start position (GSAP syntax, e.g. "top 88%").
   * Default: "top 88%"
   */
  start?: string
  /**
   * Extra translateY offset for text-reveal inners (px, applied upward from below mask).
   * Default: 100  (= full mask height, keeps text hidden until trigger fires)
   */
  textY?: number
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * @param containerRef  Ref to the section/container element.
 * @param opts          Optional overrides.
 *
 * Handles three attributes:
 *   `data-reveal`       — fade + translateY reveal per element
 *   `data-reveal-text`  — per-line mask/curtain reveal
 *   `data-reveal-word`  — per-word mask/curtain reveal (for large headings)
 */
export function useGSAPReveal(
  containerRef: RefObject<HTMLElement | null>,
  opts: GSAPRevealOptions = {},
) {
  // Keep a stable ref for opts so we don't re-run on every render
  const optsRef = useRef(opts)
  optsRef.current = opts

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!containerRef.current) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReducedMotion) {
      // Ensure everything is visible immediately
      const container = containerRef.current
      const els = container.querySelectorAll<HTMLElement>('[data-reveal],[data-reveal-text],[data-reveal-word]')
      els.forEach((el) => {
        el.style.opacity = '1'
        el.style.transform = 'none'
      })
      return
    }

    let killed = false
    const reverts: (() => void)[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const triggers: any[] = []

    async function run() {
      await initGSAP()
      if (killed) return

      const { gsap } = await import('gsap')
      const { ScrollTrigger } = await import('gsap/ScrollTrigger')

      const container = containerRef.current
      if (!container || killed) return

      const {
        y = 60,
        duration = 1.0,
        stagger = 0.1,
        start = 'top 88%',
        textY = 110,
      } = optsRef.current

      const ease = 'expo.out'

      // ── 1. data-reveal  ──────────────────────────────────────────────────
      const revealEls = Array.from(
        container.querySelectorAll<HTMLElement>('[data-reveal]'),
      )

      if (revealEls.length) {
        // Set initial state
        gsap.set(revealEls, { y: y * 1.5, opacity: 0, willChange: 'transform, opacity' })

        const trig = ScrollTrigger.create({
          trigger: container,
          start,
          once: true,
          onEnter: () => {
            gsap.to(revealEls, {
              y: 0,
              opacity: 1,
              duration: duration * 1.2,
              ease,
              stagger,
              clearProps: 'willChange',
            })
          },
        })
        triggers.push(trig)
      }

      // ── 2. data-reveal-text  (line-by-line) ──────────────────────────────
      const textEls = Array.from(
        container.querySelectorAll<HTMLElement>('[data-reveal-text]'),
      )

      textEls.forEach((el, elIdx) => {
        const split = splitIntoLines(el, false)
        reverts.push(split.revert)

        // Hide inners below their masks with slight rotation for a more organic Awwwards feel
        gsap.set(split.inners, { 
          yPercent: 120, 
          rotationZ: 3,
          opacity: 0,
          transformOrigin: '0% 100%'
        })

        const trig = ScrollTrigger.create({
          trigger: el,
          start,
          once: true,
          onEnter: () => {
            gsap.to(split.inners, {
              yPercent: 0,
              rotationZ: 0,
              opacity: 1,
              duration: duration * 1.4,
              ease,
              stagger: 0.08,
              delay: elIdx * 0.05,
              clearProps: 'all',
            })
          },
        })
        triggers.push(trig)
      })

      // ── 3. data-reveal-word  (word-by-word) ──────────────────────────────
      const wordEls = Array.from(
        container.querySelectorAll<HTMLElement>('[data-reveal-word]'),
      )

      wordEls.forEach((el) => {
        const split = splitIntoLines(el, true)
        reverts.push(split.revert)

        gsap.set(split.inners, { 
          y: textY, 
          rotationZ: 5,
          opacity: 0,
          transformOrigin: '0% 100%'
        })

        const trig = ScrollTrigger.create({
          trigger: el,
          start,
          once: true,
          onEnter: () => {
            gsap.to(split.inners, {
              y: 0,
              rotationZ: 0,
              opacity: 1,
              duration: duration * 1.2,
              ease,
              stagger: 0.03,
              clearProps: 'all',
            })
          },
        })
        triggers.push(trig)
      })

      // Refresh so Lenis scroll heights are correct
      if (!killed) ScrollTrigger.refresh()
    }

    run()

    return () => {
      killed = true
      reverts.forEach((r) => r())
      triggers.forEach((t) => {
        try { t.kill() } catch { /* ignore */ }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef])
}
