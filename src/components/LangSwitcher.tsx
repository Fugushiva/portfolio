'use client'

import { useLocale } from 'next-intl'
import { useRouter, usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { useCallback } from 'react'

export default function LangSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const otherLocale = locale === 'fr' ? 'en' : 'fr'
  const activeLabel = locale.toUpperCase()
  const otherLabel = otherLocale.toUpperCase()

  const switchLocale = useCallback(() => {
    // Replace the locale segment in the current path
    // pathname is like /fr/... or /en/...
    const segments = pathname.split('/')
    segments[1] = otherLocale
    router.push(segments.join('/') || `/${otherLocale}`)
  }, [pathname, otherLocale, router])

  return (
    <button
      onClick={switchLocale}
      aria-label={`Switch to ${otherLabel}`}
      data-magnetic
      className="magnetic-wrap relative overflow-hidden group"
      style={{ height: '1.2em', width: '2.4ch' }}
    >
      {/* Track — slides on hover */}
      <motion.div
        className="flex flex-col"
        initial={false}
        whileHover={{ y: '-50%' }}
        transition={{ duration: 0.4, ease: [0.19, 1, 0.22, 1] }}
      >
        {/* Active locale (visible by default) */}
        <span
          className="font-mono text-xs uppercase tracking-widest leading-none block"
          style={{ height: '1.2em', lineHeight: '1.2em' }}
          aria-hidden="false"
        >
          <span className="text-foreground group-hover:text-accent transition-colors duration-300">
            {activeLabel}
          </span>
        </span>

        {/* Other locale (hidden below, revealed on hover) */}
        <span
          className="font-mono text-xs uppercase tracking-widest leading-none block"
          style={{ height: '1.2em', lineHeight: '1.2em' }}
          aria-hidden="true"
        >
          <span className="text-muted group-hover:text-accent transition-colors duration-300">
            {otherLabel}
          </span>
        </span>
      </motion.div>
    </button>
  )
}
