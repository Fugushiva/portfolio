'use client'

/**
 * NavMobileMenu — full-screen cinematic overlay.
 *
 * Animation system:
 *   - Entry: clip-path circle(0% at burger position) → circle(150%) — 600ms
 *   - Exit:  reverse, items out in reverse stagger order
 *   - Items: translateX(-40px → 0) + opacity, 80ms stagger between each
 *   - Footer: translateY(16px → 0) + opacity, delayed by items
 *
 * Accessibility:
 *   - Traps focus within overlay when open
 *   - Restores focus to burger on close
 *   - Esc key closes
 *   - Body scroll locked (position:fixed + scrollY restore)
 *   - aria-modal, role="dialog", aria-label
 *
 * Uses Framer Motion AnimatePresence (the only allowed FM usage per issue spec).
 */

import { useEffect, useRef, useCallback } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import LangSwitcher from '@/components/LangSwitcher'

interface NavItem {
  label: string
  href: string
}

interface NavMobileMenuProps {
  isOpen:      boolean
  items:       NavItem[]
  onClose:     () => void
  onNavigate:  (href: string) => void
  burgerRef:   React.RefObject<HTMLButtonElement | null>
  activeSection: string
}

// Stagger delay per item
const ITEM_STAGGER_MS = 80

export function NavMobileMenu({
  isOpen,
  items,
  onClose,
  onNavigate,
  burgerRef,
  activeSection,
}: NavMobileMenuProps) {
  const t            = useTranslations('nav')
  const overlayRef   = useRef<HTMLDivElement>(null)
  const scrollYRef   = useRef(0)
  const prevFocusRef = useRef<HTMLElement | null>(null)

  // ── Body scroll lock ────────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      scrollYRef.current   = window.scrollY
      prevFocusRef.current = document.activeElement as HTMLElement
      document.body.style.position = 'fixed'
      document.body.style.top      = `-${scrollYRef.current}px`
      document.body.style.width    = '100%'
    } else {
      document.body.style.position = ''
      document.body.style.top      = ''
      document.body.style.width    = ''
      window.scrollTo(0, scrollYRef.current)
      prevFocusRef.current?.focus()
    }
  }, [isOpen])

  // ── Escape key ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  // ── Focus trap ──────────────────────────────────────────────────────────────
  const trapFocus = useCallback((e: KeyboardEvent) => {
    const overlay = overlayRef.current
    if (!overlay || e.key !== 'Tab') return
    const focusable = overlay.querySelectorAll<HTMLElement>(
      'a[href], button, [tabindex]:not([tabindex="-1"])',
    )
    const first = focusable[0]
    const last  = focusable[focusable.length - 1]
    if (e.shiftKey ? document.activeElement === first : document.activeElement === last) {
      e.preventDefault()
      ;(e.shiftKey ? last : first).focus()
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', trapFocus)
      // Auto-focus first link
      setTimeout(() => {
        overlayRef.current?.querySelector<HTMLElement>('a, button')?.focus()
      }, 650) // after animation completes
    } else {
      window.removeEventListener('keydown', trapFocus)
    }
    return () => window.removeEventListener('keydown', trapFocus)
  }, [isOpen, trapFocus])

  const handleItemClick = (href: string) => {
    onNavigate(href)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <m.div
          ref={overlayRef}
          id="nav-mobile-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
          className="nav-mobile-overlay"
          initial={{ clipPath: 'circle(0% at calc(100% - 28px) 28px)' }}
          animate={{ clipPath: 'circle(150% at calc(100% - 28px) 28px)' }}
          exit={{ clipPath: 'circle(0% at calc(100% - 28px) 28px)' }}
          transition={{ duration: 0.65, ease: [0.85, 0, 0.15, 1] }}
        >
          {/* Items */}
          <nav className="flex flex-col gap-2">
            {items.map((item, i) => {
              const isActive = activeSection === item.href.replace('#', '')
              return (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={(e) => { e.preventDefault(); handleItemClick(item.href) }}
                  className={`nav-mobile-item is-visible${isActive ? ' text-accent-light' : ''}`}
                  style={{ transitionDelay: `${i * ITEM_STAGGER_MS}ms` }}
                  data-cursor="link"
                >
                  <span className="nav-mobile-item-number">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {item.label}
                  <span className="nav-mobile-arrow" aria-hidden="true">↗</span>
                </a>
              )
            })}
          </nav>

          {/* Footer */}
          <div
            className="nav-mobile-footer is-visible"
            style={{ transitionDelay: `${items.length * ITEM_STAGGER_MS + 80}ms` }}
          >
            {/* Separator */}
            <div className="w-full h-px bg-border" aria-hidden="true" />

            {/* Contact link (no email in clear HTML — anti-scraping) */}
            <div className="flex items-center justify-between">
              <a
                href="#contact"
                className="nav-mobile-footer-email"
                onClick={() => {
                  // Close mobile menu then scroll to contact section
                  const el = document.getElementById('contact')
                  if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 80)
                }}
              >
                Contact
              </a>
              <LangSwitcher />
            </div>

            {/* Social + status */}
            <div className="flex items-center justify-between">
              <div className="nav-mobile-footer-status">
                <span className="nav-mobile-footer-status-dot" aria-hidden="true" />
                <span>{t('hire')}</span>
              </div>

              {/* Social links */}
              <div className="flex items-center gap-4">
                <a
                  href="https://github.com/Fugushiva"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-muted hover:text-foreground transition-colors duration-200"
                  aria-label="GitHub"
                >
                  GH
                </a>
                <a
                  href="https://www.linkedin.com/in/jerome-delodder-a12b8a1b1/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-muted hover:text-foreground transition-colors duration-200"
                  aria-label="LinkedIn"
                >
                  LI
                </a>
              </div>
            </div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
