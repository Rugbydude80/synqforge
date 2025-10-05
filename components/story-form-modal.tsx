'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api-client'
import type { Story, Epic } from '@/lib/api-client'
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

interface StoryFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  story?: Story
  onSuccess?: () => void
}

export function StoryFormModal({
  open,
  onOpenChange,
  projectId,
  story,
  onSuccess,
}: StoryFormModalProps) {
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [epics, setEpics] = React.useState<Epic[]>([])

  const [formData, setFormData] = React.useState({
    title: '',
    description: '',
    priority: 'medium' as Story['priority'],
    storyPoints: 0,
    epicId: '',
    acceptanceCriteria: [''],
  })

  // Load epics for dropdown
  React.useEffect(() => {
    if (open && projectId) {
      fetchEpics()
    }
  }, [open, projectId])

  // Populate form if editing
  React.useEffect(() => {
    if (story) {
      setFormData({
        title: story.title,
        description: story.description || '',
        priority: story.priority,
        storyPoints: story.storyPoints || 0,
        epicId: story.epicId || '',
        acceptanceCriteria: story.acceptanceCriteria || [''],
      })
    }
  }, [story])

  const fetchEpics = async () => {
    try {
      const response = await api.epics.list({ projectId })
      setEpics(response.data)
    } catch (err) {
      console.error('Failed to load epics:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      setError('Title is required')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const storyData = {
        projectId,
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        priority: formData.priority,
        storyPoints: formData.storyPoints || undefined,
        epicId: formData.epicId || undefined,
        acceptanceCriteria: formData.acceptanceCriteria.filter(ac => ac.trim()),
      }

      if (story) {
        await api.stories.update(story.id, storyData)
        toast.success('Story updated successfully!')
      } else {
        await api.stories.create(storyData)
        toast.success('Story created successfully!')
      }

      // Reset form
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        storyPoints: 0,
        epicId: '',
        acceptanceCriteria: [''],
      })

      onSuccess?.()
      onOpenChange(false)
    } catch (err: any) {
      setError(err.message || 'Failed to save story')
      toast.error(err.message || 'Failed to save story')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddCriteria = () => {
    setFormData(prev => ({
      ...prev,
      acceptanceCriteria: [...prev.acceptanceCriteria, ''],
    }))
  }

  const handleRemoveCriteria = (index: number) => {
    setFormData(prev => ({
      ...prev,
      acceptanceCriteria: prev.acceptanceCriteria.filter((_, i) => i !== index),
    }))
  }

  const handleCriteriaChange = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      acceptanceCriteria: prev.acceptanceCriteria.map((ac, i) => i === index ? value : ac),
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{story ? 'Edit Story' : 'Create New Story'}</DialogTitle>
            <DialogDescription>
              {story ? 'Update story details' : 'Add a new story to your project'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="As a user, I want to..."
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                maxLength={255}
                disabled={isLoading}
                autoFocus
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the story in detail..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                maxLength={2000}
                disabled={isLoading}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  id="priority"
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as Story['priority'] }))}
                  disabled={isLoading}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="storyPoints">Story Points</Label>
                <Input
                  id="storyPoints"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.storyPoints}
                  onChange={(e) => setFormData(prev => ({ ...prev, storyPoints: parseInt(e.target.value) || 0 }))}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="epic">Epic (optional)</Label>
              <Select
                id="epic"
                value={formData.epicId}
                onChange={(e) => setFormData(prev => ({ ...prev, epicId: e.target.value }))}
                disabled={isLoading}
              >
                <option value="">No Epic</option>
                {epics.map((epic) => (
                  <option key={epic.id} value={epic.id}>
                    {epic.title}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Acceptance Criteria</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddCriteria}
                  disabled={isLoading}
                >
                  Add Criteria
                </Button>
              </div>
              <div className="space-y-2">
                {formData.acceptanceCriteria.map((criteria, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder={`Criteria ${index + 1}`}
                      value={criteria}
                      onChange={(e) => handleCriteriaChange(index, e.target.value)}
                      disabled={isLoading}
                    />
                    {formData.acceptanceCriteria.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveCriteria(index)}
                        disabled={isLoading}
                      >
                        ×
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isLoading}>
              {story ? 'Update Story' : 'Create Story'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
