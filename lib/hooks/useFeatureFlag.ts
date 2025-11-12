/**
 * Feature flag hook
 * Replace with your actual feature flag system (e.g., LaunchDarkly, PostHog, etc.)
 */

'use client';

import { useSession } from 'next-auth/react';

// Super admin emails - must match lib/auth/super-admin.ts
const SUPER_ADMIN_EMAILS = [
  'chrisjrobertson@outlook.com',
  'chris@synqforge.com',
] as const;

function isSuperAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalizedEmail = email.toLowerCase().trim();
  return SUPER_ADMIN_EMAILS.some(
    adminEmail => adminEmail.toLowerCase() === normalizedEmail
  );
}

export function useFeatureFlag(flagKey: string): boolean {
  const { data: session } = useSession();
  const userEmail = session?.user?.email;

  // Super admins always have access to all features
  if (userEmail && isSuperAdmin(userEmail)) {
    return true;
  }

  // For now, enable story features via environment variables
  if (flagKey === 'stories.split_button.enabled') {
    // Use only NEXT_PUBLIC_ env var to avoid hydration mismatches
    return process.env.NEXT_PUBLIC_ENABLE_STORY_SPLIT === 'true';
  }
  
  if (flagKey === 'stories.refine_button.enabled') {
    // Use only NEXT_PUBLIC_ env var to avoid hydration mismatches
    // Enabled if explicitly set to 'true' or in development mode
    return process.env.NEXT_PUBLIC_ENABLE_STORY_REFINE === 'true' || 
           process.env.NODE_ENV === 'development';
  }
  
  return false;
}

