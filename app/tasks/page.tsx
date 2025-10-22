'use client'

import * as React from 'react'
import { Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckSquare, Search, FolderKanban, FileText, Plus, Trash2, Clock, AlertCircle, Circle, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { AppSidebar } from '@/components/app-sidebar'
import { TaskFormDialog } from '@/components/tasks/task-form-dialog'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Task {
  id: string
  storyId: string
  projectId: string
  title: string
  description: string | null
  status: 'todo' | 'in_progress' | 'done' | 'blocked'
  priority: 'low' | 'medium' | 'high' | 'critical'
  estimatedHours: number | null
  actualHours: number | null
  assigneeId: string | null
  tags: string[] | null
  orderIndex: number | null
  completedAt: Date | null
  createdBy: string
  createdAt: Date | null
  updatedAt: Date | null
  assignee?: {
    id: string
    name: string | null
    email: string
    avatar: string | null
  } | null
  story?: {
    id: string
    title: string
    projectId: string
  }
  project?: {
    id: string
    name: string
    key: string
  }
}

interface Project {
  id: string
  name: string
  key: string
}

interface Story {
  id: string
  title: string
  projectId: string
}

function TasksPageContent() {
  const { status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const highlightId = searchParams?.get('highlight')

  const [tasks, setTasks] = React.useState<Task[]>([])
  const [projects, setProjects] = React.useState<Project[]>([])
  const [stories, setStories] = React.useState<Story[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')

  // Modals
  const [showCreateDialog, setShowCreateDialog] = React.useState(false)
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>('')
  const [selectedStoryId, setSelectedStoryId] = React.useState<string>('')

  // Filters
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [projectFilter, setProjectFilter] = React.useState<string>('all')
  const [storyFilter, setStoryFilter] = React.useState<string>('all')
  const [priorityFilter, setPriorityFilter] = React.useState<string>('all')
  const [searchQuery, setSearchQuery] = React.useState('')

  // Pagination state
  const [currentPage, setCurrentPage] = React.useState(1)
  const [itemsPerPage, setItemsPerPage] = React.useState(24)

  const sortedProjects = React.useMemo(
    () => [...projects].sort((a, b) => a.name.localeCompare(b.name)),
    [projects]
  )

  const filteredStories = React.useMemo(() => {
    const availableStories =
      projectFilter === 'all'
        ? stories
        : stories.filter((story) => story.projectId === projectFilter)

    return [...availableStories].sort((a, b) => a.title.localeCompare(b.title))
  }, [stories, projectFilter])

  React.useEffect(() => {
    if (storyFilter === 'all') {
      return
    }

    const storyMatchesSelection = filteredStories.some((story) => story.id === storyFilter)

    if (!storyMatchesSelection) {
      setStoryFilter('all')
    }
  }, [filteredStories, storyFilter])

  React.useEffect(() => {
    if (projectFilter === 'all') {
      return
    }

    const projectExists = projects.some((project) => project.id === projectFilter)

    if (!projectExists) {
      setProjectFilter('all')
    }
  }, [projects, projectFilter])

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      setStories([])

      // Fetch projects and tasks in parallel
      const [projectsRes, tasksRes] = await Promise.all([
        fetch('/api/projects', { cache: 'no-store', credentials: 'include' }),
        fetch('/api/tasks?limit=1000', { cache: 'no-store', credentials: 'include' })
      ])

      if (!projectsRes.ok) {
        throw new Error('Failed to load projects')
      }

      if (!tasksRes.ok) {
        throw new Error('Failed to load tasks')
      }

      const projectsData = await projectsRes.json()
      const tasksData = await tasksRes.json()

      const nextProjects: Project[] = Array.isArray(projectsData?.data) ? projectsData.data : []
      const nextTasks: Task[] = Array.isArray(tasksData?.data) ? tasksData.data : []

      setProjects(nextProjects)
      setTasks(nextTasks)

      // Fetch stories for all projects
      if (nextProjects.length > 0) {
        const storiesResults = await Promise.all(
          nextProjects.map(async (project) => {
            try {
              const response = await fetch(`/api/projects/${project.id}/stories`, {
                cache: 'no-store',
                credentials: 'include'
              })

              if (!response.ok) {
                throw new Error('Failed to load stories')
              }

              const payload = await response.json()
              return Array.isArray(payload?.data) ? (payload.data as Story[]) : []
            } catch (error) {
              console.error(`Failed to fetch stories for project ${project.id}:`, error)
              return []
            }
          })
        )

        setStories(storiesResults.flat())
      }
    } catch (error: any) {
      console.error('Failed to fetch data:', error)
      setError(error.message || 'Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (status === 'authenticated') {
      fetchData()
    }
  }, [status, router, fetchData])

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'done':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      case 'in_progress':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
      case 'blocked':
        return 'bg-red-500/10 text-red-400 border-red-500/20'
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    }
  }

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'done':
        return <CheckSquare className="h-3.5 w-3.5" />
      case 'in_progress':
        return <Clock className="h-3.5 w-3.5" />
      case 'blocked':
        return <AlertCircle className="h-3.5 w-3.5" />
      default:
        return <Circle className="h-3.5 w-3.5" />
    }
  }

  const getPriorityColor = (priority: Task['priority']) => {
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

  const toTitleCase = (value: string) =>
    value
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')

  const formatStatusLabel = (status: Task['status']) =>
    status ? toTitleCase(status) : 'Unknown'

  const formatPriorityLabel = (priority: Task['priority']) =>
    priority ? toTitleCase(priority) : 'Unspecified'

  const handleCreateTask = () => {
    if (projects.length === 0) {
      toast.error('Please create a project first')
      router.push('/projects')
      return
    }

    // If a project filter is selected, use that; otherwise use the first project
    const projectId = projectFilter !== 'all' ? projectFilter : projects[0]?.id
    if (!projectId) {
      toast.error('No project selected')
      return
    }

    // If a story filter is selected, use that; otherwise empty
    const storyId = storyFilter !== 'all' ? storyFilter : ''

    setSelectedProjectId(projectId)
    setSelectedStoryId(storyId)
    setShowCreateDialog(true)
  }

  const handleDeleteTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation()

    if (!confirm('Are you sure you want to delete this task?')) {
      return
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to delete task')
      }

      toast.success('Task deleted successfully!')
      fetchData()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete task')
    }
  }

  const handleTaskSuccess = () => {
    setShowCreateDialog(false)
    fetchData()
    toast.success('Task saved successfully!')
  }

  // Effect to scroll to highlighted task
  React.useEffect(() => {
    if (highlightId && !loading) {
      setTimeout(() => {
        const element = document.getElementById(`task-${highlightId}`)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          setTimeout(() => {
            const params = new URLSearchParams(window.location.search)
            params.delete('highlight')
            router.replace(`${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`, { scroll: false })
          }, 3000)
        }
      }, 100)
    }
  }, [highlightId, loading, router])

  // Filter tasks based on selected filters
  const filteredTasks = React.useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    return tasks.filter((task) => {
      const matchesSearch =
        normalizedQuery.length === 0 ||
        task.title.toLowerCase().includes(normalizedQuery) ||
        (task.description?.toLowerCase().includes(normalizedQuery) ?? false)

      const matchesStatus =
        statusFilter === 'all' || task.status === statusFilter

      const matchesProject =
        projectFilter === 'all' || task.projectId === projectFilter

      const matchesStory =
        storyFilter === 'all' || task.storyId === storyFilter

      const matchesPriority =
        priorityFilter === 'all' || task.priority === priorityFilter

      return (
        matchesSearch &&
        matchesStatus &&
        matchesProject &&
        matchesStory &&
        matchesPriority
      )
    })
  }, [tasks, searchQuery, statusFilter, projectFilter, storyFilter, priorityFilter])

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter, projectFilter, storyFilter, priorityFilter])

  // Paginate filtered tasks
  const totalTasks = filteredTasks.length
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedTasks = filteredTasks.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1)
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-screen bg-background">
        <AppSidebar />
        <main className="flex-1 md:ml-64">
          <div className="flex items-center justify-center h-screen">
            <div className="text-muted-foreground">Loading tasks...</div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 md:ml-64">
        {/* Header */}
        <div className="border-b border-gray-700 bg-gray-800/50 backdrop-blur-xl sticky top-0 z-10">
          <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/50">
                  <CheckSquare className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white">All Tasks</h1>
                  <p className="text-gray-400">View and manage all your tasks across projects</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchData}
                  disabled={loading}
                >
                  Refresh
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreateTask}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Task
                </Button>
                <Badge variant="secondary" className="text-sm">
                  {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
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
                placeholder="Search tasks by title or description..."
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
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
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
                  {sortedProjects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name} ({project.key})
                    </option>
                  ))}
                </Select>
              </div>

              {/* Story Filter */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Story</label>
                <Select
                  value={storyFilter}
                  onChange={(e) => setStoryFilter(e.target.value)}
                >
                  <option value="all">All Stories</option>
                  {filteredStories.map(story => (
                    <option key={story.id} value={story.id}>
                      {story.title}
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
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6 flex items-center justify-between gap-4 flex-wrap">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={fetchData}>
                Try again
              </Button>
            </div>
          )}

          {/* Tasks Grid */}
          {filteredTasks.length === 0 ? (
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="h-16 w-16 rounded-full bg-purple-500/10 flex items-center justify-center mb-4">
                  <CheckSquare className="h-8 w-8 text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {tasks.length === 0 ? 'No Tasks Yet' : 'No Tasks Match Filters'}
                </h3>
                <p className="text-gray-400 text-center max-w-md mb-6">
                  {tasks.length === 0
                    ? 'Create your first task in a story or project.'
                    : 'Try adjusting your filter criteria to see more results.'}
                </p>
                {tasks.length === 0 && (
                  <div className="flex gap-3">
                    <Button onClick={() => router.push('/projects')}>
                      <FolderKanban className="h-4 w-4 mr-2" />
                      Go to Projects
                    </Button>
                    <Button variant="outline" onClick={() => router.push('/stories')}>
                      <FileText className="h-4 w-4 mr-2" />
                      Go to Stories
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {paginatedTasks.map(task => (
                  <Card
                    key={task.id}
                    id={`task-${task.id}`}
                    className={cn(
                      "bg-gray-800/50 border-gray-700 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10 transition-all cursor-pointer group",
                      highlightId === task.id && "ring-2 ring-purple-500 border-purple-500 animate-pulse"
                    )}
                    onClick={() => task.story && router.push(`/stories/${task.storyId}`)}
                  >
                    <CardContent className="p-5">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {task.priority && (
                            <Badge className={cn('text-xs border', getPriorityColor(task.priority))}>
                              {formatPriorityLabel(task.priority)}
                            </Badge>
                          )}
                          <Badge className={cn('text-xs border flex items-center gap-1', getStatusColor(task.status))}>
                            {getStatusIcon(task.status)}
                            {formatStatusLabel(task.status)}
                          </Badge>
                        </div>
                        <div className="hidden group-hover:flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => handleDeleteTask(task.id, e)}
                            className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="font-semibold text-white mb-2 line-clamp-2 group-hover:text-purple-400 transition-colors">
                        {task.title}
                      </h3>

                      {/* Description */}
                      {task.description && (
                        <p className="text-sm text-gray-400 line-clamp-2 mb-3">
                          {task.description}
                        </p>
                      )}

                      {/* Project & Story */}
                      <div className="space-y-2 mb-3">
                        {task.project && (
                          <div className="flex items-center gap-2 text-xs">
                            <FolderKanban className="h-3 w-3 text-gray-500" />
                            <span className="text-gray-400">
                              {task.project.name} ({task.project.key})
                            </span>
                          </div>
                        )}
                        {task.story && (
                          <div className="flex items-center gap-2 text-xs">
                            <FileText className="h-3 w-3 text-gray-500" />
                            <span className="text-gray-400 line-clamp-1">{task.story.title}</span>
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-700">
                        <div className="flex items-center gap-2">
                          {task.estimatedHours && (
                            <span className="font-mono">{task.estimatedHours}h est</span>
                          )}
                          {task.actualHours && (
                            <span className="font-mono">{task.actualHours}h act</span>
                          )}
                        </div>
                        {task.assignee && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{task.assignee.name || task.assignee.email}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {filteredTasks.length > 0 && (
                <div className="mt-8">
                  <Pagination
                    currentPage={currentPage}
                    totalItems={totalTasks}
                    itemsPerPage={itemsPerPage}
                    onPageChange={handlePageChange}
                    onItemsPerPageChange={handleItemsPerPageChange}
                    itemName="tasks"
                  />
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Create Dialog */}
      {showCreateDialog && (
        <TaskFormDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          storyId={selectedStoryId || undefined}
          projectId={selectedProjectId}
          onSuccess={handleTaskSuccess}
        />
      )}
    </div>
  )
}

export default function TasksPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen bg-background">
        <AppSidebar />
        <main className="flex-1 ml-64">
          <div className="flex items-center justify-center h-screen">
            <div className="text-muted-foreground">Loading tasks...</div>
          </div>
        </main>
      </div>
    }>
      <TasksPageContent />
    </Suspense>
  )
}
