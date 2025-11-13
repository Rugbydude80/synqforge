'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit2, Save, X as XIcon } from 'lucide-react';
import { DiffChange } from '@/types/refinement';
import { cn } from '@/lib/utils';

interface InlineEditModeProps {
  change: DiffChange;
  refinedText: string;
  onSave: (editedText: string) => void;
  onCancel: () => void;
  className?: string;
}

export function InlineEditMode({
  change,
  refinedText,
  onSave,
  onCancel,
  className,
}: InlineEditModeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(refinedText);
  const [isManuallyEdited, setIsManuallyEdited] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditedText(refinedText);
  };

  const handleSave = () => {
    if (editedText.trim() !== refinedText.trim()) {
      setIsManuallyEdited(true);
      onSave(editedText);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedText(refinedText);
    setIsEditing(false);
    onCancel();
  };

  if (isEditing) {
    return (
      <div className={cn('space-y-2', className)}>
        <textarea
          ref={textareaRef}
          value={editedText}
          onChange={(e) => setEditedText(e.target.value)}
          className="w-full min-h-20 p-2 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              handleCancel();
            } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              handleSave();
            }
          }}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Press Ctrl+Enter to save, Esc to cancel
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              className="gap-2"
            >
              <XIcon className="h-3 w-3" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} className="gap-2">
              <Save className="h-3 w-3" />
              Save
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('group relative', className)}>
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {isManuallyEdited && (
              <Badge variant="secondary" className="text-xs">
                Edited
              </Badge>
            )}
            {change.category && (
              <Badge variant="outline" className="text-xs">
                {change.category}
              </Badge>
            )}
          </div>
          <div className="prose prose-sm max-w-none text-sm leading-relaxed">
            {editedText}
          </div>
          {change.reason && (
            <div className="text-xs text-muted-foreground italic mt-1">
              {change.reason}
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleStartEdit}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Edit2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

