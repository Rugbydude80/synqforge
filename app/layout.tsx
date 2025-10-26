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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const savedTheme = localStorage.getItem('theme') || 'dark';
                const root = document.documentElement;
                
                if (savedTheme === 'dark') {
                  root.classList.add('dark');
                } else if (savedTheme === 'light') {
                  root.classList.remove('dark');
                } else {
                  // System theme
                  const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (isDarkMode) {
                    root.classList.add('dark');
                  } else {
                    root.classList.remove('dark');
                  }
                }
              })();
            `,
          }}
        />
      </head>
      <body className={cn(inter.className, 'min-h-screen bg-background antialiased')}>
        <Providers>
          {children}
        </Providers>
        <Toaster
          position="bottom-right"
          toastOptions={{
            className: 'bg-card border-border text-foreground',
          }}
        />
      </body>
    </html>
  )
}
