'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

interface SynqForgeLogoProps {
  className?: string
  showText?: boolean
  size?: 'sm' | 'md' | 'lg'
  width?: number
  height?: number
}

/**
 * SynqForge Logo Component
 * 
 * Displays the SynqForge logo with automatic theme switching.
 * Shows the light version on light backgrounds and dark version on dark backgrounds.
 * 
 * @param className - Additional CSS classes
 * @param showText - Whether to show full logo with text (true) or just icon (false)
 * @param size - Preset size (sm, md, lg) - only used when showText is false
 * @param width - Custom width (overrides size preset)
 * @param height - Custom height (overrides size preset)
 */
export function SynqForgeLogo({ 
  className = '', 
  showText = true, 
  size = 'md',
  width,
  height 
}: SynqForgeLogoProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    // Detect initial theme
    const isDark = document.documentElement.classList.contains('dark')
    setTheme(isDark ? 'dark' : 'light')

    // Watch for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          const isDark = document.documentElement.classList.contains('dark')
          setTheme(isDark ? 'dark' : 'light')
        }
      })
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })

    return () => observer.disconnect()
  }, [])

  // Size presets for icon-only mode
  const sizePresets = {
    sm: { width: 32, height: 32 },
    md: { width: 40, height: 40 },
    lg: { width: 48, height: 48 }
  }

  // Determine dimensions
  const dimensions = showText 
    ? { width: width || 240, height: height || 60 }
    : { width: width || sizePresets[size].width, height: height || sizePresets[size].height }

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return <div style={{ width: dimensions.width, height: dimensions.height }} className={className} />
  }

  const logoSrc = theme === 'dark' ? '/logo-dark.svg' : '/logo-light.svg'

  return (
    <div className={`flex items-center ${className}`}>
      <Image
        src={logoSrc}
        alt="SynqForge"
        width={dimensions.width}
        height={dimensions.height}
        priority
        className="object-contain"
        style={{
          maxWidth: '100%',
          height: 'auto'
        }}
      />
    </div>
  )
}

