'use client'

// SiteShell — client island that owns the preloader → ready sequence.
//
// HYDRATION STRATEGY
// ──────────────────
// Next.js App Router SSR-renders 'use client' components on the server.
// Browser-only APIs (sessionStorage, matchMedia, WebGL, AnimatePresence)
// would run during SSR and produce markup that mismatches the client.
//
// useIsMounted() returns false on the server and on the first client render
// (before useEffect fires). SiteShell renders a stable, empty shell in both
// cases. After mount, React replaces it with the full interactive tree —
// no mismatch.
//
// IMPORTANT: All section components are imported statically. Next.js 15.5
// has a webpack bug where dynamically-imported chunks can lose their React
// module reference when the parent uses conditional rendering — exactly
// what useIsMounted does. Static imports avoid the issue and don't cost
// anything since all sections live on the same page anyway (Next.js still
// code-splits at the page level).

import { useCallback, useEffect, useState } from 'react'
import Providers from '@/components/Providers'
import Preloader from '@/components/Preloader'
import Nav from '@/components/Nav'
import Hero from '@/components/Hero'
import About from '@/components/About'
import Stack from '@/components/Stack'
import Work from '@/components/Work'
import Process from '@/components/Process'
import Contact from '@/components/Contact'
import PerfHUD from '@/components/PerfHUD'

export default function SiteShell() {
  const [mounted, setMounted]     = useState(false)
  const [siteReady, setSiteReady] = useState(false)

  // Only flip to true after the first client-side paint — guarantees that
  // server HTML and initial client HTML are identical (both render the
  // stable skeleton below), then React hydrates successfully before we
  // swap in the browser-only content.
  useEffect(() => {
    setMounted(true)
  }, [])

  const handlePreloaderComplete = useCallback(() => {
    setSiteReady(true)
  }, [])

  // ── Pre-mount: render a stable shell that matches SSR output exactly.
  if (!mounted) {
    return <div aria-hidden="true" suppressHydrationWarning />
  }

  // ── Post-mount: full interactive tree, safe to use all browser APIs.
  return (
    <Providers>
      <div className="grain-overlay" aria-hidden="true" />
      <div className="cursor"      aria-hidden="true" />
      <div className="cursor-ring" aria-hidden="true" />

      <Preloader onComplete={handlePreloaderComplete} />
      <Nav isReady={siteReady} />

      <main>
        <Hero    isReady={siteReady} />
        <About />
        <Stack />
        <Work />
        <Process />
        <Contact />
      </main>

      <PerfHUD />
    </Providers>
  )
}
