'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Sparkles, Loader2, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { ChildRowEditor } from './ChildRowEditor';
import type { ChildStoryInput } from '@/lib/services/story-split-validation.service';
import { storySplitValidationService } from '@/lib/services/story-split-validation.service';
import { useTranslation } from '@/lib/i18n';
import type { StorySplitAnalysis } from '@/lib/services/story-split-analysis.service';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useSession } from 'next-auth/react';
import type { ChildValidationResult } from '@/lib/services/story-split-validation.service';

// Super admin emails - must match backend
const SUPER_ADMIN_EMAILS = [
  'chrisjrobertson@outlook.com',
  'chris@synqforge.com',
];

function isSuperAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalizedEmail = email.toLowerCase().trim();
  return SUPER_ADMIN_EMAILS.some(
    adminEmail => adminEmail.toLowerCase() === normalizedEmail
  );
}

interface ChildrenEditorProps {
  childStories: ChildStoryInput[];
  onChange: (children: ChildStoryInput[]) => void;
  onValidationChange: (valid: boolean, results?: ChildValidationResult[]) => void;
  disabled?: boolean;
  analysis?: StorySplitAnalysis;
  storyId: string;
  parentAcceptanceCriteria?: string[];
}

export function ChildrenEditor({
  childStories,
  onChange,
  onValidationChange,
  disabled,
  analysis,
  storyId,
  parentAcceptanceCriteria,
}: ChildrenEditorProps) {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const [validationResults, setValidationResults] = useState<any[]>([]);
  const [coverageAnalysis, setCoverageAnalysis] = useState<any>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  // Check if user is super admin
  const userEmail = session?.user?.email as string | undefined;
  const isSuperAdminUser = isSuperAdmin(userEmail);

  useEffect(() => {
    if (childStories.length === 0) {
      onValidationChange(false, []);
      setCoverageAnalysis(null);
      setValidationResults([]);
      return;
    }

    const validation = storySplitValidationService.validateAllChildren(
      childStories,
      parentAcceptanceCriteria
    );
    setValidationResults(validation.results);
    setCoverageAnalysis(validation.coverage);
    
    // 🔓 SUPER ADMIN BYPASS: Allow submission even with partial coverage
    // For regular users: require 100% coverage to ensure all acceptance criteria are covered
    // For super admin: allow any coverage > 0% (for demo/testing purposes)
    const hasCoverage = isSuperAdminUser 
      ? validation.coverage.coveragePercentage > 0 
      : validation.coverage.coveragePercentage === 100;
    
    onValidationChange(validation.allValid && hasCoverage, validation.results);
  }, [childStories, parentAcceptanceCriteria, onValidationChange, isSuperAdminUser]);

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
      {/* Coverage Analysis Banner */}
      {coverageAnalysis && parentAcceptanceCriteria && parentAcceptanceCriteria.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {coverageAnalysis.coveragePercentage === 100 && coverageAnalysis.duplicatedFunctionality.length === 0 ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : coverageAnalysis.coveragePercentage < 100 ? (
              <AlertTriangle className="h-5 w-5 text-orange-500" />
            ) : (
              <Info className="h-5 w-5 text-blue-500" />
            )}
            <span className="text-sm font-medium">
              Coverage: {coverageAnalysis.coveragePercentage}%
            </span>
            <Progress value={coverageAnalysis.coveragePercentage} className="flex-1 h-2" />
          </div>
          
          {coverageAnalysis.recommendations.length > 0 && (
            <Alert variant={coverageAnalysis.coveragePercentage === 100 ? "default" : "destructive"}>
              <AlertDescription>
                <div className="space-y-1">
                  {coverageAnalysis.recommendations.map((rec: string, idx: number) => (
                    <div key={idx} className="text-sm">
                      {rec}
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

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

