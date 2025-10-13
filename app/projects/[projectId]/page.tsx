'use client'

import * as React from 'react'
import { useRouter, useParams } from 'next/navigation'
import { api } from '@/lib/api-client'
import type { Project, Story, Epic } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StoryFormModal } from '@/components/story-form-modal'
import { EpicFormModal } from '@/components/epic-form-modal'
import { AppSidebar } from '@/components/app-sidebar'
import { ExportButton } from '@/components/export-button'
import { ArrowLeft, Plus, Settings, Sparkles, Layers, FileText, Edit, Trash2, Rocket } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useDroppable } from '@dnd-kit/core'

// Draggable Story Card Component
function DraggableStoryCard({ story }: { story: Story }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: story.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
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

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="group hover:shadow-lg hover:shadow-purple-500/10 transition-all cursor-grab active:cursor-grabbing"
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <Badge className={cn('text-xs border', getPriorityColor(story.priority))}>
            {story.priority}
          </Badge>
          {story.aiGenerated && (
            <Sparkles className="h-4 w-4 text-purple-400" />
          )}
        </div>

        <h3 className="font-semibold text-white mb-2 line-clamp-2 group-hover:text-purple-400 transition-colors">
          {story.title}
        </h3>

        {story.description && (
          <p className="text-sm text-gray-400 line-clamp-2 mb-3">
            {story.description}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-gray-400">
          {story.storyPoints && (
            <span className="font-mono">{story.storyPoints} pts</span>
          )}
          <span className="text-xs text-gray-500">{story.storyType}</span>
        </div>
      </CardContent>
    </Card>
  )
}

// Droppable Column Component
function DroppableColumn({
  column,
  stories,
}: {
  column: { id: Story['status']; title: string; color: string }
  stories: Story[]
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  })

  return (
    <div ref={setNodeRef} className="flex flex-col">
      {/* Column Header */}
      <div className="mb-4">
        <div
          className={cn(
            'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r text-white text-sm font-semibold',
            column.color
          )}
        >
          <span>{column.title}</span>
          <Badge variant="secondary" className="bg-white/20 text-white border-0">
            {stories.length}
          </Badge>
        </div>
      </div>

      {/* Story Cards */}
      <div
        className={cn(
          'flex-1 space-y-3 min-h-[200px] p-2 rounded-lg transition-colors',
          isOver && 'bg-purple-500/10 ring-2 ring-purple-500/50'
        )}
      >
        <SortableContext items={stories.map(s => s.id)} strategy={verticalListSortingStrategy}>
          {stories.map(story => (
            <DraggableStoryCard key={story.id} story={story} />
          ))}
        </SortableContext>

        {/* Empty State */}
        {stories.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            No stories
          </div>
        )}
      </div>
    </div>
  )
}

export default function ProjectDetailPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.projectId as string

  const [project, setProject] = React.useState<Project | null>(null)
  const [stories, setStories] = React.useState<Story[]>([])
  const [epics, setEpics] = React.useState<Epic[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [isStoryModalOpen, setIsStoryModalOpen] = React.useState(false)
  const [isEpicModalOpen, setIsEpicModalOpen] = React.useState(false)
  const [selectedEpic, setSelectedEpic] = React.useState<Epic | undefined>()
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [activeTab, setActiveTab] = React.useState<'stories' | 'epics'>('stories')

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  React.useEffect(() => {
    if (projectId) {
      fetchProjectData()
    }
  }, [projectId])

  const fetchProjectData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const [projectData, storiesResponse, epicsResponse] = await Promise.all([
        api.projects.getById(projectId),
        api.stories.list({ projectId, limit: 100 }),
        api.epics.list({ projectId }),
      ])

      setProject(projectData)
      setStories(Array.isArray(storiesResponse?.data) ? storiesResponse.data : [])
      setEpics(Array.isArray(epicsResponse?.data) ? epicsResponse.data : [])
    } catch (err: any) {
      setError(err.message || 'Failed to load project')
      toast.error(err.message || 'Failed to load project')
      setStories([])
      setEpics([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const storyId = active.id as string
    const overId = over.id as string

    // Check if dropping on a column
    const targetColumn = columns.find(col => col.id === overId)
    if (!targetColumn) return

    const story = stories.find(s => s.id === storyId)
    if (!story || story.status === targetColumn.id) return

    const newStatus = targetColumn.id

    // Optimistic update
    const previousStories = stories
    setStories(prev =>
      prev.map(s => (s.id === storyId ? { ...s, status: newStatus } : s))
    )

    try {
      await api.stories.move(storyId, { newStatus })
      toast.success('Story moved successfully')
    } catch (err: any) {
      // Rollback on error
      setStories(previousStories)
      toast.error(err.message || 'Failed to move story')
    }
  }

  const columns: Array<{ id: Story['status']; title: string; color: string }> = [
    { id: 'backlog', title: 'Backlog', color: 'from-gray-500 to-gray-600' },
    { id: 'in_progress', title: 'In Progress', color: 'from-purple-500 to-purple-600' },
    { id: 'review', title: 'Review', color: 'from-amber-500 to-amber-600' },
    { id: 'done', title: 'Done', color: 'from-emerald-500 to-emerald-600' },
  ]

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

  if (error || !project) {
    return (
      <div className="flex min-h-screen bg-background">
        <AppSidebar />
        <main className="flex-1 ml-64 flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-white mb-2">Failed to load project</h3>
            <p className="text-gray-400 mb-6">{error}</p>
            <Button onClick={() => router.push('/projects')}>Back to Projects</Button>
          </div>
        </main>
      </div>
    )
  }

  const getStoriesByStatus = (status: Story['status']) => {
    return (stories || []).filter(s => s.status === status)
  }

  const handleCreateEpic = () => {
    setSelectedEpic(undefined)
    setIsEpicModalOpen(true)
  }

  const handleEditEpic = (epic: Epic, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedEpic(epic)
    setIsEpicModalOpen(true)
  }

  const handleDeleteEpic = async (epicId: string, e: React.MouseEvent) => {
    e.stopPropagation()

    if (!confirm('Are you sure you want to delete this epic? Stories linked to this epic will not be deleted.')) {
      return
    }

    try {
      await api.epics.delete(epicId)
      toast.success('Epic deleted successfully!')
      fetchProjectData()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete epic')
    }
  }

  const handlePublishEpic = async (epicId: string, e: React.MouseEvent) => {
    e.stopPropagation()

    try {
      await api.epics.publish(epicId)
      toast.success('Epic published successfully! Stories are now active.')
      fetchProjectData()
    } catch (err: any) {
      toast.error(err.message || 'Failed to publish epic')
    }
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
              <Button variant="ghost" size="icon" onClick={() => router.push('/projects')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-white">{project.name}</h1>
                  <Badge variant="outline" className="font-mono">{project.key}</Badge>
                </div>
                <p className="text-gray-400 text-sm mt-1">{project.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ExportButton
                endpoint={`/api/projects/${projectId}/export`}
                filename={project.name}
                variant="outline"
                size="sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/ai-generate?projectId=${projectId}`)}
                className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20 hover:border-purple-500/40"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                AI Generate
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              {activeTab === 'stories' ? (
                <Button size="sm" onClick={() => setIsStoryModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Story
                </Button>
              ) : (
                <Button size="sm" onClick={handleCreateEpic}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Epic
                </Button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mt-4">
            <button
              onClick={() => setActiveTab('stories')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg transition-all',
                activeTab === 'stories'
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              )}
            >
              <FileText className="h-4 w-4" />
              Stories ({stories.length})
            </button>
            <button
              onClick={() => setActiveTab('epics')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg transition-all',
                activeTab === 'epics'
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              )}
            >
              <Layers className="h-4 w-4" />
              Epics ({epics.length})
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="container mx-auto px-6 py-8">
        {activeTab === 'stories' ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {columns.map(column => (
                <DroppableColumn
                  key={column.id}
                  column={column}
                  stories={getStoriesByStatus(column.id)}
                />
              ))}
            </div>

            <DragOverlay>
              {activeId ? (
                <Card className="opacity-90 cursor-grabbing shadow-2xl">
                  <CardContent className="p-4">
                    <div className="font-semibold text-white">
                      {(stories || []).find(s => s.id === activeId)?.title}
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </DragOverlay>
          </DndContext>
        ) : (
          <div className="space-y-4">
            {epics.length === 0 ? (
              <Card className="bg-gray-800/50 border-gray-700">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="h-16 w-16 rounded-full bg-purple-500/10 flex items-center justify-center mb-4">
                    <Layers className="h-8 w-8 text-purple-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">No Epics Yet</h3>
                  <p className="text-gray-400 text-center max-w-md mb-6">
                    Epics help organize related stories into larger features or initiatives.
                  </p>
                  <Button onClick={handleCreateEpic}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Epic
                  </Button>
                </CardContent>
              </Card>
            ) : (
              epics.map(epic => (
                <Card key={epic.id} className="bg-gray-800/50 border-gray-700 hover:border-purple-500/50 transition-all group">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: epic.color || '#a855f7' }}
                          />
                          <h3 className="text-lg font-semibold text-white">{epic.title}</h3>
                          <Badge variant="outline" className={cn(
                            epic.status === 'completed' && 'border-emerald-500/50 text-emerald-400',
                            epic.status === 'in_progress' && 'border-purple-500/50 text-purple-400',
                            epic.status === 'planned' && 'border-blue-500/50 text-blue-400',
                            epic.status === 'draft' && 'border-gray-500/50 text-gray-400',
                            epic.status === 'archived' && 'border-neutral-500/50 text-neutral-400',
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
                        </div>
                        {epic.description && (
                          <p className="text-gray-400 text-sm mb-3">{epic.description}</p>
                        )}
                        {epic.goals && (
                          <p className="text-gray-500 text-xs mb-3">Goals: {epic.goals}</p>
                        )}
                        {epic.startDate && epic.targetDate && (
                          <p className="text-gray-500 text-xs">
                            {epic.startDate} → {epic.targetDate}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/projects/${projectId}/epics/${epic.id}`)}
                        >
                          View Stories
                        </Button>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {epic.status === 'draft' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => handlePublishEpic(epic.id, e)}
                              className="h-8 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20 hover:border-green-500/40"
                              title="Publish Epic"
                            >
                              <Rocket className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => handleEditEpic(epic, e)}
                            className="h-8 w-8 p-0"
                            title="Edit Epic"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => handleDeleteEpic(epic.id, e)}
                            className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                            title="Delete Epic"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <StoryFormModal
        open={isStoryModalOpen}
        onOpenChange={setIsStoryModalOpen}
        projectId={projectId}
        onSuccess={fetchProjectData}
      />
      <EpicFormModal
        open={isEpicModalOpen}
        onOpenChange={setIsEpicModalOpen}
        projectId={projectId}
        epic={selectedEpic}
        onSuccess={fetchProjectData}
      />
        </div>
      </main>
    </div>
  )
}
