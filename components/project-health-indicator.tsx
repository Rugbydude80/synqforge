'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProjectHealthProps {
  completionRate: number // 0-100
  velocityTrend: 'up' | 'down' | 'stable' // Based on story completion rate
  blockedCount: number
  overdueCount: number
  activeSprintProgress?: number
  className?: string
}

export function ProjectHealthIndicator({
  completionRate,
  velocityTrend,
  blockedCount,
  overdueCount,
  activeSprintProgress,
  className,
}: ProjectHealthProps) {
  // Calculate overall health score
  const healthScore = React.useMemo(() => {
    let score = completionRate
    
    // Deduct for blockers and overdue
    score -= blockedCount * 5
    score -= overdueCount * 3
    
    // Bonus for good velocity
    if (velocityTrend === 'up') score += 10
    if (velocityTrend === 'down') score -= 10
    
    return Math.max(0, Math.min(100, score))
  }, [completionRate, velocityTrend, blockedCount, overdueCount])

  const getHealthStatus = (score: number) => {
    if (score >= 80) return { label: 'Excellent', color: 'text-green-400', bg: 'bg-green-500/10', icon: CheckCircle2 }
    if (score >= 60) return { label: 'Good', color: 'text-blue-400', bg: 'bg-blue-500/10', icon: TrendingUp }
    if (score >= 40) return { label: 'Fair', color: 'text-yellow-400', bg: 'bg-yellow-500/10', icon: Activity }
    return { label: 'Needs Attention', color: 'text-red-400', bg: 'bg-red-500/10', icon: AlertTriangle }
  }

  const health = getHealthStatus(healthScore)

  return (
    <Card className={cn('border-purple-500/20', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span>Project Health</span>
          <Badge className={cn('gap-1', health.bg, health.color)}>
            <health.icon className="h-3 w-3" />
            {health.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Health Score */}
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Overall Score</span>
            <span className="font-medium">{healthScore}/100</span>
          </div>
          <Progress value={healthScore} className="h-2" />
        </div>

        {/* Completion Rate */}
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Completion Rate</span>
            <span className="font-medium">{completionRate}%</span>
          </div>
          <Progress value={completionRate} className="h-2" />
        </div>

        {/* Sprint Progress (if active sprint) */}
        {activeSprintProgress !== undefined && (
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Sprint Progress</span>
              <span className="font-medium">{activeSprintProgress}%</span>
            </div>
            <Progress value={activeSprintProgress} className="h-2" />
          </div>
        )}

        {/* Velocity Trend */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Velocity</span>
          <div className="flex items-center gap-1">
            {velocityTrend === 'up' && (
              <>
                <TrendingUp className="h-4 w-4 text-green-400" />
                <span className="text-green-400 font-medium">Trending Up</span>
              </>
            )}
            {velocityTrend === 'down' && (
              <>
                <TrendingDown className="h-4 w-4 text-red-400" />
                <span className="text-red-400 font-medium">Trending Down</span>
              </>
            )}
            {velocityTrend === 'stable' && (
              <>
                <Activity className="h-4 w-4 text-blue-400" />
                <span className="text-blue-400 font-medium">Stable</span>
              </>
            )}
          </div>
        </div>

        {/* Issues */}
        {(blockedCount > 0 || overdueCount > 0) && (
          <div className="pt-3 border-t space-y-2">
            {blockedCount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Blocked Stories</span>
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {blockedCount}
                </Badge>
              </div>
            )}
            {overdueCount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Overdue</span>
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {overdueCount}
                </Badge>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

