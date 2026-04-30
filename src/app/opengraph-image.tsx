import { ImageResponse } from 'next/og'

export const alt = 'Jerome Delodder — Freelance Fullstack Developer & Prompt Engineer'
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

        {/* Availability badge */}
        <div
          style={{
            position: 'absolute',
            top: '72px',
            right: '96px',
            background: '#1a1a1a',
            border: '1px solid #2a2a2a',
            borderRadius: '6px',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#22c55e',
            }}
          />
          <span
            style={{
              fontSize: '14px',
              color: '#888',
              letterSpacing: '0.5px',
            }}
          >
            Available for work
          </span>
        </div>

        {/* Name */}
        <div
          style={{
            fontSize: '64px',
            fontWeight: 700,
            color: '#f5f5f5',
            letterSpacing: '-1.5px',
            lineHeight: 1.1,
            marginBottom: '20px',
          }}
        >
          Jerome Delodder
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: '26px',
            fontWeight: 400,
            color: '#888888',
            lineHeight: 1.4,
            marginBottom: '40px',
          }}
        >
          Freelance Fullstack Developer · Prompt Engineer · n8n Automation
        </div>

        {/* Tags */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
          }}
        >
          {['Next.js', 'TypeScript', 'AI Agents', 'Remote · Europe'].map((tag) => (
            <div
              key={tag}
              style={{
                background: '#1a1a1a',
                border: '1px solid #2a2a2a',
                borderRadius: '4px',
                padding: '6px 14px',
                fontSize: '14px',
                color: '#666',
                letterSpacing: '0.3px',
              }}
            >
              {tag}
            </div>
          ))}
        </div>

        {/* Bottom URL */}
        <div
          style={{
            position: 'absolute',
            bottom: '80px',
            left: '96px',
            fontSize: '16px',
            color: '#333333',
            letterSpacing: '0.5px',
          }}
        >
          jeromedelodder.com
        </div>
      </div>
    ),
    { ...size },
  )
}
