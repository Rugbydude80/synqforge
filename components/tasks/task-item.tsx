'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  MoreVertical,
  Edit2,
  Trash2,
  Clock,
  AlertCircle,
  CheckCircle2,
  Circle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { TaskFormDialog } from './task-form-dialog'
import type { Task } from './task-list'
import { toast } from 'sonner'

interface TaskItemProps {
  task: Task
  onUpdate: () => void
  onDelete: () => void
}

const statusIcons = {
  todo: Circle,
  in_progress: Clock,
  done: CheckCircle2,
  blocked: AlertCircle,
}

const statusColors = {
  todo: 'text-muted-foreground',
  in_progress: 'text-blue-500',
  done: 'text-green-500',
  blocked: 'text-red-500',
}

const priorityColors = {
  low: 'border-gray-500/20 bg-gray-500/5 text-gray-400',
  medium: 'border-blue-500/20 bg-blue-500/5 text-blue-400',
  high: 'border-orange-500/20 bg-orange-500/5 text-orange-400',
  critical: 'border-red-500/20 bg-red-500/5 text-red-400',
}

export function TaskItem({ task, onUpdate, onDelete }: TaskItemProps) {
  const [showEditDialog, setShowEditDialog] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = React.useState(false)

  const StatusIcon = statusIcons[task.status]

  const handleStatusToggle = async () => {
    setIsUpdatingStatus(true)
    try {
      const newStatus = task.status === 'done' ? 'todo' : 'done'

      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to update task')
      }

      onUpdate()
    } catch (error) {
      toast.error('Failed to update task status')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task?')) {
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete task')
      }

      onDelete()
    } catch (error) {
      toast.error('Failed to delete task')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleEditSuccess = () => {
    setShowEditDialog(false)
    onUpdate()
  }

  return (
    <>
      <div
        className={cn(
          'group flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors',
          task.status === 'done' && 'opacity-60'
        )}
      >
        {/* Checkbox */}
        <Checkbox
          checked={task.status === 'done'}
          onCheckedChange={handleStatusToggle}
          disabled={isUpdatingStatus}
          className="mt-1"
        />

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start gap-2">
            <StatusIcon className={cn('h-4 w-4 mt-0.5 flex-shrink-0', statusColors[task.status])} />
            <div className="flex-1 min-w-0">
              <p className={cn(
                'font-medium',
                task.status === 'done' && 'line-through text-muted-foreground'
              )}>
                {task.title}
              </p>
              {task.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {task.description}
                </p>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={cn('text-xs', priorityColors[task.priority])}>
              {task.priority}
            </Badge>

            {task.estimatedHours && (
              <Badge variant="secondary" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {task.estimatedHours}h
                {task.actualHours && ` / ${task.actualHours}h`}
              </Badge>
            )}

            {task.assignee && (
              <div className="flex items-center gap-1">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={task.assignee.avatar || undefined} />
                  <AvatarFallback className="text-xs">
                    {task.assignee.name?.[0] || task.assignee.email[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">
                  {task.assignee.name || task.assignee.email}
                </span>
              </div>
            )}

            {task.tags && task.tags.length > 0 && (
              <div className="flex items-center gap-1">
                {task.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <TaskFormDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        storyId={task.storyId}
        projectId={task.projectId}
        task={task}
        onSuccess={handleEditSuccess}
      />
    </>
  )
}
