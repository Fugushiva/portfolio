'use client'

import { useState, useEffect } from 'react'
import { useLenis } from '@/hooks/useLenis'
import { useMagneticCursor } from '@/hooks/useMagneticCursor'

export default function Providers({ children }: { children: React.ReactNode }) {
  useLenis()
  useMagneticCursor()

  return <>{children}</>
}
