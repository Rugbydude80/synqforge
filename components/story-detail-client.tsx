'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { CommentThread } from '@/components/comments/comment-thread'
import { AcceptanceCriteriaSection } from '@/components/acceptance-criteria-section'
import { UserSelect } from '@/components/user-select'
import { TagsInput } from '@/components/tags-input'
import { TaskList } from '@/components/tasks/task-list'
import type { Task, TaskStats } from '@/components/tasks/task-list'
import { SplitStoryButton } from '@/components/story-split/SplitStoryButton'
import Link from 'next/link'
import {
  Calendar,
  User,
  Layers,
  Edit2,
  Save,
  X,
  Copy,
  Check,
} from 'lucide-react'
import { format } from 'date-fns'
import { projectUrl } from '@/lib/urls'
import { api, type Story } from '@/lib/api-client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface StoryDetailClientProps {
  story: Story
  currentUserId: string
}

const storyTypeColors = {
  feature: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  bug: 'bg-red-500/10 text-red-400 border-red-500/20',
  task: 'bg-green-500/10 text-green-400 border-green-500/20',
  spike: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
}

export function StoryDetailClient({ story: initialStory, currentUserId }: StoryDetailClientProps) {
  const router = useRouter()
  const [story, setStory] = React.useState<Story>(initialStory)
  const [editMode, setEditMode] = React.useState<string | null>(null)
  const [editValues, setEditValues] = React.useState<Partial<Story>>({})
  const [saving, setSaving] = React.useState(false)
  const [copySuccess, setCopySuccess] = React.useState(false)
  const [epics, setEpics] = React.useState<any[]>([])
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [taskStats, setTaskStats] = React.useState<TaskStats>({
    total: 0,
    todo: 0,
    inProgress: 0,
    done: 0,
    blocked: 0,
    totalEstimatedHours: 0,
    totalActualHours: 0,
  })

  // Load epics for the project
  React.useEffect(() => {
    if (story.projectId) {
      fetchEpics()
    }
  }, [story.projectId])

  // Load tasks for the story
  React.useEffect(() => {
    fetchTasks()
  }, [story.id])

  const fetchEpics = async () => {
    try {
      // Only fetch published epics (draft epics shouldn't be available for story assignment)
      const response = await api.epics.list({ projectId: story.projectId, status: 'published' })
      setEpics(response.data || [])
    } catch (error) {
      console.error('Failed to load epics:', error)
    }
  }

  const fetchTasks = async () => {
    try {
      const response = await fetch(`/api/stories/${story.id}/tasks`)
      if (response.ok) {
        const data = await response.json()
        setTasks(data.data || [])
        setTaskStats(data.stats || {
          total: 0,
          todo: 0,
          inProgress: 0,
          done: 0,
          blocked: 0,
          totalEstimatedHours: 0,
          totalActualHours: 0,
        })
      }
    } catch (error) {
      console.error('Failed to load tasks:', error)
    }
  }

  const startEdit = (field: string) => {
    setEditMode(field)
    setEditValues({
      [field]: story[field as keyof Story],
    })
  }

  const cancelEdit = () => {
    setEditMode(null)
    setEditValues({})
  }

  const saveField = async (field: string) => {
    if (!editValues[field as keyof Story]) {
      cancelEdit()
      return
    }

    setSaving(true)
    try {
      const updatedStory = await api.stories.update(story.id, {
        [field]: editValues[field as keyof Story],
      })

      setStory(updatedStory)
      setEditMode(null)
      setEditValues({})
      toast.success('Story updated')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update story')
      // Rollback
      setEditValues({})
    } finally {
      setSaving(false)
    }
  }

  const updateField = async (field: string, value: any) => {
    // Optimistic update
    const previousValue = story[field as keyof Story]
    setStory({ ...story, [field]: value })

    try {
      const updatedStory = await api.stories.update(story.id, {
        [field]: value,
      })

      setStory(updatedStory)
      toast.success('Story updated')
      router.refresh()
    } catch (error: any) {
      // Rollback on error
      setStory({ ...story, [field]: previousValue })
      toast.error(error.message || 'Failed to update story')
    }
  }

  const copyPermalink = () => {
    const url = `${window.location.origin}/stories/${story.id}`
    navigator.clipboard.writeText(url)
    setCopySuccess(true)
    toast.success('Link copied to clipboard')
    setTimeout(() => setCopySuccess(false), 2000)
  }

  return (
    <div className="max-w-5xl mx-auto px-8 py-8 space-y-6">
      {/* Title Section */}
      <Card>
        <CardContent className="pt-6">
          {editMode === 'title' ? (
            <div className="space-y-2">
              <Input
                value={editValues.title as string}
                onChange={(e) => setEditValues({ ...editValues, title: e.target.value })}
                className="text-2xl font-bold"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveField('title')
                  if (e.key === 'Escape') cancelEdit()
                }}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => saveField('title')}
                  disabled={saving}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={cancelEdit}>
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between group">
              <h1 className="text-2xl font-bold">{story.title}</h1>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <SplitStoryButton storyId={story.id} />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => startEdit('title')}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={copyPermalink}
                >
                  {copySuccess ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap mt-4">
            <Select
              value={story.status}
              onChange={(e) => updateField('status', e.target.value)}
            >
              <option value="backlog">Backlog</option>
              <option value="ready">Ready</option>
              <option value="in_progress">In Progress</option>
              <option value="review">Review</option>
              <option value="done">Done</option>
              <option value="blocked">Blocked</option>
            </Select>

            <Select
              value={story.priority}
              onChange={(e) => updateField('priority', e.target.value)}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </Select>

            <Badge className={cn('border', storyTypeColors[story.storyType])}>
              {story.storyType}
            </Badge>

            {story.storyPoints && (
              <Badge variant="outline">{story.storyPoints} points</Badge>
            )}

            {story.aiGenerated && (
              <Badge variant="secondary">AI Generated</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Description</CardTitle>
        </CardHeader>
        <CardContent>
          {editMode === 'description' ? (
            <div className="space-y-2">
              <Textarea
                value={editValues.description as string}
                onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
                rows={6}
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => saveField('description')}
                  disabled={saving}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={cancelEdit}>
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="group">
              {story.description ? (
                <div className="flex justify-between items-start">
                  <p className="text-muted-foreground whitespace-pre-wrap flex-1">
                    {story.description}
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => startEdit('description')}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => startEdit('description')}
                  className="text-muted-foreground"
                >
                  Add description...
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Acceptance Criteria */}
      <AcceptanceCriteriaSection
        storyId={story.id}
        acceptanceCriteria={story.acceptanceCriteria || []}
        onUpdate={(criteria) => setStory({ ...story, acceptanceCriteria: criteria })}
      />

      {/* Tasks */}
      <TaskList
        storyId={story.id}
        projectId={story.projectId}
        tasks={tasks}
        stats={taskStats}
        onTasksChange={fetchTasks}
      />

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Meta Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {story.project && (
              <div className="flex items-center gap-3">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Project</p>
                  <Link
                    href={projectUrl(story.projectId)}
                    className="text-sm font-medium hover:underline text-blue-400"
                  >
                    {story.project.name}
                  </Link>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Epic</p>
                <Select
                  value={story.epicId || ''}
                  onChange={(e) => updateField('epicId', e.target.value || null)}
                  className="w-full"
                >
                  <option value="">No Epic</option>
                  {epics.map((epic) => (
                    <option key={epic.id} value={epic.id}>
                      {epic.title}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Assigned To</p>
                <UserSelect
                  value={story.assignedTo}
                  onChange={(userId) => updateField('assignedTo', userId)}
                  placeholder="Unassigned"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="text-sm font-medium">
                  {format(new Date(story.createdAt), 'PPP')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Updated</p>
                <p className="text-sm font-medium">
                  {format(new Date(story.updatedAt), 'PPP')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tags */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <TagsInput
              value={story.tags || []}
              onChange={(tags) => updateField('tags', tags)}
              placeholder="Add tags..."
            />
          </CardContent>
        </Card>
      </div>

      {/* Comments */}
      <Card>
        <CardContent className="pt-6">
          <CommentThread storyId={story.id} currentUserId={currentUserId} />
        </CardContent>
      </Card>
    </div>
  )
}
