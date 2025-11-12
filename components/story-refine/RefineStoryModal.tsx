'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, Check, X, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  useRefinements,
  useRefineStoryMutation,
  useAcceptRefinementMutation,
  useRejectRefinementMutation,
  type Refinement,
} from '@/lib/hooks/useStoryRefinement';
import { format } from 'date-fns';

interface RefineStoryModalProps {
  storyId: string;
  open: boolean;
  onClose: () => void;
}

export function RefineStoryModal({ storyId, open, onClose }: RefineStoryModalProps) {
  const [userRequest, setUserRequest] = useState('');
  const [selectedRefinement, setSelectedRefinement] = useState<Refinement | null>(null);

  const { data: refinements, isLoading: isLoadingRefinements } = useRefinements(storyId);
  const refineMutation = useRefineStoryMutation(storyId);
  const acceptMutation = useAcceptRefinementMutation(storyId);
  const rejectMutation = useRejectRefinementMutation(storyId);

  // Set the most recent pending refinement as selected when refinements load
  useEffect(() => {
    if (refinements && refinements.length > 0 && !selectedRefinement) {
      const pendingRefinement = refinements.find((r) => r.status === 'pending');
      if (pendingRefinement) {
        setSelectedRefinement(pendingRefinement);
      } else {
        setSelectedRefinement(refinements[0]);
      }
    }
  }, [refinements, selectedRefinement]);

  const handleRefine = async () => {
    try {
      await refineMutation.mutateAsync(userRequest || undefined);
      setUserRequest('');
    } catch (_error) {
      // Error handled by mutation
    }
  };

  const handleAccept = async (refinementId: string) => {
    try {
      await acceptMutation.mutateAsync(refinementId);
      onClose();
    } catch (_error) {
      // Error handled by mutation
    }
  };

  const handleReject = async (refinementId: string, reason?: string) => {
    try {
      await rejectMutation.mutateAsync({ refinementId, reason });
    } catch (_error) {
      // Error handled by mutation
    }
  };

  const pendingRefinements = refinements?.filter((r) => r.status === 'pending') || [];
  const acceptedRefinements = refinements?.filter((r) => r.status === 'accepted') || [];
  const rejectedRefinements = refinements?.filter((r) => r.status === 'rejected') || [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Refine Story with AI
          </DialogTitle>
          <DialogDescription>
            Get AI-powered suggestions to improve your story based on INVEST principles
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Request Input */}
          <div className="space-y-2">
            <Label htmlFor="refinement-request">Optional: Specify what you'd like to improve</Label>
            <Textarea
              id="refinement-request"
              placeholder="e.g., Make the acceptance criteria more specific, improve clarity, add more detail..."
              value={userRequest}
              onChange={(e) => setUserRequest(e.target.value)}
              rows={3}
            />
            <Button
              onClick={handleRefine}
              disabled={refineMutation.isPending}
              className="w-full"
            >
              {refineMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating refinement...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Refinement
                </>
              )}
            </Button>
          </div>

          {/* Loading State */}
          {isLoadingRefinements && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading refinements...</span>
            </div>
          )}

          {/* Refinements List */}
          {!isLoadingRefinements && refinements && refinements.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Refinement History</h3>
                <div className="flex gap-2 text-sm text-muted-foreground">
                  <span>{pendingRefinements.length} Pending</span>
                  <span>•</span>
                  <span>{acceptedRefinements.length} Accepted</span>
                  <span>•</span>
                  <span>{rejectedRefinements.length} Rejected</span>
                </div>
              </div>

              {/* Refinement Selection */}
              {refinements.length > 1 && (
                <div className="space-y-2">
                  <Label>Select a refinement to review:</Label>
                  <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                    {refinements.map((refinement) => (
                      <button
                        key={refinement.id}
                        onClick={() => setSelectedRefinement(refinement)}
                        className={`p-3 text-left border rounded-lg transition-colors ${
                          selectedRefinement?.id === refinement.id
                            ? 'border-purple-500 bg-purple-500/10'
                            : 'border-border hover:border-purple-500/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {format(new Date(refinement.createdAt), 'PPp')}
                              </span>
                              <span
                                className={`text-xs px-2 py-0.5 rounded ${
                                  refinement.status === 'pending'
                                    ? 'bg-yellow-500/20 text-yellow-600'
                                    : refinement.status === 'accepted'
                                    ? 'bg-green-500/20 text-green-600'
                                    : 'bg-red-500/20 text-red-600'
                                }`}
                              >
                                {refinement.status}
                              </span>
                            </div>
                            {refinement.userRequest && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {refinement.userRequest}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected Refinement Display */}
              {selectedRefinement && (
                <div className="space-y-4 border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">Refinement Details</h4>
                      <p className="text-sm text-muted-foreground">
                        Created: {format(new Date(selectedRefinement.createdAt), 'PPp')}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        selectedRefinement.status === 'pending'
                          ? 'bg-yellow-500/20 text-yellow-600'
                          : selectedRefinement.status === 'accepted'
                          ? 'bg-green-500/20 text-green-600'
                          : 'bg-red-500/20 text-red-600'
                      }`}
                    >
                      {selectedRefinement.status}
                    </span>
                  </div>

                  {selectedRefinement.userRequest && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Your Request:</Label>
                      <p className="text-sm mt-1">{selectedRefinement.userRequest}</p>
                    </div>
                  )}

                  <div>
                    <Label className="text-xs text-muted-foreground">AI Suggestions:</Label>
                    <div className="mt-2 p-4 bg-muted rounded-lg whitespace-pre-wrap text-sm">
                      {selectedRefinement.refinement}
                    </div>
                  </div>

                  {selectedRefinement.status === 'pending' && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={() => handleAccept(selectedRefinement.id)}
                        disabled={acceptMutation.isPending}
                        className="flex-1"
                      >
                        {acceptMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Accepting...
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Accept Refinement
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => handleReject(selectedRefinement.id)}
                        disabled={rejectMutation.isPending}
                        variant="outline"
                        className="flex-1"
                      >
                        {rejectMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Rejecting...
                          </>
                        ) : (
                          <>
                            <X className="h-4 w-4 mr-2" />
                            Reject
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {selectedRefinement.status === 'accepted' && (
                    <Alert>
                      <Check className="h-4 w-4" />
                      <AlertDescription>
                        This refinement was accepted on{' '}
                        {selectedRefinement.acceptedAt &&
                          format(new Date(selectedRefinement.acceptedAt), 'PPp')}
                      </AlertDescription>
                    </Alert>
                  )}

                  {selectedRefinement.status === 'rejected' && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        This refinement was rejected on{' '}
                        {selectedRefinement.rejectedAt &&
                          format(new Date(selectedRefinement.rejectedAt), 'PPp')}
                        {selectedRefinement.rejectedReason && (
                          <>
                            <br />
                            <strong>Reason:</strong> {selectedRefinement.rejectedReason}
                          </>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {!isLoadingRefinements && (!refinements || refinements.length === 0) && (
            <div className="text-center py-8 text-muted-foreground">
              <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No refinements yet. Generate one to get started!</p>
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

