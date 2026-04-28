'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { gsap } from 'gsap'
import { useTranslations } from 'next-intl'

interface HeroProps {
  isReady: boolean
}

export default function Hero({ isReady }: HeroProps) {
  const t = useTranslations('hero')
  const words = t.raw('words') as string[]

  const containerRef = useRef<HTMLDivElement>(null)
  const orbRef = useRef<HTMLDivElement>(null)
  const wordIndexRef = useRef(0)
  const wordRef = useRef<HTMLSpanElement>(null)
  const wordIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Mouse parallax on orb
  useEffect(() => {
    if (!orbRef.current) return
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return

    const onMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 60
      const y = (e.clientY / window.innerHeight - 0.5) * 40
      gsap.to(orbRef.current, {
        x,
        y,
        duration: 2,
        ease: 'power2.out',
      })
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  // Rotating words
  useEffect(() => {
    if (!isReady || !wordRef.current) return
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return

    // Reset to first word when locale changes
    wordIndexRef.current = 0
    if (wordRef.current) wordRef.current.textContent = words[0]

    const rotateWord = () => {
      wordIndexRef.current = (wordIndexRef.current + 1) % words.length
      if (!wordRef.current) return

      gsap.to(wordRef.current, {
        y: '-110%',
        opacity: 0,
        duration: 0.4,
        ease: 'power2.in',
        onComplete: () => {
          if (!wordRef.current) return
          wordRef.current.textContent = words[wordIndexRef.current]
          gsap.fromTo(
            wordRef.current,
            { y: '60%', opacity: 0 },
            { y: '0%', opacity: 1, duration: 0.5, ease: 'power2.out' }
          )
        },
      })
    }

    wordIntervalRef.current = setInterval(rotateWord, 2200)
    return () => {
      if (wordIntervalRef.current) clearInterval(wordIntervalRef.current)
    }
  }, [isReady, words])

  const containerVariants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: 0.1, delayChildren: 0.1 },
    },
  }

  const itemVariants = {
    hidden: { y: 60, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 1.1, ease: [0.19, 1, 0.22, 1] as [number, number, number, number] },
    },
  }

  return (
    <section
      id="hero"
      ref={containerRef}
      className="relative min-h-screen flex flex-col justify-end overflow-hidden px-6 pb-16 md:px-12 md:pb-24 lg:px-20 lg:pb-28"
    >
      {/* Background orb */}
      <div
        ref={orbRef}
        className="absolute top-1/4 right-0 md:right-[10%] w-[clamp(300px,55vw,700px)] h-[clamp(300px,55vw,700px)] rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at center, rgba(124,58,237,0.22) 0%, rgba(124,58,237,0.06) 50%, transparent 75%)',
          filter: 'blur(40px)',
        }}
      />

      {/* Grid lines */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}
      />

      {/* Content */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate={isReady ? 'visible' : 'hidden'}
        className="relative z-10 max-w-[1600px] w-full"
      >
        {/* Eyebrow */}
        <motion.div variants={itemVariants} className="split-line mb-6 md:mb-8">
          <span className="font-mono text-xs md:text-sm text-muted tracking-widest uppercase">
            {t('availability')}
          </span>
        </motion.div>

        {/* Name headline */}
        <div className="overflow-hidden mb-2 md:mb-4">
          <motion.h1
            variants={itemVariants}
            className="font-black text-foreground leading-none tracking-tighter"
            style={{ fontSize: 'clamp(3.5rem, 11vw, 11.5rem)' }}
          >
            Jérôme
          </motion.h1>
        </div>

        <div className="overflow-hidden mb-8 md:mb-10">
          <motion.h1
            variants={itemVariants}
            className="font-black text-foreground leading-none tracking-tighter"
            style={{ fontSize: 'clamp(3.5rem, 11vw, 11.5rem)' }}
          >
            Delodder
          </motion.h1>
        </div>

        {/* Tagline row */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-8"
        >
          <p className="font-sans text-muted text-base md:text-lg max-w-[420px] leading-relaxed">
            {t('tagline')}<br />
            {t('buildPrefix')}{' '}
            <span
              className="inline-block overflow-hidden align-bottom"
              style={{ height: '1.2em', verticalAlign: 'bottom' }}
            >
              <span
                ref={wordRef}
                className="inline-block text-accent font-semibold"
              >
                {words[0]}
              </span>
            </span>
          </p>

          <div className="flex items-center gap-6 sm:ml-auto">
            <a
              href="#work"
              data-magnetic
              className="magnetic-wrap group relative inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-foreground transition-colors duration-300 hover:text-accent"
            >
              <span
                className="absolute -inset-3 rounded-full border border-border opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              />
              {t('cta_work')}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="transition-transform duration-300 group-hover:translate-x-1">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>

            <a
              href="#contact"
              data-magnetic
              className="magnetic-wrap relative inline-flex items-center justify-center px-6 py-3 font-mono text-xs uppercase tracking-widest border border-accent text-accent rounded-full transition-all duration-400 hover:bg-accent hover:text-bg"
            >
              {t('cta_contact')}
            </a>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          variants={itemVariants}
          className="absolute bottom-0 right-0 hidden md:flex flex-col items-center gap-2"
        >
          <div className="flex flex-col items-center gap-1">
            <span className="font-mono text-[10px] text-muted uppercase tracking-widest [writing-mode:vertical-rl]">
              {t('scroll')}
            </span>
            <motion.div
              className="w-px h-12 bg-gradient-to-b from-accent to-transparent origin-top"
              animate={{ scaleY: [0, 1, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </motion.div>
      </motion.div>

      {/* Bottom divider */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </section>
  )
}
