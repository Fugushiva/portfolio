'use client'

/**
 * Success state panel — replaces the form after a successful submission.
 * Animated checkmark (Framer spring) + success copy + reset button.
 * Respects prefers-reduced-motion.
 */

import { m, useReducedMotion } from 'framer-motion'
import { useTranslations } from 'next-intl'

interface ContactSuccessProps {
  onReset: () => void
}

export default function ContactSuccess({ onReset }: ContactSuccessProps) {
  const t = useTranslations('contact.form')
  const reduce = useReducedMotion()

  return (
    <m.div
      role="status"
      aria-live="polite"
      className="flex flex-col items-start gap-6 py-4"
      initial={{ opacity: 0, y: reduce ? 0 : 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.19, 1, 0.22, 1] }}
    >
      {/* Animated checkmark */}
      <m.div
        className="w-14 h-14 rounded-full border border-accent/40 flex items-center justify-center"
        initial={{ scale: reduce ? 1 : 0, rotate: reduce ? 0 : -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
      >
        <m.svg
          width="28"
          height="28"
          viewBox="0 0 28 28"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            pathLength: { duration: 0.5, ease: 'easeInOut', delay: 0.3 },
            opacity: { duration: 0.1, delay: 0.3 },
          }}
        >
          <m.polyline
            points="6,14 11,19 22,9"
            stroke="#7c3aed"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </m.svg>
      </m.div>

      {/* Copy */}
      <div>
        <p className="font-black text-foreground" style={{ fontSize: 'clamp(1.25rem, 3vw, 2rem)' }}>
          {t('success_title')}
        </p>
        <p className="text-muted text-sm mt-1 leading-relaxed">
          {t('success_body')}
        </p>
      </div>

      {/* Reset button */}
      <button
        onClick={onReset}
        className="inline-flex items-center gap-2 font-mono text-xs text-muted border border-border rounded-full px-4 py-3 hover:border-foreground/40 hover:text-foreground transition-all duration-300 cursor-pointer"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {t('success_reset')}
      </button>
    </m.div>
  )
}
