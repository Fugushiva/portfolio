'use client'

/**
 * CommandPalette — ⌘K overlay for premium portfolio navigation.
 *
 * Visual design:
 *   - Backdrop: blur(8px) + rgba(0,0,0,0.6)
 *   - Modal: 600px, #111, accent border, triple-box-shadow
 *   - Items: 32px icon chip + label + hint/shortcut
 *   - Selected state: accent-tinted row
 *   - Entry: scale(0.96→1) + opacity — 200ms, AnimatePresence
 *
 * Uses `m.*` + AnimatePresence (FM allowed, domMax features loaded by Providers).
 * Strictly avoids `motion.*` (LazyMotion strict mode).
 *
 * Toast system:
 *   Items that set `toast` on their action context get a brief
 *   confirmation message (e.g. "Copied!") — implemented via local state.
 */

import { useRef, useState, useEffect, useCallback } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { type PaletteItem } from '@/hooks/useCommandPalette'

interface CommandPaletteProps {
  open:         boolean
  onClose:      () => void
  query:        string
  onQueryChange: (q: string) => void
  items:        PaletteItem[]
  filtered:     PaletteItem[]
  selected:     number
  onSelect:     (i: number) => void
  onExecute:    (item: PaletteItem) => void
  inputRef:     React.RefObject<HTMLInputElement | null>
}

export function CommandPalette({
  open,
  onClose,
  query,
  onQueryChange,
  items,
  filtered,
  selected,
  onSelect,
  onExecute,
  inputRef,
}: CommandPaletteProps) {
  const [toast, setToast] = useState<string | null>(null)
  const toastTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), 2000)
  }, [])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  const handleExecute = useCallback((item: PaletteItem) => {
    onExecute(item)
    // Some items fire a toast via a convention:
    // they call showToast via a ref we inject — but since items are built
    // in Nav.tsx, we check for a toast hint on the item itself
    if ((item as PaletteItem & { toastMsg?: string }).toastMsg) {
      showToast((item as PaletteItem & { toastMsg?: string }).toastMsg!)
    }
  }, [onExecute, showToast])

  // Group items by type
  const navItems    = filtered.filter(i => i.type === 'nav')
  const actionItems = filtered.filter(i => i.type === 'action')

  // Relative index → global index mapper for selection highlight
  const navOffset    = 0
  const actionOffset = navItems.length

  const isMac = typeof navigator !== 'undefined'
    ? navigator.platform.toUpperCase().includes('MAC')
    : true

  return (
    <>
      <AnimatePresence>
        {open && (
          <m.div
            className="cmdk-backdrop"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <m.div
              role="dialog"
              aria-modal="true"
              aria-label="Command palette"
              className="cmdk-modal"
              onClick={e => e.stopPropagation()}
              initial={{ scale: 0.96, opacity: 0, y: -8 }}
              animate={{ scale: 1,    opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.19, 1, 0.22, 1] }}
            >
              {/* Search input */}
              <div className="cmdk-input-wrap">
                <span className="cmdk-input-icon" aria-hidden="true">⌕</span>
                <input
                  ref={inputRef}
                  className="cmdk-input"
                  type="text"
                  role="combobox"
                  aria-expanded={open}
                  aria-autocomplete="list"
                  aria-controls="cmdk-list"
                  placeholder="Search actions…"
                  value={query}
                  onChange={e => onQueryChange(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
                <span className="cmdk-shortcut-hint" aria-label="Fermer avec Échap">
                  ESC
                </span>
              </div>

              {/* Results */}
              <div id="cmdk-list" className="cmdk-list" role="listbox">
                {filtered.length === 0 && (
                  <div className="cmdk-empty">
                    No results for &ldquo;{query}&rdquo;
                  </div>
                )}

                {/* Navigation group */}
                {navItems.length > 0 && (
                  <>
                    {query.trim() === '' && (
                      <div className="cmdk-group-label">Navigation</div>
                    )}
                    {navItems.map((item, i) => (
                      <button
                        key={item.id}
                        className="cmdk-item w-full text-left"
                        role="option"
                        aria-selected={selected === navOffset + i}
                        data-selected={selected === navOffset + i}
                        onClick={() => handleExecute(item)}
                        onMouseEnter={() => onSelect(navOffset + i)}
                      >
                        <span className="cmdk-item-icon" aria-hidden="true">{item.icon}</span>
                        <span className="cmdk-item-label">{item.label}</span>
                        {item.hint && (
                          <span className="cmdk-item-hint">{item.hint}</span>
                        )}
                      </button>
                    ))}
                  </>
                )}

                {/* Actions group */}
                {actionItems.length > 0 && (
                  <>
                    {query.trim() === '' && (
                      <div className="cmdk-group-label">Actions</div>
                    )}
                    {actionItems.map((item, i) => (
                      <button
                        key={item.id}
                        className="cmdk-item w-full text-left"
                        role="option"
                        aria-selected={selected === actionOffset + i}
                        data-selected={selected === actionOffset + i}
                        onClick={() => handleExecute(item)}
                        onMouseEnter={() => onSelect(actionOffset + i)}
                      >
                        <span className="cmdk-item-icon" aria-hidden="true">{item.icon}</span>
                        <span className="cmdk-item-label">{item.label}</span>
                        {item.shortcut && (
                          <span className="cmdk-item-shortcut">{item.shortcut}</span>
                        )}
                      </button>
                    ))}
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="cmdk-footer">
                <div className="cmdk-footer-hint">
                  <span className="cmdk-key">↑</span>
                  <span className="cmdk-key">↓</span>
                  <span>to navigate</span>
                  <span className="cmdk-key">↵</span>
                  <span>to execute</span>
                </div>
                <div className="cmdk-footer-hint">
                  <span className="cmdk-key">{isMac ? '⌘' : 'Ctrl'}</span>
                  <span className="cmdk-key">K</span>
                  <span>to toggle</span>
                </div>
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <m.div
            className="cmdk-toast"
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
          >
            {toast}
          </m.div>
        )}
      </AnimatePresence>
    </>
  )
}
