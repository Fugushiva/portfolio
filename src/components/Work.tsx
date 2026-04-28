'use client'

import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import { useTranslations } from 'next-intl'

const PROJECT_STACKS = [
  ['n8n', 'Claude AI', 'Supabase', 'Slack API', 'HubSpot'],
  ['Next.js', 'TypeScript', 'Prisma', 'PostgreSQL', 'Clerk', 'Tailwind'],
  ['Claude API', 'TypeScript', 'Zod', 'Node.js'],
  ['Next.js', 'Framer Motion', 'Supabase', 'Vercel', 'SendGrid'],
]

const PROJECT_ACCENT_COLORS = ['#7c3aed', '#a78bfa', '#6d28d9', '#8b5cf6']
const PROJECT_INDICES = ['01', '02', '03', '04']

function ProjectRow({
  index,
  title,
  category,
  description,
  impact,
  stack,
  accentColor,
  stackLabel,
  isOpen,
  onToggle,
}: {
  index: string
  title: string
  category: string
  description: string
  impact: string
  stack: string[]
  accentColor: string
  stackLabel: string
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <div className="border-t border-border group" data-reveal>
      <button
        onClick={onToggle}
        data-magnetic
        className="w-full text-left flex items-start md:items-center gap-4 md:gap-8 py-6 md:py-8 transition-all duration-300 hover:pl-2"
        aria-expanded={isOpen}
      >
        {/* Index */}
        <span className="font-mono text-xs text-muted shrink-0 pt-1 md:pt-0">{index}</span>

        {/* Title + category */}
        <div className="flex-1 flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
          <h3
            className="font-black text-foreground leading-tight tracking-tighter transition-colors duration-300 group-hover:text-accent"
            style={{ fontSize: 'clamp(1.5rem, 3.5vw, 3rem)' }}
          >
            {title}
          </h3>
          <span className="font-mono text-xs text-muted uppercase tracking-wider border border-border rounded-full px-3 py-1 w-fit">
            {category}
          </span>
        </div>

        {/* Arrow */}
        <motion.div
          className="shrink-0 w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted group-hover:border-accent group-hover:text-accent transition-colors duration-300"
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.3, ease: [0.19, 1, 0.22, 1] }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </motion.div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
            className="overflow-hidden"
          >
            <div className="pb-10 pl-0 md:pl-16 grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Description */}
              <div className="md:col-span-2">
                <p className="text-muted text-base leading-relaxed mb-6">{description}</p>
                {/* Impact badge */}
                <div
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-mono"
                  style={{
                    background: `${accentColor}15`,
                    border: `1px solid ${accentColor}40`,
                    color: accentColor,
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: accentColor }} />
                  {impact}
                </div>
              </div>

              {/* Stack */}
              <div>
                <p className="font-mono text-xs text-muted uppercase tracking-wider mb-4">{stackLabel}</p>
                <div className="flex flex-wrap gap-2">
                  {stack.map((tech) => (
                    <span
                      key={tech}
                      className="font-mono text-xs text-foreground/70 border border-border rounded px-2 py-1"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Work() {
  const t = useTranslations('work')
  const projects = t.raw('projects') as Array<{
    title: string
    category: string
    description: string
    impact: string
  }>

  const containerRef = useRef<HTMLElement>(null)
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  useScrollReveal(containerRef, { stagger: 0.06 })

  return (
    <section
      id="work"
      ref={containerRef}
      className="section-pad px-6 md:px-12 lg:px-20 relative"
    >
      {/* Section label */}
      <div className="flex items-center gap-4 mb-16 md:mb-20" data-reveal>
        <span className="font-mono text-xs text-accent tracking-widest uppercase">{t('section')}</span>
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
          <ProjectRow
            key={PROJECT_INDICES[i]}
            index={PROJECT_INDICES[i]}
            title={project.title}
            category={project.category}
            description={project.description}
            impact={project.impact}
            stack={PROJECT_STACKS[i]}
            accentColor={PROJECT_ACCENT_COLORS[i]}
            stackLabel={t('stackLabel')}
            isOpen={openIndex === i}
            onToggle={() => setOpenIndex(openIndex === i ? null : i)}
          />
        ))}
        {/* Bottom border */}
        <div className="border-t border-border" />
      </div>
    </section>
  )
}
