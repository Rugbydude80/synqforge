'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Sparkles } from 'lucide-react';
import { ChildRowEditor } from './ChildRowEditor';
import type { ChildStoryInput } from '@/lib/services/story-split-validation.service';
import { storySplitValidationService } from '@/lib/services/story-split-validation.service';
import { useTranslation } from '@/lib/i18n';
import type { StorySplitAnalysis } from '@/lib/services/story-split-analysis.service';

interface ChildrenEditorProps {
  childStories: ChildStoryInput[];
  onChange: (children: ChildStoryInput[]) => void;
  onValidationChange: (valid: boolean) => void;
  disabled?: boolean;
  analysis?: StorySplitAnalysis;
}

export function ChildrenEditor({
  childStories,
  onChange,
  onValidationChange,
  disabled,
  analysis,
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

  const suggestSplits = () => {
    if (!analysis) return;

    const suggestions: ChildStoryInput[] = [];

    // Generate suggestions based on SPIDR hints
    if (analysis.spidr.spike) {
      suggestions.push({
        title: 'Research spike',
        personaGoal: 'determine technical approach',
        description: 'Investigate and document the technical approach for implementation',
        acceptanceCriteria: ['Research documented', 'Technical recommendations provided'],
        estimatePoints: 2,
        providesUserValue: false,
      });
    }

    if (analysis.spidr.interfaces) {
      suggestions.push({
        title: 'Frontend interface',
        personaGoal: 'interact with the feature',
        description: 'Implement the user interface components',
        acceptanceCriteria: ['UI components created', 'User can interact with interface'],
        estimatePoints: 3,
        providesUserValue: true,
      });
      suggestions.push({
        title: 'Backend API',
        personaGoal: 'process requests',
        description: 'Implement the backend API endpoints',
        acceptanceCriteria: ['API endpoints created', 'API responds correctly'],
        estimatePoints: 3,
        providesUserValue: false,
      });
    }

    if (analysis.spidr.data) {
      suggestions.push({
        title: 'Data handling',
        personaGoal: 'manage data',
        description: 'Implement data processing and storage',
        acceptanceCriteria: ['Data can be saved', 'Data can be retrieved'],
        estimatePoints: 3,
        providesUserValue: false,
      });
    }

    if (analysis.spidr.rules) {
      suggestions.push({
        title: 'Business rules',
        personaGoal: 'enforce constraints',
        description: 'Implement validation and business logic',
        acceptanceCriteria: ['Rules enforced', 'Invalid data rejected'],
        estimatePoints: 2,
        providesUserValue: false,
      });
    }

    if (analysis.spidr.paths) {
      suggestions.push({
        title: 'Happy path',
        personaGoal: 'complete the primary flow',
        description: 'Implement the main success scenario',
        acceptanceCriteria: ['Primary flow works', 'User can complete main task'],
        estimatePoints: 3,
        providesUserValue: true,
      });
      suggestions.push({
        title: 'Edge cases',
        personaGoal: 'handle exceptions',
        description: 'Handle error cases and edge scenarios',
        acceptanceCriteria: ['Errors handled gracefully', 'Edge cases covered'],
        estimatePoints: 2,
        providesUserValue: false,
      });
    }

    // If no specific splits detected, suggest generic vertical slices
    if (suggestions.length === 0) {
      suggestions.push({
        title: 'Core functionality',
        personaGoal: 'use basic features',
        description: 'Implement the minimum viable functionality',
        acceptanceCriteria: ['Basic feature works', 'User can complete main action'],
        estimatePoints: 3,
        providesUserValue: true,
      });
      suggestions.push({
        title: 'Enhancements',
        personaGoal: 'access additional features',
        description: 'Add supplementary features and improvements',
        acceptanceCriteria: ['Additional features added', 'User experience improved'],
        estimatePoints: 2,
        providesUserValue: true,
      });
    }

    onChange(suggestions);
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
        <div className="flex gap-2">
          {analysis && childStories.length === 0 && (
            <Button
              variant="default"
              size="sm"
              onClick={suggestSplits}
              disabled={disabled}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Suggest Splits
            </Button>
          )}
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

