'use client'

import { useState, useEffect } from 'react'
import { X, CheckCircle2, AlertTriangle, GitBranch, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface AutopilotReviewModalProps {
  jobId: string
  isOpen: boolean
  onClose: () => void
  onApproved?: () => void
}

interface ReviewData {
  epics: Array<{
    id: string
    title: string
    description: string
    stories: Array<{
      id: string
      title: string
      description: string
      acceptanceCriteria: string[]
      estimatedEffort: number
    }>
  }>
  duplicates: Array<{
    existingStoryId: string
    existingTitle: string
    similarity: number
    mergeAction: string
    diff?: {
      titleDiff: string
      descriptionDiff: string
    }
  }>
  dependencies: Array<{
    sourceStoryId: string
    targetStoryId: string
    dependencyType: string
    description: string
  }>
}

export function AutopilotReviewModal({
  jobId,
  isOpen,
  onClose,
  onApproved,
}: AutopilotReviewModalProps) {
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)
  const [reviewData, setReviewData] = useState<ReviewData | null>(null)
  const [selectedStoryIds, setSelectedStoryIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (isOpen && jobId) {
      fetchReviewData()
    }
  }, [isOpen, jobId])

  const fetchReviewData = async () => {
    try {
      setLoading(true)

      const response = await fetch(`/api/ai/autopilot?jobId=${jobId}`, {
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch review data')
      }

      // In a real implementation, the job would include outputData
      // For now, we'll create a mock structure
      setReviewData({
        epics: data.outputData?.epics || [],
        duplicates: data.outputData?.duplicates || [],
        dependencies: data.outputData?.dependencies || [],
      })

      // Pre-select all stories by default
      const allStoryIds = new Set<string>()
      data.outputData?.epics?.forEach((epic: any) => {
        epic.stories.forEach((story: any) => {
          allStoryIds.add(story.id)
        })
      })
      setSelectedStoryIds(allStoryIds)
    } catch (error: any) {
      console.error('Error fetching review data:', error)
      toast.error(error.message || 'Failed to load review data')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    try {
      setApproving(true)

      const response = await fetch(`/api/ai/autopilot/${jobId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          approvedStoryIds: Array.from(selectedStoryIds),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve autopilot results')
      }

      toast.success('Autopilot results approved!', {
        description: `${selectedStoryIds.size} stories have been published to your backlog.`,
      })

      onApproved?.()
      onClose()
    } catch (error: any) {
      console.error('Error approving results:', error)
      toast.error(error.message || 'Failed to approve results')
    } finally {
      setApproving(false)
    }
  }

  const toggleStory = (storyId: string) => {
    setSelectedStoryIds((prev) => {
      const next = new Set(prev)
      if (next.has(storyId)) {
        next.delete(storyId)
      } else {
        next.add(storyId)
      }
      return next
    })
  }

  const selectAll = () => {
    const allStoryIds = new Set<string>()
    reviewData?.epics.forEach((epic) => {
      epic.stories.forEach((story) => {
        allStoryIds.add(story.id)
      })
    })
    setSelectedStoryIds(allStoryIds)
  }

  const deselectAll = () => {
    setSelectedStoryIds(new Set())
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="bg-card rounded-lg border shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between border-b p-6">
            <div>
              <h2 className="text-2xl font-bold">Review Autopilot Results</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Select stories to publish to your backlog
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-180px)] p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-purple-500 mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading review data...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Summary */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-brand-purple-500">
                        {reviewData?.epics.length || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">Epics</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-brand-emerald-500">
                        {reviewData?.epics.reduce((acc, epic) => acc + epic.stories.length, 0) || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">Stories</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-orange-500">
                        {reviewData?.duplicates.length || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">Duplicates Detected</p>
                    </div>
                  </div>
                </div>

                {/* Bulk Actions */}
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {selectedStoryIds.size} of{' '}
                    {reviewData?.epics.reduce((acc, epic) => acc + epic.stories.length, 0) || 0}{' '}
                    stories selected
                  </p>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={selectAll}>
                      Select All
                    </Button>
                    <Button variant="ghost" size="sm" onClick={deselectAll}>
                      Deselect All
                    </Button>
                  </div>
                </div>

                {/* Duplicates Warning */}
                {reviewData && reviewData.duplicates.length > 0 && (
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium text-orange-500">
                          {reviewData.duplicates.length} Potential Duplicates Detected
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Some stories are similar to existing ones in your backlog. Review carefully
                          before publishing.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Epics and Stories */}
                {reviewData?.epics.map((epic) => (
                  <div key={epic.id} className="border rounded-lg p-4 space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge>Epic</Badge>
                        <h3 className="font-semibold">{epic.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">{epic.description}</p>
                    </div>

                    {/* Stories */}
                    <div className="space-y-3 pl-4 border-l-2 border-brand-purple-500/20">
                      {epic.stories.map((story) => {
                        const isSelected = selectedStoryIds.has(story.id)
                        const hasDuplicate = reviewData.duplicates.some(
                          (d) => d.existingStoryId === story.id
                        )
                        const dependencies = reviewData.dependencies.filter(
                          (d) => d.sourceStoryId === story.id
                        )

                        return (
                          <div
                            key={story.id}
                            className={cn(
                              'border rounded-lg p-3 cursor-pointer transition-colors',
                              isSelected
                                ? 'border-brand-purple-500 bg-brand-purple-500/5'
                                : 'border-border hover:border-brand-purple-500/50'
                            )}
                            onClick={() => toggleStory(story.id)}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={cn(
                                  'h-5 w-5 rounded border flex items-center justify-center shrink-0 mt-0.5',
                                  isSelected
                                    ? 'bg-brand-purple-500 border-brand-purple-500'
                                    : 'border-border'
                                )}
                              >
                                {isSelected && <Check className="h-3 w-3 text-white" />}
                              </div>
                              <div className="flex-1 space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="font-medium text-sm">{story.title}</p>
                                  <div className="flex items-center gap-1">
                                    {hasDuplicate && (
                                      <Badge variant="outline" className="text-orange-500">
                                        Possible Duplicate
                                      </Badge>
                                    )}
                                    {dependencies.length > 0 && (
                                      <Badge variant="outline" className="text-purple-500">
                                        <GitBranch className="h-3 w-3 mr-1" />
                                        {dependencies.length} Dependency
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {story.description}
                                </p>
                                {story.acceptanceCriteria &&
                                  story.acceptanceCriteria.length > 0 && (
                                    <div className="text-sm">
                                      <p className="font-medium mb-1">Acceptance Criteria:</p>
                                      <ul className="space-y-1 text-muted-foreground">
                                        {story.acceptanceCriteria.map((ac, index) => (
                                          <li key={index} className="flex items-start gap-2">
                                            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-brand-emerald-500" />
                                            <span>{ac}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t p-6 flex items-center justify-between">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approving || selectedStoryIds.size === 0}
            >
              {approving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Publishing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Publish {selectedStoryIds.size} Stories
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
