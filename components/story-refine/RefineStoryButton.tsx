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

  // Fetch fresh story data before opening modal
  const handleOpenModal = useCallback(async () => {
    try {
      // Always fetch fresh story data to ensure we have latest title/description
      const response = await fetch(`/api/stories/${storyId}`, {
        cache: 'no-store', // Ensure fresh data from database
      });
      if (response.ok) {
        const freshStory = await response.json();
        console.log('RefineStoryButton: Fetched fresh story before opening modal', {
          id: freshStory.id,
          title: freshStory.title,
          description: freshStory.description?.substring(0, 50),
        });
        setCurrentStory({
          id: freshStory.id,
          title: freshStory.title,
          description: freshStory.description || null,
        });
      } else {
        console.warn('Failed to fetch fresh story, using current:', response.status);
        // Fallback to current story if fetch fails
        setCurrentStory(currentStory || initialStory);
      }
    } catch (error) {
      console.error('Failed to fetch fresh story:', error);
      // Fallback to current story
      setCurrentStory(currentStory || initialStory);
    }
    setOpen(true);
  }, [storyId, initialStory, currentStory]);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  const handleComplete = useCallback(async () => {
    setOpen(false);
    // Trigger parent refresh to get updated story
    await onRefineComplete?.();
    // Update local story state after parent refresh completes
    setTimeout(async () => {
      try {
        const response = await fetch(`/api/stories/${storyId}`, {
          cache: 'no-store', // Ensure fresh data
        });
        if (response.ok) {
          const freshStory = await response.json();
          console.log('RefineStoryButton: Refreshed story after refinement', {
            id: freshStory.id,
            title: freshStory.title,
            description: freshStory.description?.substring(0, 50),
          });
          setCurrentStory({
            id: freshStory.id,
            title: freshStory.title,
            description: freshStory.description || null,
          });
        }
      } catch (error) {
        console.error('Failed to refresh story after refinement:', error);
      }
    }, 300);
  }, [storyId, onRefineComplete]);

  // Update currentStory when initialStory prop changes (from parent refresh)
  useEffect(() => {
    if (initialStory) {
      console.log('RefineStoryButton: Story prop updated', {
        id: initialStory.id,
        title: initialStory.title,
        description: initialStory.description?.substring(0, 50),
      });
      setCurrentStory(initialStory);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialStory?.id, initialStory?.title, initialStory?.description]);

  // Early returns AFTER all hooks
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

