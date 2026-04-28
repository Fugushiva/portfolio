'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'

export interface WorkflowImage {
  src: string
  alt: string
  label: string
  description?: string
  wide?: boolean // images that deserve full width (like the full workflow)
}

interface WorkflowGalleryProps {
  images: WorkflowImage[]
  accent?: string
  accentRgb?: string
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({
  images,
  startIndex,
  onClose,
  accent,
}: {
  images: WorkflowImage[]
  startIndex: number
  onClose: () => void
  accent: string
}) {
  const [current, setCurrent] = useState(startIndex)

  const prev = useCallback(() => setCurrent((c) => (c - 1 + images.length) % images.length), [images.length])
  const next = useCallback(() => setCurrent((c) => (c + 1) % images.length), [images.length])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, prev, next])

  // Lock scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const img = images[current]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.93)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 w-10 h-10 rounded-full border border-border/60 flex items-center justify-center text-muted hover:text-foreground hover:border-foreground transition-all duration-200 z-10"
        aria-label="Close"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {/* Counter */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 font-mono text-xs text-muted/60">
        {current + 1} / {images.length}
      </div>

      {/* Main image */}
      <motion.div
        key={current}
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.35, ease: [0.19, 1, 0.22, 1] }}
        className="relative w-full max-w-[90vw] max-h-[75vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative w-full" style={{ maxHeight: '75vh' }}>
          <Image
            src={img.src}
            alt={img.alt}
            width={1600}
            height={900}
            className="object-contain max-h-[75vh] w-auto mx-auto rounded-xl"
            style={{ maxWidth: '90vw' }}
            priority
          />
        </div>
      </motion.div>

      {/* Caption */}
      <motion.div
        key={`cap-${current}`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="mt-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-mono text-xs uppercase tracking-widest" style={{ color: accent }}>
          {img.label}
        </p>
        {img.description && (
          <p className="mt-1.5 text-sm text-muted/70 max-w-xl mx-auto">{img.description}</p>
        )}
      </motion.div>

      {/* Nav arrows */}
      <div className="absolute inset-y-0 left-4 flex items-center" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={prev}
          className="w-10 h-10 rounded-full border border-border/60 flex items-center justify-center text-muted hover:text-foreground hover:border-foreground transition-all duration-200"
          aria-label="Previous"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      <div className="absolute inset-y-0 right-4 flex items-center" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={next}
          className="w-10 h-10 rounded-full border border-border/60 flex items-center justify-center text-muted hover:text-foreground hover:border-foreground transition-all duration-200"
          aria-label="Next"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Thumbnail strip */}
      <div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {images.map((img, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className="relative overflow-hidden rounded-lg transition-all duration-300"
            style={{
              width: current === i ? 52 : 36,
              height: 28,
              opacity: current === i ? 1 : 0.4,
              outline: current === i ? `1.5px solid ${accent}` : 'none',
            }}
          >
            <Image src={img.src} alt={img.alt} fill className="object-cover" />
          </button>
        ))}
      </div>
    </motion.div>
  )
}

// ─── Gallery grid ─────────────────────────────────────────────────────────────

export default function WorkflowGallery({
  images,
  accent = '#7c3aed',
  accentRgb = '124,58,237',
}: WorkflowGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Split images: first image wide (full-width overview), rest in grid
  const heroImage = images[0]
  const gridImages = images.slice(1)

  return (
    <>
      <div ref={containerRef} className="space-y-3">
        {/* ── Hero image (full workflow) ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.7, ease: [0.19, 1, 0.22, 1] }}
          className="relative group cursor-pointer overflow-hidden rounded-2xl border border-border/40"
          style={{ aspectRatio: '16/6' }}
          onClick={() => setLightboxIndex(0)}
          onMouseEnter={() => setHoveredIndex(0)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <Image
            src={heroImage.src}
            alt={heroImage.alt}
            fill
            className="object-cover object-left transition-transform duration-700 ease-out group-hover:scale-[1.02]"
            sizes="(max-width: 768px) 100vw, 80vw"
          />

          {/* Dark overlay */}
          <div
            className="absolute inset-0 transition-opacity duration-300"
            style={{
              background: `linear-gradient(to right, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)`,
              opacity: hoveredIndex === 0 ? 0.6 : 0.75,
            }}
          />

          {/* Label */}
          <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between">
            <div>
              <span
                className="font-mono text-[0.6rem] uppercase tracking-widest mb-1 block"
                style={{ color: accent }}
              >
                {heroImage.label}
              </span>
              {heroImage.description && (
                <p className="text-xs text-foreground/70 max-w-sm">{heroImage.description}</p>
              )}
            </div>
            <div
              className="w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300 shrink-0"
              style={{
                borderColor: `${accent}60`,
                background: `rgba(${accentRgb},0.12)`,
                color: accent,
                transform: hoveredIndex === 0 ? 'scale(1.1)' : 'scale(1)',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1.5 1.5h9v9M1.5 10.5l9-9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </motion.div>

        {/* ── Grid images ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {gridImages.map((img, i) => {
            const absIdx = i + 1
            return (
              <motion.div
                key={absIdx}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-20px' }}
                transition={{ duration: 0.6, ease: [0.19, 1, 0.22, 1], delay: i * 0.06 }}
                className="relative group cursor-pointer overflow-hidden rounded-xl border border-border/40"
                style={{ aspectRatio: '4/3' }}
                onClick={() => setLightboxIndex(absIdx)}
                onMouseEnter={() => setHoveredIndex(absIdx)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                  sizes="(max-width: 768px) 50vw, 20vw"
                />

                {/* Overlay */}
                <div
                  className="absolute inset-0 transition-opacity duration-300"
                  style={{
                    background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.1) 60%)',
                    opacity: hoveredIndex === absIdx ? 1 : 0.5,
                  }}
                />

                {/* Label */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <span
                    className="font-mono text-[0.58rem] uppercase tracking-widest block truncate"
                    style={{ color: accent }}
                  >
                    {img.label}
                  </span>
                </div>

                {/* Expand icon on hover */}
                <div
                  className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full border flex items-center justify-center transition-all duration-300"
                  style={{
                    borderColor: `${accent}50`,
                    background: `rgba(${accentRgb},0.15)`,
                    color: accent,
                    opacity: hoveredIndex === absIdx ? 1 : 0,
                    transform: hoveredIndex === absIdx ? 'scale(1)' : 'scale(0.7)',
                  }}
                >
                  <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                    <path d="M1 1h7v7M1 8l7-7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* ── Lightbox portal ── */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <Lightbox
            images={images}
            startIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            accent={accent}
          />
        )}
      </AnimatePresence>
    </>
  )
}
