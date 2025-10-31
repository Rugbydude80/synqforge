'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragOverEvent,
  useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Plus,
  Calendar,
  MessageSquare,
  Paperclip,
  Sparkles,
  GripVertical,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn, getInitials, getPriorityColor } from '@/lib/utils'
import { toast } from 'sonner'

type StoryStatus = 'backlog' | 'ready' | 'in_progress' | 'review' | 'done'

interface Story {
  id: string
  title: string
  description: string
  status: StoryStatus
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assignee?: { name: string; avatar?: string }
  storyPoints?: number
  comments: number
  attachments: number
  aiGenerated?: boolean
  dueDate?: Date
}

const columns = [
  { id: 'backlog', title: 'Backlog', color: 'from-slate-500 to-slate-600' },
  { id: 'ready', title: 'Ready', color: 'from-blue-500 to-blue-600' },
  { id: 'in_progress', title: 'In Progress', color: 'from-brand-purple-500 to-brand-purple-600' },
  { id: 'review', title: 'Review', color: 'from-amber-500 to-amber-600' },
  { id: 'done', title: 'Done', color: 'from-brand-emerald-500 to-brand-emerald-600' },
]

// Story Card Component with drag handle
function StoryCard({ story }: { story: Story }) {
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

  return (
    <div ref={setNodeRef} style={style}>
      <Card 
        className="p-4 group hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
        {...attributes}
        {...listeners}
      >
        {/* Drag Handle */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* AI Badge */}
        {story.aiGenerated && (
          <div className="absolute top-2 right-2">
            <Sparkles className="h-4 w-4 text-brand-purple-400" />
          </div>
        )}

        {/* Priority Indicator */}
        <div
          className={cn(
            'absolute left-0 top-0 bottom-0 w-1',
            story.priority === 'urgent' && 'bg-red-500',
            story.priority === 'high' && 'bg-orange-500',
            story.priority === 'medium' && 'bg-yellow-500',
            story.priority === 'low' && 'bg-blue-500'
          )}
        />

        <div className="ml-6">
          {/* Title */}
          <h4 className="font-medium mb-2 group-hover:text-brand-purple-400 transition-colors">
            {story.title}
          </h4>

          {/* Description */}
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
            {story.description}
          </p>

          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-3">
            <Badge
              variant="outline"
              className={getPriorityColor(story.priority)}
            >
              {story.priority}
            </Badge>
            {story.storyPoints && (
              <Badge variant="outline">
                {story.storyPoints} pts
              </Badge>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              {story.comments > 0 && (
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {story.comments}
                </div>
              )}
              {story.attachments > 0 && (
                <div className="flex items-center gap-1">
                  <Paperclip className="h-3 w-3" />
                  {story.attachments}
                </div>
              )}
              {story.dueDate && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {story.dueDate.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
              )}
            </div>

            {/* Assignee */}
            {story.assignee && (
              <div className="flex items-center gap-1">
                <div className="h-6 w-6 rounded-full bg-gradient-primary flex items-center justify-center text-[10px] font-medium text-white">
                  {getInitials(story.assignee.name)}
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}

// Droppable Column Component
function DroppableColumn({
  column,
  stories,
}: {
  column: typeof columns[0]
  stories: Story[]
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  })

  return (
    <div className="w-80 shrink-0">
      {/* Column Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'h-2 w-2 rounded-full bg-gradient-to-r',
                column.color
              )}
            />
            <h3 className="font-semibold">{column.title}</h3>
            <Badge variant="outline" className="ml-auto">
              {stories.length}
            </Badge>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div
          className={cn(
            'h-1 rounded-full bg-gradient-to-r',
            column.color
          )}
        />
      </div>

      {/* Droppable Area */}
      <div
        ref={setNodeRef}
        className={cn(
          "min-h-[500px] rounded-lg p-3 transition-all",
          isOver && "bg-brand-purple-500/10 ring-2 ring-brand-purple-500 ring-inset"
        )}
      >
        <SortableContext
          items={stories.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            <AnimatePresence>
              {stories.map((story) => (
                <motion.div
                  key={story.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  layout
                >
                  <StoryCard story={story} />
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Add Story Button */}
            {stories.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-8">
                Drop stories here or
              </div>
            )}
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-foreground border-2 border-dashed"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Story
            </Button>
          </div>
        </SortableContext>
      </div>
    </div>
  )
}

export default function KanbanBoard() {
  const [stories, setStories] = useState<Story[]>([
    {
      id: '1',
      title: 'User Authentication - OAuth Integration',
      description: 'Implement Google and GitHub OAuth for user sign-in',
      status: 'in_progress',
      priority: 'high',
      assignee: { name: 'Sarah Chen' },
      storyPoints: 8,
      comments: 3,
      attachments: 2,
      aiGenerated: true,
      dueDate: new Date(Date.now() + 86400000 * 2),
    },
    {
      id: '2',
      title: 'Dashboard UI Components',
      description: 'Build reusable card, button, and badge components',
      status: 'done',
      priority: 'high',
      assignee: { name: 'John Doe' },
      storyPoints: 5,
      comments: 7,
      attachments: 1,
      aiGenerated: false,
    },
    {
      id: '3',
      title: 'File Upload with Drag & Drop',
      description: 'Implement file upload interface with progress indicators',
      status: 'review',
      priority: 'medium',
      assignee: { name: 'Mike Ross' },
      storyPoints: 5,
      comments: 2,
      attachments: 3,
      aiGenerated: true,
    },
    {
      id: '4',
      title: 'AI Story Generation Endpoint',
      description: 'Create API endpoint for generating stories from requirements',
      status: 'backlog',
      priority: 'urgent',
      storyPoints: 13,
      comments: 1,
      attachments: 0,
      aiGenerated: false,
    },
    {
      id: '5',
      title: 'Real-time Collaboration Features',
      description: 'Add live cursors and presence tracking',
      status: 'backlog',
      priority: 'low',
      storyPoints: 8,
      comments: 0,
      attachments: 1,
      aiGenerated: true,
    },
    {
      id: '6',
      title: 'Sprint Velocity Analytics',
      description: 'Build charts and metrics for sprint performance',
      status: 'ready',
      priority: 'medium',
      assignee: { name: 'Emma Wilson' },
      storyPoints: 8,
      comments: 4,
      attachments: 2,
      aiGenerated: false,
      dueDate: new Date(Date.now() + 86400000 * 5),
    },
  ])

  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragOver = (_event: DragOverEvent) => {
    // Track drag over for visual feedback
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    setActiveId(null)

    if (!over) {
      return
    }

    const activeStory = stories.find((s) => s.id === active.id)
    if (!activeStory) {
      return
    }

    // Determine the target column
    const validColumns: StoryStatus[] = ['backlog', 'ready', 'in_progress', 'review', 'done']
    let targetColumnId: StoryStatus | null = null

    // Check if dropped directly over a column
    if (validColumns.includes(over.id as StoryStatus)) {
      targetColumnId = over.id as StoryStatus
    } else {
      // Dropped over another story, find its column
      const targetStory = stories.find((s) => s.id === over.id)
      if (targetStory) {
        targetColumnId = targetStory.status
      }
    }

    // Only update if moving to a different column
    if (targetColumnId && activeStory.status !== targetColumnId) {
      const oldStatus = activeStory.status

      // Optimistically update UI
      setStories((prev) =>
        prev.map((story) =>
          story.id === activeStory.id
            ? { ...story, status: targetColumnId as StoryStatus }
            : story
        )
      )

      try {
        // Update story status via API
        const response = await fetch(`/api/stories/${activeStory.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: targetColumnId,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to update story')
        }

        toast.success(`Moved to ${columns.find((c) => c.id === targetColumnId)?.title}`)
      } catch (error) {
        // Revert on error
        setStories((prev) =>
          prev.map((story) =>
            story.id === activeStory.id
              ? { ...story, status: oldStatus }
              : story
          )
        )
        toast.error('Failed to update story status')
        console.error('Error updating story:', error)
      }
    }
  }

  const getStoriesByColumn = (columnId: StoryStatus) =>
    stories.filter((story) => story.status === columnId)

  const activeStory = activeId ? stories.find((s) => s.id === activeId) : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="h-full overflow-x-auto">
        <div className="flex gap-6 p-6 min-w-max">
          {columns.map((column) => {
            const columnStories = getStoriesByColumn(column.id as StoryStatus)
            return (
              <DroppableColumn
                key={column.id}
                column={column}
                stories={columnStories}
              />
            )
          })}
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeStory ? (
          <div className="opacity-90 rotate-3 scale-105 cursor-grabbing">
            <Card className="p-4 shadow-2xl">
              <div className="font-medium">{activeStory.title}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {activeStory.description}
              </div>
            </Card>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
