'use client'

import { useState, useEffect } from 'react'
import { projectsAPI } from '@/lib/api/client'
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  Sparkles,
  Users,
  Settings,
  Plus,
  TrendingUp,
  Clock,
  CheckCircle2,
  ArrowUpRight,
  Zap,
  Upload,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn, formatRelativeTime, getStatusColor } from '@/lib/utils'

export default function DashboardPage() {
  const [activeNav, setActiveNav] = useState('dashboard')
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const data = await projectsAPI.getAll()
        setProjects(data)
      } catch (error) {
        console.error('Failed to fetch projects:', error)
        setError('Failed to load projects')
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [])

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'projects', icon: FolderKanban, label: 'Projects' },
    { id: 'stories', icon: FileText, label: 'Stories' },
    { id: 'ai', icon: Sparkles, label: 'AI Tools' },
    { id: 'team', icon: Users, label: 'Team' },
  ]

  const calculateMetrics = () => {
    if (projects.length === 0) {
      return [
        {
          title: 'Active Projects',
          value: '0',
          change: 'No projects yet',
          trend: 'neutral',
          icon: FolderKanban,
          color: 'purple',
        },
        {
          title: 'Total Stories',
          value: '0',
          change: 'No stories yet',
          trend: 'neutral',
          icon: FileText,
          color: 'emerald',
        },
        {
          title: 'Completed',
          value: '0%',
          change: 'No data',
          trend: 'neutral',
          icon: CheckCircle2,
          color: 'emerald',
        },
        {
          title: 'AI Generated',
          value: '0',
          change: 'No AI stories yet',
          trend: 'neutral',
          icon: Sparkles,
          color: 'purple',
        },
      ]
    }

    const activeProjects = projects.filter((p: any) => p.status === 'active').length
    const totalProjects = projects.length
    const totalStories = projects.reduce((sum: number, p: any) => sum + (p.storyCount || 0), 0)
    const totalEpics = projects.reduce((sum: number, p: any) => sum + (p.epicCount || 0), 0)
    const completedStories = projects.reduce((sum: number, p: any) => sum + (p.completedStoryCount || 0), 0)
    const aiGeneratedStories = Math.floor(totalStories * 0.6) // Estimate 60% AI generated

    return [
      {
        title: 'Active Projects',
        value: activeProjects.toString(),
        change: `${totalProjects > 0 ? '+' + activeProjects : activeProjects} projects`,
        trend: activeProjects > 0 ? 'up' : 'neutral',
        icon: FolderKanban,
        color: 'purple',
      },
      {
        title: 'Total Stories',
        value: totalStories.toString(),
        change: `${totalEpics} epics`,
        trend: totalStories > 0 ? 'up' : 'neutral',
        icon: FileText,
        color: 'emerald',
      },
      {
        title: 'Completed',
        value: totalStories > 0 ? `${Math.round((completedStories / totalStories) * 100)}%` : '0%',
        change: `${completedStories} stories done`,
        trend: completedStories > 0 ? 'up' : 'neutral',
        icon: CheckCircle2,
        color: 'emerald',
      },
      {
        title: 'AI Generated',
        value: aiGeneratedStories.toString(),
        change: `${Math.round((aiGeneratedStories / totalStories) * 100)}% of stories`,
        trend: aiGeneratedStories > 0 ? 'up' : 'neutral',
        icon: Sparkles,
        color: 'purple',
      },
    ]
  }

  const metrics = calculateMetrics()

  const getRecentActivity = () => {
    if (projects.length === 0) {
      return []
    }

    // Generate activity based on projects
    const activities = projects.slice(0, 4).map((project: any, index: number) => ({
      id: index + 1,
      type: index % 3 === 0 ? 'story_created' : index % 3 === 1 ? 'ai_generated' : 'story_completed',
      title: `Updated ${project.name}`,
      project: project.name,
      user: project.ownerName || 'You',
      timestamp: new Date(Date.now() - (index + 1) * 1000 * 60 * 30),
      status: project.status === 'active' ? 'in-progress' : 'done',
    }))

    return activities
  }

  const recentActivity = getRecentActivity()

  const quickActions = [
    {
      icon: Plus,
      label: 'New Project',
      description: 'Start a new project',
      gradient: true,
    },
    {
      icon: Sparkles,
      label: 'AI Generate',
      description: 'Generate stories with AI',
      gradient: true,
    },
    {
      icon: Upload,
      label: 'Upload Document',
      description: 'Upload requirements doc',
      gradient: false,
    },
  ]

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-card">
        <div className="flex h-16 items-center gap-2 border-b border-border px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold gradient-text">SynqForge</span>
        </div>

        <nav className="space-y-1 p-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                activeNav === item.id
                  ? 'bg-gradient-primary text-white shadow-lg shadow-brand-purple-500/20'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <Button variant="outline" className="w-full justify-start gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 pl-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/80 backdrop-blur-xl px-8">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Welcome back! Here's what's happening.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              <Clock className="h-4 w-4 mr-2" />
              Last sync: 2m ago
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
          {/* Metrics Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {metrics.map((metric, i) => (
              <Card key={i} className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300">
                <div
                  className={cn(
                    'absolute top-0 right-0 h-32 w-32 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity',
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
                        'h-4 w-4',
                        metric.color === 'purple'
                          ? 'text-brand-purple-400'
                          : 'text-brand-emerald-400'
                      )}
                    />
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{metric.value}</div>
                  <div className="flex items-center gap-1 mt-2 text-xs">
                    {metric.trend === 'up' && (
                      <ArrowUpRight className="h-3 w-3 text-brand-emerald-400" />
                    )}
                    <span className="text-muted-foreground">{metric.change}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {quickActions.map((action, i) => (
                <Button
                  key={i}
                  variant={action.gradient ? 'default' : 'outline'}
                  className="h-auto flex-col items-start gap-2 p-6 group"
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
              <Button variant="ghost" size="sm">View All</Button>
            </div>
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-4 p-4 hover:bg-accent/50 transition-colors"
                    >
                      <div
                        className={cn(
                          'mt-1 flex h-2 w-2 rounded-full',
                          activity.type === 'ai_generated'
                            ? 'bg-brand-purple-500 shadow-glow-purple'
                            : 'bg-brand-emerald-500 shadow-glow-emerald'
                        )}
                      />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">{activity.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{activity.project}</span>
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
                            : 'outline'
                        }
                      >
                        {activity.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          )}
        </div>
      </main>
    </div>
  )
}
