'use client';

import { useState, useEffect, useRef } from 'react';
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
import { useTranslation } from '@/lib/i18n';

interface SplitStoryModalProps {
  storyId: string;
  open: boolean;
  onClose: () => void;
}

export function SplitStoryModal({ storyId, open, onClose }: SplitStoryModalProps) {
  const { t } = useTranslation();
  const { data, isLoading } = useSplitAnalysis(storyId);
  const splitMutation = useSplitStoryMutation(storyId);
  
  const [convertToEpic, setConvertToEpic] = useState(false);
  const [children, setChildren] = useState<ChildStoryInput[]>([]);
  const [canSubmit, setCanSubmit] = useState(false);
  
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const analysis = data?.analysis;
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

    try {
      await splitMutation.mutateAsync({
        convertParentToEpic: convertToEpic,
        children,
        investRationale: analysis?.invest,
        spidrStrategy: analysis?.spidr,
      });
      onClose();
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl h-[80vh]">
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

        <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
          <div className="overflow-y-auto">
            <AnalysisPanel analysis={analysis} storyId={storyId} />
          </div>
          
          <div className="overflow-y-auto">
            <ChildrenEditor
              childStories={children}
              onChange={setChildren}
              onValidationChange={setCanSubmit}
              disabled={isBlocked}
              analysis={analysis}
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="convert-to-epic"
              checked={convertToEpic}
              onCheckedChange={(checked) => setConvertToEpic(checked === true)}
              disabled={isBlocked}
            />
            <label
              htmlFor="convert-to-epic"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {t('story.split.convert_to_epic')}
            </label>
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

