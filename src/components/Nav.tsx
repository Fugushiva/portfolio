'use client'

/**
 * Nav — cinematic world-class header.
 *
 * Three visual states:
 *   1. Hero state    (scroll = 0)      — transparent, full-width, items spaced
 *   2. Pill state    (scroll > 60px)   — compressed glassmorphism pill, aurora bg
 *   3. Active state  (section in view) — nav link dash indicator active
 *
 * Architecture:
 *   - useScrollProgress  writes --nav-progress/--nav-pill/--nav-blur CSS vars
 *   - useActiveSection   tracks which section is in view via IntersectionObserver
 *   - All scroll animation is CSS-only (no Framer Motion in the scroll path)
 *   - Framer Motion: AnimatePresence for entry animation + mobile overlay only
 *   - Mobile overlay: NavMobileMenu (sole AnimatePresence consumer besides entry)
 *
 * View Transitions API:
 *   Wraps Lenis scroll-to in document.startViewTransition when available.
 *   Progressive enhancement — no impact on older browsers.
 *
 * Constraints honored:
 *   - No useScroll/useSpring from Framer Motion (LazyMotion strict mode)
 *   - No layout recalc in RAF — transform/opacity/clip-path only
 *   - prefers-reduced-motion: animations cut, visual states preserved
 *   - pointer: coarse — cursor custom hidden, hover effects disabled
 */

import { useRef, useState, useCallback, useEffect } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter, usePathname } from 'next/navigation'
import { getLenis } from '@/hooks/useLenis'
import { useScrollProgress } from '@/hooks/useScrollProgress'
import { useActiveSection } from '@/hooks/useActiveSection'
import { useCommandPalette, type PaletteItem } from '@/hooks/useCommandPalette'
import { useNavSound } from '@/hooks/useNavSound'
import { NavLogo }        from '@/components/nav/NavLogo'
import { NavLink }        from '@/components/nav/NavLink'
import { NavCTA }         from '@/components/nav/NavCTA'
import { NavBurger }      from '@/components/nav/NavBurger'
import { NavStatus }      from '@/components/nav/NavStatus'
import { NavMobileMenu }  from '@/components/nav/NavMobileMenu'
import { CommandPalette } from '@/components/nav/CommandPalette'
import LangSwitcher       from '@/components/LangSwitcher'

interface NavProps {
  isReady: boolean
}

// Section IDs matching the page — kept here so Nav is the single source of truth
const SECTION_IDS = ['hero', 'about', 'stack', 'work', 'process', 'contact']

// ─── Progress bar — pure RAF-driven, no Framer Motion ──────────────────────────
function ProgressBar() {
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const bar = barRef.current
    if (!bar) return

    let rafId = 0
    let lastVal = -1

    const tick = () => {
      rafId = 0
      const docH = document.documentElement.scrollHeight - window.innerHeight
      const p    = docH > 0 ? Math.min(window.scrollY / docH, 1) : 0
      if (Math.abs(p - lastVal) > 0.0008) {
        bar.style.transform = `scaleX(${p.toFixed(4)})`
        lastVal = p
      }
    }

    const schedule = () => {
      if (rafId === 0) rafId = requestAnimationFrame(tick)
    }

    window.addEventListener('scroll', schedule, { passive: true })
    schedule()

    return () => {
      window.removeEventListener('scroll', schedule)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <div
      ref={barRef}
      className="scroll-progress"
      style={{ transformOrigin: 'left center', transform: 'scaleX(0)' }}
      aria-hidden="true"
    />
  )
}

export default function Nav({ isReady }: NavProps) {
  const t = useTranslations('nav')

  const NAV_ITEMS = [
    { label: t('about'),   href: '#about'   },
    { label: t('stack'),   href: '#stack'   },
    { label: t('work'),    href: '#work'    },
    { label: t('process'), href: '#process' },
    { label: t('contact'), href: '#contact' },
  ]

  // ── State ───────────────────────────────────────────────────────────────────
  const [menuOpen,     setMenuOpen]     = useState(false)
  const [scrollState,  setScrollState]  = useState<'hero' | 'pill'>('hero')
  const burgerRef                       = useRef<HTMLButtonElement>(null)

  // ── i18n for locale switching in palette ────────────────────────────────────
  const locale   = useLocale()
  const router   = useRouter()
  const pathname = usePathname()

  // ── Sound ───────────────────────────────────────────────────────────────────
  const { enabled: soundEnabled, toggle: toggleSound, click: playClick } = useNavSound()

  // ── Scroll progress driver ──────────────────────────────────────────────────
  useScrollProgress({
    threshold: 60,
    onScrollStateChange: setScrollState,
  })

  // ── Active section tracker ──────────────────────────────────────────────────
  const { activeSection, setActiveSection } = useActiveSection({
    sectionIds: SECTION_IDS,
  })

  // ── Close menu on resize to desktop ────────────────────────────────────────
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768 && menuOpen) setMenuOpen(false)
    }
    window.addEventListener('resize', onResize, { passive: true })
    return () => window.removeEventListener('resize', onResize)
  }, [menuOpen])

  // ── Navigation with View Transitions + Lenis ────────────────────────────────
  const handleNavClick = useCallback((href: string) => {
    setMenuOpen(false)
    playClick()
    const sectionId = href.replace('#', '')
    setActiveSection(sectionId)

    const target = document.querySelector(href)
    if (!target) return

    const doScroll = () => {
      const lenis = getLenis()
      if (lenis) {
        lenis.scrollTo(target as HTMLElement, { offset: -80, duration: 1.0 })
      } else {
        target.scrollIntoView({ behavior: 'smooth' })
      }
    }

    // Progressive enhancement — View Transitions API (Chrome 111+)
    if ('startViewTransition' in document) {
      (document as Document & { startViewTransition: (cb: () => void) => void })
        .startViewTransition(doScroll)
    } else {
      doScroll()
    }
  }, [setActiveSection, playClick])

  // ── Mobile menu toggle ──────────────────────────────────────────────────────
  const toggleMenu = useCallback(() => setMenuOpen(prev => !prev), [])
  const closeMenu  = useCallback(() => setMenuOpen(false), [])

  // ── Locale switch helper ────────────────────────────────────────────────────
  const switchLocale = useCallback(() => {
    const other    = locale === 'fr' ? 'en' : 'fr'
    const segments = pathname.split('/')
    segments[1]    = other
    router.push(segments.join('/') || `/${other}`)
  }, [locale, pathname, router])

  // ── Command palette items ───────────────────────────────────────────────────
  const paletteItems: PaletteItem[] = [
    ...NAV_ITEMS.map(({ label, href }) => ({
      id:     `nav-${href}`,
      type:   'nav' as const,
      icon:   '→',
      label,
      hint:   `Scroll to ${label}`,
      action: () => handleNavClick(href),
    })),
    {
      id:     'action-email',
      type:   'action' as const,
      icon:   '✉',
      label:  'Contact',
      hint:   'Go to contact form',
      shortcut: '⌘E',
      action: () => {
        const el = document.getElementById('contact')
        if (el) el.scrollIntoView({ behavior: 'smooth' })
      },
    },
    {
      id:     'action-copy-email',
      type:   'action' as const,
      icon:   '⎘',
      label:  'Copy email',
      hint:   'jerome@delodder.dev',
      ...(({ toastMsg: 'Email copied!' }) as unknown as Partial<PaletteItem>),
      action: () => {
        navigator.clipboard.writeText('jerome@delodder.dev').catch(() => {})
      },
    } as PaletteItem & { toastMsg: string },
    {
      id:     'action-github',
      type:   'action' as const,
      icon:   '◈',
      label:  'GitHub',
      hint:   'Fugushiva',
      shortcut: '⌘G',
      action: () => { window.open('https://github.com/Fugushiva', '_blank', 'noopener') },
    },
    {
      id:     'action-linkedin',
      type:   'action' as const,
      icon:   '◉',
      label:  'LinkedIn',
      hint:   'jerome-delodder',
      action: () => { window.open('https://linkedin.com/in/jerome-delodder', '_blank', 'noopener') },
    },
    {
      id:     'action-lang',
      type:   'action' as const,
      icon:   '⌂',
      label:  `Switch to ${locale === 'fr' ? 'English' : 'Français'}`,
      shortcut: '⌘L',
      action: switchLocale,
    },
    {
      id:     'action-sound',
      type:   'action' as const,
      icon:   soundEnabled ? '♪' : '♩',
      label:  `Sound: ${soundEnabled ? 'ON — click to disable' : 'OFF — click to enable'}`,
      action: toggleSound,
    },
  ]

  // ── Command palette state ───────────────────────────────────────────────────
  const {
    open: paletteOpen,
    openPalette,
    closePalette,
    query,
    setQuery,
    filtered,
    selected,
    setSelected,
    inputRef,
  } = useCommandPalette({ items: paletteItems })

  return (
    <>
    <AnimatePresence>
      {isReady && (
        <m.header
          key="nav-header"
          className="fixed top-0 left-0 right-0 z-[9000]"
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0,  opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.15, ease: [0.19, 1, 0.22, 1] }}
          style={{ viewTransitionName: 'nav' } as React.CSSProperties}
        >
          {/* Scroll progress line */}
          <ProgressBar />

          {/* Pill container — morphs hero→pill via CSS vars */}
          <div
            className={`
              nav-pill
              mx-4 sm:mx-8 md:mx-12 lg:mx-20
              flex items-center justify-between
              px-4 md:px-5
              py-3 md:py-3.5
              mt-3
            `}
          >
            {/* Left: Logo + Status */}
            <div className="flex items-center gap-3">
              <NavLogo onNavigate={handleNavClick} />
              <NavStatus />
            </div>

            {/* Center: Desktop nav links */}
            <nav
              className="hidden md:flex items-center gap-6 lg:gap-8"
              aria-label="Navigation principale"
            >
              {NAV_ITEMS.map(({ label, href }) => (
                <NavLink
                  key={href}
                  label={label}
                  href={href}
                  section={href.replace('#', '')}
                  activeSection={activeSection}
                  onClick={handleNavClick}
                />
              ))}
            </nav>

            {/* Right: LangSwitcher + CTA + Burger */}
            <div className="flex items-center gap-3 md:gap-4">
              <span className="hidden md:block">
                <LangSwitcher />
              </span>
              <span
                className="hidden md:block w-px h-3 bg-border/60"
                aria-hidden="true"
              />
              <span className="hidden md:block">
                <NavCTA label={t('hire')} />
              </span>

              {/* ⌘K trigger — desktop only */}
              <button
                type="button"
                onClick={openPalette}
                className="hidden md:flex items-center gap-1.5 font-mono text-xs text-muted/60 border border-border/40 rounded-md px-2 py-1 hover:text-muted hover:border-border transition-colors duration-200"
                aria-label="Ouvrir la command palette (⌘K)"
                title="⌘K"
              >
                <span className="text-[10px] opacity-70">⌘K</span>
              </button>

              {/* Burger — mobile only */}
              <NavBurger
                isOpen={menuOpen}
                onToggle={toggleMenu}
                labelOpen={t('menuOpen')}
                labelClose={t('menuClose')}
              />
            </div>
          </div>

          {/* Mobile overlay — sole AnimatePresence consumer in Nav tree */}
          <NavMobileMenu
            isOpen={menuOpen}
            items={NAV_ITEMS}
            onClose={closeMenu}
            onNavigate={handleNavClick}
            burgerRef={burgerRef}
            activeSection={activeSection}
          />
        </m.header>
      )}
    </AnimatePresence>

    {/* Command palette — rendered at body level via portal-like placement */}
    {isReady && (
      <CommandPalette
        open={paletteOpen}
        onClose={closePalette}
        query={query}
        onQueryChange={setQuery}
        items={paletteItems}
        filtered={filtered}
        selected={selected}
        onSelect={setSelected}
        onExecute={(item) => { item.action(); closePalette() }}
        inputRef={inputRef}
      />
    )}
    </>
  )
}


