import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: 38,
          background: 'linear-gradient(135deg, #00B14F 0%, #008F3E 50%, #06B6D4 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* HireGenAI lightning bolt */}
        <svg viewBox="0 0 180 180" width="120" height="120">
          <path d="M105 30L55 100H90L75 150L130 75H95L105 30Z" fill="white" />
        </svg>
      </div>
    ),
    { width: 180, height: 180 }
  )
}
