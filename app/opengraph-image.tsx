import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'HireGenAI - AI-Powered Recruitment'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #03110A 0%, #071A0E 50%, #03110A 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Green radial glow */}
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '800px',
            height: '500px',
            background: 'radial-gradient(ellipse, rgba(0,177,79,0.25) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />

        {/* Logo icon */}
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '18px',
            background: 'linear-gradient(135deg, #00B14F, #008F3E, #06B6D4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px',
          }}
        >
          <svg width="48" height="48" viewBox="0 0 180 180" fill="none">
            <path d="M105 30L55 100H90L75 150L130 75H95L105 30Z" fill="white" />
          </svg>
        </div>

        {/* Wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
          <span style={{ fontSize: '56px', fontWeight: 900, color: '#ffffff', letterSpacing: '-2px' }}>
            Hire
          </span>
          <span
            style={{
              fontSize: '56px',
              fontWeight: 900,
              letterSpacing: '-2px',
              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            GenAI
          </span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: '28px',
            fontWeight: 700,
            color: '#ffffff',
            textAlign: 'center',
            marginBottom: '12px',
            letterSpacing: '-0.5px',
          }}
        >
          Hire Smarter. 10× Faster with AI.
        </div>

        <div
          style={{
            fontSize: '18px',
            color: 'rgba(248,250,252,0.6)',
            textAlign: 'center',
            maxWidth: '700px',
          }}
        >
          Automate CV screening · AI video interviews · Candidate scoring
        </div>

        {/* Badge */}
        <div
          style={{
            marginTop: '32px',
            background: 'rgba(0,177,79,0.15)',
            border: '1px solid rgba(0,177,79,0.4)',
            borderRadius: '100px',
            padding: '8px 24px',
            fontSize: '16px',
            fontWeight: 600,
            color: '#4ade80',
          }}
        >
          ⚡ Join 50+ companies already using HireGenAI
        </div>
      </div>
    ),
    { ...size }
  )
}
