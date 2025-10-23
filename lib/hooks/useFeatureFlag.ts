/**
 * Feature flag hook
 * Replace with your actual feature flag system (e.g., LaunchDarkly, PostHog, etc.)
 */

export function useFeatureFlag(flagKey: string): boolean {
  // For now, enable story splitting feature via environment variable
  if (flagKey === 'stories.split_button.enabled') {
    // Use only NEXT_PUBLIC_ env var to avoid hydration mismatches
    return process.env.NEXT_PUBLIC_ENABLE_STORY_SPLIT === 'true';
  }
  
  return false;
}

