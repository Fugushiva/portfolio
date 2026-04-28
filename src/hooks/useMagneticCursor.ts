'use client'

import { useEffect, useRef } from 'react'

export function useMagneticCursor() {
  const cursorRef = useRef<HTMLDivElement | null>(null)
  const ringRef = useRef<HTMLDivElement | null>(null)
  const pos = useRef({ x: -100, y: -100 })
  const ringPos = useRef({ x: -100, y: -100 })
  const rafRef = useRef<number>(0)

  useEffect(() => {
    // Only on pointer devices
    if (window.matchMedia('(pointer: coarse)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const cursor = document.querySelector<HTMLDivElement>('.cursor')
    const ring = document.querySelector<HTMLDivElement>('.cursor-ring')
    if (!cursor || !ring) return
    cursorRef.current = cursor
    ringRef.current = ring

    const onMove = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY }
    }

    const onEnterMagnetic = () => {
      cursor.classList.add('is-hovering')
      ring.classList.add('is-hovering')
    }
    const onLeaveMagnetic = () => {
      cursor.classList.remove('is-hovering')
      ring.classList.remove('is-hovering')
    }

    // Lerp ring toward cursor
    function loop() {
      if (!cursorRef.current || !ringRef.current) return
      cursorRef.current.style.left = `${pos.current.x}px`
      cursorRef.current.style.top = `${pos.current.y}px`

      ringPos.current.x += (pos.current.x - ringPos.current.x) * 0.12
      ringPos.current.y += (pos.current.y - ringPos.current.y) * 0.12
      ringRef.current.style.left = `${ringPos.current.x}px`
      ringRef.current.style.top = `${ringPos.current.y}px`

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    window.addEventListener('mousemove', onMove)

    // Add hover listeners to all magnetic targets
    const targets = document.querySelectorAll<HTMLElement>('[data-magnetic]')
    targets.forEach((el) => {
      el.addEventListener('mouseenter', onEnterMagnetic)
      el.addEventListener('mouseleave', onLeaveMagnetic)
    })

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('mousemove', onMove)
      targets.forEach((el) => {
        el.removeEventListener('mouseenter', onEnterMagnetic)
        el.removeEventListener('mouseleave', onLeaveMagnetic)
      })
    }
  }, [])
}
