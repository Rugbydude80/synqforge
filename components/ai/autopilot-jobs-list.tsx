'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, Clock, CheckCircle2, XCircle, AlertCircle, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface AutopilotJob {
  jobId: string
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'pending_review'
  epicsCreated: number
  storiesCreated: number
  tasksCreated: number
  duplicatesDetected: number
  dependenciesDetected: number
  error?: string
}

interface AutopilotJobsListProps {
  refreshTrigger?: number
  onJobSelect?: (jobId: string) => void
  className?: string
}

export function AutopilotJobsList({ refreshTrigger, onJobSelect, className }: AutopilotJobsListProps) {
  const [jobs, setJobs] = useState<AutopilotJob[]>([])
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState<string | null>(null)

  const fetchJobs = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/ai/autopilot', {
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch jobs')
      }

      setJobs(data.jobs || [])
    } catch (error: any) {
      console.error('Error fetching jobs:', error)
      toast.error(error.message || 'Failed to fetch autopilot jobs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJobs()
  }, [refreshTrigger])

  // Poll for updates on jobs that are processing
  useEffect(() => {
    const hasActiveJobs = jobs.some((job) =>
      ['queued', 'processing'].includes(job.status)
    )

    if (!hasActiveJobs) return

    const interval = setInterval(() => {
      fetchJobs()
    }, 5000) // Poll every 5 seconds

    return () => clearInterval(interval)
  }, [jobs])

  const handleRetry = async (jobId: string) => {
    try {
      setRetrying(jobId)

      const response = await fetch(`/api/ai/autopilot/${jobId}/retry`, {
        method: 'POST',
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to retry job')
      }

      toast.success('Job queued for retry')
      fetchJobs()
    } catch (error: any) {
      console.error('Error retrying job:', error)
      toast.error(error.message || 'Failed to retry job')
    } finally {
      setRetrying(null)
    }
  }

  const getStatusIcon = (status: AutopilotJob['status']) => {
    switch (status) {
      case 'queued':
        return <Clock className="h-4 w-4" />
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin" />
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />
      case 'failed':
        return <XCircle className="h-4 w-4" />
      case 'pending_review':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getStatusBadge = (status: AutopilotJob['status']) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'emerald'> = {
      queued: 'outline',
      processing: 'default',
      completed: 'emerald',
      failed: 'destructive',
      pending_review: 'secondary',
    }

    return (
      <Badge variant={variants[status] || 'outline'} className="capitalize">
        {status === 'pending_review' ? 'Pending Review' : status}
      </Badge>
    )
  }

  if (loading && jobs.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (jobs.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="text-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No autopilot jobs yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Upload a document to get started
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
            <CardTitle>Autopilot Jobs</CardTitle>
            <CardDescription>Recent backlog generation jobs</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchJobs}
            disabled={loading}
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {jobs.map((job) => (
            <div
              key={job.jobId}
              className="border rounded-lg p-4 space-y-3 hover:border-brand-purple-500/50 transition-colors cursor-pointer"
              onClick={() => onJobSelect?.(job.jobId)}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(job.status)}
                  <span className="font-medium text-sm">Job {job.jobId.slice(0, 8)}</span>
                </div>
                {getStatusBadge(job.status)}
              </div>

              {/* Stats */}
              {(job.status === 'completed' || job.status === 'pending_review') && (
                <div className="grid grid-cols-5 gap-2 text-sm">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-brand-purple-500">{job.epicsCreated}</p>
                    <p className="text-xs text-muted-foreground">Epics</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-brand-emerald-500">{job.storiesCreated}</p>
                    <p className="text-xs text-muted-foreground">Stories</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-500">{job.tasksCreated}</p>
                    <p className="text-xs text-muted-foreground">Tasks</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-500">{job.duplicatesDetected}</p>
                    <p className="text-xs text-muted-foreground">Duplicates</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-500">{job.dependenciesDetected}</p>
                    <p className="text-xs text-muted-foreground">Dependencies</p>
                  </div>
                </div>
              )}

              {/* Processing indicator */}
              {job.status === 'processing' && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Analysing document and generating backlog items...</span>
                </div>
              )}

              {/* Queued indicator */}
              {job.status === 'queued' && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Waiting to be processed...</span>
                </div>
              )}

              {/* Error */}
              {job.status === 'failed' && (
                <div className="space-y-2">
                  <div className="bg-destructive/10 text-destructive text-sm rounded p-2">
                    {job.error || 'An unknown error occurred'}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRetry(job.jobId)
                    }}
                    disabled={retrying === job.jobId}
                  >
                    {retrying === job.jobId ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Retrying...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Retry
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Pending Review */}
              {job.status === 'pending_review' && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Review required before publishing
                  </p>
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      onJobSelect?.(job.jobId)
                    }}
                  >
                    Review
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
