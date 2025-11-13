'use client';

import { DiffChange } from '@/types/refinement';
import { useMemo } from 'react';

interface DiffViewerProps {
  content: string;
  changes: DiffChange[];
  type: 'original' | 'refined' | 'unified';
  showChanges: boolean;
  currentChangeIndex?: number;
  onHoverChange?: (index: number | null) => void;
}

export function DiffViewer({
  content,
  changes,
  type,
  showChanges,
  currentChangeIndex,
  onHoverChange,
}: DiffViewerProps) {
  // Build highlighted content with inline highlighting (not fragmented)
  const highlightedContent = useMemo(() => {
    if (!showChanges || changes.length === 0) {
      return <span className="whitespace-pre-wrap">{content}</span>;
    }

    const segments: React.ReactNode[] = [];
    let currentPos = 0;

    // Sort changes by position
    const sortedChanges = [...changes].sort((a, b) => a.position - b.position);

    sortedChanges.forEach((change, idx) => {
      // Add text before this change
      if (change.position > currentPos) {
        segments.push(
          <span key={`text-${currentPos}`} className="whitespace-pre-wrap">
            {content.substring(currentPos, change.position)}
          </span>
        );
      }

      // Get the text for this change based on type
      let changeText = '';
      let changeType = change.type;

      if (type === 'refined') {
        // Show refined text for additions and modifications
        if (change.type === 'add' || change.type === 'modify') {
          changeText = change.refinedText || '';
          changeType = change.type;
        } else if (change.type === 'unchanged') {
          changeText = change.refinedText || change.originalText || '';
          changeType = 'unchanged';
        }
      } else if (type === 'original') {
        // Show original text for deletions and modifications
        if (change.type === 'delete' || change.type === 'modify') {
          changeText = change.originalText || '';
          changeType = change.type;
        } else if (change.type === 'unchanged') {
          changeText = change.originalText || change.refinedText || '';
          changeType = 'unchanged';
        }
      } else {
        // Unified view
        changeText = change.refinedText || change.originalText || '';
        changeType = change.type;
      }

      // Apply inline highlighting based on change type
      if (changeType === 'add' && type === 'refined') {
        segments.push(
          <mark
            key={`change-${idx}`}
            className="bg-emerald-200 dark:bg-emerald-900/50 text-emerald-900 dark:text-emerald-100 px-0.5 rounded"
            title={change.reason || 'Added'}
          >
            {changeText}
          </mark>
        );
      } else if (changeType === 'delete' && type === 'original') {
        segments.push(
          <mark
            key={`change-${idx}`}
            className="bg-rose-200 dark:bg-rose-900/50 text-rose-900 dark:text-rose-100 px-0.5 rounded line-through"
            title={change.reason || 'Deleted'}
          >
            {changeText}
          </mark>
        );
      } else if (changeType === 'modify') {
        const bgColor = type === 'refined' 
          ? 'bg-amber-200 dark:bg-amber-900/50 text-amber-900 dark:text-amber-100'
          : 'bg-amber-200 dark:bg-amber-900/50 text-amber-900 dark:text-amber-100';
        segments.push(
          <mark
            key={`change-${idx}`}
            className={`${bgColor} px-0.5 rounded`}
            title={change.reason || 'Modified'}
          >
            {changeText}
          </mark>
        );
      } else {
        // Unchanged - just add the text
        segments.push(
          <span key={`change-${idx}`} className="whitespace-pre-wrap">
            {changeText}
          </span>
        );
      }

      currentPos = change.position + (change.length || changeText.length);
    });

    // Add remaining content
    if (currentPos < content.length) {
      segments.push(
        <span key={`text-${currentPos}`} className="whitespace-pre-wrap">
          {content.substring(currentPos)}
        </span>
      );
    }

    return segments;
  }, [content, changes, type, showChanges, currentChangeIndex, onHoverChange]);

  // Render plain text if changes are hidden
  if (!showChanges) {
    return (
      <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed">
        {content}
      </div>
    );
  }

  return (
    <div className="prose prose-sm max-w-none text-sm leading-relaxed whitespace-pre-wrap">
      {highlightedContent}
    </div>
  );
}
