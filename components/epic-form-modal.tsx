'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api-client'
import type { Epic } from '@/lib/api-client'
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
import { Rocket } from 'lucide-react'

interface EpicFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId?: string
  epic?: Epic
  onSuccess?: () => void
}

export function EpicFormModal({
  open,
  onOpenChange,
  projectId,
  epic,
  onSuccess,
}: EpicFormModalProps) {
  const [isLoading, setIsLoading] = React.useState(false)
  const [isPublishing, setIsPublishing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [formData, setFormData] = React.useState({
    title: '',
    description: '',
    goals: '',
    priority: 'medium' as Epic['priority'],
    color: '#a855f7',
    startDate: '',
    targetDate: '',
  })

  // Populate form if editing
  React.useEffect(() => {
    if (epic) {
      setFormData({
        title: epic.title,
        description: epic.description || '',
        goals: epic.goals || '',
        priority: epic.priority,
        color: epic.color || '#a855f7',
        startDate: epic.startDate || '',
        targetDate: epic.targetDate || '',
      })
    } else {
      // Reset form when creating new
      setFormData({
        title: '',
        description: '',
        goals: '',
        priority: 'medium',
        color: '#a855f7',
        startDate: '',
        targetDate: '',
      })
    }
  }, [epic, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      setError('Title is required')
      return
    }

    if (!epic && !projectId) {
      setError('Project is required when creating a new epic')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const epicData = {
        projectId: epic ? epic.projectId : projectId!,
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        goals: formData.goals.trim() || undefined,
        priority: formData.priority,
        color: formData.color,
        startDate: formData.startDate || undefined,
        targetDate: formData.targetDate || undefined,
      }

      if (epic) {
        await api.epics.update(epic.id, epicData)
        toast.success('Epic updated successfully!')
      } else {
        await api.epics.create(epicData)
        toast.success('Epic created successfully!')
      }

      // Reset form
      setFormData({
        title: '',
        description: '',
        goals: '',
        priority: 'medium',
        color: '#a855f7',
        startDate: '',
        targetDate: '',
      })

      onSuccess?.()
      onOpenChange(false)
    } catch (err: any) {
      const errorMessage = err.message || err.error || 'Failed to save epic'
      setError(errorMessage)
      toast.error(errorMessage)
      console.error('Failed to save epic:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePublish = async () => {
    if (!epic) return

    setIsPublishing(true)
    setError(null)

    try {
      await api.epics.publish(epic.id)
      toast.success('Epic published successfully! Stories are now active.')
      onSuccess?.()
      onOpenChange(false)
    } catch (err: any) {
      const errorMessage = err.message || err.error || 'Failed to publish epic'
      setError(errorMessage)
      toast.error(errorMessage)
      console.error('Failed to publish epic:', err)
    } finally {
      setIsPublishing(false)
    }
  }

  const canPublish = epic && epic.status === 'draft'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{epic ? 'Edit Epic' : 'Create New Epic'}</DialogTitle>
            <DialogDescription>
              {epic ? 'Update epic details' : 'Add a new epic to organize your stories'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="User Authentication System"
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
                placeholder="Describe the epic and its purpose..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                maxLength={2000}
                disabled={isLoading}
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="goals">Goals</Label>
              <Textarea
                id="goals"
                placeholder="What are the goals of this epic?"
                value={formData.goals}
                onChange={(e) => setFormData(prev => ({ ...prev, goals: e.target.value }))}
                maxLength={1000}
                disabled={isLoading}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  id="priority"
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as Epic['priority'] }))}
                  disabled={isLoading}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  disabled={isLoading}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="targetDate">Target Date</Label>
                <Input
                  id="targetDate"
                  type="date"
                  value={formData.targetDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, targetDate: e.target.value }))}
                  disabled={isLoading}
                />
              </div>
            </div>

            {epic && epic.status && (
              <div className="grid gap-2 p-3 bg-gray-800/50 border border-gray-700 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Current Status</Label>
                    <p className="text-xs text-gray-400 mt-1">
                      {epic.status === 'draft' && 'Epic is in draft mode. Publish to make stories visible.'}
                      {epic.status === 'published' && 'Epic is published and stories are active.'}
                      {epic.status === 'in_progress' && 'Epic is currently in progress.'}
                      {epic.status === 'completed' && 'Epic has been completed.'}
                    </p>
                  </div>
                  <span className="text-sm font-medium capitalize">{epic.status}</span>
                </div>
              </div>
            )}

            {error && (
              <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading || isPublishing}
            >
              Cancel
            </Button>
            {canPublish && (
              <Button
                type="button"
                variant="default"
                onClick={handlePublish}
                disabled={isLoading || isPublishing}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              >
                <Rocket className="h-4 w-4 mr-2" />
                {isPublishing ? 'Publishing...' : 'Publish Epic'}
              </Button>
            )}
            <Button type="submit" disabled={isLoading || isPublishing}>
              {isLoading ? 'Saving...' : epic ? 'Update Epic' : 'Create Epic'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
