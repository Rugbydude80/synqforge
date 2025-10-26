'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'

interface SprintHealth {
  sprintId: string
  sprintName: string
  status: string
  plannedPoints: number
  completedPoints: number
  remainingPoints: number
  completionPercentage: number
  daysElapsed: number
  daysRemaining: number
  totalDays: number
  idealBurnRate: number
  actualBurnRate: number
  healthStatus: 'on_track' | 'at_risk' | 'behind'
  scopeChanges: number
}

interface SprintHealthWidgetProps {
  sprintId: string
}

export function SprintHealthWidget({ sprintId }: SprintHealthWidgetProps) {
  const [health, setHealth] = useState<SprintHealth | null>(null)
  const [loading, setLoading] = useState(true)

  const loadSprintHealth = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/analytics/sprint-health?sprintId=${sprintId}`)
      if (!res.ok) throw new Error('Failed to load sprint health')
      const data = await res.json()
      setHealth(data)
    } catch {
      toast.error('Failed to load sprint health')
    } finally {
      setLoading(false)
    }
  }, [sprintId])

  useEffect(() => {
    loadSprintHealth()
  }, [loadSprintHealth])

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </Card>
    )
  }

  if (!health) {
    return null
  }

  const getHealthColor = () => {
    switch (health.healthStatus) {
      case 'on_track':
        return 'text-green-600 bg-green-50'
      case 'at_risk':
        return 'text-yellow-600 bg-yellow-50'
      case 'behind':
        return 'text-red-600 bg-red-50'
    }
  }

  const getHealthIcon = () => {
    switch (health.healthStatus) {
      case 'on_track':
        return <CheckCircle className="h-5 w-5" />
      case 'at_risk':
        return <AlertTriangle className="h-5 w-5" />
      case 'behind':
        return <AlertTriangle className="h-5 w-5" />
    }
  }

  const getHealthLabel = () => {
    switch (health.healthStatus) {
      case 'on_track':
        return 'On Track'
      case 'at_risk':
        return 'At Risk'
      case 'behind':
        return 'Behind Schedule'
    }
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Sprint Health</h3>
        <Badge className={getHealthColor()}>
          <span className="flex items-center gap-1">
            {getHealthIcon()}
            {getHealthLabel()}
          </span>
        </Badge>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Progress</span>
          <span className="text-sm font-semibold">
            {health.completionPercentage}%
          </span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all"
            style={{ width: `${health.completionPercentage}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
          <span>{health.completedPoints} completed</span>
          <span>{health.remainingPoints} remaining</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-xs text-gray-500 mb-1">Days Elapsed</div>
          <div className="text-xl font-bold">
            {health.daysElapsed} / {health.totalDays}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Days Remaining</div>
          <div className="text-xl font-bold">{health.daysRemaining}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Ideal Burn Rate</div>
          <div className="text-xl font-bold">
            {health.idealBurnRate.toFixed(1)} pts/day
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Actual Burn Rate</div>
          <div className="text-xl font-bold flex items-center gap-1">
            {health.actualBurnRate.toFixed(1)} pts/day
            {health.actualBurnRate > health.idealBurnRate && (
              <TrendingUp className="h-4 w-4 text-green-600" />
            )}
          </div>
        </div>
      </div>

      {/* Scope Changes Alert */}
      {health.scopeChanges > 0 && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
          <div className="flex items-center gap-2 text-yellow-800">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-semibold">Scope Changes Detected</span>
          </div>
          <p className="text-yellow-700 mt-1">
            {health.scopeChanges} story points added since sprint start
          </p>
        </div>
      )}

      {/* Health Insights */}
      <div className="mt-4 pt-4 border-t text-sm">
        {health.healthStatus === 'on_track' && (
          <p className="text-green-700">
            🎯 Great work! Team is on track to complete the sprint on schedule.
          </p>
        )}
        {health.healthStatus === 'at_risk' && (
          <p className="text-yellow-700">
            ⚠️ Sprint is slightly behind. Consider removing lower-priority stories.
          </p>
        )}
        {health.healthStatus === 'behind' && (
          <p className="text-red-700">
            🚨 Sprint is significantly behind schedule. Action needed: reduce scope
            or extend timeline.
          </p>
        )}
      </div>
    </Card>
  )
}
