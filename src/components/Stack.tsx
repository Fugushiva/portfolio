'use client'

import { useRef } from 'react'
import { useGSAPReveal } from '@/hooks/useGSAPReveal'
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

// Marquee strip — pure CSS (no JS animation engine).
// The doubled list lets us translate from 0 → -50% seamlessly.
// Animation runs on the GPU via translate3d; pauses when off-screen
// thanks to content-visibility + animation-play-state media queries.
function MarqueeStrip({ items, reverse = false }: { items: string[]; reverse?: boolean }) {
  const doubled = [...items, ...items]
  return (
    <div className="overflow-hidden">
      <div
        className="flex gap-3 w-max marquee-track"
        style={{
          animationDuration: '18s',
          animationDirection: reverse ? 'reverse' : 'normal',
        }}
      >
        {doubled.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center px-4 py-2 rounded-full border border-border text-muted font-mono text-xs uppercase tracking-wider whitespace-nowrap hover:border-accent hover:text-accent transition-colors duration-200"
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

  // Flatten all skills for marquee
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

        {/* Categories grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border mb-1 max-w-[1600px]" data-reveal>
          {CATEGORIES.map(({ label, color, skills }) => (
            <div
              key={label}
              className="bg-bg p-6 md:p-8 group hover:bg-surface transition-colors duration-300"
            >
              {/* Category dot + label */}
              <div className="flex items-center gap-2 mb-6">
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="font-mono text-xs uppercase tracking-widest text-muted">
                  {label}
                </span>
              </div>

              {/* Skills list */}
              <ul className="flex flex-col gap-2">
                {skills.map((skill) => (
                  <li
                    key={skill}
                    className="font-sans text-sm text-foreground/80 flex items-center gap-2 group-hover:text-foreground transition-colors duration-300"
                  >
                    <span
                      className="w-1 h-1 rounded-full shrink-0"
                      style={{ backgroundColor: color, opacity: 0.7 }}
                    />
                    {skill}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Marquee strips — full width */}
      <div className="mt-16 flex flex-col gap-4">
        <MarqueeStrip items={allSkills} />
        <MarqueeStrip items={[...allSkills].reverse()} reverse />
      </div>
    </section>
  )
}
