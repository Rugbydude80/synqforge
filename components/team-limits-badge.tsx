'use client'

import { useState, useEffect } from 'react'
import { Users, Crown, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TeamLimits {
  currentCount: number
  maxUsers: number
  remainingSlots: number | typeof Infinity
  canAddMore: boolean
  subscriptionTier: string
  upgradeRequired: boolean
}

export function TeamLimitsBadge() {
  const [limits, setLimits] = useState<TeamLimits | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLimits()
  }, [])

  const fetchLimits = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/team/limits')
      if (response.ok) {
        const data = await response.json()
        setLimits(data)
      }
    } catch (error) {
      console.error('Error fetching limits:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !limits) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg animate-pulse">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    )
  }

  const percentage = limits.maxUsers === Infinity
    ? 0
    : (limits.currentCount / limits.maxUsers) * 100

  const isNearLimit = percentage >= 80 && percentage < 100
  const isAtLimit = !limits.canAddMore

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">
          {limits.currentCount} {limits.maxUsers !== Infinity && `/ ${limits.maxUsers}`}
        </span>
        <span className="text-xs text-muted-foreground">
          {limits.maxUsers === Infinity ? 'Unlimited' : 'users'}
        </span>
      </div>

      {isNearLimit && (
        <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
          <AlertCircle className="h-4 w-4" />
          <span className="text-xs font-medium">
            {limits.remainingSlots} {limits.remainingSlots === 1 ? 'slot' : 'slots'} left
          </span>
        </div>
      )}

      {isAtLimit && (
        <Button
          size="sm"
          variant="default"
          onClick={() => window.location.href = '/pricing'}
          className="bg-gradient-primary hover:opacity-90"
        >
          <Crown className="h-3 w-3 mr-1.5" />
          Upgrade Plan
        </Button>
      )}
    </div>
  )
}
