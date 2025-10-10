'use client'

import * as React from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { FileText, Search, Sparkles, FolderKanban, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { AppSidebar } from '@/components/app-sidebar'
import { cn } from '@/lib/utils'

interface Story {
  id: string
  title: string
  description: string | null
  status: 'backlog' | 'ready' | 'in_progress' | 'review' | 'done' | 'blocked'
  priority: 'low' | 'medium' | 'high' | 'critical'
  storyPoints?: number
  storyType: string
  projectId: string
  epicId?: string | null
  aiGenerated: boolean
  createdAt: string
  project?: {
    id: string
    name: string
    key: string
  }
  epic?: {
    id: string
    title: string
    color: string | null
  } | null
}

interface Project {
  id: string
  name: string
  key: string
}

interface Epic {
  id: string
  title: string
  projectId: string
}

export default function StoriesPage() {
  const { status } = useSession()
  const router = useRouter()
  const [stories, setStories] = React.useState<Story[]>([])
  const [projects, setProjects] = React.useState<Project[]>([])
  const [epics, setEpics] = React.useState<Epic[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')

  // Filters
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [projectFilter, setProjectFilter] = React.useState<string>('all')
  const [epicFilter, setEpicFilter] = React.useState<string>('all')
  const [priorityFilter, setPriorityFilter] = React.useState<string>('all')
  const [searchQuery, setSearchQuery] = React.useState('')

  React.useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (status === 'authenticated') {
      fetchData()
    }
  }, [status, router])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError('')

      // Fetch projects and stories in parallel
      const [projectsRes, storiesRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/stories?limit=1000')
      ])

      if (!projectsRes.ok || !storiesRes.ok) {
        throw new Error('Failed to load data')
      }

      const projectsData = await projectsRes.json()
      const storiesData = await storiesRes.json()

      setProjects(Array.isArray(projectsData?.data) ? projectsData.data : [])
      setStories(Array.isArray(storiesData?.data) ? storiesData.data : [])

      // Fetch epics for all projects
      if (projectsData?.data && projectsData.data.length > 0) {
        const epicsPromises = projectsData.data.map((p: Project) =>
          fetch(`/api/projects/${p.id}/epics`).then(r => r.json())
        )
        const epicsResults = await Promise.all(epicsPromises)
        const allEpics = epicsResults.flatMap(r => Array.isArray(r?.data) ? r.data : [])
        setEpics(allEpics)
      }
    } catch (error: any) {
      console.error('Failed to fetch data:', error)
      setError(error.message || 'Failed to load stories')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: Story['status']) => {
    switch (status) {
      case 'done':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      case 'in_progress':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
      case 'review':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      case 'ready':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'blocked':
        return 'bg-red-500/10 text-red-400 border-red-500/20'
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

  // Filter stories based on selected filters
  const filteredStories = stories.filter(story => {
    const matchesSearch = !searchQuery ||
      story.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      story.description?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === 'all' || story.status === statusFilter
    const matchesProject = projectFilter === 'all' || story.projectId === projectFilter
    const matchesEpic = epicFilter === 'all' ||
      (epicFilter === 'none' && !story.epicId) ||
      story.epicId === epicFilter
    const matchesPriority = priorityFilter === 'all' || story.priority === priorityFilter

    return matchesSearch && matchesStatus && matchesProject && matchesEpic && matchesPriority
  })

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-screen bg-background">
        <AppSidebar />
        <main className="flex-1 ml-64">
          <div className="flex items-center justify-center h-screen">
            <div className="text-muted-foreground">Loading stories...</div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 ml-64">
        {/* Header */}
        <div className="border-b border-gray-700 bg-gray-800/50 backdrop-blur-xl sticky top-0 z-10">
          <div className="container mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/50">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">All Stories</h1>
                  <p className="text-gray-400">View and manage all your user stories across projects</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="text-sm">
                  {filteredStories.length} {filteredStories.length === 1 ? 'story' : 'stories'}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-6 py-8">
          {/* Filters */}
          <div className="mb-6 space-y-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search stories by title or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Status Filter */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Status</label>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="backlog">Backlog</option>
                  <option value="ready">Ready</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="done">Done</option>
                  <option value="blocked">Blocked</option>
                </Select>
              </div>

              {/* Project Filter */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Project</label>
                <Select
                  value={projectFilter}
                  onChange={(e) => setProjectFilter(e.target.value)}
                >
                  <option value="all">All Projects</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name} ({project.key})
                    </option>
                  ))}
                </Select>
              </div>

              {/* Epic Filter */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Epic</label>
                <Select
                  value={epicFilter}
                  onChange={(e) => setEpicFilter(e.target.value)}
                >
                  <option value="all">All Epics</option>
                  <option value="none">No Epic</option>
                  {epics.map(epic => (
                    <option key={epic.id} value={epic.id}>
                      {epic.title}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Priority Filter */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Priority</label>
                <Select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                >
                  <option value="all">All Priorities</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </Select>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Stories Grid */}
          {filteredStories.length === 0 ? (
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="h-16 w-16 rounded-full bg-purple-500/10 flex items-center justify-center mb-4">
                  <FileText className="h-8 w-8 text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {stories.length === 0 ? 'No Stories Yet' : 'No Stories Match Filters'}
                </h3>
                <p className="text-gray-400 text-center max-w-md mb-6">
                  {stories.length === 0
                    ? 'Create your first story in a project or use AI to generate stories.'
                    : 'Try adjusting your filter criteria to see more results.'}
                </p>
                {stories.length === 0 && (
                  <div className="flex gap-3">
                    <Button onClick={() => router.push('/projects')}>
                      <FolderKanban className="h-4 w-4 mr-2" />
                      Go to Projects
                    </Button>
                    <Button variant="outline" onClick={() => router.push('/ai-generate')}>
                      <Sparkles className="h-4 w-4 mr-2" />
                      AI Generate
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredStories.map(story => (
                <Card
                  key={story.id}
                  className="bg-gray-800/50 border-gray-700 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10 transition-all cursor-pointer"
                  onClick={() => router.push(`/stories/${story.id}`)}
                >
                  <CardContent className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge className={cn('text-xs border', getPriorityColor(story.priority))}>
                          {story.priority}
                        </Badge>
                        <Badge className={cn('text-xs border', getStatusColor(story.status))}>
                          {story.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      {story.aiGenerated && (
                        <Sparkles className="h-4 w-4 text-purple-400 flex-shrink-0" />
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="font-semibold text-white mb-2 line-clamp-2 group-hover:text-purple-400 transition-colors">
                      {story.title}
                    </h3>

                    {/* Description */}
                    {story.description && (
                      <p className="text-sm text-gray-400 line-clamp-2 mb-3">
                        {story.description}
                      </p>
                    )}

                    {/* Project & Epic */}
                    <div className="space-y-2 mb-3">
                      {story.project && (
                        <div className="flex items-center gap-2 text-xs">
                          <FolderKanban className="h-3 w-3 text-gray-500" />
                          <span className="text-gray-400">
                            {story.project.name} ({story.project.key})
                          </span>
                        </div>
                      )}
                      {story.epic && (
                        <div className="flex items-center gap-2 text-xs">
                          <Layers className="h-3 w-3 text-gray-500" />
                          <span className="text-gray-400">{story.epic.title}</span>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-700">
                      {story.storyPoints && (
                        <span className="font-mono">{story.storyPoints} pts</span>
                      )}
                      <span>{story.storyType}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
