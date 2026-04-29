import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Jérôme Delodder — Prompt Engineer & Fullstack Developer'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: '#0a0a0a',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px 96px',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Top-left accent line */}
        <div
          style={{
            position: 'absolute',
            top: '80px',
            left: '96px',
            width: '40px',
            height: '2px',
            background: '#e5e5e5',
          }}
        />

        {/* Name */}
        <div
          style={{
            fontSize: '64px',
            fontWeight: 700,
            color: '#f5f5f5',
            letterSpacing: '-1.5px',
            lineHeight: 1.1,
            marginBottom: '24px',
          }}
        >
          Jérôme Delodder
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: '28px',
            fontWeight: 400,
            color: '#888888',
            letterSpacing: '0px',
            lineHeight: 1.4,
          }}
        >
          Prompt Engineer · Fullstack Developer · Automation
        </div>

        {/* Bottom URL */}
        <div
          style={{
            position: 'absolute',
            bottom: '80px',
            left: '96px',
            fontSize: '18px',
            color: '#444444',
            letterSpacing: '0.5px',
          }}
        >
          jerome-delodder.com
        </div>
      </div>
    ),
    { ...size },
  )
}
