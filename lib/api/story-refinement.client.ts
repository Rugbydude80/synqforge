export interface StoryRefinement {
  id: string;
  storyId: string;
  refinement: string;
  userRequest: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  acceptedAt: Date | null;
  rejectedAt: Date | null;
  rejectedReason: string | null;
  aiModelUsed: string | null;
  aiTokensUsed: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RefineStoryRequest {
  userRequest?: string;
}

export interface RefineStoryResponse {
  success: boolean;
  refinement: {
    id: string;
    content: string; // The AI-generated refinement text
    status: string;
  };
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
}

export const storyRefinementApi = {
  refineStory: async (storyId: string, request?: RefineStoryRequest): Promise<RefineStoryResponse> => {
    const response = await fetch(`/api/stories/${storyId}/refine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request || {}),
      credentials: 'include',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to refine story');
    }
    return response.json();
  },

  getRefinements: async (storyId: string): Promise<{ success: boolean; refinements: StoryRefinement[] }> => {
    const response = await fetch(`/api/stories/${storyId}/refinements`, {
      credentials: 'include',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch refinements');
    }
    return response.json();
  },

  acceptRefinement: async (storyId: string, refinementId: string): Promise<{ success: boolean; message: string }> => {
    const response = await fetch(`/api/stories/${storyId}/refinements/${refinementId}/accept`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to accept refinement');
    }
    return response.json();
  },

  rejectRefinement: async (storyId: string, refinementId: string): Promise<{ success: boolean; message: string }> => {
    const response = await fetch(`/api/stories/${storyId}/refinements/${refinementId}/reject`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to reject refinement');
    }
    return response.json();
  },
};
