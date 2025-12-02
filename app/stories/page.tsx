'use client'

import * as React from 'react'
import { Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FileText, Search, Sparkles, FolderKanban, Layers, Plus, Edit, Trash2, CheckSquare, Square, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { Checkbox } from '@/components/ui/checkbox'
import { AppSidebar } from '@/components/app-sidebar'
import { StoryFormModal } from '@/components/story-form-modal'
import { BatchRefinementModal } from '@/components/story-refine/BatchRefinementModal'
import { cn } from '@/lib/utils'
import { api, type Story } from '@/lib/api-client'
import { exportStoriesToCSV } from '@/lib/utils/export'
import { emitProjectMetricsChanged } from '@/lib/events/project-events'
import { toast } from 'sonner'

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

function StoriesPageContent() {
  const { status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const highlightId = searchParams?.get('highlight')

  const [stories, setStories] = React.useState<Story[]>([])
  const [projects, setProjects] = React.useState<Project[]>([])
  const [epics, setEpics] = React.useState<Epic[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')

  // Modals
  const [showCreateModal, setShowCreateModal] = React.useState(false)
  const [showEditModal, setShowEditModal] = React.useState(false)
  const [selectedStory, setSelectedStory] = React.useState<Story | undefined>()
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>('')
  const [showBatchRefinement, setShowBatchRefinement] = React.useState(false)
  
  // Batch selection
  const [selectedStoryIds, setSelectedStoryIds] = React.useState<Set<string>>(new Set())
  const [isSelectMode, setIsSelectMode] = React.useState(false)

  // Filters
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [projectFilter, setProjectFilter] = React.useState<string>('all')
  const [epicFilter, setEpicFilter] = React.useState<string>('all')
  const [priorityFilter, setPriorityFilter] = React.useState<string>('all')
  const [searchQuery, setSearchQuery] = React.useState('')

  // Pagination state
  const [currentPage, setCurrentPage] = React.useState(1)
  const [itemsPerPage, setItemsPerPage] = React.useState(24)

  const sortedProjects = React.useMemo(
    () => [...projects].sort((a, b) => a.name.localeCompare(b.name)),
    [projects]
  )

  const filteredEpics = React.useMemo(() => {
    const availableEpics =
      projectFilter === 'all'
        ? epics
        : epics.filter((epic) => epic.projectId === projectFilter)

    return [...availableEpics].sort((a, b) => a.title.localeCompare(b.title))
  }, [epics, projectFilter])

  React.useEffect(() => {
    if (epicFilter === 'all' || epicFilter === 'none') {
      return
    }

    const epicMatchesSelection = filteredEpics.some((epic) => epic.id === epicFilter)

    if (!epicMatchesSelection) {
      setEpicFilter('all')
    }
  }, [filteredEpics, epicFilter])

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
      setEpics([])

      // Fetch projects and stories in parallel
      const [projectsRes, storiesRes] = await Promise.all([
        fetch('/api/projects', { cache: 'no-store', credentials: 'include' }),
        fetch('/api/stories?limit=1000', { cache: 'no-store', credentials: 'include' })
      ])

      if (!projectsRes.ok) {
        throw new Error('Failed to load projects')
      }

      if (!storiesRes.ok) {
        throw new Error('Failed to load stories')
      }

      const projectsData = await projectsRes.json()
      const storiesData = await storiesRes.json()

      const nextProjects: Project[] = Array.isArray(projectsData?.data) ? projectsData.data : []
      const nextStories: Story[] = Array.isArray(storiesData?.data) ? storiesData.data : []

      setProjects(nextProjects)
      setStories(nextStories)

      // Fetch epics for all projects
      if (nextProjects.length > 0) {
        const epicsResults = await Promise.all(
          nextProjects.map(async (project) => {
            try {
              const response = await fetch(`/api/projects/${project.id}/epics`, {
                cache: 'no-store',
                credentials: 'include'
              })

              if (!response.ok) {
                throw new Error('Failed to load epics')
              }

              const payload = await response.json()
              return Array.isArray(payload?.data) ? (payload.data as Epic[]) : []
            } catch (error) {
              console.error(`Failed to fetch epics for project ${project.id}:`, error)
              return []
            }
          })
        )

        setEpics(epicsResults.flat())
      }
    } catch (error: any) {
      console.error('Failed to fetch data:', error)
      setError(error.message || 'Failed to load stories')
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

  const toTitleCase = (value: string) =>
    value
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')

  const formatStatusLabel = (status: Story['status']) =>
    status ? toTitleCase(status) : 'Unknown'

  const formatPriorityLabel = (priority: Story['priority']) =>
    priority ? toTitleCase(priority) : 'Unspecified'

  const formatStoryType = (storyType: Story['storyType']) =>
    storyType ? toTitleCase(storyType) : 'Unknown'

  const handleCreateStory = () => {
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

    setSelectedProjectId(projectId)
    setSelectedStory(undefined)
    setShowCreateModal(true)
  }

  const handleEditStory = (story: Story, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedStory(story)
    setSelectedProjectId(story.projectId)
    setShowEditModal(true)
  }

  const handleDeleteStory = async (storyId: string, e: React.MouseEvent) => {
    e.stopPropagation()

    if (!confirm('Are you sure you want to delete this story?')) {
      return
    }

    try {
      const story = stories.find(item => item.id === storyId)
      await api.stories.delete(storyId)
      toast.success('Story deleted successfully!')
      if (story?.projectId) {
        emitProjectMetricsChanged(story.projectId)
      } else {
        emitProjectMetricsChanged()
      }
      fetchData()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete story')
    }
  }

  const handleModalSuccess = () => {
    fetchData()
  }

  // Effect to scroll to highlighted story
  React.useEffect(() => {
    if (highlightId && !loading) {
      // Wait for DOM to render
      setTimeout(() => {
        const element = document.getElementById(`story-${highlightId}`)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          // Remove highlight after 3 seconds
          setTimeout(() => {
            const params = new URLSearchParams(window.location.search)
            params.delete('highlight')
            router.replace(`${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`, { scroll: false })
          }, 3000)
        }
      }, 100)
    }
  }, [highlightId, loading, router])

  // Filter stories based on selected filters
  const filteredStories = React.useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    return stories.filter((story) => {
      const matchesSearch =
        normalizedQuery.length === 0 ||
        story.title.toLowerCase().includes(normalizedQuery) ||
        (story.description?.toLowerCase().includes(normalizedQuery) ?? false)

      const matchesStatus =
        statusFilter === 'all' || story.status === statusFilter

      const matchesProject =
        projectFilter === 'all' || story.projectId === projectFilter

      const matchesEpic =
        epicFilter === 'all' ||
        (epicFilter === 'none' && !story.epicId) ||
        story.epicId === epicFilter

      const matchesPriority =
        priorityFilter === 'all' || story.priority === priorityFilter

      return (
        matchesSearch &&
        matchesStatus &&
        matchesProject &&
        matchesEpic &&
        matchesPriority
      )
    })
  }, [stories, searchQuery, statusFilter, projectFilter, epicFilter, priorityFilter])

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter, projectFilter, epicFilter, priorityFilter])

  // Paginate filtered stories
  const totalStories = filteredStories.length
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedStories = filteredStories.slice(startIndex, endIndex)

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
            <div className="text-muted-foreground">Loading stories...</div>
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
                  <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white">All Stories</h1>
                  <p className="text-gray-400">View and manage all your user stories across projects</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {isSelectMode && selectedStoryIds.size > 0 && (
                  <>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => setShowBatchRefinement(true)}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Refine Selected ({selectedStoryIds.size})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedStoryIds(new Set());
                        setIsSelectMode(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </>
                )}
                {!isSelectMode && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        try {
                          exportStoriesToCSV(stories)
                          toast.success('Stories exported to CSV')
                        } catch (_error) {
                          toast.error('Failed to export stories')
                        }
                      }}
                      disabled={stories.length === 0}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsSelectMode(true)}
                    >
                      <CheckSquare className="h-4 w-4 mr-2" />
                      Select Stories
                    </Button>
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
                      onClick={handleCreateStory}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      New Story
                    </Button>
                  </>
                )}
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
                  {sortedProjects.map(project => (
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
                  {filteredEpics.map(epic => (
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
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6 flex items-center justify-between gap-4 flex-wrap">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={fetchData}>
                Try again
              </Button>
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
            <>
              {isSelectMode && (
                <div className="mb-4 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectedStoryIds.size === paginatedStories.length) {
                        setSelectedStoryIds(new Set());
                      } else {
                        setSelectedStoryIds(new Set(paginatedStories.map(s => s.id)));
                      }
                    }}
                  >
                    {selectedStoryIds.size === paginatedStories.length ? (
                      <>
                        <Square className="h-4 w-4 mr-2" />
                        Deselect All
                      </>
                    ) : (
                      <>
                        <CheckSquare className="h-4 w-4 mr-2" />
                        Select All ({paginatedStories.length})
                      </>
                    )}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {selectedStoryIds.size} selected
                  </span>
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {paginatedStories.map(story => (
                <Card
                  key={story.id}
                  id={`story-${story.id}`}
                  className={cn(
                    "bg-gray-800/50 border-gray-700 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10 transition-all group",
                    highlightId === story.id && "ring-2 ring-purple-500 border-purple-500 animate-pulse",
                    isSelectMode ? "cursor-default" : "cursor-pointer",
                    selectedStoryIds.has(story.id) && "ring-2 ring-purple-500 border-purple-500"
                  )}
                  onClick={() => {
                    if (isSelectMode) {
                      setSelectedStoryIds(prev => {
                        const next = new Set(prev);
                        if (next.has(story.id)) {
                          next.delete(story.id);
                        } else {
                          next.add(story.id);
                        }
                        return next;
                      });
                    } else {
                      router.push(`/stories/${story.id}`);
                    }
                  }}
                >
                  <CardContent className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      {isSelectMode && (
                        <Checkbox
                          checked={selectedStoryIds.has(story.id)}
                          onCheckedChange={(checked) => {
                            setSelectedStoryIds(prev => {
                              const next = new Set(prev);
                              if (checked) {
                                next.add(story.id);
                              } else {
                                next.delete(story.id);
                              }
                              return next;
                            });
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="mr-2"
                        />
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        {story.priority && (
                          <Badge className={cn('text-xs border', getPriorityColor(story.priority))}>
                            {formatPriorityLabel(story.priority)}
                          </Badge>
                        )}
                        <Badge className={cn('text-xs border', getStatusColor(story.status))}>
                          {formatStatusLabel(story.status)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        {story.aiGenerated && (
                          <Sparkles className="h-4 w-4 text-purple-400 flex-shrink-0" />
                        )}
                        <div className="hidden group-hover:flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => handleEditStory(story, e)}
                            className="h-7 w-7 p-0"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => handleDeleteStory(story.id, e)}
                            className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
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
                      <span>{formatStoryType(story.storyType)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {filteredStories.length > 0 && (
              <div className="mt-8">
                <Pagination
                  currentPage={currentPage}
                  totalItems={totalStories}
                  itemsPerPage={itemsPerPage}
                  onPageChange={handlePageChange}
                  onItemsPerPageChange={handleItemsPerPageChange}
                  itemName="stories"
                />
              </div>
            )}
            </>
          )}
        </div>
      </main>

      {/* Modals */}
      {showCreateModal && (
        <StoryFormModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          projectId={selectedProjectId}
          onSuccess={handleModalSuccess}
        />
      )}
      {showEditModal && selectedStory && (
        <StoryFormModal
          open={showEditModal}
          onOpenChange={setShowEditModal}
          projectId={selectedProjectId}
          story={selectedStory}
          onSuccess={handleModalSuccess}
        />
      )}
      {showBatchRefinement && (
        <BatchRefinementModal
          stories={stories.filter(s => selectedStoryIds.has(s.id))}
          isOpen={showBatchRefinement}
          onClose={() => {
            setShowBatchRefinement(false);
            setSelectedStoryIds(new Set());
            setIsSelectMode(false);
          }}
          onComplete={() => {
            fetchData();
            setShowBatchRefinement(false);
            setSelectedStoryIds(new Set());
            setIsSelectMode(false);
          }}
        />
      )}
    </div>
  )
}

export default function StoriesPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen bg-background">
        <AppSidebar />
        <main className="flex-1 ml-64">
          <div className="flex items-center justify-center h-screen">
            <div className="text-muted-foreground">Loading stories...</div>
          </div>
        </main>
      </div>
    }>
      <StoriesPageContent />
    </Suspense>
  )
}
