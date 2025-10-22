'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, CheckCircle2, Circle, Clock, AlertCircle } from 'lucide-react'
import { TaskItem } from './task-item'
import { TaskFormDialog } from './task-form-dialog'
import { toast } from 'sonner'

export interface Task {
  id: string
  storyId: string
  projectId: string
  title: string
  description: string | null
  status: 'todo' | 'in_progress' | 'done' | 'blocked'
  priority: 'low' | 'medium' | 'high' | 'critical'
  estimatedHours: number | null
  actualHours: number | null
  assigneeId: string | null
  tags: string[] | null
  orderIndex: number | null
  completedAt: Date | null
  createdBy: string
  createdAt: Date | null
  updatedAt: Date | null
  assignee?: {
    id: string
    name: string | null
    email: string
    avatar: string | null
  } | null
}

export interface TaskStats {
  total: number
  todo: number
  inProgress: number
  done: number
  blocked: number
  totalEstimatedHours: number
  totalActualHours: number
}

interface TaskListProps {
  storyId: string
  projectId: string
  tasks: Task[]
  stats: TaskStats
  onTasksChange: () => void
}

export function TaskList({ storyId, projectId, tasks, stats, onTasksChange }: TaskListProps) {
  const [showCreateDialog, setShowCreateDialog] = React.useState(false)

  const handleTaskCreated = () => {
    setShowCreateDialog(false)
    onTasksChange()
    toast.success('Task created successfully')
  }

  const handleTaskUpdated = () => {
    onTasksChange()
  }

  const handleTaskDeleted = () => {
    onTasksChange()
    toast.success('Task deleted')
  }

  const completionPercentage = stats.total > 0
    ? Math.round((stats.done / stats.total) * 100)
    : 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Tasks
              <Badge variant="secondary">{stats.total}</Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Break down this story into smaller tasks
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Task
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        {stats.total > 0 && (
          <div className="space-y-3">
            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{completionPercentage}%</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>

            {/* Status breakdown */}
            <div className="flex items-center gap-4 text-sm flex-wrap">
              {stats.todo > 0 && (
                <div className="flex items-center gap-1">
                  <Circle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{stats.todo} To Do</span>
                </div>
              )}
              {stats.inProgress > 0 && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span className="text-blue-500">{stats.inProgress} In Progress</span>
                </div>
              )}
              {stats.done > 0 && (
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-green-500">{stats.done} Done</span>
                </div>
              )}
              {stats.blocked > 0 && (
                <div className="flex items-center gap-1">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-red-500">{stats.blocked} Blocked</span>
                </div>
              )}
            </div>

            {/* Time tracking */}
            {(stats.totalEstimatedHours > 0 || stats.totalActualHours > 0) && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {stats.totalEstimatedHours > 0 && (
                  <span>Estimated: {stats.totalEstimatedHours}h</span>
                )}
                {stats.totalActualHours > 0 && (
                  <span>Actual: {stats.totalActualHours}h</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Task list */}
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Circle className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No tasks yet</p>
            <p className="text-sm mt-1">Break down this story into smaller tasks to track progress</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onUpdate={handleTaskUpdated}
                onDelete={handleTaskDeleted}
              />
            ))}
          </div>
        )}
      </CardContent>

      <TaskFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        storyId={storyId}
        projectId={projectId}
        onSuccess={handleTaskCreated}
      />
    </Card>
  )
}
