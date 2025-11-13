'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Sparkles, Lock } from 'lucide-react';
import { RefineStoryModal } from './RefineStoryModal';
import { useFeatureFlag } from '@/lib/hooks/useFeatureFlag';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { canAccessFeature, Feature, getRequiredTierForFeature } from '@/lib/featureGates';
import { isSuperAdmin } from '@/lib/auth/super-admin';

interface RefineStoryButtonProps {
  storyId: string;
  story?: {
    id: string;
    title: string;
    description?: string | null;
  };
  onRefineComplete?: () => void;
}

export function RefineStoryButton({
  storyId,
  story: initialStory,
  onRefineComplete,
}: RefineStoryButtonProps) {
  const [open, setOpen] = useState(false);
  const [currentStory, setCurrentStory] = useState(initialStory);
  const { data: session } = useSession();
  const refineEnabled = useFeatureFlag('stories.refine_button.enabled');

  // Get user tier from session
  const userTier =
    (session?.user as any)?.organizationTier || 'starter';
  const userEmail = session?.user?.email;
  const isSuperAdminUser = userEmail ? isSuperAdmin(userEmail) : false;
  const canRefine = isSuperAdminUser || canAccessFeature(userTier, Feature.REFINE_STORY);

  if (!refineEnabled) return null;

  if (!canRefine) {
    const requiredTier = getRequiredTierForFeature(Feature.REFINE_STORY);

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              disabled
              className="gap-2"
              onClick={() => {
                // Open upgrade modal or redirect to pricing
                window.location.href = '/settings/billing';
              }}
            >
              <Sparkles className="h-4 w-4" />
              Refine Story
              <Lock className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              Upgrade to{' '}
              {requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)} to
              refine stories with AI
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Fetch fresh story data before opening modal
  const handleOpenModal = useCallback(async () => {
    try {
      // Fetch fresh story data to ensure we have latest title/description
      const response = await fetch(`/api/stories/${storyId}`);
      if (response.ok) {
        const freshStory = await response.json();
        setCurrentStory({
          id: freshStory.id,
          title: freshStory.title,
          description: freshStory.description || null,
        });
      } else {
        // Fallback to initial story if fetch fails
        setCurrentStory(initialStory);
      }
    } catch (error) {
      console.error('Failed to fetch fresh story:', error);
      // Fallback to initial story
      setCurrentStory(initialStory);
    }
    setOpen(true);
  }, [storyId, initialStory]);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  const handleComplete = useCallback(() => {
    setOpen(false);
    // Trigger parent refresh to get updated story
    onRefineComplete?.();
    // Update local story state after a brief delay to allow parent refresh
    setTimeout(async () => {
      try {
        const response = await fetch(`/api/stories/${storyId}`);
        if (response.ok) {
          const freshStory = await response.json();
          setCurrentStory({
            id: freshStory.id,
            title: freshStory.title,
            description: freshStory.description || null,
          });
        }
      } catch (error) {
        console.error('Failed to refresh story after refinement:', error);
      }
    }, 500);
  }, [storyId, onRefineComplete]);

  // Update currentStory when initialStory prop changes (from parent refresh)
  useEffect(() => {
    if (initialStory) {
      setCurrentStory(initialStory);
    }
  }, [initialStory]);

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        className="gap-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20 hover:border-purple-500/40"
        onClick={handleOpenModal}
        aria-label="Refine story with AI"
      >
        <Sparkles className="h-4 w-4" />
        Refine Story
      </Button>

      {open && currentStory && (
        <RefineStoryModal
          story={currentStory}
          isOpen={open}
          onClose={handleClose}
          onComplete={handleComplete}
        />
      )}
    </>
  );
}

