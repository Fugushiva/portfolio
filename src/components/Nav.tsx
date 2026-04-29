'use client'

import { useEffect, useState } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import LangSwitcher from '@/components/LangSwitcher'
import { getLenis } from '@/hooks/useLenis'

interface NavProps {
  isReady: boolean
}

export default function Nav({ isReady }: NavProps) {
  const t = useTranslations('nav')

  const NAV_ITEMS = [
    { label: t('about'), href: '#about' },
    { label: t('stack'), href: '#stack' },
    { label: t('work'), href: '#work' },
    { label: t('process'), href: '#process' },
    { label: t('contact'), href: '#contact' },
  ]

  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Use Lenis scroll when available (avoids double smooth-scroll conflict).
  // Falls back gracefully to native scrollIntoView on touch / reduced-motion.
  const handleNavClick = (href: string) => {
    setMenuOpen(false)
    const target = document.querySelector(href)
    if (!target) return

    const lenis = getLenis()
    if (lenis) {
      // Lenis.scrollTo handles easing, duration, and offset internally.
      lenis.scrollTo(target as HTMLElement, { offset: -80, duration: 1.0 })
    } else {
      // Fallback: native scroll (touch devices, reduced-motion).
      target.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <AnimatePresence>
      {isReady && (
        <m.header
          key="nav"
          className={`fixed top-0 left-0 right-0 z-[9000] transition-all duration-500 ${
            scrolled ? 'py-3' : 'py-6'
          }`}
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.19, 1, 0.22, 1] }}
        >
          <div
            className={`mx-6 md:mx-12 lg:mx-20 flex items-center justify-between transition-all duration-500 ${
              scrolled
                ? 'bg-bg/80 backdrop-blur-md border border-border/50 rounded-full px-5 py-3'
                : ''
            }`}
          >
            {/* Logo */}
            <a
              href="#hero"
              onClick={(e) => { e.preventDefault(); handleNavClick('#hero') }}
              data-magnetic
              className="magnetic-wrap font-black text-foreground tracking-tighter leading-none text-lg hover:text-accent transition-colors duration-300"
            >
              JD
            </a>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-8">
              {NAV_ITEMS.map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  onClick={(e) => { e.preventDefault(); handleNavClick(href) }}
                  data-magnetic
                  className="magnetic-wrap font-mono text-xs text-muted uppercase tracking-widest hover:text-foreground transition-colors duration-200"
                >
                  {label}
                </a>
              ))}
            </nav>

            {/* Right side: LangSwitcher + CTA */}
            <div className="hidden md:flex items-center gap-5">
              <LangSwitcher />
              <span className="w-px h-3 bg-border/60" aria-hidden="true" />
              <a
                href="mailto:jerome@delodder.dev"
                data-magnetic
                className="magnetic-wrap inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-accent border border-accent/40 rounded-full px-4 py-2 hover:bg-accent hover:text-bg hover:border-accent transition-all duration-300"
              >
                {t('hire')}
              </a>
            </div>

            {/* Mobile burger */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden flex flex-col gap-1.5 p-2"
              aria-label={menuOpen ? t('menuClose') : t('menuOpen')}
            >
              <m.span
                className="block w-5 h-px bg-foreground origin-center"
                animate={{ rotate: menuOpen ? 45 : 0, y: menuOpen ? 4 : 0 }}
                transition={{ duration: 0.3 }}
              />
              <m.span
                className="block w-5 h-px bg-foreground"
                animate={{ opacity: menuOpen ? 0 : 1 }}
                transition={{ duration: 0.3 }}
              />
              <m.span
                className="block w-5 h-px bg-foreground origin-center"
                animate={{ rotate: menuOpen ? -45 : 0, y: menuOpen ? -4 : 0 }}
                transition={{ duration: 0.3 }}
              />
            </button>
          </div>

          {/* Mobile menu */}
          <AnimatePresence>
            {menuOpen && (
              <m.div
                key="mobile-menu"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.4, ease: [0.19, 1, 0.22, 1] }}
                className="md:hidden overflow-hidden mx-6 mt-2 bg-surface border border-border rounded-2xl"
              >
                <nav className="flex flex-col p-6 gap-5">
                  {NAV_ITEMS.map(({ label, href }) => (
                    <a
                      key={label}
                      href={href}
                      onClick={(e) => { e.preventDefault(); handleNavClick(href) }}
                      className="font-sans text-lg font-bold text-foreground hover:text-accent transition-colors duration-200"
                    >
                      {label}
                    </a>
                  ))}

                  <div className="flex items-center gap-3 pt-2 border-t border-border">
                    <LangSwitcher />
                  </div>

                  <a
                    href="mailto:jerome@delodder.dev"
                    className="mt-2 inline-flex items-center justify-center gap-2 font-mono text-xs uppercase tracking-widest text-bg bg-accent rounded-full px-6 py-3"
                  >
                    {t('hire')}
                  </a>
                </nav>
              </m.div>
            )}
          </AnimatePresence>
        </m.header>
      )}
    </AnimatePresence>
  )
}
