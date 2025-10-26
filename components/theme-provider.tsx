'use client'

import { useEffect } from 'react'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Apply theme on mount
    const applyTheme = () => {
      const savedTheme = localStorage.getItem('theme') || 'dark'
      const root = document.documentElement

      if (savedTheme === 'dark') {
        root.classList.add('dark')
      } else if (savedTheme === 'light') {
        root.classList.remove('dark')
      } else {
        // System theme
        const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches
        if (isDarkMode) {
          root.classList.add('dark')
        } else {
          root.classList.remove('dark')
        }
      }
    }

    applyTheme()

    // Listen for system theme changes if using system theme
    const savedTheme = localStorage.getItem('theme') || 'dark'
    if (savedTheme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => applyTheme()
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  return <>{children}</>
}
