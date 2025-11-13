'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Check, X, RotateCcw, ChevronLeft, ChevronRight, Eye, EyeOff, GripVertical } from 'lucide-react';
import { DiffResult } from '@/types/refinement';
import { DiffViewer } from './DiffViewer';

interface ReviewInterfaceProps {
  original: string;
  refined: string;
  changes: DiffResult;
  onAccept: (saveToHistory: boolean) => void;
  onReject: () => void;
  onRefineAgain: () => void;
}

// Generate line numbers for content
function generateLineNumbers(content: string): number[] {
  const lines = content.split('\n');
  return lines.map((_, idx) => idx + 1);
}

export function ReviewInterface({
  original,
  refined,
  changes,
  onAccept,
  onReject,
  onRefineAgain,
}: ReviewInterfaceProps) {
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('split');
  const [showChanges, setShowChanges] = useState(true);
  const [saveToHistory, setSaveToHistory] = useState(true);
  const [currentChangeIndex, setCurrentChangeIndex] = useState(0);
  const [leftPanelWidth, setLeftPanelWidth] = useState(50); // Percentage
  const [isResizing, setIsResizing] = useState(false);

  // Refs for synchronized scrolling
  const originalScrollRef = useRef<HTMLDivElement>(null);
  const refinedScrollRef = useRef<HTMLDivElement>(null);
  const originalContentRef = useRef<HTMLDivElement>(null);
  const refinedContentRef = useRef<HTMLDivElement>(null);

  // Synchronized scrolling
  useEffect(() => {
    const originalEl = originalScrollRef.current;
    const refinedEl = refinedScrollRef.current;

    if (!originalEl || !refinedEl || viewMode !== 'split') return;

    let isScrolling = false;

    const handleOriginalScroll = () => {
      if (isScrolling) return;
      isScrolling = true;
      const scrollPercent = originalEl.scrollTop / (originalEl.scrollHeight - originalEl.clientHeight);
      refinedEl.scrollTop = scrollPercent * (refinedEl.scrollHeight - refinedEl.clientHeight);
      setTimeout(() => {
        isScrolling = false;
      }, 10);
    };

    const handleRefinedScroll = () => {
      if (isScrolling) return;
      isScrolling = true;
      const scrollPercent = refinedEl.scrollTop / (refinedEl.scrollHeight - refinedEl.clientHeight);
      originalEl.scrollTop = scrollPercent * (originalEl.scrollHeight - originalEl.clientHeight);
      setTimeout(() => {
        isScrolling = false;
      }, 10);
    };

    originalEl.addEventListener('scroll', handleOriginalScroll);
    refinedEl.addEventListener('scroll', handleRefinedScroll);

    return () => {
      originalEl.removeEventListener('scroll', handleOriginalScroll);
      refinedEl.removeEventListener('scroll', handleRefinedScroll);
    };
  }, [viewMode]);

  // Handle panel resizing
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = originalScrollRef.current?.parentElement?.parentElement;
      if (!container) return;
      
      const containerRect = container.getBoundingClientRect();
      const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      setLeftPanelWidth(Math.max(20, Math.min(80, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleAcceptClick = () => {
    onAccept(saveToHistory);
  };

  const goToNextChange = () => {
    const nextIndex = Math.min(
      currentChangeIndex + 1,
      changes.changes.length - 1
    );
    setCurrentChangeIndex(nextIndex);
  };

  const goToPreviousChange = () => {
    const prevIndex = Math.max(currentChangeIndex - 1, 0);
    setCurrentChangeIndex(prevIndex);
  };

  const originalLines = generateLineNumbers(original);
  const refinedLines = generateLineNumbers(refined);

  return (
    <div className="space-y-4 py-4">
      {/* Stats Header */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300"
            >
              +{changes.additions} additions
            </Badge>
            <Badge
              variant="outline"
              className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300"
            >
              -{changes.deletions} deletions
            </Badge>
            <Badge
              variant="outline"
              className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300"
            >
              {changes.modifications} modifications
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            Words: {changes.originalWordCount} → {changes.refinedWordCount}
            <span
              className={
                changes.wordCountDelta > 0 ? 'text-emerald-600' : 'text-rose-600'
              }
            >
              {' '}
              ({changes.wordCountDelta > 0 ? '+' : ''}
              {changes.wordCountDelta})
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowChanges(!showChanges)}
          >
            {showChanges ? (
              <EyeOff className="h-4 w-4 mr-2" />
            ) : (
              <Eye className="h-4 w-4 mr-2" />
            )}
            {showChanges ? 'Hide' : 'Show'} Changes
          </Button>
        </div>
      </div>

      {/* Change Navigation */}
      {changes.totalChanges > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousChange}
              disabled={currentChangeIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Change {currentChangeIndex + 1} of {changes.totalChanges}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextChange}
              disabled={currentChangeIndex === changes.changes.length - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              variant={viewMode === 'split' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('split')}
            >
              Split View
            </Button>
            <Button
              variant={viewMode === 'unified' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('unified')}
            >
              Unified View
            </Button>
          </div>
        </div>
      )}

      {/* Content Display */}
      <div className="rounded-lg border overflow-hidden">
        {viewMode === 'split' ? (
          <div className="relative flex" style={{ height: '600px' }}>
            {/* Original Panel */}
            <div
              className="flex border-r overflow-hidden"
              style={{ width: `${leftPanelWidth}%` }}
            >
              <div className="bg-muted/30 px-2 py-4 text-xs text-muted-foreground font-mono border-r select-none">
                {originalLines.map((line) => (
                  <div key={line} className="leading-relaxed">
                    {line}
                  </div>
                ))}
              </div>
              <div
                ref={originalScrollRef}
                className="flex-1 overflow-y-auto p-4 bg-muted/20"
              >
                <h3 className="text-sm font-semibold mb-3 sticky top-0 bg-muted/20 pb-2 z-10">
                  Original
                </h3>
                <div ref={originalContentRef}>
                  <DiffViewer
                    content={original}
                    changes={changes.changes}
                    type="original"
                    showChanges={showChanges}
                    currentChangeIndex={currentChangeIndex}
                    onHoverChange={setHoveredChangeIndex}
                  />
                </div>
              </div>
            </div>

            {/* Resize Handle */}
            <div
              className="w-1 bg-border cursor-col-resize hover:bg-primary/50 transition-colors flex items-center justify-center group"
              onMouseDown={() => setIsResizing(true)}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
            </div>

            {/* Refined Panel */}
            <div
              className="flex overflow-hidden"
              style={{ width: `${100 - leftPanelWidth}%` }}
            >
              <div className="bg-muted/30 px-2 py-4 text-xs text-muted-foreground font-mono border-r select-none">
                {refinedLines.map((line) => (
                  <div key={line} className="leading-relaxed">
                    {line}
                  </div>
                ))}
              </div>
              <div
                ref={refinedScrollRef}
                className="flex-1 overflow-y-auto p-4"
              >
                <h3 className="text-sm font-semibold mb-3 sticky top-0 bg-background pb-2 z-10">
                  Refined
                </h3>
                <div ref={refinedContentRef}>
                  <DiffViewer
                    content={refined}
                    changes={changes.changes}
                    type="refined"
                    showChanges={showChanges}
                    currentChangeIndex={currentChangeIndex}
                    onHoverChange={setHoveredChangeIndex}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 max-h-[600px] overflow-y-auto">
            <DiffViewer
              content={refined}
              changes={changes.changes}
              type="unified"
              showChanges={showChanges}
              currentChangeIndex={currentChangeIndex}
              onHoverChange={setHoveredChangeIndex}
            />
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-4 border-t">
        <Button variant="outline" onClick={onRefineAgain} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Refine Again
        </Button>

        <div className="flex gap-3">
          <div className="flex items-center space-x-2 mr-4">
            <Checkbox
              id="save-history"
              checked={saveToHistory}
              onCheckedChange={(checked) =>
                setSaveToHistory(checked as boolean)
              }
            />
            <label
              htmlFor="save-history"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Save to history
            </label>
          </div>
          <Button variant="outline" onClick={onReject} className="gap-2">
            <X className="h-4 w-4" />
            Reject
          </Button>
          <Button onClick={handleAcceptClick} className="gap-2">
            <Check className="h-4 w-4" />
            Accept Refinement
          </Button>
        </div>
      </div>
    </div>
  );
}
