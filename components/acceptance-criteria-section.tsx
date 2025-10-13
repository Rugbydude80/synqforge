'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, GripVertical, Check, X, Trash2 } from 'lucide-react'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface AcceptanceCriteriaSectionProps {
  storyId: string
  acceptanceCriteria: string[]
  onUpdate: (criteria: string[]) => void
}

interface ACItemProps {
  id: string
  text: string
  index: number
  isCompleted: boolean
  onToggle: (index: number) => void
  onDelete: (index: number) => void
  onEdit: (index: number, text: string) => void
}

function ACItem({ id, text, index, isCompleted, onToggle, onDelete, onEdit }: ACItemProps) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [editValue, setEditValue] = React.useState(text)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const handleSave = () => {
    if (editValue.trim()) {
      onEdit(index, editValue)
      setIsEditing(false)
    }
  }

  const handleCancel = () => {
    setEditValue(text)
    setIsEditing(false)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-start gap-2 p-3 rounded-lg border bg-card group hover:border-purple-500/50 transition-colors',
        isDragging && 'opacity-50'
      )}
    >
      <button
        className="cursor-grab active:cursor-grabbing mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>

      <button
        className={cn(
          'mt-1 h-4 w-4 rounded border flex-shrink-0',
          isCompleted
            ? 'bg-green-500 border-green-500'
            : 'border-muted-foreground'
        )}
        onClick={() => onToggle(index)}
        aria-label="Toggle completion"
      >
        {isCompleted && <Check className="h-3 w-3 text-white" />}
      </button>

      {isEditing ? (
        <div className="flex-1 flex gap-2">
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave()
              if (e.key === 'Escape') handleCancel()
            }}
            autoFocus
            className="flex-1"
          />
          <Button size="sm" onClick={handleSave}>
            <Check className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={handleCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <>
          <span
            className={cn(
              'flex-1 text-sm cursor-pointer',
              isCompleted && 'line-through text-muted-foreground'
            )}
            onClick={() => setIsEditing(true)}
          >
            {text}
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => onDelete(index)}
          >
            <Trash2 className="h-4 w-4 text-red-400" />
          </Button>
        </>
      )}
    </div>
  )
}

export function AcceptanceCriteriaSection({
  storyId,
  acceptanceCriteria,
  onUpdate,
}: AcceptanceCriteriaSectionProps) {
  const [criteria, setCriteria] = React.useState(acceptanceCriteria)
  const [newAC, setNewAC] = React.useState('')
  const [completed, setCompleted] = React.useState<Set<number>>(new Set())
  const [saving, setSaving] = React.useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const updateCriteria = async (newCriteria: string[]) => {
    setSaving(true)
    try {
      await api.stories.update(storyId, {
        acceptanceCriteria: newCriteria,
      })
      setCriteria(newCriteria)
      onUpdate(newCriteria)
      toast.success('Acceptance criteria updated')
    } catch (error: any) {
      toast.error(error.message || 'Failed to update acceptance criteria')
    } finally {
      setSaving(false)
    }
  }

  const handleAdd = async () => {
    if (!newAC.trim()) return

    const newCriteria = [...criteria, newAC]
    await updateCriteria(newCriteria)
    setNewAC('')
  }

  const handleDelete = async (index: number) => {
    const newCriteria = criteria.filter((_, i) => i !== index)
    await updateCriteria(newCriteria)

    // Update completed set
    const newCompleted = new Set<number>()
    completed.forEach((i) => {
      if (i < index) newCompleted.add(i)
      else if (i > index) newCompleted.add(i - 1)
    })
    setCompleted(newCompleted)
  }

  const handleEdit = async (index: number, text: string) => {
    const newCriteria = [...criteria]
    newCriteria[index] = text
    await updateCriteria(newCriteria)
  }

  const handleToggle = (index: number) => {
    const newCompleted = new Set(completed)
    if (newCompleted.has(index)) {
      newCompleted.delete(index)
    } else {
      newCompleted.add(index)
    }
    setCompleted(newCompleted)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = criteria.findIndex((_, i) => `ac-${i}` === active.id)
      const newIndex = criteria.findIndex((_, i) => `ac-${i}` === over.id)

      const newCriteria = arrayMove(criteria, oldIndex, newIndex)
      await updateCriteria(newCriteria)

      // Update completed indices
      const newCompleted = new Set<number>()
      completed.forEach((i) => {
        if (i === oldIndex) newCompleted.add(newIndex)
        else if (i < oldIndex && i >= newIndex) newCompleted.add(i + 1)
        else if (i > oldIndex && i <= newIndex) newCompleted.add(i - 1)
        else newCompleted.add(i)
      })
      setCompleted(newCompleted)
    }
  }

  const completedCount = completed.size
  const totalCount = criteria.length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Acceptance Criteria</CardTitle>
          {totalCount > 0 && (
            <span className="text-sm text-muted-foreground">
              {completedCount} / {totalCount} completed
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={criteria.map((_, i) => `ac-${i}`)}
            strategy={verticalListSortingStrategy}
          >
            {criteria.map((ac, index) => (
              <ACItem
                key={`ac-${index}`}
                id={`ac-${index}`}
                text={ac}
                index={index}
                isCompleted={completed.has(index)}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onEdit={handleEdit}
              />
            ))}
          </SortableContext>
        </DndContext>

        {/* Add new AC */}
        <div className="flex gap-2 mt-4">
          <Input
            value={newAC}
            onChange={(e) => setNewAC(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd()
            }}
            placeholder="Add acceptance criteria..."
            disabled={saving}
          />
          <Button onClick={handleAdd} disabled={saving || !newAC.trim()}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>

        {criteria.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No acceptance criteria yet. Add one above to get started.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
