import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface Refinement {
  id: string;
  storyId: string;
  refinement: string;
  userRequest?: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  acceptedAt?: Date | null;
  rejectedAt?: Date | null;
  rejectedReason?: string | null;
  aiModelUsed?: string | null;
  aiTokensUsed?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

import type { RefinementResponse } from '@/types/refinement';

export interface RefineStoryResponse extends RefinementResponse {
  success?: boolean;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model?: string;
}

export function useRefinements(storyId: string) {
  return useQuery({
    queryKey: ['story-refinements', storyId],
    queryFn: async () => {
      const response = await fetch(`/api/stories/${storyId}/refinements`);
      if (!response.ok) {
        throw new Error('Failed to fetch refinements');
      }
      const data = await response.json();
      return data.refinements as Refinement[];
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useRefineStoryMutation(storyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (instructions: string): Promise<RefineStoryResponse> => {
      const response = await fetch(`/api/stories/${storyId}/refine`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ instructions, preserveOriginal: true }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to refine story');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['story-refinements', storyId] });
      queryClient.invalidateQueries({ queryKey: ['story', storyId] });
      toast.success('Story refinement generated', {
        description: `Made ${data.changes.totalChanges} changes to your story.`,
      });
    },
    onError: (error: Error) => {
      toast.error('Refinement failed', {
        description: error.message,
      });
    },
  });
}

export function useAcceptRefinementMutation(storyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      refinementId,
      saveToHistory = true,
    }: {
      refinementId: string;
      saveToHistory?: boolean;
    }) => {
      const response = await fetch(
        `/api/stories/${storyId}/refinements/${refinementId}/accept`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ saveToHistory }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to accept refinement');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['story-refinements', storyId] });
      queryClient.invalidateQueries({ queryKey: ['story', storyId] });
      toast.success('Story successfully refined!');
    },
    onError: (error: Error) => {
      toast.error('Failed to accept refinement', {
        description: error.message,
      });
    },
  });
}

export function useRejectRefinementMutation(storyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ refinementId, reason }: { refinementId: string; reason?: string }) => {
      const response = await fetch(
        `/api/stories/${storyId}/refinements/${refinementId}/reject`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reason }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to reject refinement');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['story-refinements', storyId] });
      toast.success('Refinement rejected');
    },
    onError: (error: Error) => {
      toast.error('Failed to reject refinement', {
        description: error.message,
      });
    },
  });
}

