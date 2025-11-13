'use client';

import { DiffChange } from '@/types/refinement';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

interface DiffViewerProps {
  content: string;
  changes: DiffChange[];
  type: 'original' | 'refined' | 'unified';
  showChanges: boolean;
  currentChangeIndex?: number;
}

export function DiffViewer({
  content,
  changes,
  type,
  showChanges,
  currentChangeIndex,
}: DiffViewerProps) {
  // Build highlighted content based on type
  const highlightedContent = useMemo(() => {
    const segments: React.ReactNode[] = [];
    let currentPos = 0;

    changes.forEach((change, idx) => {
      const isActive = idx === currentChangeIndex;

      // Add text before this change
      if (change.position > currentPos) {
        segments.push(
          <span key={`text-${currentPos}`}>
            {content.substring(currentPos, change.position)}
          </span>
        );
      }

      // Render change based on type and view mode
      if (
        type === 'original' &&
        (change.type === 'delete' || change.type === 'modify')
      ) {
        segments.push(
          <mark
            key={`change-${idx}`}
            className={cn(
              'bg-red-100 text-red-900 line-through rounded px-0.5',
              'dark:bg-red-900/20 dark:text-red-300',
              isActive && 'ring-2 ring-red-500'
            )}
          >
            {change.originalText}
          </mark>
        );
      } else if (
        type === 'refined' &&
        (change.type === 'add' || change.type === 'modify')
      ) {
        segments.push(
          <mark
            key={`change-${idx}`}
            className={cn(
              'bg-green-100 text-green-900 rounded px-0.5',
              'dark:bg-green-900/20 dark:text-green-300',
              isActive && 'ring-2 ring-green-500'
            )}
          >
            {change.refinedText}
          </mark>
        );
      } else if (type === 'unified' && change.type === 'modify') {
        segments.push(
          <span key={`change-${idx}`}>
            <mark className="bg-red-100 text-red-900 line-through dark:bg-red-900/20">
              {change.originalText}
            </mark>
            {' → '}
            <mark className="bg-green-100 text-green-900 dark:bg-green-900/20">
              {change.refinedText}
            </mark>
          </span>
        );
      }

      currentPos = change.position + (change.length || 0);
    });

    // Add remaining content
    if (currentPos < content.length) {
      segments.push(
        <span key={`text-${currentPos}`}>{content.substring(currentPos)}</span>
      );
    }

    return segments;
  }, [content, changes, type, currentChangeIndex]);

  // Render plain text if changes are hidden
  if (!showChanges) {
    return (
      <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed">
        {content}
      </div>
    );
  }

  return (
    <div className="prose prose-sm max-w-none text-sm leading-relaxed">
      {highlightedContent}
    </div>
  );
}

