// Root-level not-found — catches 404s that happen outside the [locale] segment
// (e.g. /unknown-path that doesn't match any locale).
// Needs its own html/body shell since the [locale] layout doesn't wrap it.

import { Geist, Geist_Mono } from 'next/font/google'
import NotFound from '@/components/NotFound'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'], display: 'swap' })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'], display: 'swap' })

export default function RootNotFound() {
  return (
    <html lang="fr">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <NotFound />
      </body>
    </html>
  )
}
