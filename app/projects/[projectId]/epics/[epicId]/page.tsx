'use client'

import * as React from 'react'
import { useRouter, useParams } from 'next/navigation'
import { api } from '@/lib/api-client'
import type { Epic, Story } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AppSidebar } from '@/components/app-sidebar'
import { ArrowLeft, Sparkles, FileText, Clock, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function EpicDetailPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.projectId as string
  const epicId = params.epicId as string

  const [epic, setEpic] = React.useState<Epic | null>(null)
  const [stories, setStories] = React.useState<Story[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const fetchEpicData = React.useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const [epicData, storiesResponse] = await Promise.all([
        api.epics.getById(epicId),
        api.stories.list({ epicId, limit: 100 }),
      ])

      setEpic(epicData)
      setStories(Array.isArray(storiesResponse?.data) ? storiesResponse.data : [])
    } catch (err: any) {
      setError(err.message || 'Failed to load epic')
      toast.error(err.message || 'Failed to load epic')
      setStories([])
    } finally {
      setIsLoading(false)
    }
  }, [epicId])

  React.useEffect(() => {
    if (epicId) {
      fetchEpicData()
    }
  }, [epicId, fetchEpicData])

  const getStatusColor = (status: Story['status']) => {
    switch (status) {
      case 'done':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      case 'in_progress':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
      case 'review':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    }
  }

  const getPriorityColor = (priority: Story['priority']) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-500/10 text-red-400 border-red-500/20'
      case 'high':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
      case 'low':
        return 'bg-green-500/10 text-green-400 border-green-500/20'
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    }
  }

  const completedStories = stories.filter(s => s.status === 'done').length
  const totalStories = stories.length
  const progressPercentage = totalStories > 0 ? Math.round((completedStories / totalStories) * 100) : 0

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background">
        <AppSidebar />
        <main className="flex-1 ml-64 flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
          <div className="animate-spin h-8 w-8 border-2 border-purple-500 border-t-transparent rounded-full"></div>
        </main>
      </div>
    )
  }

  if (error || !epic) {
    return (
      <div className="flex min-h-screen bg-background">
        <AppSidebar />
        <main className="flex-1 ml-64 flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-white mb-2">Failed to load epic</h3>
            <p className="text-gray-400 mb-6">{error}</p>
            <Button onClick={() => router.push(`/projects/${projectId}`)}>Back to Project</Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 ml-64">
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
          {/* Header */}
          <div className="border-b border-gray-700 bg-gray-800/50 backdrop-blur-xl">
            <div className="container mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon" onClick={() => router.push(`/projects/${projectId}`)}>
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: epic.color || '#a855f7' }}
                  >
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h1 className="text-2xl font-bold text-white">{epic.title}</h1>
                      <Badge variant="outline" className={cn(
                        epic.status === 'completed' && 'border-emerald-500/50 text-emerald-400',
                        epic.status === 'in_progress' && 'border-purple-500/50 text-purple-400',
                        epic.status === 'planned' && 'border-blue-500/50 text-blue-400',
                      )}>
                        {epic.status.replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline" className={cn(
                        epic.priority === 'critical' && 'border-red-500/50 text-red-400',
                        epic.priority === 'high' && 'border-orange-500/50 text-orange-400',
                        epic.priority === 'medium' && 'border-yellow-500/50 text-yellow-400',
                        epic.priority === 'low' && 'border-green-500/50 text-green-400',
                      )}>
                        {epic.priority}
                      </Badge>
                      {epic.aiGenerated && (
                        <Badge variant="outline" className="border-purple-500/50 text-purple-400">
                          <Sparkles className="h-3 w-3 mr-1" />
                          AI Generated
                        </Badge>
                      )}
                    </div>
                    {epic.description && (
                      <p className="text-gray-400 text-sm mt-1">{epic.description}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-400">Progress</span>
                  <span className="text-white font-semibold">{progressPercentage}%</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-emerald-500 transition-all duration-500"
                    role="progressbar"
                    aria-label={`Epic progress: ${progressPercentage}% complete`}
                    aria-valuenow={progressPercentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                <div className="flex items-center gap-6 mt-2 text-xs text-gray-400">
                  <span>{completedStories} of {totalStories} stories completed</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stories List */}
          <div className="container mx-auto px-6 py-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Stories in this Epic</h2>
              <Badge variant="secondary" className="text-sm">
                {totalStories} {totalStories === 1 ? 'story' : 'stories'}
              </Badge>
            </div>

            {stories.length === 0 ? (
              <Card className="bg-gray-800/50 border-gray-700">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="h-16 w-16 rounded-full bg-purple-500/10 flex items-center justify-center mb-4">
                    <FileText className="h-8 w-8 text-purple-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">No Stories Yet</h3>
                  <p className="text-gray-400 text-center max-w-md">
                    Add stories to this epic to track progress on this feature.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {stories.map(story => (
                  <Card
                    key={story.id}
                    className="bg-gray-800/50 border-gray-700 hover:border-purple-500/50 transition-all cursor-pointer"
                    onClick={() => router.push(`/stories?highlight=${story.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={cn('text-xs border', getStatusColor(story.status))}>
                              {story.status.replace('_', ' ')}
                            </Badge>
                            <Badge className={cn('text-xs border', getPriorityColor(story.priority))}>
                              {story.priority}
                            </Badge>
                            {story.aiGenerated && (
                              <Sparkles className="h-4 w-4 text-purple-400" />
                            )}
                          </div>
                          <h3 className="font-semibold text-white mb-1 hover:text-purple-400 transition-colors">
                            {story.title}
                          </h3>
                          {story.description && (
                            <p className="text-sm text-gray-400 line-clamp-2">{story.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            {story.storyPoints && (
                              <span className="font-mono">{story.storyPoints} pts</span>
                            )}
                            <span>{story.storyType}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {story.status === 'done' ? (
                            <CheckCircle className="h-5 w-5 text-emerald-400" />
                          ) : (
                            <Clock className="h-5 w-5 text-gray-500" />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
