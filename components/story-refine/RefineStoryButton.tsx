'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { RefineStoryModal } from './RefineStoryModal';
import { useFeatureFlag } from '@/lib/hooks/useFeatureFlag';

interface RefineStoryButtonProps {
  storyId: string;
}

export function RefineStoryButton({ storyId }: RefineStoryButtonProps) {
  const [open, setOpen] = useState(false);
  const refineEnabled = useFeatureFlag('stories.refine_button.enabled');

  if (!refineEnabled) return null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label="Refine story with AI"
        className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20 hover:border-purple-500/40"
      >
        <Sparkles className="h-4 w-4 mr-2" />
        Refine Story
      </Button>

      {open && (
        <RefineStoryModal
          storyId={storyId}
          open={open}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

