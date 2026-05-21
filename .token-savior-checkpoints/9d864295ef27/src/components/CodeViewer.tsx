'use client'

import { useState, useCallback, useId, useRef } from 'react'
import { m, AnimatePresence } from 'framer-motion'

// ─── Token types for minimal syntax highlighting ─────────────────────────────

type Token = { type: 'keyword' | 'string' | 'comment' | 'number' | 'operator' | 'plain'; text: string }

function tokenizeLine(line: string, lang: 'js' | 'json'): Token[] {
  const tokens: Token[] = []

  if (lang === 'json') {
    // JSON tokenizer
    const jsonPattern = /("(?:[^"\\]|\\.)*")\s*:|(:\s*)("(?:[^"\\]|\\.)*")|(\btrue\b|\bfalse\b|\bnull\b)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|("(?:[^"\\]|\\.)*")|([{}[\],])|(\s+)|(\/\/.*$)|(\/\*[\s\S]*?\*\/)/g
    let lastIndex = 0
    let match

    while ((match = jsonPattern.exec(line)) !== null) {
      if (match.index > lastIndex) {
        tokens.push({ type: 'plain', text: line.slice(lastIndex, match.index) })
      }

      if (match[1]) { // object key
        tokens.push({ type: 'operator', text: match[1] })
      } else if (match[2] && match[3]) { // colon + string value
        tokens.push({ type: 'plain', text: match[2] })
        tokens.push({ type: 'string', text: match[3] })
      } else if (match[4]) { // true / false / null
        tokens.push({ type: 'keyword', text: match[4] })
      } else if (match[5]) { // number
        tokens.push({ type: 'number', text: match[5] })
      } else if (match[6]) { // string
        tokens.push({ type: 'string', text: match[6] })
      } else if (match[7]) { // punctuation
        tokens.push({ type: 'operator', text: match[7] })
      } else if (match[8]) { // whitespace
        tokens.push({ type: 'plain', text: match[8] })
      } else if (match[9] || match[10]) { // comments
        tokens.push({ type: 'comment', text: match[9] || match[10] })
      } else {
        tokens.push({ type: 'plain', text: match[0] })
      }

      lastIndex = jsonPattern.lastIndex
    }

    if (lastIndex < line.length) {
      tokens.push({ type: 'plain', text: line.slice(lastIndex) })
    }
    return tokens
  }

  // JS tokenizer
  const jsPattern = /(\/\/.*$)|(\/\*[\s\S]*?\*\/)|(`(?:[^`\\]|\\.)*`)|("(?:[^"\\]|\\.)*")|('(?:[^'\\]|\\.)*')|\b(const|let|var|function|return|for|if|else|in|of|new|typeof|true|false|null|undefined|class|import|export|default|async|await)\b|(\b\d+(?:\.\d+)?\b)|(===|!==|=>|\.\.\.|\+\+|--|&&|\|\|)|([{}[\]().,;:?!])/g
  let lastIndex = 0
  let match

  while ((match = jsPattern.exec(line)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'plain', text: line.slice(lastIndex, match.index) })
    }

    if (match[1] || match[2]) {
      tokens.push({ type: 'comment', text: match[1] || match[2] })
    } else if (match[3] || match[4] || match[5]) {
      tokens.push({ type: 'string', text: match[3] || match[4] || match[5] })
    } else if (match[6]) {
      tokens.push({ type: 'keyword', text: match[6] })
    } else if (match[7]) {
      tokens.push({ type: 'number', text: match[7] })
    } else if (match[8]) {
      tokens.push({ type: 'operator', text: match[8] })
    } else if (match[9]) {
      tokens.push({ type: 'operator', text: match[9] })
    } else {
      tokens.push({ type: 'plain', text: match[0] })
    }

    lastIndex = jsPattern.lastIndex
  }

  if (lastIndex < line.length) {
    tokens.push({ type: 'plain', text: line.slice(lastIndex) })
  }
  return tokens
}

const TOKEN_COLORS: Record<Token['type'], string> = {
  keyword: '#a78bfa',   // accent-light purple
  string: '#34d399',    // emerald
  comment: '#4b5563',   // gray-600
  number: '#fb923c',    // orange
  operator: '#94a3b8',  // slate
  plain: '#f5f5f0',     // foreground
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface CodeFile {
  filename: string
  language: 'js' | 'json'
  content: string
  description?: string
}

interface CodeViewerProps {
  files: CodeFile[]
  accent?: string
  accentRgb?: string
  maxLines?: number
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CodeViewer({
  files,
  accent = '#7c3aed',
  accentRgb = '124,58,237',
  maxLines = 28,
}: CodeViewerProps) {
  const [activeTab, setActiveTab] = useState(0)
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)

  // Stable IDs for tab / tabpanel ARIA wiring.
  const idBase = useId()
  const tabId = (i: number) => `${idBase}-tab-${i}`
  const panelId = (i: number) => `${idBase}-tabpanel-${i}`
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])

  const activeFile = files[activeTab]
  const lines = activeFile.content.split('\n')
  const visibleLines = expanded ? lines : lines.slice(0, maxLines)
  const hasMore = lines.length > maxLines

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(activeFile.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [activeFile.content])

  // Roving-tabindex keyboard nav per WAI-ARIA Tabs pattern.
  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    let next = activeTab
    if (e.key === 'ArrowRight') next = (activeTab + 1) % files.length
    else if (e.key === 'ArrowLeft') next = (activeTab - 1 + files.length) % files.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = files.length - 1
    else return
    e.preventDefault()
    setActiveTab(next)
    tabRefs.current[next]?.focus()
  }

  return (
    <div
      className="relative rounded-2xl border border-border/60 overflow-hidden font-mono text-sm"
      style={{ background: '#0d0d0d' }}
    >
      {/* ── Top bar ── */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-border/40"
        style={{ background: 'rgba(255,255,255,0.02)' }}
      >
        {/* Traffic light dots — decorative window chrome */}
        <div className="flex items-center gap-1.5 mr-6" aria-hidden="true">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <div className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Source files"
          aria-orientation="horizontal"
          className="flex items-center gap-1 flex-1 overflow-x-auto"
        >
          {files.map((f, i) => {
            const selected = activeTab === i
            return (
              <button
                key={f.filename}
                ref={(el) => { tabRefs.current[i] = el }}
                type="button"
                role="tab"
                id={tabId(i)}
                aria-selected={selected}
                aria-controls={panelId(i)}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveTab(i)}
                onKeyDown={handleTabKeyDown}
                className="relative px-3 py-1.5 text-[0.68rem] transition-colors duration-200 whitespace-nowrap rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                style={{
                  color: selected ? accent : '#6b6b6b',
                  background: selected ? `rgba(${accentRgb},0.1)` : 'transparent',
                }}
              >
                {f.filename}
                {selected && (
                  <m.div
                    layoutId="tab-indicator"
                    className="absolute bottom-0 left-3 right-3 h-px"
                    style={{ background: accent }}
                    aria-hidden="true"
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* Copy button */}
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? `Copied ${activeFile.filename}` : `Copy ${activeFile.filename} to clipboard`}
          className="ml-4 flex items-center gap-1.5 text-[0.68rem] text-muted hover:text-foreground transition-colors duration-200 px-2 py-1 rounded border border-border/40 hover:border-border whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <AnimatePresence mode="wait" initial={false}>
            {copied ? (
              <m.span
                key="copied"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                style={{ color: accent }}
              >
                ✓ Copied
              </m.span>
            ) : (
              <m.span
                key="copy"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
              >
                Copy
              </m.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* ── Tabpanel: file description + code body ──
          No tabIndex={0} needed: the panel contains its own focusable elements
          (copy button + expand button), satisfying WAI-ARIA tab pattern. */}
      <div
        role="tabpanel"
        id={panelId(activeTab)}
        aria-labelledby={tabId(activeTab)}
      >
        {activeFile.description && (
          <div
            className="px-5 py-2.5 text-[0.68rem] text-muted/70 border-b border-border/20 leading-snug"
            style={{ background: 'rgba(255,255,255,0.01)' }}
          >
            {activeFile.description}
          </div>
        )}

        {/* ── Code body ── */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: '100%' }}>
          <tbody>
            {visibleLines.map((line, lineIdx) => {
              const tokens = tokenizeLine(line, activeFile.language)
              return (
                <tr key={lineIdx} className="group hover:bg-white/[0.02] transition-colors duration-100">
                  {/* Line number */}
                  <td
                    className="select-none text-right pr-4 pl-4 text-[0.68rem] leading-6 w-10 align-top"
                    style={{ color: '#3f3f46' }}
                  >
                    {lineIdx + 1}
                  </td>
                  {/* Code */}
                  <td className="pr-6 text-[0.75rem] leading-6 whitespace-pre align-top">
                    {tokens.length === 0 ? (
                      <span>&nbsp;</span>
                    ) : (
                      tokens.map((tok, ti) => (
                        <span key={ti} style={{ color: TOKEN_COLORS[tok.type] }}>
                          {tok.text || ' '}
                        </span>
                      ))
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

        {/* ── Expand / collapse ── */}
        {hasMore && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            className="w-full flex items-center justify-center gap-2 py-3 text-[0.7rem] text-muted hover:text-foreground transition-all duration-300 border-t border-border/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
            style={{ background: 'rgba(255,255,255,0.02)' }}
          >
            <m.svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.3 }}
              aria-hidden="true"
            >
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </m.svg>
            {expanded
              ? `Collapse (${lines.length} lines)`
              : `Show all ${lines.length} lines`}
          </button>
        )}
      </div>
    </div>
  )
}
