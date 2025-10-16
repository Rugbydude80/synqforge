'use client'

import { useState } from 'react'
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  CheckSquare,
  Square,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Story {
  id: string
  title: string
  acceptanceCriteria: string[]
}

interface ValidationResult {
  validationId: string
  storyId: string
  storyTitle: string
  overallStatus: 'pass' | 'fail' | 'warning'
  totalIssues: number
  errors: number
  warnings: number
  infos: number
  tokensUsed: number
}

interface BatchACValidatorProps {
  stories: Story[]
  onValidationComplete?: (results: ValidationResult[]) => void
  className?: string
}

export function BatchACValidator({
  stories,
  onValidationComplete,
  className,
}: BatchACValidatorProps) {
  const [validating, setValidating] = useState(false)
  const [results, setResults] = useState<ValidationResult[]>([])
  const [selectedStoryIds, setSelectedStoryIds] = useState<Set<string>>(new Set())
  const [progress, setProgress] = useState(0)

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
    setSelectedStoryIds(new Set(stories.map((s) => s.id)))
  }

  const deselectAll = () => {
    setSelectedStoryIds(new Set())
  }

  const handleValidate = async (autoFix: boolean = false) => {
    if (selectedStoryIds.size === 0) {
      toast.error('Please select at least one story to validate')
      return
    }

    try {
      setValidating(true)
      setProgress(0)
      setResults([])

      const response = await fetch('/api/ai/ac-validator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          storyIds: Array.from(selectedStoryIds),
          autoFix,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to validate stories')
      }

      setResults(data.results || [])
      setProgress(100)
      onValidationComplete?.(data.results || [])

      const passCount = data.results.filter((r: ValidationResult) => r.overallStatus === 'pass').length
      const failCount = data.results.filter((r: ValidationResult) => r.overallStatus === 'fail').length
      const warningCount = data.results.filter((r: ValidationResult) => r.overallStatus === 'warning').length

      toast.success('Batch validation complete', {
        description: `${passCount} passed, ${failCount} failed, ${warningCount} warnings`,
      })
    } catch (error: any) {
      console.error('Error validating stories:', error)
      toast.error(error.message || 'Failed to validate stories')
    } finally {
      setValidating(false)
    }
  }

  const getStatusIcon = (status: 'pass' | 'fail' | 'warning') => {
    switch (status) {
      case 'pass':
        return <CheckCircle2 className="h-5 w-5 text-brand-emerald-500" />
      case 'fail':
        return <XCircle className="h-5 w-5 text-destructive" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />
    }
  }

  const getStatusBadge = (status: 'pass' | 'fail' | 'warning') => {
    const variants = {
      pass: 'emerald',
      fail: 'destructive',
      warning: 'outline',
    } as const

    return (
      <Badge variant={variants[status]} className="capitalize">
        {status}
      </Badge>
    )
  }

  // Filter stories with AC
  const validStories = stories.filter(
    (story) => story.acceptanceCriteria && story.acceptanceCriteria.length > 0
  )

  if (validStories.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="text-center py-8">
          <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
          <p className="text-muted-foreground">
            No stories with acceptance criteria found
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Batch AC Validation</CardTitle>
            <CardDescription>
              Validate multiple stories at once
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={selectAll}>
              Select All
            </Button>
            <Button variant="ghost" size="sm" onClick={deselectAll}>
              Deselect All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selection Info */}
        <div className="bg-muted/50 rounded-lg p-3 flex items-center justify-between">
          <p className="text-sm">
            {selectedStoryIds.size} of {validStories.length} stories selected
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => handleValidate(false)}
              disabled={validating || selectedStoryIds.size === 0}
            >
              {validating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Validate Selected
                </>
              )}
            </Button>
            <Button
              onClick={() => handleValidate(true)}
              disabled={validating || selectedStoryIds.size === 0}
            >
              Validate & Auto-Fix
            </Button>
          </div>
        </div>

        {/* Progress */}
        {validating && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground text-center">
              Validating stories... This may take a moment.
            </p>
          </div>
        )}

        {/* Results Summary */}
        {results.length > 0 && !validating && (
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <CheckCircle2 className="h-8 w-8 text-brand-emerald-500 mx-auto mb-2" />
                <p className="text-2xl font-bold">
                  {results.filter((r) => r.overallStatus === 'pass').length}
                </p>
                <p className="text-sm text-muted-foreground">Passed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <XCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
                <p className="text-2xl font-bold">
                  {results.filter((r) => r.overallStatus === 'fail').length}
                </p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <AlertTriangle className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                <p className="text-2xl font-bold">
                  {results.filter((r) => r.overallStatus === 'warning').length}
                </p>
                <p className="text-sm text-muted-foreground">Warnings</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Story List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {validStories.map((story) => {
            const isSelected = selectedStoryIds.has(story.id)
            const result = results.find((r) => r.storyId === story.id)

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
                  {/* Checkbox */}
                  <div className="pt-0.5">
                    {isSelected ? (
                      <CheckSquare className="h-5 w-5 text-brand-purple-500" />
                    ) : (
                      <Square className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>

                  {/* Story Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{story.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {story.acceptanceCriteria.length} acceptance criteria
                    </p>
                  </div>

                  {/* Result */}
                  {result && (
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result.overallStatus)}
                      {getStatusBadge(result.overallStatus)}
                      {result.totalIssues > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {result.totalIssues} issues
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Detailed Results */}
        {results.length > 0 && !validating && (
          <div className="space-y-3 pt-4 border-t">
            <p className="text-sm font-medium">Detailed Results:</p>
            {results.map((result) => (
              <div key={result.validationId} className="border rounded-lg p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(result.overallStatus)}
                    <span className="font-medium text-sm">{result.storyTitle}</span>
                  </div>
                  {getStatusBadge(result.overallStatus)}
                </div>
                {result.totalIssues > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{result.errors} errors</span>
                    <span>•</span>
                    <span>{result.warnings} warnings</span>
                    <span>•</span>
                    <span>{result.infos} info</span>
                    <span>•</span>
                    <span>{result.tokensUsed.toLocaleString()} tokens</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
