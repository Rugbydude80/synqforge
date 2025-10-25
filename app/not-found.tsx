import Link from 'next/link'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const dynamicParams = true

export default function NotFound() {
  return (
    <html>
      <body>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h1>404 - Page Not Found</h1>
          <p>The page you are looking for does not exist.</p>
          <Link href="/">Go Home</Link>
        </div>
      </body>
    </html>
  )
}
