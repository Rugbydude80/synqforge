'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api-client'
import type { Project } from '@/lib/api-client'
import {
  FolderKanban,
  Plus,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Settings,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'
import { CreateProjectModal } from '@/components/create-project-modal'
import { ProjectEditModal } from '@/components/project-edit-modal'
import { AppSidebar } from '@/components/app-sidebar'
import { cn } from '@/lib/utils'
import { subscribeToProjectMetrics } from '@/lib/events/project-events'

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = React.useState<Project[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [isEditOpen, setIsEditOpen] = React.useState(false)
  const [selectedProject, setSelectedProject] = React.useState<Project | null>(null)

  // Pagination state
  const [currentPage, setCurrentPage] = React.useState(1)
  const [itemsPerPage, setItemsPerPage] = React.useState(12)

  const fetchProjects = React.useCallback(async (options?: { silent?: boolean }) => {
    try {
      if (!options?.silent) {
        setIsLoading(true)
      }
      setError(null)
      const response = await api.projects.list()
      const nextProjects = Array.isArray(response?.data) ? response.data : []
      
      // Log for debugging if projects have zero counts
      if (process.env.NODE_ENV === 'development') {
        nextProjects.forEach((project: Project) => {
          if ((project.totalStories === 0 && project.totalEpics === 0) || 
              project.totalStories === undefined || project.totalEpics === undefined) {
            console.log(`[DEBUG] Project ${project.id} (${project.name}):`, {
              totalStories: project.totalStories,
              completedStories: project.completedStories,
              totalEpics: project.totalEpics,
              rawData: project
            })
          }
        })
      }
      
      setProjects(nextProjects)
    } catch (err: any) {
      console.error('Error fetching projects:', err)
      setError(err.message || 'Failed to load projects')
      setProjects([])
    } finally {
      if (!options?.silent) {
        setIsLoading(false)
      }
    }
  }, [])

  React.useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  React.useEffect(() => {
    const unsubscribe = subscribeToProjectMetrics(() => {
      fetchProjects({ silent: true })
    })

    return unsubscribe
  }, [fetchProjects])

  React.useEffect(() => {
    const interval = window.setInterval(() => {
      fetchProjects({ silent: true })
    }, 30000)

    return () => window.clearInterval(interval)
  }, [fetchProjects])


  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (project.description?.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter])

  // Paginate filtered projects
  const totalProjects = filteredProjects.length
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedProjects = filteredProjects.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1)
  }

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-400 border-green-500/20'
      case 'planning':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'on_hold':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
      case 'completed':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
      case 'archived':
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffInDays === 0) return 'Today'
    if (diffInDays === 1) return 'Yesterday'
    if (diffInDays < 7) return `${diffInDays} days ago`
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`
    return `${Math.floor(diffInDays / 365)} years ago`
  }

  const handleEditProject = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedProject(project)
    setIsEditOpen(true)
  }

  const handleModalSuccess = () => {
    fetchProjects()
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background">
        <AppSidebar />
        <main className="flex-1 md:ml-64">
          <div className="container mx-auto px-3 sm:px-4 md:px-6 py-6 md:py-8">
            <div className="mb-6 md:mb-8">
              <div className="h-8 w-48 bg-gray-700/50 rounded animate-pulse mb-2" />
              <div className="h-4 w-full max-w-96 bg-gray-700/50 rounded animate-pulse" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-64 bg-gray-800/50 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen bg-background">
        <AppSidebar />
        <main className="flex-1 md:ml-64 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Something went wrong</h3>
            <p className="text-gray-400 mb-6">{error}</p>
            <Button onClick={() => fetchProjects()}>Try Again</Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 md:ml-64">
        <div className="container mx-auto px-3 sm:px-4 md:px-6 py-6 md:py-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Projects</h1>
              <p className="text-sm sm:text-base text-gray-400">Manage your projects and track progress</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Button
                variant="outline"
                onClick={() => router.push('/ai-generate')}
                className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20 hover:border-purple-500/40"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                AI Generate
              </Button>
              <Button onClick={() => setIsCreateOpen(true)} size="lg">
                <Plus className="h-5 w-5 mr-2" />
                New Project
              </Button>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </Select>
          </div>
        </div>

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          <div className="text-center py-16">
            <FolderKanban className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              {searchQuery || statusFilter !== 'all' ? 'No projects found' : 'No projects yet'}
            </h3>
            <p className="text-gray-400 mb-6">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'Get started by creating your first project'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-5 w-5 mr-2" />
                Create Project
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {paginatedProjects.map((project) => (
              <Card
                key={project.id}
                className="group hover:shadow-2xl hover:shadow-purple-500/10 transition-all cursor-pointer"
                onClick={() => router.push(`/projects/${project.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="outline" className="font-mono">
                      {project.key}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <Badge className={cn('border', getStatusColor(project.status))}>
                        {project.status.replace('_', ' ')}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => handleEditProject(project, e)}
                        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="text-xl group-hover:text-purple-400 transition-colors">
                    {project.name}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {project.description || 'No description provided'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Progress Bar */}
                  {project.totalStories !== undefined && project.totalStories > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-400">Progress</span>
                        <span className="text-white font-medium">
                          {project.progressPercentage || 0}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        { }
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-emerald-500 transition-all"
                          style={{ width: `${project.progressPercentage || 0}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-4">
                    <div>
                      <div className="flex items-center gap-2 text-gray-400 mb-1">
                        <FolderKanban className="h-4 w-4" />
                        <span>Total Stories</span>
                      </div>
                      <div className="text-white font-semibold">
                        {project.totalStories ?? 0}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-gray-400 mb-1">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Completed</span>
                      </div>
                      <div className="text-white font-semibold">
                        {project.completedStories ?? 0}
                      </div>
                    </div>
                    <div className="hidden md:block">
                      <div className="flex items-center gap-2 text-gray-400 mb-1">
                        <Layers className="h-4 w-4" />
                        <span>Epics</span>
                      </div>
                      <div className="text-white font-semibold">
                        {project.totalEpics ?? project.epicCount ?? 0}
                      </div>
                    </div>
                  </div>
                  <div className="md:hidden grid grid-cols-1 gap-4 text-sm mb-4">
                    <div>
                      <div className="flex items-center gap-2 text-gray-400 mb-1">
                        <Layers className="h-4 w-4" />
                        <span>Epics</span>
                      </div>
                      <div className="text-white font-semibold">
                        {project.totalEpics ?? project.epicCount ?? 0}
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="pt-4 border-t border-gray-700 flex items-center justify-between text-xs text-gray-400">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>Updated {formatDate(project.updatedAt)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {filteredProjects.length > 0 && (
            <div className="mt-8">
              <Pagination
                currentPage={currentPage}
                totalItems={totalProjects}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleItemsPerPageChange}
                itemName="projects"
              />
            </div>
          )}
          </>
        )}
        </div>
      </main>

      {/* Modals */}
      <CreateProjectModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={handleModalSuccess}
      />
      {isEditOpen && selectedProject && (
        <ProjectEditModal
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          project={selectedProject}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  )
}


