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
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useRefinements, useRefineStoryMutation, useAcceptRefinementMutation, useRejectRefinementMutation } from '@/lib/hooks/useStoryRefinement';
import { format } from 'date-fns';
import type { StoryRefinement } from '@/lib/api/story-refinement.client';

interface RefineStoryModalProps {
  storyId: string;
  open: boolean;
  onClose: () => void;
}

export function RefineStoryModal({ storyId, open, onClose }: RefineStoryModalProps) {
  const [userRequest, setUserRequest] = useState('');
  const refinementsEndRef = useRef<HTMLDivElement>(null);
  
  const { data: refinementsData, isLoading: isLoadingRefinements } = useRefinements(storyId);
  const refineMutation = useRefineStoryMutation(storyId);
  const acceptMutation = useAcceptRefinementMutation(storyId);
  const rejectMutation = useRejectRefinementMutation(storyId);

  const refinements = refinementsData?.refinements || [];

  // Scroll to bottom when new refinement is added
  useEffect(() => {
    if (refinements.length > 0 && refinementsEndRef.current) {
      refinementsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [refinements.length]);

  useEffect(() => {
    if (!open) {
      setUserRequest('');
    }
  }, [open]);

  const handleRefine = async () => {
    try {
      await refineMutation.mutateAsync({
        userRequest: userRequest || undefined,
      });
      // Clear the input after successful refinement
      setUserRequest('');
    } catch (error) {
      // Error is handled by the mutation's onError
    }
  };

  const handleAccept = async (refinementId: string) => {
    try {
      await acceptMutation.mutateAsync(refinementId);
    } catch (error) {
      // Error is handled by the mutation's onError
    }
  };

  const handleReject = async (refinementId: string) => {
    try {
      await rejectMutation.mutateAsync(refinementId);
    } catch (error) {
      // Error is handled by the mutation's onError
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/20"><CheckCircle2 className="h-3 w-3 mr-1" />Accepted</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Refine Story with AI
          </DialogTitle>
          <DialogDescription>
            Get AI-powered suggestions to improve your story's quality, clarity, and adherence to INVEST principles.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Request New Refinement */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Refinement Request (Optional)
              </label>
              <Textarea
                placeholder="E.g., 'Improve acceptance criteria clarity' or 'Make the story more testable'..."
                value={userRequest}
                onChange={(e) => setUserRequest(e.target.value)}
                rows={3}
                disabled={refineMutation.isPending}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty for general refinement suggestions
              </p>
            </div>
            <Button
              onClick={handleRefine}
              disabled={refineMutation.isPending}
              className="w-full"
            >
              {refineMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Refining story...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Refinement
                </>
              )}
            </Button>
          </div>

          {/* Refinements List */}
          {isLoadingRefinements ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : refinements.length === 0 ? (
            <Alert>
              <AlertDescription>
                No refinements yet. Click "Generate Refinement" to get AI suggestions.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Refinement History</h3>
              {refinements.map((refinement) => (
                <div
                  key={refinement.id}
                  className="border border-gray-700 rounded-lg p-4 space-y-3 bg-gray-800/50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusBadge(refinement.status)}
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(refinement.createdAt), 'PPp')}
                        </span>
                      </div>
                      {refinement.userRequest && (
                        <p className="text-sm text-muted-foreground mb-2 italic">
                          Request: "{refinement.userRequest}"
                        </p>
                      )}
                    </div>
                    {refinement.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAccept(refinement.id)}
                          disabled={acceptMutation.isPending || rejectMutation.isPending}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReject(refinement.id)}
                          disabled={acceptMutation.isPending || rejectMutation.isPending}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="prose prose-invert max-w-none">
                    <div className="text-sm whitespace-pre-wrap text-gray-200">
                      {refinement.refinement}
                    </div>
                  </div>
                  {refinement.aiTokensUsed && (
                    <div className="text-xs text-muted-foreground pt-2 border-t border-gray-700">
                      Tokens used: {refinement.aiTokensUsed} | Model: {refinement.aiModelUsed || 'N/A'}
                    </div>
                  )}
                </div>
              ))}
              <div ref={refinementsEndRef} />
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
