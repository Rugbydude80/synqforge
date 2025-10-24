'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { AlertCircle, Lock, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface StoryEditorProps {
  storyId: string
  initialData?: {
    title: string
    description: string
    status: string
    priority: string
    storyType: string
  }
  onSave?: (data: any) => void
}

export function StoryEditor({ storyId, initialData, onSave }: StoryEditorProps) {
  const { data: _session } = useSession()
  const [loading, setLoading] = useState(false)
  const [usageStats, setUsageStats] = useState<any>(null)

  // Form state
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    status: initialData?.status || 'backlog',
    priority: initialData?.priority || 'medium',
    storyType: initialData?.storyType || 'feature',
  })

  // Fetch usage stats on mount
  useEffect(() => {
    async function fetchUsage() {
      try {
        const response = await fetch(`/api/stories/${storyId}/usage`)
        if (response.ok) {
          const data = await response.json()
          setUsageStats(data)
        }
      } catch (error) {
        console.error('Failed to fetch usage stats:', error)
      }
    }

    if (storyId) {
      fetchUsage()
    }
  }, [storyId])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setLoading(true)

    try {
      const response = await fetch(`/api/stories/${storyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (!response.ok) {
        if (response.status === 429) {
          // Quota exceeded
          toast.error(result.error || 'Update quota exceeded', {
            description: result.upgradeRequired
              ? 'Upgrade your plan to continue updating stories'
              : 'You have reached your monthly update limit',
            action: result.upgradeRequired
              ? {
                  label: 'Upgrade',
                  onClick: () => (window.location.href = '/pricing'),
                }
              : undefined,
          })
          return
        }

        throw new Error(result.error || 'Failed to update story')
      }

      // Update usage stats
      if (result.usage) {
        setUsageStats(result.usage)
      }

      toast.success('Story updated successfully', {
        description: `Version ${result.updateVersion || 'unknown'}`,
      })

      if (onSave) {
        onSave(result)
      }
    } catch (error) {
      console.error('Error updating story:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update story')
    } finally {
      setLoading(false)
    }
  }

  // Calculate usage percentage
  const usagePercentage = usageStats
    ? (usageStats.currentMonthCount / (usageStats.limit || 1)) * 100
    : 0

  const isQuotaExceeded = usageStats?.allowed === false
  const isNearLimit = usagePercentage >= 80

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Edit Story</CardTitle>
        <CardDescription>
          Update story details and track changes
        </CardDescription>

        {/* Usage Stats */}
        {usageStats && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Monthly Updates: {usageStats.currentMonthCount} /{' '}
                {usageStats.limit || 'Unlimited'}
              </span>
              {usageStats.tier && (
                <Badge variant="secondary">{usageStats.tier}</Badge>
              )}
            </div>
            {usageStats.limit && (
              <Progress
                value={Math.min(usagePercentage, 100)}
                className={cn(
                  isQuotaExceeded && 'bg-red-500',
                  isNearLimit && !isQuotaExceeded && 'bg-yellow-500'
                )}
              />
            )}
            {isNearLimit && !isQuotaExceeded && (
              <div className="flex items-center gap-2 text-sm text-yellow-600">
                <AlertCircle className="h-4 w-4" />
                <span>Approaching update limit</span>
              </div>
            )}
          </div>
        )}

        {/* Quota Exceeded Warning */}
        {isQuotaExceeded && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <Lock className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-red-900 dark:text-red-100">
                  Update Quota Exceeded
                </h4>
                <p className="text-sm text-red-700 dark:text-red-200 mt-1">
                  You've reached your monthly limit of {usageStats.limit} story updates.
                  Upgrade your plan to continue.
                </p>
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={() => (window.location.href = '/pricing')}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  View Plans
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="Story title"
            disabled={isQuotaExceeded}
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Story description"
            rows={4}
            disabled={isQuotaExceeded}
          />
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            id="status"
            value={formData.status}
            onChange={(e) => handleInputChange('status', e.target.value)}
            disabled={isQuotaExceeded}
          >
            <option value="backlog">Backlog</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="in_review">In Review</option>
            <option value="done">Done</option>
            <option value="archived">Archived</option>
          </Select>
        </div>

        {/* Priority */}
        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <Select
            id="priority"
            value={formData.priority}
            onChange={(e) => handleInputChange('priority', e.target.value)}
            disabled={isQuotaExceeded}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </Select>
        </div>

        {/* Story Type */}
        <div className="space-y-2">
          <Label htmlFor="storyType">Type</Label>
          <Select
            id="storyType"
            value={formData.storyType}
            onChange={(e) => handleInputChange('storyType', e.target.value)}
            disabled={isQuotaExceeded}
          >
            <option value="feature">Feature</option>
            <option value="bug">Bug</option>
            <option value="chore">Chore</option>
            <option value="spike">Spike</option>
          </Select>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {usageStats?.version && (
              <span>Current Version: {usageStats.version}</span>
            )}
          </div>
          <Button
            onClick={handleSave}
            disabled={loading || isQuotaExceeded}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
