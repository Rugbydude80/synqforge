'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Split } from 'lucide-react';
import { SplitStoryModal } from './SplitStoryModal';
import { useFeatureFlag } from '@/lib/hooks/useFeatureFlag';

interface SplitStoryButtonProps {
  storyId: string;
}

export function SplitStoryButton({ storyId }: SplitStoryButtonProps) {
  const [open, setOpen] = useState(false);
  const splitEnabled = useFeatureFlag('stories.split_button.enabled');

  if (!splitEnabled) return null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label="Split story into smaller stories"
      >
        <Split className="h-4 w-4 mr-2" />
        Split story
      </Button>

      {open && (
        <SplitStoryModal
          storyId={storyId}
          open={open}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

