'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  User, 
  Tag,
  Sparkles
} from 'lucide-react'
import { Select } from '@/components/ui/select'
import { toast } from 'sonner'

interface BulkOperationsBarProps {
  selectedCount: number
  onUpdateStatus?: (status: string) => Promise<void>
  onUpdatePriority?: (priority: string) => Promise<void>
  onDelete?: () => Promise<void>
  onAssign?: () => void
  onAddTags?: () => void
  onBatchRefine?: () => void
  onClearSelection?: () => void
}

export function BulkOperationsBar({
  selectedCount,
  onUpdateStatus,
  onUpdatePriority,
  onDelete,
  onAssign,
  onAddTags,
  onBatchRefine,
  onClearSelection,
}: BulkOperationsBarProps) {
  const [isProcessing, setIsProcessing] = React.useState(false)

  const handleUpdateStatus = async (status: string) => {
    if (!onUpdateStatus) return
    setIsProcessing(true)
    try {
      await onUpdateStatus(status)
      toast.success(`Updated ${selectedCount} stories to ${status}`)
    } catch {
      toast.error('Failed to update stories')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleUpdatePriority = async (priority: string) => {
    if (!onUpdatePriority) return
    setIsProcessing(true)
    try {
      await onUpdatePriority(priority)
      toast.success(`Updated ${selectedCount} stories to ${priority} priority`)
    } catch {
      toast.error('Failed to update stories')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    if (!confirm(`Are you sure you want to delete ${selectedCount} stories? This cannot be undone.`)) {
      return
    }
    setIsProcessing(true)
    try {
      await onDelete()
      toast.success(`Deleted ${selectedCount} stories`)
    } catch {
      toast.error('Failed to delete stories')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4">
      <div className="bg-card border border-purple-500/20 rounded-lg shadow-2xl shadow-purple-500/20 p-4 flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1 bg-purple-500/10 rounded-full">
          <CheckCircle2 className="h-4 w-4 text-purple-400" />
          <span className="text-sm font-medium">{selectedCount} selected</span>
        </div>

        <div className="h-6 w-px bg-border" />

        {/* Quick Status Updates */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleUpdateStatus('in_progress')}
            disabled={isProcessing}
            title="Mark as In Progress"
          >
            <CheckCircle2 className="h-4 w-4 mr-1 text-blue-400" />
            In Progress
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleUpdateStatus('done')}
            disabled={isProcessing}
            title="Mark as Done"
          >
            <CheckCircle2 className="h-4 w-4 mr-1 text-green-400" />
            Done
          </Button>
        </div>

        <div className="h-6 w-px bg-border" />

        {/* More Actions */}
        <Select 
          onChange={(e) => handleUpdatePriority(e.target.value)} 
          disabled={isProcessing}
          className="w-32 h-8 text-xs"
        >
          <option value="">Set Priority...</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </Select>

        {onAssign && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onAssign}
            disabled={isProcessing}
            title="Assign to user"
          >
            <User className="h-4 w-4" />
          </Button>
        )}

        {onAddTags && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddTags}
            disabled={isProcessing}
            title="Add tags"
          >
            <Tag className="h-4 w-4" />
          </Button>
        )}

        {onBatchRefine && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBatchRefine}
            disabled={isProcessing}
            className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
            title="Batch refine with AI"
          >
            <Sparkles className="h-4 w-4 mr-1" />
            Refine
          </Button>
        )}

        <div className="h-6 w-px bg-border" />

        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={isProcessing}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            title="Delete selected"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}

        <div className="h-6 w-px bg-border" />

        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          disabled={isProcessing}
        >
          <XCircle className="h-4 w-4 mr-1" />
          Cancel
        </Button>
      </div>
    </div>
  )
}

