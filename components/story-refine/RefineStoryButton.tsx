'use client';

import { useState } from 'react';
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
  storyId: _storyId,
  story,
  onRefineComplete,
}: RefineStoryButtonProps) {
  const [open, setOpen] = useState(false);
  const { data: session } = useSession();
  const refineEnabled = useFeatureFlag('stories.refine_button.enabled');

  // Get user tier from session
  const userTier =
    (session?.user as any)?.organizationTier || 'starter';
  const canRefine = canAccessFeature(userTier, Feature.REFINE_STORY);

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
        onClick={() => setOpen(true)}
        aria-label="Refine story with AI"
      >
        <Sparkles className="h-4 w-4" />
        Refine Story
      </Button>

      {open && story && (
        <RefineStoryModal
          story={story}
          isOpen={open}
          onClose={() => setOpen(false)}
          onComplete={() => {
            setOpen(false);
            onRefineComplete?.();
          }}
        />
      )}
    </>
  );
}

