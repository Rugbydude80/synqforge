'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle2, XCircle, TrendingUp } from 'lucide-react'

interface UsageData {
  tier: string
  currentUsage: number
  softLimit: number
  hardLimit: number
  totalCalls: number
  avgLatency: number
  cacheHitRate: number
  usagePercentage: string
}

export function UsageDashboard() {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchUsage()
  }, [])

  const fetchUsage = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/ai/generate-story-haiku')
      const data = await response.json()

      if (response.ok) {
        setUsage(data.usage)
      } else {
        setError(data.error || 'Failed to fetch usage')
      }
    } catch (err) {
      console.error('Error fetching usage:', err)
      setError('Failed to load usage data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Usage</CardTitle>
          <CardDescription>Loading usage data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !usage) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error || 'No usage data available'}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const usagePct = parseFloat(usage.usagePercentage)
  const isNearSoftLimit = usagePct >= 80
  const isOverSoftLimit = usage.currentUsage >= usage.softLimit
  const isNearHardLimit = usagePct >= 95

  return (
    <div className="space-y-6">
      {/* Usage Alert */}
      {isNearHardLimit && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Critical: Approaching Hard Limit</AlertTitle>
          <AlertDescription>
            You've used {usagePct}% of your monthly AI token allowance. Further requests will be blocked when you
            reach {usage.hardLimit.toLocaleString()} tokens. Consider upgrading your plan.
          </AlertDescription>
        </Alert>
      )}

      {isOverSoftLimit && !isNearHardLimit && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Soft Limit Exceeded</AlertTitle>
          <AlertDescription>
            You've exceeded the soft limit ({usage.softLimit.toLocaleString()} tokens). AI responses are now
            throttled to preserve your remaining quota. Upgrade for more capacity.
          </AlertDescription>
        </Alert>
      )}

      {isNearSoftLimit && !isOverSoftLimit && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Approaching Soft Limit</AlertTitle>
          <AlertDescription>
            You've used {usagePct}% of your soft limit. Consider upgrading to avoid throttling.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Usage Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>AI Token Usage</CardTitle>
              <CardDescription>
                Current plan: <Badge variant="outline">{usage.tier.toUpperCase()}</Badge>
              </CardDescription>
            </div>
            {!isOverSoftLimit && (
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Tokens Used</span>
                <span className="font-medium">
                  {usage.currentUsage.toLocaleString()} / {usage.hardLimit.toLocaleString()}
                </span>
              </div>
              <Progress
                value={usagePct}
                className={
                  isNearHardLimit
                    ? 'bg-red-100'
                    : isOverSoftLimit
                    ? 'bg-orange-100'
                    : isNearSoftLimit
                    ? 'bg-yellow-100'
                    : ''
                }
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Soft limit: {usage.softLimit.toLocaleString()}</span>
                <span>{usagePct}% used</span>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total API Calls</p>
                <p className="text-2xl font-bold">{usage.totalCalls.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Latency</p>
                <p className="text-2xl font-bold">{usage.avgLatency}ms</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Cache Hit Rate</p>
                <p className="text-2xl font-bold">{usage.cacheHitRate}%</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Model</p>
                <p className="text-sm font-semibold mt-2">Claude 4.5 Haiku</p>
              </div>
            </div>

            {/* Upgrade Prompt */}
            {isNearSoftLimit && (
              <div className="pt-4 border-t">
                <div className="flex items-start gap-2">
                  <TrendingUp className="h-4 w-4 text-primary mt-1" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Need more capacity?</p>
                    <p className="text-sm text-muted-foreground">
                      Upgrade to get higher token limits and faster responses.
                    </p>
                    <a
                      href="/settings/billing"
                      className="text-sm text-primary hover:underline mt-1 inline-block"
                    >
                      View plans →
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Understanding Your Usage</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• 1 AI credit = 1 token (input or output)</p>
          <p>• Soft limit: Responses get throttled to preserve quota</p>
          <p>• Hard limit: New AI requests blocked until monthly reset</p>
          <p>• Usage resets on the 1st of each month</p>
        </CardContent>
      </Card>
    </div>
  )
}
