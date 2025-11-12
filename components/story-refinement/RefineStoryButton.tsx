'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { RefineStoryModal } from './RefineStoryModal';

interface RefineStoryButtonProps {
  storyId: string;
}

export function RefineStoryButton({ storyId }: RefineStoryButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label="Refine story with AI"
      >
        <Sparkles className="h-4 w-4 mr-2" />
        Refine story
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
