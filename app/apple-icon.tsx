import { ImageResponse } from 'next/og'

// Apple touch icon metadata
export const size = {
  width: 180,
  height: 180,
}

export const contentType = 'image/png'

// Generate Apple touch icon
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1A1D23',
        }}
      >
        {/* Lightning bolt icon */}
        <svg
          width="120"
          height="120"
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M 85 28 L 57 63 L 67 63 L 42 92 L 74 57 L 64 57 Z"
            fill="white"
            stroke="white"
            strokeWidth="4"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  )
}




