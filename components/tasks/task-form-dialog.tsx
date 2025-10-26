'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { UserSelect } from '@/components/user-select'
import { TagsInput } from '@/components/tags-input'
import { toast } from 'sonner'
import type { Task } from './task-list'

interface TaskFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  storyId?: string
  projectId: string
  task?: Task
  onSuccess: () => void
}

export function TaskFormDialog({
  open,
  onOpenChange,
  storyId,
  projectId,
  task,
  onSuccess,
}: TaskFormDialogProps) {
  const [formData, setFormData] = React.useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    estimatedHours: task?.estimatedHours?.toString() || '',
    actualHours: task?.actualHours?.toString() || '',
    assigneeId: task?.assigneeId || '',
    tags: task?.tags || [],
    storyId: storyId || task?.storyId || '',
  })
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [stories, setStories] = React.useState<Array<{ id: string; title: string }>>([])
  const [loadingStories, setLoadingStories] = React.useState(false)
  const [storiesError, setStoriesError] = React.useState<string | null>(null)

  // Fetch stories when projectId changes or dialog opens
  React.useEffect(() => {
    if (open && projectId && !storyId) {
      const fetchStories = async () => {
        setLoadingStories(true)
        setStoriesError(null)
        try {
          const response = await fetch(`/api/projects/${projectId}/stories`, {
            credentials: 'include'
          })
          if (response.ok) {
            const data = await response.json()
            console.log('Fetched stories:', data)
            if (Array.isArray(data?.data)) {
              setStories(data.data)
              if (data.data.length === 0) {
                setStoriesError('No stories found in this project. Please create a story first.')
              }
            } else {
              setStories([])
              setStoriesError('Unexpected response format from server')
            }
          } else {
            const error = await response.json().catch(() => ({ error: 'Failed to fetch stories' }))
            setStoriesError(error.error || `Error: ${response.status} ${response.statusText}`)
            console.error('Failed to fetch stories:', response.status, error)
          }
        } catch (error) {
          console.error('Failed to fetch stories:', error)
          setStoriesError('Network error: Unable to fetch stories')
        } finally {
          setLoadingStories(false)
        }
      }
      fetchStories()
    }
  }, [open, projectId, storyId])

  React.useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || '',
        status: task.status,
        priority: task.priority,
        estimatedHours: task.estimatedHours?.toString() || '',
        actualHours: task.actualHours?.toString() || '',
        assigneeId: task.assigneeId || '',
        tags: task.tags || [],
        storyId: task.storyId,
      })
    } else {
      setFormData({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        estimatedHours: '',
        actualHours: '',
        assigneeId: '',
        tags: [],
        storyId: storyId || '',
      })
    }
  }, [task, open, storyId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      toast.error('Please enter a task title')
      return
    }

    if (!task && !formData.storyId) {
      toast.error('Please select a story')
      return
    }

    setIsSubmitting(true)

    try {
      const payload: any = {
        title: formData.title,
        description: formData.description || undefined,
        status: formData.status,
        priority: formData.priority,
        assigneeId: formData.assigneeId || null,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
      }

      if (formData.estimatedHours) {
        payload.estimatedHours = parseInt(formData.estimatedHours, 10)
      }

      if (formData.actualHours) {
        payload.actualHours = parseInt(formData.actualHours, 10)
      }

      if (!task) {
        // Create new task
        payload.storyId = formData.storyId
        payload.projectId = projectId
      }

      const url = task ? `/api/tasks/${task.id}` : '/api/tasks'
      const method = task ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to save task')
      }

      onSuccess()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save task')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? 'Edit Task' : 'Create Task'}</DialogTitle>
          <DialogDescription>
            {task
              ? 'Update the task details below.'
              : 'Break down your story into smaller, manageable tasks.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Story Selection (only show when creating new task without pre-selected story) */}
          {!task && !storyId && (
            <div className="space-y-2">
              <Label htmlFor="story">
                Story <span className="text-destructive">*</span>
              </Label>
              <Select
                id="story"
                value={formData.storyId}
                onChange={(e) => setFormData({ ...formData, storyId: e.target.value })}
                disabled={loadingStories || stories.length === 0}
                required
              >
                <option value="">Select a story...</option>
                {stories.map(story => (
                  <option key={story.id} value={story.id}>
                    {story.title}
                  </option>
                ))}
              </Select>
              {loadingStories && (
                <p className="text-sm text-muted-foreground">Loading stories...</p>
              )}
              {storiesError && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                  <p className="text-sm text-destructive font-medium">{storiesError}</p>
                  {storiesError.includes('No stories found') && (
                    <p className="text-xs text-muted-foreground mt-1">
                      💡 Tip: Go to your project and create a story first, then come back to create tasks.
                    </p>
                  )}
                </div>
              )}
              {!loadingStories && !storiesError && stories.length === 0 && (
                <p className="text-sm text-muted-foreground">No stories available</p>
              )}
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="What needs to be done?"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add more details about this task..."
              rows={4}
            />
          </div>

          {/* Status and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
                <option value="blocked">Blocked</option>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                id="priority"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </Select>
            </div>
          </div>

          {/* Time Tracking */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="estimatedHours">Estimated Hours</Label>
              <Input
                id="estimatedHours"
                type="number"
                min="0"
                step="0.5"
                value={formData.estimatedHours}
                onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="actualHours">Actual Hours</Label>
              <Input
                id="actualHours"
                type="number"
                min="0"
                step="0.5"
                value={formData.actualHours}
                onChange={(e) => setFormData({ ...formData, actualHours: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          {/* Assignee */}
          <div className="space-y-2">
            <Label htmlFor="assignee">Assignee</Label>
            <UserSelect
              value={formData.assigneeId}
              onChange={(userId) => setFormData({ ...formData, assigneeId: userId || '' })}
              placeholder="Assign to..."
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <TagsInput
              value={formData.tags}
              onChange={(tags) => setFormData({ ...formData, tags })}
              placeholder="Add tags..."
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || (!task && !storyId && stories.length === 0)}
            >
              {isSubmitting ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
