'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useSplitAnalysis, useSplitStoryMutation } from '@/lib/hooks/useStorySplit';
import { AnalysisPanel } from './AnalysisPanel';
import { ChildrenEditor } from './ChildrenEditor';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { ChildStoryInput } from '@/lib/services/story-split-validation.service';
import type { ChildValidationResult } from '@/lib/services/story-split-validation.service';
import { useTranslation } from '@/lib/i18n';

interface SplitStoryModalProps {
  storyId: string;
  open: boolean;
  onClose: () => void;
}

export function SplitStoryModal({ storyId, open, onClose }: SplitStoryModalProps) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useSplitAnalysis(storyId);
  const splitMutation = useSplitStoryMutation(storyId);
  
  const [convertToEpic, setConvertToEpic] = useState(false);
  const [children, setChildren] = useState<ChildStoryInput[]>([]);
  const [canSubmit, setCanSubmit] = useState(false);
  const [validationResults, setValidationResults] = useState<ChildValidationResult[]>([]);
  const [showValidationSummary, setShowValidationSummary] = useState(false);
  const [epicConversionError, setEpicConversionError] = useState<string | null>(null);
  
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const firstErrorRef = useRef<HTMLDivElement>(null);

  const analysis = data?.analysis;
  const parentAcceptanceCriteria = data?.parentAcceptanceCriteria || [];
  const isBlocked = analysis?.blockingReasons && analysis.blockingReasons.length > 0;

  useEffect(() => {
    if (!open) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const handleSubmit = async () => {
    if (!canSubmit || isBlocked) return;

    // Clear previous errors
    setEpicConversionError(null);
    setShowValidationSummary(false);

    try {
      await splitMutation.mutateAsync({
        convertParentToEpic: convertToEpic,
        children,
        investRationale: analysis?.invest,
        spidrStrategy: analysis?.spidr,
      });
      onClose();
    } catch (error: any) {
      // Check if error is related to epic conversion
      const errorMessage = error?.message || 'Split failed';
      if (errorMessage.toLowerCase().includes('epic') || errorMessage.toLowerCase().includes('convert')) {
        setEpicConversionError(errorMessage);
      }
      
      // Show validation summary if there are validation errors
      if (!canSubmit) {
        setShowValidationSummary(true);
        // Scroll to first error
        setTimeout(() => {
          firstErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
      }
    }
  };

  const handleValidationChange = useCallback((valid: boolean, results?: ChildValidationResult[]) => {
    setCanSubmit(valid);
    if (results) {
      setValidationResults(results);
      // Show validation summary if invalid
      setShowValidationSummary(!valid);
    }
  }, []);

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>{t('story.split.title')}</DialogTitle>
            <DialogDescription className="sr-only">
              {t('story.split.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">{t('story.split.analyzing')}</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-6xl h-[80vh] flex flex-col"
        aria-describedby="split-story-description"
      >
        <DialogHeader>
          <DialogTitle>{t('story.split.title')}</DialogTitle>
          <DialogDescription id="split-story-description">
            {t('story.split.description')}
          </DialogDescription>
        </DialogHeader>

        {isBlocked && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {analysis.blockingReasons.map((reason) => t(reason)).join('. ')}
              <Button
                variant="link"
                size="sm"
                className="ml-2"
                onClick={onClose}
              >
                {t('story.split.blocking.create_subtasks')}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Validation Summary */}
        {showValidationSummary && validationResults.length > 0 && (
          <div ref={firstErrorRef}>
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold">Please fix the following errors before submitting:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {validationResults.map((result, index) => {
                      if (result.valid) return null;
                      return (
                        <li key={index}>
                          <strong>Story {index + 1}:</strong>{' '}
                          {result.errors.map((error, errIdx) => (
                            <span key={errIdx}>
                              {t(error)}
                              {errIdx < result.errors.length - 1 ? ', ' : ''}
                            </span>
                          ))}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Epic Conversion Error */}
        {epicConversionError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Epic conversion failed:</strong> {epicConversionError}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
          <div className="overflow-y-auto">
            <AnalysisPanel 
              analysis={analysis} 
              storyId={storyId}
              isLoading={isLoading}
              isError={isError}
            />
          </div>
          
          <div className="overflow-y-auto">
            <ChildrenEditor
              childStories={children}
              onChange={setChildren}
              onValidationChange={handleValidationChange}
              disabled={isBlocked}
              analysis={analysis}
              storyId={storyId}
              parentAcceptanceCriteria={parentAcceptanceCriteria}
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="convert-to-epic"
                checked={convertToEpic}
                onCheckedChange={(checked) => {
                  setConvertToEpic(checked === true);
                  setEpicConversionError(null);
                }}
                disabled={isBlocked}
              />
              <label
                htmlFor="convert-to-epic"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {t('story.split.convert_to_epic')}
              </label>
            </div>
            {convertToEpic && (
              <p className="text-xs text-muted-foreground ml-6">
                This story will be converted to an epic and linked to the child stories.
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              ref={closeButtonRef}
              variant="outline"
              onClick={onClose}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || isBlocked || splitMutation.isPending}
            >
              {splitMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('story.split.creating')}
                </>
              ) : (
                t('story.split.create_stories', { count: children.length })
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

