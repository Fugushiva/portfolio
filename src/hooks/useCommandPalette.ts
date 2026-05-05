'use client'

/**
 * useCommandPalette — ⌘K command palette state + keyboard handling.
 *
 * Features:
 *   - ⌘K / Ctrl+K opens the palette from anywhere on the page
 *   - Esc closes
 *   - ↑↓ arrow keys navigate the filtered item list
 *   - Enter executes the selected item
 *   - Fuzzy substring search (no external dep)
 *   - Items are stable — no re-creation on each render
 *
 * Returns state + handlers; the UI is in CommandPalette.tsx.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

export interface PaletteItem {
  id:       string
  type:     'nav' | 'action'
  icon:     string
  label:    string
  hint?:    string
  shortcut?: string
  action:   () => void
}

interface UseCommandPaletteOptions {
  items: PaletteItem[]
}

export function useCommandPalette({ items }: UseCommandPaletteOptions) {
  const [open,     setOpen]     = useState(false)
  const [query,    setQuery]    = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef               = useRef<HTMLInputElement>(null)

  // ── Fuzzy filter ────────────────────────────────────────────────────────────
  const filtered = query.trim() === ''
    ? items
    : items.filter(item => {
        const haystack = `${item.label} ${item.hint ?? ''}`.toLowerCase()
        return query.toLowerCase().split('').every(char => haystack.includes(char))
      })

  // Clamp selected when filtered list shrinks
  const safeSelected = Math.min(selected, Math.max(0, filtered.length - 1))

  // ── Open/close ──────────────────────────────────────────────────────────────
  const openPalette = useCallback(() => {
    setOpen(true)
    setQuery('')
    setSelected(0)
  }, [])

  const closePalette = useCallback(() => {
    setOpen(false)
    setQuery('')
    setSelected(0)
  }, [])

  // ── Global ⌘K / Ctrl+K listener ────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC')
      const mod   = isMac ? e.metaKey : e.ctrlKey

      if (mod && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => {
          if (prev) { setQuery(''); setSelected(0); return false }
          setQuery(''); setSelected(0); return true
        })
        return
      }

      if (!open) return

      switch (e.key) {
        case 'Escape':
          e.preventDefault()
          closePalette()
          break
        case 'ArrowDown':
          e.preventDefault()
          setSelected(prev => Math.min(prev + 1, filtered.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelected(prev => Math.max(prev - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (filtered[safeSelected]) {
            filtered[safeSelected].action()
            closePalette()
          }
          break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, filtered, safeSelected, closePalette])

  // ── Auto-focus input when palette opens ────────────────────────────────────
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  return {
    open,
    openPalette,
    closePalette,
    query,
    setQuery,
    filtered,
    selected: safeSelected,
    setSelected,
    inputRef,
  }
}
