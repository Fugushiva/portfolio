'use client'

import { useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

type RevealOptions = {
  selector?: string
  y?: number
  duration?: number
  stagger?: number
  start?: string
}

export function useScrollReveal(
  containerRef: React.RefObject<HTMLElement | null>,
  opts: RevealOptions = {}
) {
  useEffect(() => {
    if (!containerRef.current) return
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const {
      selector = '[data-reveal]',
      y = 40,
      duration = 1,
      stagger = 0.08,
      start = 'top 85%',
    } = opts

    const els = containerRef.current.querySelectorAll<HTMLElement>(selector)
    if (!els.length) return

    gsap.fromTo(
      els,
      { y, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration,
        stagger,
        ease: 'expo.out',
        scrollTrigger: {
          trigger: containerRef.current,
          start,
          once: true,
        },
      }
    )

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill())
    }
  }, [containerRef, opts])
}
