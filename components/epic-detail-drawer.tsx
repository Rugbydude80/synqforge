'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Edit2, Trash2, ExternalLink, Target, Calendar } from 'lucide-react'
import { api, type Epic, type Story } from '@/lib/api-client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import Link from 'next/link'
import { emitProjectMetricsChanged } from '@/lib/events/project-events'

interface EpicDetailDrawerProps {
  epic: Epic | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (epic: Epic) => void
  onDelete?: (epicId: string) => void
}

const statusColors = {
  draft: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  published: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  planned: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  in_progress: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  completed: 'bg-green-500/10 text-green-400 border-green-500/20',
  archived: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
}

const priorityColors = {
  low: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  medium: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  high: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  critical: 'bg-red-500/10 text-red-400 border-red-500/20',
}

export function EpicDetailDrawer({
  epic,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: EpicDetailDrawerProps) {
  const router = useRouter()
  const [stories, setStories] = React.useState<Story[]>([])
  const [loading, setLoading] = React.useState(false)

  const fetchStories = React.useCallback(async () => {
    if (!epic) return

    setLoading(true)
    try {
      const response = await api.stories.list({ epicId: epic.id })
      setStories(response.data)
    } catch (error) {
      console.error('Failed to fetch stories:', error)
      setStories([])
    } finally {
      setLoading(false)
    }
  }, [epic])

  React.useEffect(() => {
    if (epic && open) {
      fetchStories()
    }
  }, [epic, open, fetchStories])

  const handleDelete = async () => {
    if (!epic) return

    if (!confirm(`Delete epic "${epic.title}"? This cannot be undone.`)) {
      return
    }

    try {
      await api.epics.delete(epic.id)
      toast.success('Epic deleted')
      emitProjectMetricsChanged(epic.projectId)
      onDelete?.(epic.id)
      onOpenChange(false)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete epic')
    }
  }

  const completedStories = stories.filter((s) => s.status === 'done').length
  const totalStories = stories.length
  const progressPercentage = totalStories > 0 ? Math.round((completedStories / totalStories) * 100) : 0

  if (!epic) {
    return null
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <SheetTitle className="text-2xl mb-2">{epic.title}</SheetTitle>
              <SheetDescription className="flex items-center gap-2 flex-wrap">
                <Badge className={cn('border', statusColors[epic.status])}>
                  {epic.status.replace('_', ' ')}
                </Badge>
                <Badge className={cn('border', priorityColors[epic.priority])}>
                  {epic.priority}
                </Badge>
                {epic.aiGenerated && (
                  <Badge variant="secondary">AI Generated</Badge>
                )}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Actions */}
          <div className="flex gap-2">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(epic)}
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              className="text-red-400 hover:text-red-300"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <Link href={`/projects/${epic.projectId}/epics/${epic.id}`}>
                <ExternalLink className="h-4 w-4 mr-2" />
                View Full Page
              </Link>
            </Button>
          </div>

          {/* Description */}
          {epic.description && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Description</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {epic.description}
              </p>
            </div>
          )}

          {/* Goals */}
          {epic.goals && (
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Goals
              </h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {epic.goals}
              </p>
            </div>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4">
            {epic.startDate && (
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                  <Calendar className="h-3 w-3" />
                  Start Date
                </p>
                <p className="text-sm font-medium">
                  {format(new Date(epic.startDate), 'PPP')}
                </p>
              </div>
            )}

            {epic.targetDate && (
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                  <Calendar className="h-3 w-3" />
                  Target Date
                </p>
                <p className="text-sm font-medium">
                  {format(new Date(epic.targetDate), 'PPP')}
                </p>
              </div>
            )}
          </div>

          {/* Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">Progress</h3>
              <span className="text-xs text-muted-foreground">
                {completedStories} / {totalStories} stories
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all"
                role="progressbar"
                aria-label={`Epic progress: ${progressPercentage}% complete`}
                aria-valuenow={progressPercentage}
                aria-valuemin={0}
                aria-valuemax={100}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {progressPercentage}% complete
            </p>
          </div>

          {/* Stories */}
          <div>
            <h3 className="text-sm font-semibold mb-3">
              Stories ({totalStories})
            </h3>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading stories...</p>
            ) : stories.length > 0 ? (
              <div className="space-y-2">
                {stories.map((story) => (
                  <Card
                    key={story.id}
                    className="cursor-pointer hover:border-purple-500/50 transition-colors"
                    onClick={() => router.push(`/stories/${story.id}`)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{story.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant="secondary"
                              className="text-xs"
                            >
                              {story.status.replace('_', ' ')}
                            </Badge>
                            {story.storyPoints && (
                              <span className="text-xs text-muted-foreground">
                                {story.storyPoints} pts
                              </span>
                            )}
                          </div>
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No stories in this epic yet.
              </p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
