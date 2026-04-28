'use client'

import { useState, useCallback } from 'react'
import Providers from '@/components/Providers'
import Preloader from '@/components/Preloader'
import Nav from '@/components/Nav'
import Hero from '@/components/Hero'
import About from '@/components/About'
import Stack from '@/components/Stack'
import Work from '@/components/Work'
import Process from '@/components/Process'
import Contact from '@/components/Contact'

export default function Home() {
  const [siteReady, setSiteReady] = useState(false)

  const handlePreloaderComplete = useCallback(() => {
    setSiteReady(true)
  }, [])

  return (
    <Providers>
      {/* Noise grain overlay */}
      <div className="grain-overlay" aria-hidden="true" />

      {/* Custom cursor — hidden on touch devices via CSS */}
      <div className="cursor" aria-hidden="true" />
      <div className="cursor-ring" aria-hidden="true" />

      {/* Preloader */}
      <Preloader onComplete={handlePreloaderComplete} />

      {/* Navigation */}
      <Nav isReady={siteReady} />

      {/* Main content */}
      <main>
        <Hero isReady={siteReady} />
        <About />
        <Stack />
        <Work />
        <Process />
        <Contact />
      </main>
    </Providers>
  )
}
