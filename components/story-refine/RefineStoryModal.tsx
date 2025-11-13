'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { InstructionInput, RefinementOptions } from './InstructionInput';
import { ProcessingState } from './ProcessingState';
import { ReviewInterface } from './ReviewInterface';
import { SelectiveReviewInterface } from './SelectiveReviewInterface';
import { StructuredReviewInterface } from './StructuredReviewInterface';
import { RefinementStage, RefinementResponse, DiffChange } from '@/types/refinement';
import { toast } from 'sonner';
import { useRefineStoryMutation } from '@/lib/hooks/useStoryRefinement';

interface RefineStoryModalProps {
  story: {
    id: string;
    title: string;
    description?: string | null;
  };
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function RefineStoryModal({
  story,
  isOpen,
  onClose,
  onComplete,
}: RefineStoryModalProps) {
  const [stage, setStage] = useState<RefinementStage>('input');
  const [instructions, setInstructions] = useState('');
  const [refinementResult, setRefinementResult] =
    useState<RefinementResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useSelectiveReview, setUseSelectiveReview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const refineMutation = useRefineStoryMutation(story.id);

  // BUG FIX: Clean up state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStage('input');
      setInstructions('');
      setRefinementResult(null);
      setError(null);
      setIsSubmitting(false);
      setUseSelectiveReview(false);
    }
  }, [isOpen]);

  const handleRefine = async (_options?: RefinementOptions) => {
    if (instructions.length < 10) {
      toast.error('Instructions too short', {
        description: 'Please provide at least 10 characters of instructions.',
      });
      return;
    }

    setStage('processing');
    setError(null);

    try {
      // TODO: Pass options to API when backend supports it
      const data = await refineMutation.mutateAsync(instructions);
      setRefinementResult(data);
      setStage('review');
    } catch (err: any) {
      setError(err.message);
      setStage('input');
      toast.error('Refinement failed', {
        description: err.message,
      });
    }
  };

  const handleAccept = async (saveToHistory: boolean, selectedChanges?: DiffChange[]) => {
    if (!refinementResult || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/stories/${story.id}/refinements/${refinementResult.refinementId}/accept`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            saveToHistory,
            selectedChanges: selectedChanges?.map(c => c.changeId || c.position),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.error || `Failed to accept refinement (${response.status})`;
        console.error('Accept refinement error:', errorData);
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      // Handle already-applied case gracefully
      if (result.alreadyApplied) {
        toast.success('Already Applied', {
          description: result.message || 'This refinement was already applied to your story.',
        });
      } else {
        toast.success('Success!', {
          description: result.message || 'Your story has been updated with the refinement.',
        });
      }

      // Close modal immediately after successful accept
      onComplete();
    } catch (err: any) {
      console.error('Error accepting refinement:', err);
      toast.error('Error', {
        description: err.message || 'Failed to apply refinement. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!refinementResult) return;

    try {
      await fetch(
        `/api/stories/${story.id}/refinements/${refinementResult.refinementId}/reject`,
        { method: 'POST' }
      );

      toast.success('Refinement discarded', {
        description: 'Your original story remains unchanged.',
      });

      onClose();
    } catch (err) {
      console.error('Failed to reject refinement:', err);
      onClose();
    }
  };

  const handleRefineAgain = () => {
    setStage('input');
    // Keep existing instructions for editing
  };

  const handleCloseModal = () => {
    if (stage === 'processing') {
      // Warn user before closing during processing
      if (
        confirm(
          'Refinement is in progress. Are you sure you want to cancel?'
        )
      ) {
        onClose();
        // Reset state
        setStage('input');
        setInstructions('');
        setRefinementResult(null);
      }
    } else {
      onClose();
      // Reset state
      setStage('input');
      setInstructions('');
      setRefinementResult(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCloseModal}>
      <DialogContent 
        className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
        aria-describedby="refinement-dialog-description"
      >
        <DialogHeader>
          <DialogTitle>
            {stage === 'input' && 'Refine Your Story with AI'}
            {stage === 'processing' && 'Refining Your Story...'}
            {stage === 'review' && 'Review Refinement'}
          </DialogTitle>
          <DialogDescription id="refinement-dialog-description">
            {stage === 'input' && 'Provide instructions for AI refinement'}
            {stage === 'processing' && 'Refining your story'}
            {stage === 'review' && 'Review changes before accepting'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {stage === 'input' && (
            <InstructionInput
              instructions={instructions}
              onChange={setInstructions}
              onSubmit={handleRefine}
              storyTitle={story.title}
              storyExcerpt={(story.description || '').slice(0, 150)}
              error={error}
            />
          )}

          {stage === 'processing' && <ProcessingState />}

          {stage === 'review' && refinementResult && (
            <>
              {/* Check if structured data is available (new format) */}
              {refinementResult.originalStory && refinementResult.refinedStory && refinementResult.changes?.summary ? (
                <StructuredReviewInterface
                  originalStory={refinementResult.originalStory}
                  refinedStory={refinementResult.refinedStory}
                  changes={refinementResult.changes}
                  onAccept={handleAccept}
                  onReject={handleReject}
                  onRefineAgain={handleRefineAgain}
                  isSubmitting={isSubmitting}
                />
              ) : (
                <>
                  {/* Fallback to legacy interface for backward compatibility */}
                  <div className="flex justify-end mb-2">
                    <button
                      onClick={() => setUseSelectiveReview(!useSelectiveReview)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      {useSelectiveReview ? 'Switch to standard review' : 'Switch to selective review'}
                    </button>
                  </div>
                  {useSelectiveReview ? (
                    <SelectiveReviewInterface
                      original={refinementResult.originalContent}
                      refined={refinementResult.refinedContent}
                      changes={refinementResult.changes as any}
                      onAccept={(selectedChanges, saveToHistory) => handleAccept(saveToHistory, selectedChanges)}
                      onReject={handleReject}
                      onRefineAgain={handleRefineAgain}
                    />
                  ) : (
                    <ReviewInterface
                      original={refinementResult.originalContent}
                      refined={refinementResult.refinedContent}
                      changes={refinementResult.changes as any}
                      onAccept={handleAccept}
                      onReject={handleReject}
                      onRefineAgain={handleRefineAgain}
                    />
                  )}
                </>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
