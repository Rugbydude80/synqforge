'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Sparkles, Loader2 } from 'lucide-react';
import { ChildRowEditor } from './ChildRowEditor';
import type { ChildStoryInput } from '@/lib/services/story-split-validation.service';
import { storySplitValidationService } from '@/lib/services/story-split-validation.service';
import { useTranslation } from '@/lib/i18n';
import type { StorySplitAnalysis } from '@/lib/services/story-split-analysis.service';
import { toast } from 'sonner';

interface ChildrenEditorProps {
  childStories: ChildStoryInput[];
  onChange: (children: ChildStoryInput[]) => void;
  onValidationChange: (valid: boolean) => void;
  disabled?: boolean;
  analysis?: StorySplitAnalysis;
  storyId: string;
}

export function ChildrenEditor({
  childStories,
  onChange,
  onValidationChange,
  disabled,
  analysis,
  storyId,
}: ChildrenEditorProps) {
  const { t } = useTranslation();
  const [validationResults, setValidationResults] = useState<any[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);

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

  const suggestSplits = async () => {
    if (!analysis) return;

    setIsLoadingAI(true);

    try {
      const response = await fetch(`/api/stories/${storyId}/ai-split-suggestions`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        
        // Check for rate limit or billing errors
        if (response.status === 429) {
          toast.error('Too many AI requests', {
            description: error.retryAfter || 'Please try again later',
          });
        } else if (response.status === 402) {
          toast.error('AI usage limit reached', {
            description: error.error || 'Please upgrade your plan',
            action: error.upgradeUrl ? {
              label: 'Upgrade',
              onClick: () => window.open(error.upgradeUrl, '_blank'),
            } : undefined,
          });
        } else {
          toast.error('Failed to generate suggestions', {
            description: error.error || 'Please try again',
          });
        }
        return;
      }

      const data = await response.json();

      if (data.success && data.suggestions) {
        // Convert AI suggestions to ChildStoryInput format
        const childSuggestions: ChildStoryInput[] = data.suggestions.map((suggestion: any) => ({
          title: suggestion.title,
          personaGoal: suggestion.personaGoal,
          description: suggestion.description,
          acceptanceCriteria: suggestion.acceptanceCriteria,
          estimatePoints: suggestion.estimatePoints,
          providesUserValue: suggestion.providesUserValue,
        }));

        onChange(childSuggestions);

        toast.success('AI suggestions generated', {
          description: `Created ${childSuggestions.length} story suggestions using ${data.splitStrategy}`,
        });
      }
    } catch (error) {
      console.error('Failed to get AI suggestions:', error);
      toast.error('Failed to generate suggestions', {
        description: 'Please try again or add stories manually',
      });
    } finally {
      setIsLoadingAI(false);
    }
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
    <div className="space-y-4">
      <div className="flex items-center justify-between sticky top-0 bg-background pb-4 z-10">
        <h3 className="font-semibold">
          {t('story.split.children.title')} ({childStories.length})
        </h3>
        <div className="flex gap-2">
          {analysis && childStories.length === 0 && (
            <Button
              variant="default"
              size="sm"
              onClick={suggestSplits}
              disabled={disabled || isLoadingAI}
            >
              {isLoadingAI ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Suggest Splits
                </>
              )}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={addChild}
            disabled={disabled || isLoadingAI}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('story.split.add_child')}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
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

