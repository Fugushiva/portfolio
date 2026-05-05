'use client'

/**
 * NavStatus — live time-of-day indicator.
 *
 * Displays: PARIS · HH:MM · ●
 *
 * - Updates every 30s (aligned to next minute boundary)
 * - Dot color: green (#22c55e) between 09:00–19:00 Paris time, amber otherwise
 * - Visible only in pill state via opacity: var(--nav-pill) in CSS
 * - SSR-safe: renders null on server, mounts after hydration
 * - Localized via Intl.DateTimeFormat — no moment.js, no dayjs
 *
 * The parent NavPill positions this absolutely or as a flex item.
 */

import { useEffect, useRef, useState } from 'react'

interface TimeState {
  time: string
  isAvailable: boolean
}

function getParisTZ(): TimeState {
  const fmt = new Intl.DateTimeFormat('fr-FR', {
    hour:     '2-digit',
    minute:   '2-digit',
    hour12:   false,
    timeZone: 'Europe/Paris',
  })
  const now = new Date()
  const time = fmt.format(now)

  // Check availability window (09:00–19:00 Paris)
  const hourFmt = new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit', hour12: false, timeZone: 'Europe/Paris'
  })
  const hour = parseInt(hourFmt.format(now), 10)
  const isAvailable = hour >= 9 && hour < 19

  return { time, isAvailable }
}

export function NavStatus() {
  const [mounted, setMounted] = useState(false)
  const [state, setState]     = useState<TimeState>({ time: '--:--', isAvailable: true })
  const timerRef              = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setMounted(true)
    setState(getParisTZ())

    // Schedule ticks aligned to next 30s boundary to minimize drift
    const tick = () => {
      setState(getParisTZ())
      const now = Date.now()
      const nextTick = 30000 - (now % 30000)
      timerRef.current = setTimeout(tick, nextTick)
    }

    const now = Date.now()
    const nextTick = 30000 - (now % 30000)
    timerRef.current = setTimeout(tick, nextTick)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  // Don't render on server — prevents hydration mismatch
  if (!mounted) return null

  return (
    <div className="nav-status" aria-hidden="true">
      <span className={`nav-status-dot ${state.isAvailable ? '' : 'is-away'}`} />
      <span>PARIS</span>
      <span>·</span>
      <span>{state.time}</span>
    </div>
  )
}
