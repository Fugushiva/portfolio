'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { m, AnimatePresence } from 'framer-motion'

export interface ContentPiece {
  src: string
  alt: string
  platform: string
  format: string
  theme?: 'dark' | 'light'
  span?: 'normal' | 'tall' | 'wide'
}

interface ContentGridProps {
  pieces: ContentPiece[]
  accent?: string
  accentRgb?: string
}

// Platform color mapping
const PLATFORM_COLORS: Record<string, string> = {
  LinkedIn: '#0A66C2',
  Stories: '#E1306C',
  Threads: '#101010',
  Ads: '#1877F2',
  Carousel: '#F58529',
  YouTube: '#FF0000',
  Sales: '#7c3aed',
  Default: '#6b6b6b',
}

function getPlatformColor(platform: string): string {
  for (const key of Object.keys(PLATFORM_COLORS)) {
    if (platform.toLowerCase().includes(key.toLowerCase())) {
      return PLATFORM_COLORS[key]
    }
  }
  return PLATFORM_COLORS.Default
}

// ─── Single content card ──────────────────────────────────────────────────────

function ContentCard({
  piece,
  index,
  accent,
  accentRgb,
  onClick,
}: {
  piece: ContentPiece
  index: number
  accent: string
  accentRgb: string
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const platformColor = getPlatformColor(piece.platform)

  // Determine aspect ratio from format + span
  const aspectRatio =
    piece.span === 'tall'
      ? '9/16'
      : piece.span === 'wide'
      ? '16/9'
      : piece.format?.toLowerCase().includes('portrait')
      ? '9/16'
      : piece.format?.toLowerCase().includes('landscape') || piece.format?.toLowerCase().includes('funnel')
      ? '4/3'
      : '1/1'

  return (
    <m.div
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={{
        duration: 0.7,
        ease: [0.19, 1, 0.22, 1],
        delay: (index % 5) * 0.07,
      }}
      className="relative group cursor-pointer overflow-hidden rounded-2xl border border-border/30"
      style={{ aspectRatio, background: '#0d0d0d' }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image — quality 70 is plenty for thumbnails; saves ~30% per file */}
      <Image
        src={piece.src}
        alt={piece.alt}
        fill
        className="object-cover transition-transform duration-700 ease-out"
        style={{ transform: hovered ? 'scale(1.05)' : 'scale(1)' }}
        sizes="(max-width: 768px) 50vw, 25vw"
        quality={70}
        loading="lazy"
      />

      {/* Bottom gradient overlay */}
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 55%, transparent 100%)',
          opacity: hovered ? 1 : 0.6,
        }}
      />

      {/* Top gradient for platform badge readability */}
      <div
        className="absolute top-0 left-0 right-0 h-16"
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 100%)',
        }}
      />

      {/* Platform badge */}
      <div className="absolute top-3 left-3">
        <span
          className="font-mono text-[0.58rem] uppercase tracking-widest px-2 py-0.5 rounded-full border"
          style={{
            color: platformColor,
            borderColor: `${platformColor}40`,
            background: `${platformColor}18`,
          }}
        >
          {piece.platform}
        </span>
      </div>

      {/* Theme badge */}
      {piece.theme && (
        <div className="absolute top-3 right-3">
          <span className="font-mono text-[0.55rem] text-muted/60 uppercase tracking-wider">
            {piece.theme}
          </span>
        </div>
      )}

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p
          className="font-mono text-[0.6rem] uppercase tracking-widest truncate"
          style={{ color: hovered ? accent : 'rgba(245,245,240,0.5)' }}
        >
          {piece.format}
        </p>
      </div>

      {/* Expand icon */}
      <div
        className="absolute inset-0 flex items-center justify-center transition-opacity duration-300"
        style={{ opacity: hovered ? 1 : 0 }}
      >
        <div
          className="w-10 h-10 rounded-full border flex items-center justify-center"
          style={{
            borderColor: `${accent}60`,
            background: `rgba(${accentRgb},0.2)`,
            color: accent,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1.5 1.5h11v11M1.5 12.5l11-11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </m.div>
  )
}

// ─── Lightbox (simple, reused pattern) ───────────────────────────────────────

function ContentLightbox({
  pieces,
  startIndex,
  onClose,
  accent,
}: {
  pieces: ContentPiece[]
  startIndex: number
  onClose: () => void
  accent: string
}) {
  const [current, setCurrent] = useState(startIndex)

  const prev = () => setCurrent((c) => (c - 1 + pieces.length) % pieces.length)
  const next = () => setCurrent((c) => (c + 1) % pieces.length)

  // Lock scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const piece = pieces[current]
  const isPortrait =
    piece.span === 'tall' ||
    piece.format?.toLowerCase().includes('portrait') ||
    piece.format?.toLowerCase().includes('story') ||
    piece.format?.toLowerCase().includes('stories')

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(12px)' }}
      onClick={onClose}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 w-10 h-10 rounded-full border border-border/60 flex items-center justify-center text-muted hover:text-foreground transition-all duration-200 z-10"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {/* Counter */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 font-mono text-xs text-muted/60">
        {current + 1} / {pieces.length}
      </div>

      {/* Image */}
      <m.div
        key={current}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.35, ease: [0.19, 1, 0.22, 1] }}
        className="relative"
        style={{
          width: isPortrait ? 'min(340px, 70vw)' : 'min(860px, 88vw)',
          maxHeight: '78vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="relative overflow-hidden rounded-2xl border border-border/30"
          style={{
            aspectRatio: isPortrait ? '9/16' : '16/9',
            maxHeight: '78vh',
          }}
        >
          <Image
            src={piece.src}
            alt={piece.alt}
            fill
            className="object-contain"
            priority
          />
        </div>
      </m.div>

      {/* Caption */}
      <m.div
        key={`cap-${current}`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-5 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-center gap-3">
          <span
            className="font-mono text-[0.6rem] uppercase tracking-widest px-2 py-0.5 rounded-full border"
            style={{
              color: getPlatformColor(piece.platform),
              borderColor: `${getPlatformColor(piece.platform)}40`,
              background: `${getPlatformColor(piece.platform)}15`,
            }}
          >
            {piece.platform}
          </span>
          <span className="font-mono text-[0.6rem] text-muted/50 uppercase tracking-wider">
            {piece.format}
          </span>
        </div>
      </m.div>

      {/* Nav arrows */}
      <div className="absolute inset-y-0 left-4 flex items-center" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={prev}
          className="w-10 h-10 rounded-full border border-border/60 flex items-center justify-center text-muted hover:text-foreground transition-all duration-200"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      <div className="absolute inset-y-0 right-4 flex items-center" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={next}
          className="w-10 h-10 rounded-full border border-border/60 flex items-center justify-center text-muted hover:text-foreground transition-all duration-200"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </m.div>
  )
}

// ─── Main grid ────────────────────────────────────────────────────────────────

export default function ContentGrid({
  pieces,
  accent = '#f43f5e',
  accentRgb = '244,63,94',
}: ContentGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [showAll, setShowAll] = useState(false)

  const visiblePieces = showAll ? pieces : pieces.slice(0, 9)

  return (
    <>
      {/* Intro label */}
      <div className="flex items-center gap-3 mb-5">
        <span className="font-mono text-[0.6rem] uppercase tracking-widest text-muted/60">
          Platform assets
        </span>
        <div className="flex-1 h-px bg-border/30" />
        <span className="font-mono text-[0.6rem] text-muted/40">
          {pieces.length} pieces
        </span>
      </div>

      {/* Masonry-style grid using CSS columns */}
      <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
        {visiblePieces.map((piece, i) => (
          <div key={i} className="break-inside-avoid mb-3">
            <ContentCard
              piece={piece}
              index={i}
              accent={accent}
              accentRgb={accentRgb}
              onClick={() => setLightboxIndex(i)}
            />
          </div>
        ))}
      </div>

      {/* Show more */}
      {!showAll && pieces.length > 9 && (
        <m.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-6 flex justify-center"
        >
          <button
            onClick={() => setShowAll(true)}
            className="font-mono text-xs uppercase tracking-widest text-muted hover:text-foreground transition-colors duration-200 flex items-center gap-2 px-4 py-2 rounded-full border border-border/50 hover:border-border"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Show {pieces.length - 9} more
          </button>
        </m.div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <ContentLightbox
            pieces={visiblePieces}
            startIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            accent={accent}
          />
        )}
      </AnimatePresence>
    </>
  )
}
