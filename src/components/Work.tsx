'use client'

import { useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { m, AnimatePresence, useInView } from 'framer-motion'
import { useGSAPReveal } from '@/hooks/useGSAPReveal'
import { useTranslations } from 'next-intl'
import { N8N_IMAGES, N8N_CODE_FILES, CONTENT_PIECES, PROJECT_META } from '@/components/work-data'

// Heavy sub-components — only load when a project's "Assets" or "Source"
// tab is actually opened. Each gets its own JS chunk.
const WorkflowGallery = dynamic(() => import('@/components/WorkflowGallery'), {
  loading: () => <ChunkLoading />,
})
const ContentGrid = dynamic(() => import('@/components/ContentGrid'), {
  loading: () => <ChunkLoading />,
})
const CodeViewer = dynamic(() => import('@/components/CodeViewer'), {
  loading: () => <ChunkLoading />,
})

function ChunkLoading() {
  return (
    <div className="min-h-[200px] flex items-center justify-center">
      <span className="font-mono text-[0.65rem] text-muted/60 uppercase tracking-widest animate-pulse">
        Loading…
      </span>
    </div>
  )
}

// ─── Animated metric counter ──────────────────────────────────────────────────

function MetricCard({
  value,
  label,
  accent,
  accentRgb,
  delay,
}: {
  value: string
  label: string
  accent: string
  accentRgb: string
  delay: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <m.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.19, 1, 0.22, 1], delay }}
      className="relative p-4 rounded-xl border border-border/60 overflow-hidden"
      style={{ background: `rgba(${accentRgb},0.04)` }}
    >
      <div
        className="absolute -top-4 -right-4 w-16 h-16 rounded-full blur-2xl opacity-30"
        style={{ background: accent }}
      />
      <div
        className="font-black leading-none tracking-tighter mb-1"
        style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', color: accent }}
      >
        {value}
      </div>
      <div className="font-mono text-[0.65rem] text-muted uppercase tracking-wider leading-snug">
        {label}
      </div>
    </m.div>
  )
}

// ─── Architecture diagram pill ────────────────────────────────────────────────

function ArchPill({
  label,
  accent,
  accentRgb,
}: {
  label: string
  accent: string
  accentRgb: string
}) {
  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[0.65rem] font-mono"
      style={{
        borderColor: `${accent}35`,
        background: `rgba(${accentRgb},0.06)`,
        color: accent,
      }}
    >
      {label}
    </div>
  )
}

// ─── Section tabs for project panels ─────────────────────────────────────────

type PanelTab = 'overview' | 'assets' | 'code'

const TAB_LABELS: Record<PanelTab, string> = {
  overview: 'Overview',
  assets: 'Assets',
  code: 'Source',
}

// ─── Single project card ──────────────────────────────────────────────────────

function ProjectCard({
  meta,
  project,
  stackLabel,
  architectureLabel,
  metricsLabel,
  isOpen,
  onToggle,
  index,
}: {
  meta: (typeof PROJECT_META)[number]
  project: {
    title: string
    category: string
    year: string
    client: string
    headline: string
    description: string
    architecture: string
    metrics: { value: string; label: string }[]
  }
  stackLabel: string
  architectureLabel: string
  metricsLabel: string
  isOpen: boolean
  onToggle: () => void
  index: number
}) {
  const { accent, accentRgb, stack, category_icon, hasGallery, galleryType } = meta

  // Determine available tabs
  const availableTabs: PanelTab[] = ['overview']
  if (hasGallery) availableTabs.push('assets')
  if (galleryType === 'workflow') availableTabs.push('code')

  const [activeTab, setActiveTab] = useState<PanelTab>('overview')

  // Architecture pills — split by " · "
  const archPills = project.architecture.split(' · ').map((s) => s.trim()).filter(Boolean)

  return (
    <div
      className="border-t border-border group"
      data-reveal
      style={{ '--project-accent': accent } as React.CSSProperties}
    >
      {/* ── Header row ── */}
      <button
        onClick={onToggle}
        data-magnetic
        className="w-full text-left py-7 md:py-9 transition-all duration-300 focus-visible:outline-none"
        aria-expanded={isOpen}
      >
        <div className="flex items-start md:items-center gap-4 md:gap-8">
          {/* Index */}
          <span className="font-mono text-xs text-muted shrink-0 pt-[2px] md:pt-0 select-none tabular-nums">
            {meta.index}
          </span>

          {/* Title block */}
          <div className="flex-1 min-w-0">
            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-3 mb-2 md:mb-3">
              <span
                className="font-mono text-[0.65rem] uppercase tracking-[0.2em] px-2.5 py-0.5 rounded-full border"
                style={{
                  color: accent,
                  borderColor: `${accent}50`,
                  background: `rgba(${accentRgb},0.08)`,
                }}
              >
                {category_icon} {project.category}
              </span>
              <span className="font-mono text-[0.65rem] text-muted/60 uppercase tracking-wider">
                {project.client} · {project.year}
              </span>

              {/* Asset badges */}
              {hasGallery && (
                <span className="font-mono text-[0.6rem] text-muted/40 uppercase tracking-widest flex items-center gap-1">
                  <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                    <rect x="0.5" y="0.5" width="3.5" height="3.5" rx="0.5" stroke="currentColor" strokeWidth="0.8" />
                    <rect x="5" y="0.5" width="3.5" height="3.5" rx="0.5" stroke="currentColor" strokeWidth="0.8" />
                    <rect x="0.5" y="5" width="3.5" height="3.5" rx="0.5" stroke="currentColor" strokeWidth="0.8" />
                    <rect x="5" y="5" width="3.5" height="3.5" rx="0.5" stroke="currentColor" strokeWidth="0.8" />
                  </svg>
                  Gallery
                </span>
              )}
              {galleryType === 'workflow' && (
                <span className="font-mono text-[0.6rem] text-muted/40 uppercase tracking-widest flex items-center gap-1">
                  <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                    <path d="M1 2h7M1 4.5h5M1 7h3" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
                  </svg>
                  Source
                </span>
              )}
            </div>

            {/* Title */}
            <h3
              className="font-black text-foreground leading-[1.05] tracking-tighter transition-colors duration-300 group-hover:text-accent"
              style={{ fontSize: 'clamp(1.6rem, 3.8vw, 3.2rem)' }}
            >
              {project.title}
            </h3>

            {/* Subheadline */}
            <p
              className="mt-1.5 font-light text-muted/80 leading-snug"
              style={{ fontSize: 'clamp(0.85rem, 1.4vw, 1.05rem)' }}
            >
              {project.headline}
            </p>
          </div>

          {/* Toggle arrow */}
          <m.div
            className="shrink-0 w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted transition-colors duration-300"
            style={isOpen ? { borderColor: accent, color: accent } : {}}
            animate={{ rotate: isOpen ? 45 : 0 }}
            transition={{ duration: 0.35, ease: [0.19, 1, 0.22, 1] }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </m.div>
        </div>
      </button>

      {/* ── Expanded panel ── */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <m.div
            key="panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.55, ease: [0.19, 1, 0.22, 1] }}
            className="overflow-hidden"
          >
            <div className="pb-14 pl-0 md:pl-16">
              {/* ── Tab bar (only when multiple tabs) ── */}
              {availableTabs.length > 1 && (
                <div className="flex items-center gap-1 mb-8 p-1 rounded-xl border border-border/40 w-fit"
                  style={{ background: 'rgba(255,255,255,0.02)' }}>
                  {availableTabs.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className="relative px-4 py-1.5 rounded-lg font-mono text-[0.68rem] uppercase tracking-widest transition-all duration-200"
                      style={{
                        color: activeTab === tab ? accent : '#6b6b6b',
                        background: activeTab === tab ? `rgba(${accentRgb},0.1)` : 'transparent',
                      }}
                    >
                      {activeTab === tab && (
                        <m.div
                          layoutId={`tab-${index}`}
                          className="absolute inset-0 rounded-lg"
                          style={{ background: `rgba(${accentRgb},0.1)` }}
                        />
                      )}
                      <span className="relative">{TAB_LABELS[tab]}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* ── Overview tab ── */}
              <AnimatePresence mode="wait" initial={false}>
                {activeTab === 'overview' && (
                  <m.div
                    key="overview"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.4, ease: [0.19, 1, 0.22, 1] }}
                  >
                    {/* Two-column layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 mb-10">
                      {/* Left: description + architecture */}
                      <div className="lg:col-span-3 space-y-6">
                        <p className="text-muted text-[0.95rem] leading-relaxed">
                          {project.description}
                        </p>

                        {/* Architecture pills */}
                        <div
                          className="p-4 rounded-xl border space-y-3"
                          style={{
                            borderColor: `${accent}30`,
                            background: `rgba(${accentRgb},0.04)`,
                          }}
                        >
                          <span
                            className="font-mono text-[0.6rem] uppercase tracking-widest block"
                            style={{ color: accent }}
                          >
                            {architectureLabel}
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {archPills.map((pill) => (
                              <ArchPill key={pill} label={pill} accent={accent} accentRgb={accentRgb} />
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Right: metrics */}
                      <div className="lg:col-span-2">
                        <p className="font-mono text-[0.65rem] text-muted/60 uppercase tracking-widest mb-4">
                          {metricsLabel}
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          {project.metrics.map((mt, i) => (
                            <MetricCard
                              key={i}
                              value={mt.value}
                              label={mt.label}
                              accent={accent}
                              accentRgb={accentRgb}
                              delay={i * 0.07}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Stack tags */}
                    <div>
                      <p className="font-mono text-[0.65rem] text-muted/60 uppercase tracking-widest mb-3">
                        {stackLabel}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {stack.map((tech) => (
                          <span
                            key={tech}
                            className="font-mono text-[0.7rem] border border-border/70 rounded px-2.5 py-1 text-foreground/60 transition-colors duration-200 hover:border-border hover:text-foreground/90"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Bottom accent line */}
                    <div
                      className="mt-10 h-px w-24 rounded-full opacity-40"
                      style={{ background: accent }}
                    />
                  </m.div>
                )}

                {/* ── Assets tab — workflow gallery ── */}
                {activeTab === 'assets' && galleryType === 'workflow' && (
                  <m.div
                    key="assets-workflow"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.4, ease: [0.19, 1, 0.22, 1] }}
                  >
                    <p className="text-muted/70 text-sm mb-6 leading-relaxed max-w-2xl">
                      Real screenshots from the production n8n instance — 9 stages, 21 LLM nodes. Click any image to open the full-resolution lightbox.
                    </p>
                    <WorkflowGallery
                      images={N8N_IMAGES}
                      accent={accent}
                      accentRgb={accentRgb}
                    />
                  </m.div>
                )}

                {/* ── Assets tab — content grid ── */}
                {activeTab === 'assets' && galleryType === 'content' && (
                  <m.div
                    key="assets-content"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.4, ease: [0.19, 1, 0.22, 1] }}
                  >
                    <p className="text-muted/70 text-sm mb-6 leading-relaxed max-w-2xl">
                      A sample of the weekly output — ads, carousels, Stories, Threads posts — all platform-native. Never copy-paste between channels.
                    </p>
                    <ContentGrid
                      pieces={CONTENT_PIECES}
                      accent={accent}
                      accentRgb={accentRgb}
                    />
                  </m.div>
                )}

                {/* ── Code / Source tab ── */}
                {activeTab === 'code' && (
                  <m.div
                    key="code"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.4, ease: [0.19, 1, 0.22, 1] }}
                    className="space-y-4"
                  >
                    <p className="text-muted/70 text-sm mb-6 leading-relaxed max-w-2xl">
                      Two real artifacts from the pipeline: the generation contract injected into every LLM call, and the deterministic sanitizer that runs post-generation before LinkedIn delivery.
                    </p>
                    <CodeViewer
                      files={N8N_CODE_FILES}
                      accent={accent}
                      accentRgb={accentRgb}
                      maxLines={32}
                    />
                  </m.div>
                )}
              </AnimatePresence>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Section ──────────────────────────────────────────────────────────────────

export default function Work() {
  const t = useTranslations('work')
  const projects = t.raw('projects') as Array<{
    title: string
    category: string
    year: string
    client: string
    headline: string
    description: string
    architecture: string
    metrics: { value: string; label: string }[]
  }>

  const containerRef = useRef<HTMLElement>(null)
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  useGSAPReveal(containerRef, { stagger: 0.08, duration: 1.0, y: 55, start: 'top 86%' })

  return (
    <section
      id="work"
      ref={containerRef}
      className="section-pad px-6 md:px-12 lg:px-20 relative"
    >
      {/* Section label */}
      <div className="flex items-center gap-4 mb-16 md:mb-20" data-reveal>
        <span className="font-mono text-xs text-accent tracking-widest uppercase">
          {t('section')}
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Headline */}
      <div className="mb-16 md:mb-20 max-w-[1600px]">
        <h2
          data-reveal-word
          className="font-black text-foreground leading-tight tracking-tighter"
          style={{ fontSize: 'clamp(2rem, 4.5vw, 4.5rem)' }}
        >
          {t('headline')}
        </h2>
      </div>

      {/* Projects list */}
      <div className="max-w-[1600px]">
        {projects.map((project, i) => (
          <ProjectCard
            key={PROJECT_META[i].index}
            meta={PROJECT_META[i]}
            project={project}
            stackLabel={t('stackLabel')}
            architectureLabel={t('architectureLabel')}
            metricsLabel={t('metricsLabel')}
            isOpen={openIndex === i}
            onToggle={() => setOpenIndex(openIndex === i ? null : i)}
            index={i}
          />
        ))}
        {/* Bottom border */}
        <div className="border-t border-border" />
      </div>
    </section>
  )
}
