import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storyRefinementApi, type RefineStoryRequest } from '@/lib/api/story-refinement.client';
import { toast } from 'sonner';

export function useRefinements(storyId: string) {
  return useQuery({
    queryKey: ['story-refinements', storyId],
    queryFn: () => storyRefinementApi.getRefinements(storyId),
    staleTime: 30 * 1000, // 30 seconds
    retry: 1,
  });
}

export function useRefineStoryMutation(storyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request?: RefineStoryRequest) =>
      storyRefinementApi.refineStory(storyId, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['story-refinements', storyId] });
      toast.success('Story refined successfully', {
        description: 'Review the refinement suggestions below',
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
    mutationFn: (refinementId: string) =>
      storyRefinementApi.acceptRefinement(storyId, refinementId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['story-refinements', storyId] });
      queryClient.invalidateQueries({ queryKey: ['story', storyId] });
      toast.success('Refinement accepted', {
        description: 'The refinement has been marked as accepted',
      });
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
    mutationFn: (refinementId: string) =>
      storyRefinementApi.rejectRefinement(storyId, refinementId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['story-refinements', storyId] });
      toast.success('Refinement rejected', {
        description: 'The refinement has been marked as rejected',
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to reject refinement', {
        description: error.message,
      });
    },
  });
}
