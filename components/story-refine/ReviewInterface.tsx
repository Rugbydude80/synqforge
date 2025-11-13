'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Check, X, RotateCcw, ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';
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

  return (
    <div className="space-y-4 py-4">
      {/* Stats Header */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="bg-green-50 text-green-700 border-green-200"
            >
              +{changes.additions} additions
            </Badge>
            <Badge
              variant="outline"
              className="bg-red-50 text-red-700 border-red-200"
            >
              -{changes.deletions} deletions
            </Badge>
            <Badge
              variant="outline"
              className="bg-amber-50 text-amber-700 border-amber-200"
            >
              {changes.modifications} modifications
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            Words: {changes.originalWordCount} → {changes.refinedWordCount}
            <span
              className={
                changes.wordCountDelta > 0 ? 'text-green-600' : 'text-red-600'
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
          <div className="grid grid-cols-2 divide-x">
            <div className="p-4 bg-muted/20">
              <h3 className="text-sm font-semibold mb-3 sticky top-0 bg-muted/20 pb-2">
                Original
              </h3>
              <DiffViewer
                content={original}
                changes={changes.changes}
                type="original"
                showChanges={showChanges}
                currentChangeIndex={currentChangeIndex}
              />
            </div>
            <div className="p-4">
              <h3 className="text-sm font-semibold mb-3 sticky top-0 bg-background pb-2">
                Refined
              </h3>
              <DiffViewer
                content={refined}
                changes={changes.changes}
                type="refined"
                showChanges={showChanges}
                currentChangeIndex={currentChangeIndex}
              />
            </div>
          </div>
        ) : (
          <div className="p-4">
            <DiffViewer
              content={refined}
              changes={changes.changes}
              type="unified"
              showChanges={showChanges}
              currentChangeIndex={currentChangeIndex}
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

