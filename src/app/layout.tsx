import type { Metadata } from 'next'

// Root layout — minimal shell, locale-specific layout handles html/body.
// metadataBase is set here so Next.js resolves relative OG / Twitter
// image URLs in ALL nested layouts (including /[locale]).
export const metadata: Metadata = {
  metadataBase: new URL('https://jeromedelodder.com'),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children
}
