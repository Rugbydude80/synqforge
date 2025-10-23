import type { StorySplitAnalysis } from '@/lib/services/story-split-analysis.service';
import type { ChildStoryInput } from '@/lib/services/story-split-validation.service';

export interface SplitStoryRequest {
  convertParentToEpic: boolean;
  children: ChildStoryInput[];
  investRationale?: any;
  spidrStrategy?: any;
}

export const storySplitApi = {
  getAnalysis: async (storyId: string): Promise<{ 
    analysis: StorySplitAnalysis; 
    parentAcceptanceCriteria: string[];
  }> => {
    const response = await fetch(`/api/stories/${storyId}/split-analysis`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch analysis');
    return response.json();
  },

  splitStory: async (storyId: string, request: SplitStoryRequest) => {
    const response = await fetch(`/api/stories/${storyId}/split`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      credentials: 'include',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Split failed');
    }
    return response.json();
  },
};

