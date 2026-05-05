'use client'

/**
 * useActiveSection — tracks which nav section is currently in view.
 *
 * Uses a single IntersectionObserver watching all registered section ids.
 * When multiple sections intersect simultaneously (tall sections, zoomed out),
 * we pick the one with the highest intersectionRatio — the most "present" one.
 *
 * Returns the active section id (e.g. "about") and a setter for overrides
 * (used when the user explicitly clicks a nav link — we optimistically activate
 * the clicked section before IO catches up).
 *
 * Usage:
 *   const { activeSection, setActiveSection } = useActiveSection({
 *     sectionIds: ['hero', 'about', 'stack', 'work', 'process', 'contact'],
 *   })
 */

import { useEffect, useRef, useState, useCallback } from 'react'

interface UseActiveSectionOptions {
  sectionIds: string[]
  threshold?: number    // default 0.4
  rootMargin?: string   // default '-10% 0px -50% 0px' (top-bias for natural reading)
}

export function useActiveSection({
  sectionIds,
  threshold = 0.3,
  rootMargin = '-10% 0px -50% 0px',
}: UseActiveSectionOptions) {
  const [activeSection, setActiveSection] = useState<string>('hero')
  const overrideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const overrideRef      = useRef(false)

  // Optimistic override when user clicks a link — we trust the click for 1.2s
  // then hand back control to the observer.
  const setActiveSectionOptimistic = useCallback((id: string) => {
    setActiveSection(id)
    overrideRef.current = true
    if (overrideTimerRef.current) clearTimeout(overrideTimerRef.current)
    overrideTimerRef.current = setTimeout(() => {
      overrideRef.current = false
    }, 1200)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Ratio map: sectionId → latest intersectionRatio
    const ratioMap = new Map<string, number>()

    const observer = new IntersectionObserver(
      (entries) => {
        // Update our ratio map
        entries.forEach((entry) => {
          const id = entry.target.id
          ratioMap.set(id, entry.intersectionRatio)
        })

        // During optimistic override, don't let IO overwrite the clicked section
        if (overrideRef.current) return

        // Pick the section with the highest visible ratio
        let best = ''
        let bestRatio = 0
        ratioMap.forEach((ratio, id) => {
          if (ratio > bestRatio) {
            bestRatio = ratio
            best = id
          }
        })

        // Only update if meaningful intersection
        if (bestRatio > 0.05 && best) {
          setActiveSection(best)
        }
      },
      { threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, threshold], rootMargin },
    )

    sectionIds.forEach((id) => {
      const el = document.getElementById(id)
      if (el) {
        ratioMap.set(id, 0)
        observer.observe(el)
      }
    })

    return () => {
      observer.disconnect()
      if (overrideTimerRef.current) clearTimeout(overrideTimerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threshold, rootMargin])
  // sectionIds intentionally excluded — stable at mount, no need to re-observe

  return { activeSection, setActiveSection: setActiveSectionOptimistic }
}
