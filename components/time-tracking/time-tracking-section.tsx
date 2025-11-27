'use client'

import * as React from 'react'
import { Clock, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TimerButton } from './timer-button'
import { TimeEntryFormModal } from './time-entry-form'
import { TimeEntriesList } from './time-entries-list'

interface TimeTrackingSectionProps {
  storyId: string
  currentUserId: string
}

export function TimeTrackingSection({ storyId, currentUserId }: TimeTrackingSectionProps) {
  const [entries, setEntries] = React.useState<any[]>([])
  const [totals, setTotals] = React.useState({ totalMinutes: 0, totalHours: 0 })
  const [isLoading, setIsLoading] = React.useState(true)
  const [isFormOpen, setIsFormOpen] = React.useState(false)

  const fetchTimeEntries = React.useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/stories/${storyId}/time`, {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setEntries(data.data || [])
        setTotals(data.totals || { totalMinutes: 0, totalHours: 0 })
      }
    } catch (error) {
      console.error('Error fetching time entries:', error)
    } finally {
      setIsLoading(false)
    }
  }, [storyId])

  React.useEffect(() => {
    fetchTimeEntries()
  }, [fetchTimeEntries])

  const handleTimerStop = () => {
    fetchTimeEntries()
  }

  const handleDelete = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this time entry?')) return

    try {
      const response = await fetch(`/api/time-entries/${entryId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (response.ok) {
        fetchTimeEntries()
      }
    } catch (error) {
      console.error('Error deleting time entry:', error)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <CardTitle>Time Tracking</CardTitle>
          </div>
          <div className="flex gap-2">
            <TimerButton storyId={storyId} onTimerStop={handleTimerStop} />
            <Button variant="outline" size="sm" onClick={() => setIsFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Log Time
            </Button>
          </div>
        </div>
        {totals.totalHours > 0 && (
          <p className="text-sm text-muted-foreground mt-2">
            Total: {totals.totalHours.toFixed(2)} hours ({totals.totalMinutes} minutes)
          </p>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">Loading...</div>
        ) : (
          <TimeEntriesList entries={entries} onDelete={handleDelete} />
        )}
      </CardContent>

      <TimeEntryFormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSuccess={() => {
          fetchTimeEntries()
          setIsFormOpen(false)
        }}
        storyId={storyId}
        userId={currentUserId}
      />
    </Card>
  )
}

