'use client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h1>Something went wrong!</h1>
          <p>{error.message || 'An unexpected error occurred'}</p>
          <button onClick={() => reset()}>Try again</button>
        </div>
      </body>
    </html>
  )
}
