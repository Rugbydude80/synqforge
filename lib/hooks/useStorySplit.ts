import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storySplitApi } from '@/lib/api/story-split.client';
import type { SplitStoryRequest } from '@/lib/api/story-split.client';
import { toast } from 'sonner';

export function useSplitAnalysis(storyId: string) {
  return useQuery({
    queryKey: ['story-split-analysis', storyId],
    queryFn: () => storySplitApi.getAnalysis(storyId),
    staleTime: 5 * 60 * 1000,
    retry: 1, // Only retry once
    retryDelay: 1000, // Wait 1 second before retry
  });
}

export function useSplitStoryMutation(storyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: SplitStoryRequest) =>
      storySplitApi.splitStory(storyId, request),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['story', storyId] });
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      
      toast.success(`Created ${data.childStories.length} stories`, {
        description: data.parentStory.isEpic
          ? 'Parent converted to epic'
          : 'Child stories linked to parent',
      });
    },
    onError: (error: Error) => {
      toast.error('Split failed', {
        description: error.message,
      });
    },
  });
}

