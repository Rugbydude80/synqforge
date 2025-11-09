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
          src="https://js-eu1.hsforms.net/forms/embed/147228857.js"
          defer
        />
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
              
              // Suppress browser extension errors
              (function() {
                const originalError = console.error;
                console.error = function(...args) {
                  const message = args.join(' ');
                  if (
                    message.includes('disconnected port object') ||
                    message.includes('Extension context invalidated') ||
                    message.includes('MessagePort closed') ||
                    message.includes('proxy.js') ||
                    message.includes('backendManager.js')
                  ) {
                    // Silently ignore browser extension errors
                    return;
                  }
                  originalError.apply(console, args);
                };
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
