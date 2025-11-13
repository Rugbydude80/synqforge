'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { InstructionInput } from './InstructionInput';
import { ProcessingState } from './ProcessingState';
import { ReviewInterface } from './ReviewInterface';
import { RefinementStage, RefinementResponse } from '@/types/refinement';
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

  const refineMutation = useRefineStoryMutation(story.id);

  const handleRefine = async () => {
    if (instructions.length < 10) {
      toast.error('Instructions too short', {
        description: 'Please provide at least 10 characters of instructions.',
      });
      return;
    }

    setStage('processing');
    setError(null);

    try {
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

  const handleAccept = async (saveToHistory: boolean) => {
    if (!refinementResult) return;

    try {
      const response = await fetch(
        `/api/stories/${story.id}/refinements/${refinementResult.refinementId}/accept`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ saveToHistory }),
        }
      );

      if (!response.ok) throw new Error('Failed to accept refinement');

      toast.success('Success!', {
        description: 'Your story has been updated with the refinement.',
      });

      onComplete();
    } catch {
      toast.error('Error', {
        description: 'Failed to apply refinement. Please try again.',
      });
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
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {stage === 'input' && 'Refine Your Story with AI'}
            {stage === 'processing' && 'Refining Your Story...'}
            {stage === 'review' && 'Review Refinement'}
          </DialogTitle>
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
            <ReviewInterface
              original={refinementResult.originalContent}
              refined={refinementResult.refinedContent}
              changes={refinementResult.changes}
              onAccept={handleAccept}
              onReject={handleReject}
              onRefineAgain={handleRefineAgain}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
