'use client'

import * as React from 'react'
import { Clock, Edit, Trash2, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface TimeEntry {
  id: string
  startedAt: string
  endedAt?: string
  durationMinutes?: number
  description?: string
  billable: boolean
  billingRate?: string
  story?: {
    id: string
    title: string
  }
  project?: {
    id: string
    name: string
  }
  user?: {
    name?: string
    email: string
  }
}

interface TimeEntriesListProps {
  entries: TimeEntry[]
  onEdit?: (entryId: string) => void
  onDelete?: (entryId: string) => void
}

export function TimeEntriesList({ entries, onEdit, onDelete }: TimeEntriesListProps) {
  const formatDuration = (minutes?: number) => {
    if (!minutes) return 'N/A'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const formatCurrency = (rate?: string) => {
    if (!rate) return 'N/A'
    return `$${parseFloat(rate).toFixed(2)}/hr`
  }

  const calculateAmount = (minutes?: number, rate?: string) => {
    if (!minutes || !rate) return null
    const hours = minutes / 60
    return hours * parseFloat(rate)
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No time entries yet</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const amount = calculateAmount(entry.durationMinutes, entry.billingRate)
        return (
          <Card key={entry.id}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {formatDuration(entry.durationMinutes)}
                    </span>
                    {entry.billable && (
                      <Badge variant="default" className="text-xs">
                        Billable
                      </Badge>
                    )}
                    {!entry.billable && (
                      <Badge variant="secondary" className="text-xs">
                        Non-billable
                      </Badge>
                    )}
                  </div>

                  {entry.description && (
                    <p className="text-sm text-muted-foreground mb-2">{entry.description}</p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      {new Date(entry.startedAt).toLocaleString()}
                      {entry.endedAt && ` - ${new Date(entry.endedAt).toLocaleString()}`}
                    </span>
                    {entry.story && (
                      <span className="font-medium">{entry.story.title}</span>
                    )}
                    {entry.project && (
                      <span>{entry.project.name}</span>
                    )}
                  </div>

                  {entry.billingRate && (
                    <div className="flex items-center gap-2 mt-2 text-sm">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Rate: {formatCurrency(entry.billingRate)}
                      </span>
                      {amount && (
                        <span className="font-medium">
                          • Amount: ${amount.toFixed(2)}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {onEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(entry.id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(entry.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

