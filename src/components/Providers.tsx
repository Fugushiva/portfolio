'use client'

import { LazyMotion, domMax } from 'framer-motion'
import { useLenis } from '@/hooks/useLenis'
import { useMagneticCursor } from '@/hooks/useMagneticCursor'

// Wrapping the tree in LazyMotion + using <m.*> instead of <motion.*>
// downloads framer-motion's animation engine in a lazy-loaded chunk
// rather than the main bundle. We use domMax (not domAnimation) because
// we rely on layoutId in Work / CodeViewer.
//
// strict mode forces every consumer to use <m.*> — typos that fall back
// to <motion.*> would silently re-import the full bundle.
export default function Providers({ children }: { children: React.ReactNode }) {
  useLenis()
  useMagneticCursor()

  return (
    <LazyMotion features={domMax} strict>
      {children}
    </LazyMotion>
  )
}
