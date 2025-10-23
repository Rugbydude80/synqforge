import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils'
import { Providers } from './providers'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SynqForge — Turn Ideas into Sprint-Ready User Stories',
  description: 'AI that turns requirements into sprint-ready user stories with acceptance criteria and estimates. Export to Word, Excel, or PDF.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={cn(inter.className, 'min-h-screen bg-background antialiased')}>
        <Providers>
          {children}
        </Providers>
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'rgb(31 41 55)',
              border: '1px solid rgb(55 65 81)',
              color: '#fff',
            },
          }}
        />
      </body>
    </html>
  )
}
