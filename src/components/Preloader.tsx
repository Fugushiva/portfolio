'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const LETTERS = ['J', 'É', 'R', 'Ô', 'M', 'E']

interface PreloaderProps {
  onComplete: () => void
}

export default function Preloader({ onComplete }: PreloaderProps) {
  const [visible, setVisible] = useState(true)
  const counterRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    document.body.classList.add('is-loading')

    // Animate counter from 0 to 100
    let start = 0
    const duration = 1600
    const step = (timestamp: number) => {
      if (!counterRef.current) return
      if (start === 0) start = timestamp
      const progress = Math.min((timestamp - start) / duration, 1)
      const value = Math.floor(progress * 100)
      counterRef.current.textContent = String(value).padStart(3, '0')
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)

    const timer = setTimeout(() => {
      setVisible(false)
      document.body.classList.remove('is-loading')
      setTimeout(onComplete, 800)
    }, 2200)

    return () => clearTimeout(timer)
  }, [onComplete])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="preloader"
          className="fixed inset-0 z-[9998] flex flex-col items-center justify-center bg-bg overflow-hidden"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: [0.19, 1, 0.22, 1] }}
        >
          {/* Animated name */}
          <div
            className="flex overflow-hidden"
            aria-label="Jérôme"
          >
            {LETTERS.map((letter, i) => (
              <motion.span
                key={i}
                className="block font-sans font-black text-foreground"
                style={{
                  fontSize: 'clamp(3.5rem, 10vw, 9rem)',
                  lineHeight: 1,
                  letterSpacing: '-0.04em',
                }}
                initial={{ y: '110%', opacity: 0 }}
                animate={{ y: '0%', opacity: 1 }}
                transition={{
                  delay: i * 0.06,
                  duration: 0.9,
                  ease: [0.19, 1, 0.22, 1],
                }}
              >
                {letter}
              </motion.span>
            ))}
          </div>

          {/* Tagline */}
          <motion.p
            className="mt-4 font-mono text-sm text-muted tracking-widest uppercase"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
          >
            Prompt Engineer & Developer
          </motion.p>

          {/* Progress bar */}
          <motion.div
            className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="w-32 h-px bg-border overflow-hidden">
              <motion.div
                className="h-full bg-accent origin-left"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1.6, ease: [0.19, 1, 0.22, 1], delay: 0.1 }}
              />
            </div>
            <span ref={counterRef} className="font-mono text-xs text-muted tabular-nums w-8">
              000
            </span>
          </motion.div>

          {/* Accent glow */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 glow-accent"
            style={{ width: '60vw', height: '60vw', opacity: 0.4 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
