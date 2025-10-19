'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api-client'
import {
  FolderKanban,
  FileText,
  Plus,
  CheckCircle2,
  Sparkles,
  Upload,
  Clock,
  ArrowUpRight,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CreateProjectModal } from '@/components/create-project-modal'
import { AppSidebar } from '@/components/app-sidebar'
import { cn, formatRelativeTime } from '@/lib/utils'

export default function DashboardPage() {
  const { status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<any>(null)
  const [activities, setActivities] = useState<any[]>([])
  const [inactiveProjects, setInactiveProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false)
  const [activatingProject, setActivatingProject] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [activityFilter, setActivityFilter] = useState<string>('all')
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [, forceUpdate] = useState({})

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (status === 'authenticated') {
      fetchDashboardData()
    }
  }, [status, router])

  // Update the display every 10 seconds to refresh the relative time
  useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate({}) // Force re-render to update relative time
    }, 10000) // Update every 10 seconds

    return () => clearInterval(interval)
  }, [])

  const fetchDashboardData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      // Fetch all dashboard data in parallel
      const [statsResponse, activitiesResponse, projectsResponse] = await Promise.all([
        api.dashboard.getStats(),
        api.activities.list({ limit: 10 }),
        api.projects.list(),
      ])

      setStats(statsResponse)
      setActivities(activitiesResponse.data)

      // Filter inactive projects (planning, on_hold)
      const inactive = projectsResponse.data.filter(
        (p: any) => p.status === 'planning' || p.status === 'on_hold'
      )
      setInactiveProjects(inactive)

      setError('')
      setLastSyncTime(new Date())
    } catch (error: any) {
      console.error('Failed to fetch dashboard data:', error)
      setError(error.message || 'Failed to load dashboard')
    } finally {
      if (isRefresh) {
        setRefreshing(false)
      } else {
        setLoading(false)
      }
    }
  }

  const handleActivateProject = async (projectId: string) => {
    try {
      setActivatingProject(projectId)
      await fetch(`/api/projects/${projectId}/activate`, {
        method: 'POST',
        credentials: 'include'
      })
      // Refresh dashboard data
      await fetchDashboardData()
    } catch (error) {
      console.error('Failed to activate project:', error)
    } finally {
      setActivatingProject(null)
    }
  }

  const calculateMetrics = () => {
    if (!stats) {
      return [
        {
          title: 'Active Projects',
          value: '0',
          change: '+0 projects',
          trend: 'neutral',
          icon: FolderKanban,
          color: 'purple',
          onClick: () => router.push('/projects'),
        },
        {
          title: 'Total Stories',
          value: '00',
          change: '00 epics',
          trend: 'neutral',
          icon: FileText,
          color: 'emerald',
          onClick: () => router.push('/stories'),
        },
        {
          title: 'Completed',
          value: '0%',
          change: '0 stories done',
          trend: 'neutral',
          icon: CheckCircle2,
          color: 'emerald',
          onClick: () => router.push('/stories'),
        },
        {
          title: 'AI Generated',
          value: '0',
          change: 'NaN% of stories',
          trend: 'neutral',
          icon: Sparkles,
          color: 'purple',
          onClick: () => router.push('/ai-generate'),
        },
      ]
    }

    // Build status breakdown text
    const statusParts = []
    if (stats.planningProjects > 0) statusParts.push(`${stats.planningProjects} Planning`)
    if (stats.onHoldProjects > 0) statusParts.push(`${stats.onHoldProjects} On Hold`)
    if (stats.completedProjects > 0) statusParts.push(`${stats.completedProjects} Completed`)
    if (stats.archivedProjects > 0) statusParts.push(`${stats.archivedProjects} Archived`)

    const statusBreakdown = statusParts.length > 0
      ? statusParts.join(' | ')
      : `${stats.totalProjects} total`

    return [
      {
        title: 'Active Projects',
        value: stats.activeProjects.toString(),
        change: statusBreakdown,
        trend: stats.activeProjects > 0 ? 'up' : 'neutral',
        icon: FolderKanban,
        color: 'purple',
        hasInactive: stats.activeProjects === 0 && stats.totalProjects > 0,
        onClick: () => router.push('/projects'),
      },
      {
        title: 'Total Stories',
        value: stats.totalStories.toString().padStart(2, '0'),
        change: `${stats.totalEpics.toString().padStart(2, '0')} epics`,
        trend: stats.totalStories > 0 ? 'up' : 'neutral',
        icon: FileText,
        color: 'emerald',
        onClick: () => router.push('/stories'),
      },
      {
        title: 'Completed',
        value: `${stats.completionPercentage}%`,
        change: `${stats.completedStories} stories done`,
        trend: stats.completedStories > 0 ? 'up' : 'neutral',
        icon: CheckCircle2,
        color: 'emerald',
        onClick: () => router.push('/stories'),
      },
      {
        title: 'AI Generated',
        value: stats.aiGeneratedStories.toString(),
        change: stats.totalStories > 0 ? `${stats.aiGeneratedPercentage}% of stories` : 'NaN% of stories',
        trend: stats.aiGeneratedStories > 0 ? 'up' : 'neutral',
        icon: Sparkles,
        color: 'purple',
        onClick: () => router.push('/ai-generate'),
      },
    ]
  }

  const metrics = calculateMetrics()

  const formatActivity = (activity: any) => {
    const actionMap: Record<string, { title: string; type: string; status: string }> = {
      created_project: {
        title: `Created ${activity.projectName || 'project'}`,
        type: 'project_created',
        status: 'in-progress',
      },
      updated_project: {
        title: `Updated ${activity.projectName || 'project'}`,
        type: 'project_updated',
        status: 'in-progress',
      },
      created_story: {
        title: `Created story in ${activity.projectName || 'project'}`,
        type: activity.newValues?.aiGenerated ? 'ai_generated' : 'story_created',
        status: 'in-progress',
      },
      updated_story: {
        title: `Updated story in ${activity.projectName || 'project'}`,
        type: activity.newValues?.status === 'done' ? 'story_completed' : 'story_updated',
        status: activity.newValues?.status === 'done' ? 'done' : 'in-progress',
      },
      story_deleted: {
        title: `Deleted story in ${activity.projectName || 'project'}`,
        type: 'story_deleted',
        status: 'deleted',
      },
      deleted_project: {
        title: `Deleted project ${activity.metadata?.projectName || ''}`,
        type: 'project_deleted',
        status: 'deleted',
      },
      deleted_epic: {
        title: `Deleted epic in ${activity.projectName || 'project'}`,
        type: 'epic_deleted',
        status: 'deleted',
      },
      created_epic: {
        title: `Created epic in ${activity.projectName || 'project'}`,
        type: activity.newValues?.aiGenerated ? 'ai_generated' : 'epic_created',
        status: 'in-progress',
      },
    }

    const mappedActivity = actionMap[activity.action] || {
      title: `${activity.action} in ${activity.projectName || 'project'}`,
      type: 'other',
      status: 'in-progress',
    }

    return {
      id: activity.id,
      title: mappedActivity.title,
      type: mappedActivity.type,
      project: activity.projectName || 'Unknown Project',
      projectId: activity.projectId,
      user: activity.userName || activity.userEmail || 'Unknown User',
      timestamp: new Date(activity.createdAt),
      status: mappedActivity.status,
    }
  }

  const recentActivity = activities
    .map(formatActivity)
    .filter((activity) => {
      if (activityFilter === 'all') return true
      if (activityFilter === 'ai') return activity.type === 'ai_generated'
      if (activityFilter === 'completed') return activity.status === 'done'
      if (activityFilter === 'deleted') return activity.status === 'deleted'
      return true
    })

  const quickActions = [
    {
      icon: Plus,
      label: 'New Project',
      description: 'Start a new project',
      gradient: true,
      onClick: () => setIsCreateProjectOpen(true),
    },
    {
      icon: Sparkles,
      label: 'AI Generate',
      description: 'Generate stories with AI',
      gradient: true,
      onClick: () => router.push('/ai-generate'),
    },
    {
      icon: Upload,
      label: 'Upload Document',
      description: 'Upload requirements doc',
      gradient: false,
      onClick: () => router.push('/ai-generate'),
    },
  ]

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <AppSidebar />

      {/* Main Content */}
      <main className="flex-1 md:ml-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/80 backdrop-blur-xl px-3 sm:px-4 md:px-6 lg:px-8">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Welcome back! Here's what's happening.</p>
          </div>
          <div className="flex items-center gap-3">
            {lastSyncTime && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Last sync: {formatRelativeTime(lastSyncTime)}</span>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchDashboardData(true)}
              disabled={refreshing}
              className="hover:border-purple-500/50 transition-all"
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <div className="h-8 w-8 rounded-full bg-gradient-primary" />
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-8 space-y-8">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
              <span className="ml-3 text-muted-foreground">Loading dashboard...</span>
            </div>
          )}

          {error && (
            <div className="text-center py-16">
              <div className="text-destructive mb-2">{error}</div>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          )}

          {!loading && !error && (
            <>
              {/* Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {metrics.map((metric, i) => (
              <Card
                key={i}
                className="relative overflow-hidden group hover:shadow-2xl hover:scale-105 hover:border-purple-500/50 transition-all duration-300 cursor-pointer"
                onClick={metric.onClick}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    metric.onClick?.()
                  }
                }}
                aria-label={`View ${metric.title}`}
              >
                <div
                  className={cn(
                    'absolute top-0 right-0 h-32 w-32 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-all duration-300 group-hover:scale-150',
                    metric.color === 'purple'
                      ? 'bg-brand-purple-500'
                      : 'bg-brand-emerald-500'
                  )}
                />
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center justify-between">
                    <span>{metric.title}</span>
                    <metric.icon
                      className={cn(
                        'h-4 w-4 transition-all duration-300 group-hover:scale-125',
                        metric.color === 'purple'
                          ? 'text-brand-purple-400'
                          : 'text-brand-emerald-400'
                      )}
                    />
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold group-hover:scale-110 transition-transform duration-300">{metric.value}</div>
                  <div className="flex items-center gap-1 mt-2 text-xs">
                    {metric.trend === 'up' && (
                      <ArrowUpRight className="h-3 w-3 text-brand-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    )}
                    <span className="text-muted-foreground">{metric.change}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Empty State Alert for Inactive Projects */}
          {stats && stats.activeProjects === 0 && inactiveProjects.length > 0 && (
            <Alert className="border-yellow-500/50 bg-yellow-500/10">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <AlertTitle className="text-yellow-500">No active projects yet</AlertTitle>
              <AlertDescription className="text-muted-foreground mt-2">
                <p className="mb-3">
                  You have <strong>{inactiveProjects.length} project{inactiveProjects.length > 1 ? 's' : ''}</strong> in{' '}
                  {inactiveProjects.some(p => p.status === 'planning') && 'Planning'}
                  {inactiveProjects.some(p => p.status === 'on_hold') && ' / On Hold'}.{' '}
                  Mark a project as active to start tracking progress.
                </p>
                <div className="flex flex-col gap-2">
                  {inactiveProjects.map((project) => (
                    <div key={project.id} className="flex items-center justify-between bg-background/50 rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <FolderKanban className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{project.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Status: <span className="capitalize">{project.status.replace('_', ' ')}</span>
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleActivateProject(project.id)}
                        disabled={activatingProject === project.id}
                        className="bg-yellow-500 hover:bg-yellow-600 text-black"
                      >
                        {activatingProject === project.id ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Activating...
                          </>
                        ) : (
                          'Mark Active'
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Quick Actions */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {quickActions.map((action, i) => (
                <Button
                  key={i}
                  variant={action.gradient ? 'default' : 'outline'}
                  className="h-auto flex-col items-start gap-2 p-6 group"
                  onClick={action.onClick}
                >
                  <div
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-lg transition-transform group-hover:scale-110',
                      action.gradient
                        ? 'bg-white/20'
                        : 'bg-accent'
                    )}
                  >
                    <action.icon className="h-6 w-6" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">{action.label}</div>
                    <div className="text-xs opacity-80">{action.description}</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Recent Activity</h2>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                  <Button
                    variant={activityFilter === 'all' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActivityFilter('all')}
                    className="h-7 text-xs"
                  >
                    All
                  </Button>
                  <Button
                    variant={activityFilter === 'ai' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActivityFilter('ai')}
                    className="h-7 text-xs"
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI
                  </Button>
                  <Button
                    variant={activityFilter === 'completed' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActivityFilter('completed')}
                    className="h-7 text-xs"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Done
                  </Button>
                </div>
                <Button variant="ghost" size="sm">View All</Button>
              </div>
            </div>
            <Card>
              <CardContent className="p-0">
                {recentActivity.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <p>No recent activity yet</p>
                    <p className="text-sm mt-1">Start by creating a project or generating stories</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {recentActivity.map((activity) => (
                      <div
                        key={activity.id}
                        onClick={() => activity.projectId && router.push(`/projects/${activity.projectId}`)}
                        className={cn(
                          "flex items-start gap-4 p-4 transition-all duration-200 group",
                          activity.projectId && "hover:bg-accent/50 hover:pl-6 cursor-pointer hover:border-l-4 hover:border-purple-500"
                        )}
                        role={activity.projectId ? "button" : undefined}
                        tabIndex={activity.projectId ? 0 : undefined}
                        onKeyDown={(e) => {
                          if (activity.projectId && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault()
                            router.push(`/projects/${activity.projectId}`)
                          }
                        }}
                        aria-label={activity.projectId ? `View ${activity.project}` : undefined}
                      >
                        <div
                          className={cn(
                            'mt-1 flex h-2 w-2 rounded-full transition-all duration-300 group-hover:scale-150 group-hover:shadow-lg',
                            activity.type === 'ai_generated'
                              ? 'bg-brand-purple-500 shadow-glow-purple group-hover:shadow-purple-500/50'
                              : 'bg-brand-emerald-500 shadow-glow-emerald group-hover:shadow-emerald-500/50'
                          )}
                        />
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium group-hover:text-purple-400 transition-colors">{activity.title}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="group-hover:text-foreground transition-colors">{activity.project}</span>
                            <span>•</span>
                            <span>{activity.user}</span>
                            <span>•</span>
                            <span>{formatRelativeTime(activity.timestamp)}</span>
                          </div>
                        </div>
                        <Badge
                          variant={
                            activity.status === 'done'
                              ? 'emerald'
                              : activity.status === 'in-progress'
                              ? 'purple'
                              : activity.status === 'deleted'
                              ? 'destructive'
                              : 'outline'
                          }
                          className="group-hover:scale-105 transition-transform"
                        >
                          {activity.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            </div>
            </>
          )}
        </div>
      </main>

      {/* Create Project Modal */}
      <CreateProjectModal
        open={isCreateProjectOpen}
        onOpenChange={setIsCreateProjectOpen}
        onSuccess={fetchDashboardData}
      />
    </div>
  )
}
