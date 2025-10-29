/**
 * Action Limit Badge Component
 * 
 * Displays real-time AI action usage in a fixed bottom-right badge.
 * Features:
 * - Auto-refreshes every 30 seconds
 * - Shows percentage used with progress bar
 * - Warning state at 80% usage
 * - Critical state at 95% usage
 * - Displays rollover balance (Core/Pro)
 * - Upgrade prompt when near limit
 */

'use client'

import { useEffect, useState } from 'react'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Zap, TrendingUp } from 'lucide-react'
import Link from 'next/link'

interface UsageData {
  actionsUsed: number
  actionsLimit: number
  actionsRemaining: number
  rolloverBalance: number
  percentUsed: number
  isOverLimit: boolean
  isNearLimit: boolean
  isCritical: boolean
  plan: string
}

interface ActionLimitBadgeProps {
  organizationId: string
}

export function ActionLimitBadge({ organizationId }: ActionLimitBadgeProps) {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchUsage() {
      try {
        const res = await fetch(`/api/subscriptions/usage?organizationId=${organizationId}`)
        
        if (!res.ok) {
          throw new Error('Failed to fetch usage data')
        }
        
        const data = await res.json()
        setUsage(data)
        setError(null)
      } catch (err) {
        console.error('[ActionLimitBadge] Error fetching usage:', err)
        setError(err instanceof Error ? err.message : 'Failed to load usage')
      } finally {
        setLoading(false)
      }
    }

    // Initial fetch
    fetchUsage()
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchUsage, 30000)
    
    return () => clearInterval(interval)
  }, [organizationId])

  // Don't render if loading or error
  if (loading || error || !usage) {
    return null
  }

  // Determine variant based on usage
  const isWarning = usage.isNearLimit && !usage.isCritical
  const isCritical = usage.isCritical || usage.isOverLimit

  // Choose colors
  const badgeVariant = isCritical ? 'destructive' : isWarning ? 'default' : 'secondary'
  const progressColor = isCritical ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-green-500'

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-card rounded-lg shadow-lg border p-4 z-50">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          AI Actions
          <span className="text-xs text-muted-foreground uppercase">{usage.plan}</span>
        </span>
        <Badge variant={badgeVariant}>
          {usage.actionsUsed.toLocaleString()} / {usage.actionsLimit.toLocaleString()}
        </Badge>
      </div>
      
      {/* Progress Bar */}
      <div className="space-y-1 mb-3">
        <Progress 
          value={Math.min(usage.percentUsed, 100)} 
          className="h-2"
          indicatorClassName={progressColor}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{usage.percentUsed}% used</span>
          <span>{usage.actionsRemaining.toLocaleString()} remaining</span>
        </div>
      </div>
      
      {/* Rollover Balance (Core/Pro) */}
      {usage.rolloverBalance > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 bg-muted/50 rounded px-2 py-1.5">
          <TrendingUp className="h-3 w-3 text-green-600" />
          <span>
            +{usage.rolloverBalance.toLocaleString()} rollover actions included
          </span>
        </div>
      )}
      
      {/* Warning Messages */}
      {isCritical && (
        <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md">
          <div className="flex items-start gap-2 text-xs text-red-700 dark:text-red-400">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Action limit reached</p>
              <p className="mt-1 text-red-600 dark:text-red-500">
                Upgrade your plan to continue using AI features
              </p>
              <Link 
                href="/pricing"
                className="inline-block mt-2 text-xs font-medium underline hover:no-underline"
              >
                View upgrade options →
              </Link>
            </div>
          </div>
        </div>
      )}
      
      {isWarning && !isCritical && (
        <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
          <div className="flex items-start gap-2 text-xs text-yellow-700 dark:text-yellow-400">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Running low on actions</p>
              <p className="mt-1 text-yellow-600 dark:text-yellow-500">
                You've used {usage.percentUsed}% of your monthly limit
              </p>
              <Link 
                href="/pricing"
                className="inline-block mt-2 text-xs font-medium underline hover:no-underline"
              >
                Consider upgrading →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

