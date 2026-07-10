import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 7,
          background: 'linear-gradient(135deg, #00B14F 0%, #008F3E 50%, #06B6D4 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* HireGenAI lightning bolt */}
        <svg viewBox="0 0 180 180" width="22" height="22">
          <path d="M105 30L55 100H90L75 150L130 75H95L105 30Z" fill="white" />
        </svg>
      </div>
    ),
    { width: 32, height: 32 }
  )
}
