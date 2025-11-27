'use client'

import * as React from 'react'
import { toast } from 'sonner'
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
import { Checkbox } from '@/components/ui/checkbox'

interface TimeEntryFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  storyId?: string
  projectId?: string
  clientId?: string
  userId: string
}

export function TimeEntryFormModal({
  open,
  onOpenChange,
  onSuccess,
  storyId,
  projectId,
  clientId,
  userId,
}: TimeEntryFormModalProps) {
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [formData, setFormData] = React.useState({
    startedAt: '',
    endedAt: '',
    durationHours: '',
    description: '',
    billable: true,
    billingRate: '',
  })

  React.useEffect(() => {
    if (open) {
      // Set default start time to now
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      setFormData({
        startedAt: oneHourAgo.toISOString().slice(0, 16),
        endedAt: now.toISOString().slice(0, 16),
        durationHours: '1',
        description: '',
        billable: true,
        billingRate: '',
      })
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.startedAt) {
      setError('Start time is required')
      return
    }

    setIsLoading(true)

    try {
      const startedAt = new Date(formData.startedAt)
      const endedAt = formData.endedAt ? new Date(formData.endedAt) : undefined
      const durationMinutes = formData.durationHours
        ? Math.round(parseFloat(formData.durationHours) * 60)
        : undefined

      const payload: any = {
        userId,
        startedAt: startedAt.toISOString(),
        description: formData.description.trim() || undefined,
        billable: formData.billable,
      }

      if (endedAt) {
        payload.endedAt = endedAt.toISOString()
      }
      if (durationMinutes) {
        payload.durationMinutes = durationMinutes
      }
      if (formData.billingRate) {
        payload.billingRate = parseFloat(formData.billingRate)
      }
      if (storyId) payload.storyId = storyId
      if (projectId) payload.projectId = projectId
      if (clientId) payload.clientId = clientId

      const response = await fetch('/api/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create time entry')
      }

      toast.success('Time entry created successfully')
      onSuccess?.()
      onOpenChange(false)
    } catch (err: any) {
      setError(err.message || 'Failed to create time entry')
      console.error('Error creating time entry:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Time</DialogTitle>
          <DialogDescription>Add a manual time entry</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startedAt">Start Time *</Label>
              <Input
                id="startedAt"
                type="datetime-local"
                value={formData.startedAt}
                onChange={(e) => setFormData({ ...formData, startedAt: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endedAt">End Time</Label>
              <Input
                id="endedAt"
                type="datetime-local"
                value={formData.endedAt}
                onChange={(e) => setFormData({ ...formData, endedAt: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="durationHours">Duration (hours)</Label>
            <Input
              id="durationHours"
              type="number"
              step="0.25"
              min="0"
              value={formData.durationHours}
              onChange={(e) => setFormData({ ...formData, durationHours: e.target.value })}
              placeholder="1.5"
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to calculate from start/end times
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What did you work on?"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="billingRate">Billing Rate (override)</Label>
            <Input
              id="billingRate"
              type="number"
              step="0.01"
              min="0"
              value={formData.billingRate}
              onChange={(e) => setFormData({ ...formData, billingRate: e.target.value })}
              placeholder="Leave empty to use default rate"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="billable"
              checked={formData.billable}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, billable: checked === true })
              }
            />
            <Label htmlFor="billable" className="cursor-pointer">
              Billable
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Log Time'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

