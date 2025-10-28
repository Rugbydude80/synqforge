import { ImageResponse } from 'next/og'

// App icon metadata
export const size = {
  width: 512,
  height: 512,
}

export const contentType = 'image/png'

// Generate app icon
export default function Icon() {
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
          borderRadius: '100px',
        }}
      >
        {/* Lightning bolt icon */}
        <svg
          width="340"
          height="340"
          viewBox="0 0 340 340"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M 240 80 L 160 180 L 190 180 L 120 260 L 210 160 L 180 160 Z"
            fill="white"
            stroke="white"
            strokeWidth="12"
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


