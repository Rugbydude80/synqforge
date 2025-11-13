'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Check, X, Loader2 } from 'lucide-react';
import { InstructionInput, RefinementOptions } from './InstructionInput';
import { toast } from 'sonner';

interface Story {
  id: string;
  title: string;
  description?: string | null;
}

interface BatchRefinementModalProps {
  stories: Story[];
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface RefinementJob {
  storyId: string;
  storyTitle: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  refinementId?: string;
  error?: string;
}

export function BatchRefinementModal({
  stories,
  isOpen,
  onClose,
  onComplete,
}: BatchRefinementModalProps) {
  const [instructions, setInstructions] = useState('');
  const [options, setOptions] = useState<RefinementOptions | undefined>();
  const [jobs, setJobs] = useState<RefinementJob[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<'input' | 'processing' | 'review'>('input');

  const handleStartBatch = async () => {
    if (instructions.length < 10) {
      toast.error('Instructions too short');
      return;
    }

    setIsProcessing(true);
    setCurrentStep('processing');

    // Initialize jobs
    const initialJobs: RefinementJob[] = stories.map((story) => ({
      storyId: story.id,
      storyTitle: story.title,
      status: 'pending',
    }));
    setJobs(initialJobs);

    // Process each story sequentially
    for (let i = 0; i < stories.length; i++) {
      const story = stories[i];
      
      setJobs((prev) =>
        prev.map((job, idx) =>
          idx === i ? { ...job, status: 'processing' } : job
        )
      );

      try {
        const response = await fetch(`/api/stories/${story.id}/refine`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instructions,
            options,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setJobs((prev) =>
            prev.map((job, idx) =>
              idx === i
                ? {
                    ...job,
                    status: 'completed',
                    refinementId: data.refinementId,
                  }
                : job
            )
          );
        } else {
          const error = await response.json();
          setJobs((prev) =>
            prev.map((job, idx) =>
              idx === i
                ? { ...job, status: 'failed', error: error.message || 'Failed' }
                : job
            )
          );
        }
      } catch (err: any) {
        setJobs((prev) =>
          prev.map((job, idx) =>
            idx === i
              ? { ...job, status: 'failed', error: err.message }
              : job
          )
        );
      }
    }

    setIsProcessing(false);
    setCurrentStep('review');
  };

  const handleAcceptAll = async () => {
    const completedJobs = jobs.filter((j) => j.status === 'completed' && j.refinementId);

    for (const job of completedJobs) {
      try {
        await fetch(
          `/api/stories/${job.storyId}/refinements/${job.refinementId}/accept`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ saveToHistory: true }),
          }
        );
      } catch (err) {
        console.error(`Failed to accept refinement for ${job.storyId}:`, err);
      }
    }

    toast.success(`Applied refinements to ${completedJobs.length} stories`);
    onComplete();
    onClose();
  };

  const completedCount = jobs.filter((j) => j.status === 'completed').length;
  const failedCount = jobs.filter((j) => j.status === 'failed').length;
  const progress = stories.length > 0 ? (completedCount / stories.length) * 100 : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Batch Refine Stories</DialogTitle>
          <DialogDescription>
            Refine {stories.length} selected {stories.length === 1 ? 'story' : 'stories'} with AI
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {currentStep === 'input' && (
            <div className="space-y-4">
              <InstructionInput
                instructions={instructions}
                onChange={setInstructions}
                onSubmit={(opts) => {
                  setOptions(opts);
                  handleStartBatch();
                }}
                storyTitle={`${stories.length} ${stories.length === 1 ? 'Story' : 'Stories'}`}
                storyExcerpt={`Batch refinement for ${stories.length} ${stories.length === 1 ? 'story' : 'stories'}`}
              />
            </div>
          )}

          {currentStep === 'processing' && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>
                    {completedCount} / {stories.length} completed
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {jobs.map((job, idx) => (
                  <div
                    key={job.storyId}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      {job.status === 'processing' && (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      )}
                      {job.status === 'completed' && (
                        <Check className="h-4 w-4 text-emerald-500" />
                      )}
                      {job.status === 'failed' && (
                        <X className="h-4 w-4 text-rose-500" />
                      )}
                      {job.status === 'pending' && (
                        <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                      )}
                      <span className="text-sm font-medium">{job.storyTitle}</span>
                    </div>
                    <Badge
                      variant={
                        job.status === 'completed'
                          ? 'default'
                          : job.status === 'failed'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {job.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentStep === 'review' && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700">
                  {completedCount} Completed
                </Badge>
                {failedCount > 0 && (
                  <Badge variant="destructive">{failedCount} Failed</Badge>
                )}
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {jobs.map((job) => (
                  <div
                    key={job.storyId}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      {job.status === 'completed' && (
                        <Check className="h-4 w-4 text-emerald-500" />
                      )}
                      {job.status === 'failed' && (
                        <X className="h-4 w-4 text-rose-500" />
                      )}
                      <div>
                        <span className="text-sm font-medium">{job.storyTitle}</span>
                        {job.error && (
                          <p className="text-xs text-destructive mt-1">{job.error}</p>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant={
                        job.status === 'completed' ? 'default' : 'destructive'
                      }
                    >
                      {job.status}
                    </Badge>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
                {completedCount > 0 && (
                  <Button onClick={handleAcceptAll} className="gap-2">
                    <Check className="h-4 w-4" />
                    Accept All ({completedCount})
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

