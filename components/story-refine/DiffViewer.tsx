'use client';

import { DiffChange } from '@/types/refinement';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';
import { PlusCircle, MinusCircle, RefreshCw } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface DiffViewerProps {
  content: string;
  changes: DiffChange[];
  type: 'original' | 'refined' | 'unified';
  showChanges: boolean;
  currentChangeIndex?: number;
  onHoverChange?: (index: number | null) => void;
}

// Group consecutive changes together
function groupConsecutiveChanges(changes: DiffChange[]): DiffChange[][] {
  const groups: DiffChange[][] = [];
  let currentGroup: DiffChange[] = [];

  changes.forEach((change, idx) => {
    if (idx === 0) {
      currentGroup = [change];
    } else {
      const prevChange = changes[idx - 1];
      const gap = change.position - (prevChange.position + (prevChange.length || 0));
      
      // Group if gap is small (less than 50 characters)
      if (gap < 50 && change.type !== 'unchanged') {
        currentGroup.push(change);
      } else {
        if (currentGroup.length > 0) {
          groups.push(currentGroup);
        }
        currentGroup = change.type !== 'unchanged' ? [change] : [];
      }
    }
  });

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

export function DiffViewer({
  content,
  changes,
  type,
  showChanges,
  currentChangeIndex,
  onHoverChange,
}: DiffViewerProps) {
  // Build highlighted content based on type
  const highlightedContent = useMemo(() => {
    const segments: React.ReactNode[] = [];
    let currentPos = 0;

    // Group consecutive changes
    const changeGroups = groupConsecutiveChanges(changes);

    changeGroups.forEach((group, groupIdx) => {
      const firstChange = group[0];
      const lastChange = group[group.length - 1];
      const groupStart = firstChange.position;
      const groupEnd = lastChange.position + (lastChange.length || 0);

      // Add text before this group
      if (groupStart > currentPos) {
        segments.push(
          <span key={`text-${currentPos}`}>
            {content.substring(currentPos, groupStart)}
          </span>
        );
      }

      // Determine group type (most common type in group)
      const groupType = firstChange.type;
      const isActive = group.some((_, idx) => {
        const globalIdx = changes.indexOf(firstChange) + idx;
        return globalIdx === currentChangeIndex;
      });

      // Get change type icon
      const getChangeIcon = () => {
        if (groupType === 'add') return PlusCircle;
        if (groupType === 'delete') return MinusCircle;
        if (groupType === 'modify') return RefreshCw;
        return null;
      };

      const Icon = getChangeIcon();

      // Get styling based on change type
      const getChangeStyles = (changeType: string) => {
        if (changeType === 'add') {
          return {
            bg: 'bg-emerald-100 dark:bg-emerald-900/30',
            border: 'border-l-4 border-emerald-500',
            text: 'text-emerald-900 dark:text-emerald-100',
            iconColor: 'text-emerald-500',
          };
        }
        if (changeType === 'delete') {
          return {
            bg: 'bg-rose-100 dark:bg-rose-900/30',
            border: 'border-l-4 border-rose-500',
            text: 'text-rose-900 dark:text-rose-100',
            iconColor: 'text-rose-500',
          };
        }
        if (changeType === 'modify') {
          return {
            bg: 'bg-amber-100 dark:bg-amber-900/30',
            border: 'border-l-4 border-amber-500',
            text: 'text-amber-900 dark:text-amber-100',
            iconColor: 'text-amber-500',
          };
        }
        return {
          bg: 'bg-gray-100 dark:bg-gray-900/30',
          border: '',
          text: '',
          iconColor: '',
        };
      };

      const styles = getChangeStyles(groupType);

      // Count words in group
      const wordCount = group.reduce((sum, change) => {
        const text = change.refinedText || change.originalText || '';
        return sum + text.split(/\s+/).length;
      }, 0);

      // Render group based on type and view mode
      if (type === 'original' && (groupType === 'delete' || groupType === 'modify')) {
        const changeText = group.map(c => c.originalText).join('');
        const globalIdx = changes.indexOf(firstChange);
        
        segments.push(
          <TooltipProvider key={`group-${groupIdx}`}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    'change-group my-1 px-2 py-1 rounded',
                    styles.bg,
                    styles.border,
                    styles.text,
                    isActive && 'ring-2 ring-offset-2 ring-offset-background',
                    isActive && groupType === 'delete' && 'ring-rose-500',
                    isActive && groupType === 'modify' && 'ring-amber-500',
                    'cursor-pointer transition-all hover:opacity-80'
                  )}
                  onMouseEnter={() => onHoverChange?.(globalIdx)}
                  onMouseLeave={() => onHoverChange?.(null)}
                >
                  {Icon && (
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={cn('h-3 w-3', styles.iconColor)} />
                      <span className="text-xs font-medium">
                        {groupType === 'delete' ? 'Deletion' : 'Modification'} ({wordCount} words)
                      </span>
                    </div>
                  )}
                  <span className={cn(groupType === 'delete' && 'line-through')}>
                    {changeText}
                  </span>
                  {firstChange.reason && (
                    <div className="text-xs mt-1 opacity-75 italic">
                      {firstChange.reason}
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              {firstChange.reason && (
                <TooltipContent>
                  <p className="max-w-xs">{firstChange.reason}</p>
                  {firstChange.category && (
                    <p className="text-xs mt-1 opacity-75">
                      Category: {firstChange.category}
                    </p>
                  )}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        );
      } else if (
        type === 'refined' &&
        (groupType === 'add' || groupType === 'modify')
      ) {
        const changeText = group.map(c => c.refinedText).join('');
        const globalIdx = changes.indexOf(firstChange);
        
        segments.push(
          <TooltipProvider key={`group-${groupIdx}`}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    'change-group my-1 px-2 py-1 rounded',
                    styles.bg,
                    styles.border,
                    styles.text,
                    isActive && 'ring-2 ring-offset-2 ring-offset-background',
                    isActive && groupType === 'add' && 'ring-emerald-500',
                    isActive && groupType === 'modify' && 'ring-amber-500',
                    'cursor-pointer transition-all hover:opacity-80'
                  )}
                  onMouseEnter={() => onHoverChange?.(globalIdx)}
                  onMouseLeave={() => onHoverChange?.(null)}
                >
                  {Icon && (
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={cn('h-3 w-3', styles.iconColor)} />
                      <span className="text-xs font-medium">
                        {groupType === 'add' ? 'Addition' : 'Modification'} ({wordCount} words)
                      </span>
                    </div>
                  )}
                  <span>{changeText}</span>
                  {firstChange.reason && (
                    <div className="text-xs mt-1 opacity-75 italic">
                      {firstChange.reason}
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              {firstChange.reason && (
                <TooltipContent>
                  <p className="max-w-xs">{firstChange.reason}</p>
                  {firstChange.category && (
                    <p className="text-xs mt-1 opacity-75">
                      Category: {firstChange.category}
                    </p>
                  )}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        );
      } else if (type === 'unified' && groupType === 'modify') {
        const originalText = group.map(c => c.originalText).join('');
        const refinedText = group.map(c => c.refinedText).join('');
        const globalIdx = changes.indexOf(firstChange);
        
        segments.push(
          <TooltipProvider key={`group-${groupIdx}`}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    'change-group my-1 px-2 py-1 rounded',
                    styles.bg,
                    styles.border,
                    'cursor-pointer transition-all hover:opacity-80'
                  )}
                  onMouseEnter={() => onHoverChange?.(globalIdx)}
                  onMouseLeave={() => onHoverChange?.(null)}
                >
                  {Icon && (
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={cn('h-3 w-3', styles.iconColor)} />
                      <span className="text-xs font-medium">
                        Modification ({wordCount} words)
                      </span>
                    </div>
                  )}
                  <div className="space-y-1">
                    <div className="line-through text-rose-600 dark:text-rose-400">
                      {originalText}
                    </div>
                    <div className="text-emerald-600 dark:text-emerald-400">
                      → {refinedText}
                    </div>
                  </div>
                  {firstChange.reason && (
                    <div className="text-xs mt-1 opacity-75 italic">
                      {firstChange.reason}
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              {firstChange.reason && (
                <TooltipContent>
                  <p className="max-w-xs">{firstChange.reason}</p>
                  {firstChange.category && (
                    <p className="text-xs mt-1 opacity-75">
                      Category: {firstChange.category}
                    </p>
                  )}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        );
      }

      currentPos = groupEnd;
    });

    // Add remaining content
    if (currentPos < content.length) {
      segments.push(
        <span key={`text-${currentPos}`}>{content.substring(currentPos)}</span>
      );
    }

    return segments;
  }, [content, changes, type, currentChangeIndex, onHoverChange]);

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
