/**
 * Feature flag hook
 * Replace with your actual feature flag system (e.g., LaunchDarkly, PostHog, etc.)
 */

export function useFeatureFlag(flagKey: string): boolean {
  // For now, enable story splitting feature by default in development
  if (flagKey === 'stories.split_button.enabled') {
    return process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_ENABLE_STORY_SPLIT === 'true';
  }
  
  return false;
}

