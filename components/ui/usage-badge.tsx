'use client'

/**
 * Usage Badge Component
 * Shows AI token usage with visual indicators
 */

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Sparkles, AlertTriangle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface UsageBadgeProps {
  tokensUsed: number
  tokenPool: number
  className?: string
  showProgress?: boolean
  compact?: boolean
}

export function UsageBadge({
  tokensUsed,
  tokenPool,
  className,
  showProgress = false,
  compact = false,
}: UsageBadgeProps) {
  const [percentage, setPercentage] = useState(0)

  useEffect(() => {
    const pct = (tokensUsed / tokenPool) * 100
    setPercentage(Math.min(pct, 100))
  }, [tokensUsed, tokenPool])

  const getStatusColor = () => {
    if (percentage >= 100) return 'text-red-500'
    if (percentage >= 95) return 'text-red-500'
    if (percentage >= 80) return 'text-orange-500'
    if (percentage >= 50) return 'text-yellow-500'
    return 'text-green-500'
  }

  const getStatusIcon = () => {
    if (percentage >= 95) return AlertCircle
    if (percentage >= 80) return AlertTriangle
    return Sparkles
  }

  const getStatusMessage = () => {
    if (percentage >= 100) return 'Token pool exhausted'
    if (percentage >= 95) return 'Token pool nearly exhausted'
    if (percentage >= 80) return 'High token usage'
    if (percentage >= 50) return 'Moderate token usage'
    return 'Healthy token usage'
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(0)}k`
    return num.toString()
  }

  const Icon = getStatusIcon()

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={cn(
                'flex items-center gap-1.5 cursor-help',
                getStatusColor(),
                className
              )}
            >
              <Icon className="h-3 w-3" />
              <span className="font-mono text-xs">
                {formatNumber(tokensUsed)}/{formatNumber(tokenPool)}
              </span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-semibold">{getStatusMessage()}</p>
              <p className="text-xs">
                {tokensUsed.toLocaleString()} / {tokenPool.toLocaleString()} tokens used
              </p>
              <p className="text-xs text-muted-foreground">
                {percentage.toFixed(1)}% of monthly pool
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Icon className={cn('h-4 w-4', getStatusColor())} />
          <span className="font-medium">AI Token Usage</span>
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          {formatNumber(tokensUsed)} / {formatNumber(tokenPool)}
        </span>
      </div>

      {showProgress && (
        <div className="space-y-1">
          <Progress
            value={percentage}
            className={cn(
              'h-2',
              percentage >= 95 && 'bg-red-500',
              percentage >= 80 && percentage < 95 && 'bg-orange-500',
              percentage >= 50 && percentage < 80 && 'bg-yellow-500'
            )}
          />
          <p className="text-xs text-muted-foreground text-right">
            {percentage.toFixed(1)}% used
          </p>
        </div>
      )}

      {percentage >= 90 && (
        <div className="text-xs p-2 rounded-md bg-muted border">
          <p className="font-medium mb-1">
            {percentage >= 100 ? '🚫 Token pool exhausted' : '⚠️ Token pool running low'}
          </p>
          <p className="text-muted-foreground">
            {percentage >= 100
              ? 'Upgrade your plan or purchase additional tokens to continue using AI features.'
              : 'Consider upgrading your plan to get more tokens.'}
          </p>
        </div>
      )}
    </div>
  )
}

/**
 * Simple usage indicator (for header/navbar)
 */
export function UsageIndicator({
  tokensUsed,
  tokenPool,
}: {
  tokensUsed: number
  tokenPool: number
}) {
  const percentage = (tokensUsed / tokenPool) * 100

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border bg-card cursor-help">
            <div className="flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-purple-500" />
              <span className="text-xs font-medium">AI</span>
            </div>
            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all duration-300',
                  percentage >= 95 && 'bg-red-500',
                  percentage >= 80 && percentage < 95 && 'bg-orange-500',
                  percentage >= 50 && percentage < 80 && 'bg-yellow-500',
                  percentage < 50 && 'bg-green-500'
                )}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            {tokensUsed.toLocaleString()} / {tokenPool.toLocaleString()} tokens
          </p>
          <p className="text-xs text-muted-foreground">{percentage.toFixed(1)}% used</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
