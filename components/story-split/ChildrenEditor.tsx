'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ChildRowEditor } from './ChildRowEditor';
import type { ChildStoryInput } from '@/lib/services/story-split-validation.service';
import { storySplitValidationService } from '@/lib/services/story-split-validation.service';
import { useTranslation } from '@/lib/i18n';

interface ChildrenEditorProps {
  childStories: ChildStoryInput[];
  onChange: (children: ChildStoryInput[]) => void;
  onValidationChange: (valid: boolean) => void;
  disabled?: boolean;
}

export function ChildrenEditor({
  childStories,
  onChange,
  onValidationChange,
  disabled,
}: ChildrenEditorProps) {
  const { t } = useTranslation();
  const [validationResults, setValidationResults] = useState<any[]>([]);

  useEffect(() => {
    if (childStories.length === 0) {
      onValidationChange(false);
      return;
    }

    const validation = storySplitValidationService.validateAllChildren(childStories);
    setValidationResults(validation.results);
    onValidationChange(validation.allValid);
  }, [childStories, onValidationChange]);

  const addChild = () => {
    onChange([
      ...childStories,
      {
        title: '',
        personaGoal: '',
        description: '',
        acceptanceCriteria: [''],
        estimatePoints: 3,
        providesUserValue: true,
      },
    ]);
  };

  const updateChild = (index: number, updated: ChildStoryInput) => {
    const newChildren = [...childStories];
    newChildren[index] = updated;
    onChange(newChildren);
  };

  const removeChild = (index: number) => {
    onChange(childStories.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">
          {t('story.split.children.title')} ({childStories.length})
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={addChild}
          disabled={disabled}
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('story.split.add_child')}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {childStories.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center text-muted-foreground">
            <div>
              <p className="mb-2">{t('story.split.children.empty')}</p>
              <p className="text-sm">{t('story.split.children.empty_hint')}</p>
            </div>
          </div>
        ) : (
          childStories.map((child, index) => (
            <ChildRowEditor
              key={index}
              child={child}
              index={index}
              validation={validationResults[index]}
              onChange={(updated) => updateChild(index, updated)}
              onRemove={() => removeChild(index)}
              disabled={disabled}
            />
          ))
        )}
      </div>
    </div>
  );
}

