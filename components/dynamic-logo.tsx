'use client'

import { useEffect, useState } from 'react'
import { Zap } from 'lucide-react'

interface DynamicLogoProps {
  className?: string
  showText?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function DynamicLogo({ className = '', showText = true, size = 'md' }: DynamicLogoProps) {
  const [colorScheme, setColorScheme] = useState<string>('Purple & Emerald')

  useEffect(() => {
    // Load color scheme from localStorage
    const savedColorScheme = localStorage.getItem('colorScheme') || 'Purple & Emerald'
    setColorScheme(savedColorScheme)

    // Listen for changes to color scheme
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'colorScheme' && e.newValue) {
        setColorScheme(e.newValue)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const getColors = () => {
    switch (colorScheme) {
      case 'Blue & Orange':
        return {
          primary: 'from-blue-500 to-blue-600',
          secondary: 'from-orange-500 to-orange-600',
          text: 'from-blue-500 via-blue-600 to-orange-500'
        }
      case 'Green & Teal':
        return {
          primary: 'from-green-500 to-green-600',
          secondary: 'from-teal-500 to-teal-600',
          text: 'from-green-500 via-green-600 to-teal-500'
        }
      case 'Purple & Emerald':
      default:
        return {
          primary: 'from-brand-purple-500 to-brand-purple-600',
          secondary: 'from-brand-emerald-500 to-brand-emerald-600',
          text: 'from-brand-purple-500 via-brand-purple-600 to-brand-emerald-500'
        }
    }
  }

  const colors = getColors()

  const sizeClasses = {
    sm: { icon: 'h-4 w-4', container: 'h-6 w-6', text: 'text-base' },
    md: { icon: 'h-5 w-5', container: 'h-8 w-8', text: 'text-xl' },
    lg: { icon: 'h-6 w-6', container: 'h-10 w-10', text: 'text-2xl' }
  }

  const sizes = sizeClasses[size]

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`flex items-center justify-center rounded-lg bg-gradient-to-br ${colors.primary} ${sizes.container}`}>
        <Zap className={`${sizes.icon} text-white`} />
      </div>
      {showText && (
        <span className={`${sizes.text} font-bold bg-gradient-to-r ${colors.text} bg-clip-text text-transparent`}>
          SynqForge
        </span>
      )}
    </div>
  )
}

