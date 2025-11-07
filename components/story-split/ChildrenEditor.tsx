'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Sparkles, Loader2, CheckCircle2, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { ChildRowEditor } from './ChildRowEditor';
import type { ChildStoryInput } from '@/lib/services/story-split-validation.service';
import { storySplitValidationService } from '@/lib/services/story-split-validation.service';
import { useTranslation } from '@/lib/i18n';
import type { StorySplitAnalysis } from '@/lib/services/story-split-analysis.service';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import type { ChildValidationResult, CoverageAnalysis } from '@/lib/services/story-split-validation.service';

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
  const [coverageAnalysis, setCoverageAnalysis] = useState<CoverageAnalysis | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [expandedCards, setExpandedCards] = useState<boolean[]>([]);

  // Check if user is super admin
  const userEmail = session?.user?.email as string | undefined;
  const isSuperAdminUser = isSuperAdmin(userEmail);

  useEffect(() => {
    if (childStories.length === 0) {
      onValidationChange(false, []);
      setCoverageAnalysis(null);
      setValidationResults([]);
      setExpandedCards([]);
      return;
    }

    const validation = storySplitValidationService.validateAllChildren(
      childStories,
      parentAcceptanceCriteria
    );
    setValidationResults(validation.results);
    setCoverageAnalysis(validation.coverage);
    
    // Initialize expanded state for all cards (default to collapsed)
    // Only update if the length changed to avoid unnecessary re-renders
    setExpandedCards(prev => {
      if (prev.length !== childStories.length) {
        return new Array(childStories.length).fill(false);
      }
      return prev;
    });
    
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
    // Add expanded state for new child (expanded by default so user can edit)
    setExpandedCards(prev => [...prev, true]);
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
        // Initialize expanded cards for new suggestions (all collapsed by default)
        setExpandedCards(new Array(childSuggestions.length).fill(false));

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
    setExpandedCards(prev => prev.filter((_, i) => i !== index));
  };

  const toggleCard = (index: number) => {
    const newExpanded = [...expandedCards];
    newExpanded[index] = !newExpanded[index];
    setExpandedCards(newExpanded);
  };

  const expandAll = () => {
    setExpandedCards(new Array(childStories.length).fill(true));
  };

  const collapseAll = () => {
    setExpandedCards(new Array(childStories.length).fill(false));
  };

  // Memoize keyboard shortcut handlers to avoid recreating them
  const handleExpandAll = useCallback(() => {
    expandAll();
  }, [expandAll]);

  const handleCollapseAll = useCallback(() => {
    collapseAll();
  }, [collapseAll]);

  const handleQuickAddStoryForCriterion = async (criterion: string, _criterionIndex: number) => {
    if (!analysis) return;

    setIsLoadingAI(true);
    try {
      // Generate a story specifically for this criterion
      const response = await fetch(`/api/stories/${storyId}/ai-split-suggestions`, {
        credentials: 'include',
      });

      if (!response.ok) {
        toast.error('Failed to generate story', {
          description: 'Please try again or add manually',
        });
        return;
      }

      const data = await response.json();
      
      if (data.success && data.suggestions) {
        // Find suggestions that cover this criterion
        const relevantSuggestions = data.suggestions.filter((suggestion: any) => 
          suggestion.acceptanceCriteria?.some((ac: string) => 
            ac.toLowerCase().includes(criterion.toLowerCase().substring(0, 20))
          )
        );

        if (relevantSuggestions.length > 0) {
          const newStory: ChildStoryInput = {
            title: relevantSuggestions[0].title,
            personaGoal: relevantSuggestions[0].personaGoal,
            description: relevantSuggestions[0].description,
            acceptanceCriteria: relevantSuggestions[0].acceptanceCriteria,
            estimatePoints: relevantSuggestions[0].estimatePoints,
            providesUserValue: relevantSuggestions[0].providesUserValue,
          };
          
          onChange([...childStories, newStory]);
          setExpandedCards(prev => [...prev, true]); // Expand the new card
          
          toast.success('Story added', {
            description: `Added story to cover this criterion`,
          });
        } else {
          // Fallback: create a basic story structure
          const newStory: ChildStoryInput = {
            title: `Cover: ${criterion.substring(0, 50)}...`,
            personaGoal: 'As a user, I want this functionality so that I can complete my task',
            description: `This story covers: ${criterion}`,
            acceptanceCriteria: [criterion],
            estimatePoints: 3,
            providesUserValue: true,
          };
          
          onChange([...childStories, newStory]);
          setExpandedCards(prev => [...prev, true]);
          
          toast.success('Story template added', {
            description: 'Please edit the story details',
          });
        }
      }
    } catch (error) {
      console.error('Failed to add story for criterion:', error);
      toast.error('Failed to generate story', {
        description: 'Please add manually',
      });
    } finally {
      setIsLoadingAI(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === 'E') {
        e.preventDefault();
        handleExpandAll();
      }
      if (e.shiftKey && e.key === 'C') {
        e.preventDefault();
        handleCollapseAll();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleExpandAll, handleCollapseAll]);

  return (
    <div className="space-y-6">
      {/* Redesigned Coverage Section */}
      {coverageAnalysis && parentAcceptanceCriteria && parentAcceptanceCriteria.length > 0 && (
        <div className="rounded-lg border bg-card p-6 space-y-4">
          {/* Coverage Header */}
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold">Acceptance Criteria Coverage</h4>
            <div className="text-right">
              <div className={`text-3xl font-bold ${
                coverageAnalysis.coveragePercentage === 100 
                  ? 'text-green-600' 
                  : coverageAnalysis.coveragePercentage >= 80 
                  ? 'text-orange-600' 
                  : 'text-red-600'
              }`}>
                {coverageAnalysis.coveragePercentage}%
              </div>
              <div className="text-sm text-muted-foreground">Covered</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="h-6 bg-secondary rounded-full overflow-hidden relative">
              <div 
                className={`h-full transition-all duration-300 flex items-center justify-end pr-3 ${
                  coverageAnalysis.coveragePercentage === 100 
                    ? 'bg-green-600' 
                    : coverageAnalysis.coveragePercentage >= 80 
                    ? 'bg-orange-600' 
                    : 'bg-red-600'
                }`}
                style={{ width: `${coverageAnalysis.coveragePercentage}%` }}
              >
                <span className="text-xs font-medium text-white">
                  {coverageAnalysis.coveredCriteria.length} of {parentAcceptanceCriteria.length} criteria
                </span>
              </div>
            </div>
          </div>

          {/* Missing Criteria Section */}
          {coverageAnalysis.coveragePercentage < 100 && coverageAnalysis.uncoveredCriteria.length > 0 && (
            <div className="mt-6 pt-6 border-t space-y-4">
              <div className="flex items-center gap-2 text-orange-600">
                <AlertCircle className="h-5 w-5" />
                <strong className="text-sm font-semibold">
                  {coverageAnalysis.uncoveredCriteria.length} criteria not covered - Action required
                </strong>
              </div>
              
              <div className="space-y-3">
                {coverageAnalysis.uncoveredCriteria.map((criterion, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-start gap-4 p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/30 rounded-lg"
                  >
                    <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <h5 className="text-sm font-semibold mb-1">Criterion {idx + 1}</h5>
                      <p className="text-sm text-muted-foreground leading-relaxed">{criterion}</p>
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleQuickAddStoryForCriterion(criterion, idx)}
                        disabled={disabled || isLoadingAI}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Create Story
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={addChild}
                        disabled={disabled || isLoadingAI}
                      >
                        Add Manually
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Success Message */}
          {coverageAnalysis.coveragePercentage === 100 && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium">
                All acceptance criteria are covered by child stories
              </span>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between sticky top-0 bg-background pb-4 z-10">
        <h3 className="font-semibold">
          {t('story.split.children.title')} ({childStories.length})
        </h3>
        <div className="flex gap-2">
          {childStories.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={expandAll}
                disabled={disabled}
              >
                <ChevronDown className="h-4 w-4 mr-1" />
                Expand All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={collapseAll}
                disabled={disabled}
              >
                <ChevronRight className="h-4 w-4 mr-1" />
                Collapse All
              </Button>
            </>
          )}
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
              expanded={expandedCards[index] ?? false}
              onToggle={() => toggleCard(index)}
            />
          ))
        )}
      </div>
    </div>
  );
}

