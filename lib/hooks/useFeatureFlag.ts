/**
 * Feature flag hook
 * Replace with your actual feature flag system (e.g., LaunchDarkly, PostHog, etc.)
 */

export function useFeatureFlag(flagKey: string): boolean {
  // For now, enable story features via environment variables
  if (flagKey === 'stories.split_button.enabled') {
    // Use only NEXT_PUBLIC_ env var to avoid hydration mismatches
    return process.env.NEXT_PUBLIC_ENABLE_STORY_SPLIT === 'true';
  }
  
  if (flagKey === 'stories.refine_button.enabled') {
    // Use only NEXT_PUBLIC_ env var to avoid hydration mismatches
    return process.env.NEXT_PUBLIC_ENABLE_STORY_REFINE === 'true' || process.env.NODE_ENV === 'development';
  }
  
  return false;
}

