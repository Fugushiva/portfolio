'use client'

import { useRef } from 'react'
import { m, useInView } from 'framer-motion'
import { useGSAPReveal } from '@/hooks/useGSAPReveal'
import { useTilt3D } from '@/hooks/useTilt3D'
import { useTranslations } from 'next-intl'

type SkillCategory = {
  label: string
  color: string
  skills: string[]
}

const CATEGORIES: SkillCategory[] = [
  {
    label: 'AI & Prompt',
    color: '#7c3aed',
    skills: ['Claude', 'GPT-4', 'Prompt Engineering', 'RAG', 'Function Calling', 'Agents'],
  },
  {
    label: 'Frontend',
    color: '#a78bfa',
    skills: ['Next.js', 'React', 'TypeScript', 'Tailwind CSS', 'Framer Motion', 'GSAP'],
  },
  {
    label: 'Backend',
    color: '#6d28d9',
    skills: ['Node.js', 'Prisma', 'PostgreSQL', 'REST', 'GraphQL', 'Supabase'],
  },
  {
    label: 'Automation',
    color: '#8b5cf6',
    skills: ['n8n', 'Make.com', 'Zapier', 'Webhooks', 'Cron Jobs', 'API Orchestration'],
  },
]

// ─── Category card with 3D tilt ───────────────────────────────────────────────
function CategoryCard({
  label,
  color,
  skills,
  index,
}: SkillCategory & { index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  useTilt3D(ref, { maxRot: 10, lerp: 0.07, scale: 1.03 })

  return (
    <m.div
      ref={ref}
      className="tilt-card bg-bg p-6 md:p-8 hover:bg-surface transition-colors duration-300 relative overflow-hidden"
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: index * 0.1, duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
    >
      {/* Ambient corner glow */}
      <div
        className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: color }}
        aria-hidden="true"
      />

      {/* Category dot + label */}
      <div className="flex items-center gap-2 mb-6">
        <div className="relative w-2 h-2 shrink-0">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: color }}
          />
          {/* Pulsing ring */}
          <div
            className="absolute inset-0 rounded-full animate-ping"
            style={{ backgroundColor: color, opacity: 0.4, animationDuration: `${1.8 + index * 0.4}s` }}
          />
        </div>
        <span className="font-mono text-xs uppercase tracking-widest text-muted">
          {label}
        </span>
      </div>

      {/* Skills list — stagger in when in view */}
      <ul className="flex flex-col gap-2">
        {skills.map((skill, i) => (
          <m.li
            key={skill}
            className="font-sans text-sm text-foreground/80 flex items-center gap-2 hover:text-foreground transition-colors duration-200"
            initial={{ opacity: 0, x: -8 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: index * 0.1 + i * 0.06 + 0.2, duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
          >
            <span
              className="w-1 h-1 rounded-full shrink-0 transition-all duration-300 hover:w-2"
              style={{ backgroundColor: color, opacity: 0.7 }}
            />
            {skill}
          </m.li>
        ))}
      </ul>
    </m.div>
  )
}

// ─── Marquee strip — pure CSS ─────────────────────────────────────────────────
function MarqueeStrip({
  items,
  reverse = false,
  speed = 18,
}: {
  items: string[]
  reverse?: boolean
  speed?: number
}) {
  const doubled = [...items, ...items]
  return (
    <div className="overflow-hidden">
      <div
        className="flex gap-3 w-max marquee-track"
        style={{
          animationDuration: `${speed}s`,
          animationDirection: reverse ? 'reverse' : 'normal',
        }}
      >
        {doubled.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center px-4 py-2 rounded-full border border-border text-muted font-mono text-xs uppercase tracking-wider whitespace-nowrap hover:border-accent hover:text-accent transition-colors duration-200 cursor-default"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function Stack() {
  const t = useTranslations('stack')
  const containerRef = useRef<HTMLElement>(null)
  useGSAPReveal(containerRef, { stagger: 0.1, duration: 1.0, y: 50, start: 'top 88%' })

  const allSkills = CATEGORIES.flatMap((c) => c.skills)

  return (
    <section
      id="stack"
      ref={containerRef}
      className="section-pad relative overflow-hidden"
    >
      <div className="px-6 md:px-12 lg:px-20">
        {/* Section label */}
        <div className="flex items-center gap-4 mb-16 md:mb-20" data-reveal>
          <span className="font-mono text-xs text-accent tracking-widest uppercase">{t('section')}</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Headline */}
        <div className="mb-16 md:mb-20 max-w-[1600px]">
          <h2
            data-reveal-text
            className="font-black text-foreground leading-tight tracking-tighter"
            style={{ fontSize: 'clamp(2rem, 4.5vw, 4.5rem)' }}
          >
            {t('headline')}
          </h2>
        </div>

        {/* Categories grid — each card has its own tilt */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border mb-1 max-w-[1600px]">
          {CATEGORIES.map((cat, i) => (
            <CategoryCard key={cat.label} {...cat} index={i} />
          ))}
        </div>
      </div>

      {/* Marquee strips — full width, slightly different speeds */}
      <div className="mt-16 flex flex-col gap-4">
        <MarqueeStrip items={allSkills} speed={22} />
        <MarqueeStrip items={[...allSkills].reverse()} reverse speed={18} />
      </div>
    </section>
  )
}
