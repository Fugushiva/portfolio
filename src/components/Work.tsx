'use client'

import { useRef, useState } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import { useTranslations } from 'next-intl'
import WorkflowGallery, { type WorkflowImage } from '@/components/WorkflowGallery'
import ContentGrid, { type ContentPiece } from '@/components/ContentGrid'
import CodeViewer, { type CodeFile } from '@/components/CodeViewer'

// ─── Static project assets ────────────────────────────────────────────────────

// Project 1: n8n AI Outreach Engine
const N8N_IMAGES: WorkflowImage[] = [
  {
    src: '/projects/n8n-outreach/img/full-workflow.png',
    alt: 'Full n8n outreach automation workflow',
    label: 'Full pipeline overview',
    description: '9 sequential stages, 21 LLM nodes, 4 parallel branches — the complete outreach engine',
    wide: true,
  },
  {
    src: '/projects/n8n-outreach/img/workflow-part-1.png',
    alt: 'n8n workflow part 1 — entry & validation',
    label: 'Stage 1 — Entry & validation',
    description: 'Dual-entry validation with schema enforcement',
  },
  {
    src: '/projects/n8n-outreach/img/workflow-part-2.png',
    alt: 'n8n workflow part 2 — parallel branches',
    label: 'Stage 2–5 — 4 parallel branches',
    description: 'Language detection, personalization, KB retrieval, touchpoint parsing — concurrently',
  },
  {
    src: '/projects/n8n-outreach/img/workflow-part-3.png',
    alt: 'n8n workflow part 3 — strategy & generation',
    label: 'Stage 6–7 — Strategy & generation',
    description: 'Buyer classification feeds into strategy, then multi-touchpoint message generation',
  },
  {
    src: '/projects/n8n-outreach/img/workflow-part-4.png',
    alt: 'n8n workflow part 4 — quality gate & delivery',
    label: 'Stage 8–9 — Quality gate & delivery',
    description: 'Output contract enforcement with retry logic before production API delivery',
  },
  {
    src: '/projects/n8n-outreach/img/llm-language-detection.png',
    alt: 'LLM language detection node detail',
    label: 'LLM language detection',
    description: 'Prompt-level language enforcement — the highest-priority rule in the generation contract',
  },
  {
    src: '/projects/n8n-outreach/img/output-example-TP3.png',
    alt: 'Output example — touchpoint 3',
    label: 'Output — touchpoint 3',
    description: 'Real generated message: 2 paragraphs, Hemingway grade 6, yes/no close, 500 char limit',
  },
  {
    src: '/projects/n8n-outreach/img/output-exemple-TP-4-5.png',
    alt: 'Output examples — touchpoints 4 & 5',
    label: 'Output — touchpoints 4–5',
    description: 'Follow-up sequence messages with escalating urgency, same contract enforced',
  },
]

const N8N_CODE_FILES: CodeFile[] = [
  {
    filename: 'rules.json',
    language: 'json',
    description: 'Message generation contract — 13 strict rules injected into every LLM call. Language lock, tone control, formatting hard limits.',
    content: `let rules = \`MESSAGE GENERATION RULES

You must follow every rule below exactly.
If two rules seem to conflict, follow the more restrictive rule.
Do not ignore, relax, reinterpret, or override any rule.

1. LANGUAGE RULE
The campaign language is the ONLY language allowed in messages.
Write every single word of every message in the campaign language.
Even if the strategy, instructions, or prospect data are in English,
the message must be in the campaign language.
Do NOT mix languages. Zero exceptions.
This is the highest priority rule.

2. PERSONALIZATION & SAFETY
Use only verified, observable, explicit information.
Never invent facts about the prospect OR the sender's service.
Never infer unconfirmed details.

4. MESSAGE COMPLETION
Generate exactly one message for every required touchpoint.
Never skip a touchpoint.

6. TONE AND VOCABULARY
Write like a colleague in a hallway chat. Professional but relaxed.
Do not flatter. Do not compliment. Do not congratulate.
No amplifying adjectives: "huge", "amazing", "incredible".

8. SENTENCE LENGTH AND COUNT
Each sentence must be 10 words or less.
The default is 2 to 3 sentences in the body.

9. QUESTION RULE
Every message touchpoint MUST end with exactly one closed yes/no question.
The question MUST be answerable with ONLY "yes" or "no", 10 words or less.

10. CHARACTER LIMIT
Each message must be 500 characters maximum.

11. SIMPLICITY TARGET
Target Hemingway grade 6 or lower.
Short sentences (under 10 words). Common everyday words.
Subject + verb + object. No subordinate clauses.

12. BUZZWORDS BLACKLIST
scalable, enablement, empower, leverage, precision, complexity,
streamline, optimize, synergy, robust, holistic, facilitate, utilize,
implement, structured, alignment, operational, strategic

13. FORMATTING - HARD LIMIT
Do not use dashes. Use periods or commas instead.
HARD LIMIT: Every message must have EXACTLY 2 paragraphs.
Never 1. Never 3. Never more.

18. GREETING RULE
The first touchpoint MUST open with a greeting + "thanks for connecting".
Examples: "Hi Steven, thanks for connecting." (en)
          "Bonjour Mathieu, ravi d'etre en contact." (fr)

27. FORMALITY
In French: ALWAYS use "vous". NEVER use "tu".
In German: ALWAYS use "Sie". NEVER use "du".
In Spanish: ALWAYS use "usted". NEVER use "tu".
\`;

return [{ json: { rules } }];`,
  },
  {
    filename: 'sanitize.js',
    language: 'js',
    description: 'Post-generation deterministic cleanup (V5.7) — URL protection, dash normalization, 2-paragraph enforcement, LinkedIn char limit flagging.',
    content: `// NODE: Sanitize Messages (V5.7)
// Deterministic cleanup for LinkedIn delivery.
// URL protection via placeholder/restore pattern.
// HARD LIMIT: enforces max 2 paragraphs.

const input = $input.first().json;
const touchpoints = input.touchpoints || {};
const dashRegex = /[\\u2012\\u2013\\u2014\\u2015\\u2212]/g;
const smartSingleQuoteRegex = /[\\u2018\\u2019]/g;
const smartDoubleQuoteRegex = /[\\u201C\\u201D]/g;
const asteriskRegex = /\\*/g;

function protectURLs(text) {
  const store = [];
  const protected_ = text.replace(/https?:\\/\\/[^\\s]+/g, (url) => {
    store.push(url);
    return \`__SMURL_\${store.length - 1}__\`;
  });
  return { text: protected_, store };
}

function restoreURLs(text, store) {
  return text.replace(/__SMURL_(\\d+)__/g,
    (_, i) => store[parseInt(i, 10)]);
}

const processedTouchpoints = {};
for (const key in touchpoints) {
  const tp = touchpoints[key];
  if (!tp || typeof tp.message !== 'string') {
    processedTouchpoints[key] = tp; continue;
  }

  let msg = tp.message;
  let urlStore = [];
  ({ text: msg, store: urlStore } = protectURLs(msg));

  msg = msg.replace(dashRegex, ',').replace(asteriskRegex, '');
  msg = msg.replace(smartSingleQuoteRegex, "'")
           .replace(smartDoubleQuoteRegex, '"');
  msg = msg.replace(/ {2,}/g, ' ')
           .replace(/\\n{3,}/g, '\\n\\n').trim();

  // HARD LIMIT: enforce max 2 paragraphs
  const paragraphs = msg.split(/\\n\\n+/).filter(p => p.trim() !== '');
  if (paragraphs.length > 2) {
    msg = paragraphs[0] + '\\n\\n' + paragraphs.slice(1).join(' ');
  }

  msg = restoreURLs(msg, urlStore);
  const charCount = msg.length;

  processedTouchpoints[key] = {
    rawMessage: tp.message,
    message: msg,
    rationale: tp.rationale || {},
    charCount,
    exceedsConnectionLimit: charCount > 300,
    exceedsMessageLimit: charCount > 8000,
  };
}

return [{ json: { touchpoints: processedTouchpoints } }];`,
  },
]

// Project 4: AI Content Engine — SalesMind AI
const CONTENT_PIECES: ContentPiece[] = [
  { src: '/projects/content-engine/img/Sales-Funnel-Overview-(1).png', alt: 'Sales funnel overview', platform: 'Sales', format: 'Funnel Overview', theme: 'light', span: 'wide' },
  { src: '/projects/content-engine/img/LI-C1-S1-Hook-Light.png', alt: 'LinkedIn carousel hook light', platform: 'LinkedIn', format: 'Carousel Hook', theme: 'light' },
  { src: '/projects/content-engine/img/L1.1-Hook-(Dark).png', alt: 'LinkedIn hook dark', platform: 'LinkedIn', format: 'Hook Post', theme: 'dark' },
  { src: '/projects/content-engine/img/S1.1-Hook.png', alt: 'Stories hook', platform: 'Stories', format: 'Hook Slide', theme: 'light', span: 'tall' },
  { src: '/projects/content-engine/img/S1.5-CTA.png', alt: 'Stories CTA', platform: 'Stories', format: 'CTA Slide', theme: 'light', span: 'tall' },
  { src: '/projects/content-engine/img/S2.1-Hook-(Dark).png', alt: 'Stories hook dark', platform: 'Stories', format: 'Hook Slide', theme: 'dark', span: 'tall' },
  { src: '/projects/content-engine/img/S2.1-Hook.png', alt: 'Stories hook light v2', platform: 'Stories', format: 'Hook Slide v2', theme: 'light', span: 'tall' },
  { src: '/projects/content-engine/img/S2-4-Card-Grid.png', alt: 'Stories card grid', platform: 'Stories', format: 'Card Grid', theme: 'dark' },
  { src: '/projects/content-engine/img/S2-5-CTA.png', alt: 'Stories CTA v2', platform: 'Stories', format: 'CTA Slide v2', theme: 'dark' },
  { src: '/projects/content-engine/img/AD-1-White-Pain-Hook-(SDRs).png', alt: 'Ad pain hook SDRs white', platform: 'Ads', format: 'Pain Hook', theme: 'light' },
  { src: '/projects/content-engine/img/AD-2-White-Stat-Proof-(3-5-).png', alt: 'Ad stat proof white', platform: 'Ads', format: 'Stat Proof', theme: 'light' },
  { src: '/projects/content-engine/img/AD-3-White-Offer-CTA-(7-days).png', alt: 'Ad offer CTA white', platform: 'Ads', format: 'Offer CTA', theme: 'light' },
  { src: '/projects/content-engine/img/AD-4-White-Testimonial.png', alt: 'Ad testimonial white', platform: 'Ads', format: 'Testimonial', theme: 'light' },
  { src: '/projects/content-engine/img/AD-6-Dark-Question-Hook.png', alt: 'Ad question hook dark', platform: 'Ads', format: 'Question Hook', theme: 'dark' },
  { src: '/projects/content-engine/img/AD-8-Dark-Social-Proof-Stats.png', alt: 'Ad social proof dark', platform: 'Ads', format: 'Social Proof', theme: 'dark' },
  { src: '/projects/content-engine/img/AD-9-Dark-Urgency-7-Days.png', alt: 'Ad urgency dark', platform: 'Ads', format: 'Urgency CTA', theme: 'dark' },
  { src: '/projects/content-engine/img/AD-10-Dark-Replace-SDR-Team.png', alt: 'Ad replace SDR team dark', platform: 'Ads', format: 'Bold Claim', theme: 'dark' },
  { src: '/projects/content-engine/img/THR-Carousel-C3-3-DataStat-Dark.png', alt: 'Threads carousel data stat', platform: 'Threads', format: 'Carousel Stat', theme: 'dark' },
  { src: '/projects/content-engine/img/THR-Carousel-C6-1-Hook-Dark.png', alt: 'Threads carousel hook', platform: 'Threads', format: 'Carousel Hook', theme: 'dark' },
  { src: '/projects/content-engine/img/THR-Portrait-S2-L2.2-DataStat-Dark.png', alt: 'Threads portrait data stat', platform: 'Threads', format: 'Portrait Stat', theme: 'dark', span: 'tall' },
]

// ─── Per-project metadata ─────────────────────────────────────────────────────

const PROJECT_META = [
  {
    index: '01',
    accent: '#7c3aed',
    accentRgb: '124,58,237',
    stack: ['n8n', 'Google Vertex AI', 'Gemini', 'LangChain', 'Python', 'REST APIs'],
    category_icon: '⚡',
    hasGallery: true,
    galleryType: 'workflow' as const,
  },
  {
    index: '02',
    accent: '#06b6d4',
    accentRgb: '6,182,212',
    stack: ['Next.js 15', 'React 19', 'Supabase', 'PostgreSQL', 'PL/pgSQL', 'Tailwind v4', 'OVH API'],
    category_icon: '🏗️',
    hasGallery: false,
    galleryType: 'none' as const,
  },
  {
    index: '03',
    accent: '#a78bfa',
    accentRgb: '167,139,250',
    stack: ['Google Opal', 'Nano Banana', 'Multi-agent orchestration', 'Structured outputs'],
    category_icon: '🧠',
    hasGallery: false,
    galleryType: 'none' as const,
  },
  {
    index: '04',
    accent: '#f43f5e',
    accentRgb: '244,63,94',
    stack: ['Figma', 'Claude', 'CapCut', 'Notion', 'LinkedIn', 'Instagram', 'YouTube', 'Threads', 'Bluesky'],
    category_icon: '🎨',
    hasGallery: true,
    galleryType: 'content' as const,
  },
]

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
    <motion.div
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
    </motion.div>
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
  meta: (typeof PROJECT_META)[0]
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
          <motion.div
            className="shrink-0 w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted transition-colors duration-300"
            style={isOpen ? { borderColor: accent, color: accent } : {}}
            animate={{ rotate: isOpen ? 45 : 0 }}
            transition={{ duration: 0.35, ease: [0.19, 1, 0.22, 1] }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </motion.div>
        </div>
      </button>

      {/* ── Expanded panel ── */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
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
                        <motion.div
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
                  <motion.div
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
                          {project.metrics.map((m, i) => (
                            <MetricCard
                              key={i}
                              value={m.value}
                              label={m.label}
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
                  </motion.div>
                )}

                {/* ── Assets tab — workflow gallery ── */}
                {activeTab === 'assets' && galleryType === 'workflow' && (
                  <motion.div
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
                  </motion.div>
                )}

                {/* ── Assets tab — content grid ── */}
                {activeTab === 'assets' && galleryType === 'content' && (
                  <motion.div
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
                  </motion.div>
                )}

                {/* ── Code / Source tab ── */}
                {activeTab === 'code' && (
                  <motion.div
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
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
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
  useScrollReveal(containerRef, { stagger: 0.06 })

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
          data-reveal
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
