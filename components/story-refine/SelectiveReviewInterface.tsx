'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Check, X, RotateCcw, CheckSquare, Square } from 'lucide-react';
import { DiffResult, DiffChange } from '@/types/refinement';
import { DiffViewer } from './DiffViewer';

interface ChangeSelection {
  changeId: string;
  selected: boolean;
  changeType: 'add' | 'delete' | 'modify';
  originalText?: string;
  refinedText?: string;
}

interface SelectiveReviewInterfaceProps {
  original: string;
  refined: string;
  changes: DiffResult;
  onAccept: (selectedChanges: DiffChange[], saveToHistory: boolean) => void;
  onReject: () => void;
  onRefineAgain: () => void;
}

export function SelectiveReviewInterface({
  original,
  refined,
  changes,
  onAccept,
  onReject,
  onRefineAgain,
}: SelectiveReviewInterfaceProps) {
  // Initialize selections - all changes selected by default
  const [selections, setSelections] = useState<Map<string, boolean>>(() => {
    const map = new Map<string, boolean>();
    changes.changes.forEach((change, idx) => {
      const changeId = change.changeId || `change-${idx}`;
      map.set(changeId, true); // Default to selected
    });
    return map;
  });

  const [saveToHistory, setSaveToHistory] = useState(true);
  const [previewMode, setPreviewMode] = useState(false);

  // Generate change selections with IDs
  const changeSelections = useMemo(() => {
    return changes.changes.map((change, idx) => {
      const changeId = change.changeId || `change-${idx}`;
      return {
        changeId,
        selected: selections.get(changeId) ?? true,
        changeType: change.type as 'add' | 'delete' | 'modify',
        originalText: change.originalText,
        refinedText: change.refinedText,
      };
    });
  }, [changes.changes, selections]);

  const selectedCount = useMemo(() => {
    return changeSelections.filter((cs) => cs.selected).length;
  }, [changeSelections]);

  const toggleChange = (changeId: string) => {
    setSelections((prev) => {
      const next = new Map(prev);
      next.set(changeId, !next.get(changeId));
      return next;
    });
  };

  const selectAll = () => {
    setSelections((prev) => {
      const next = new Map(prev);
      changes.changes.forEach((change, idx) => {
        const changeId = change.changeId || `change-${idx}`;
        next.set(changeId, true);
      });
      return next;
    });
  };

  const deselectAll = () => {
    setSelections((prev) => {
      const next = new Map(prev);
      changes.changes.forEach((change, idx) => {
        const changeId = change.changeId || `change-${idx}`;
        next.set(changeId, false);
      });
      return next;
    });
  };

  // Generate preview content with only selected changes
  const previewContent = useMemo(() => {
    if (!previewMode) return refined;

    let result = original;
    let offset = 0;

    // Apply changes in reverse order to maintain positions
    const sortedChanges = [...changes.changes]
      .map((change, idx) => ({
        ...change,
        changeId: change.changeId || `change-${idx}`,
      }))
      .sort((a, b) => b.position - a.position);

    sortedChanges.forEach((change) => {
      const changeId = change.changeId!;
      const isSelected = selections.get(changeId) ?? true;

      if (!isSelected) return;

      const start = change.position;
      const end = start + (change.length || 0);

      if (change.type === 'delete' || change.type === 'modify') {
        // Remove original text
        result = result.substring(0, start) + result.substring(end);
      }

      if (change.type === 'add' || change.type === 'modify') {
        // Insert refined text
        result = result.substring(0, start) + (change.refinedText || '') + result.substring(start);
      }
    });

    return result;
  }, [original, refined, changes.changes, selections, previewMode]);

  // Get filtered changes for preview
  const filteredChanges = useMemo(() => {
    return changes.changes.map((change, idx) => {
      const changeId = change.changeId || `change-${idx}`;
      const isSelected = selections.get(changeId) ?? true;
      
      if (!isSelected) {
        // Mark as unchanged for preview
        return {
          ...change,
          type: 'unchanged' as const,
        };
      }
      return change;
    });
  }, [changes.changes, selections]);

  const handleAccept = () => {
    const selectedChanges = changes.changes.filter((change, idx) => {
      const changeId = change.changeId || `change-${idx}`;
      return selections.get(changeId) ?? true;
    });
    onAccept(selectedChanges, saveToHistory);
  };

  const allSelected = selectedCount === changes.totalChanges;
  const noneSelected = selectedCount === 0;

  return (
    <div className="space-y-4 py-4">
      {/* Header with Selection Controls */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={allSelected ? deselectAll : selectAll}
              className="gap-2"
            >
              {allSelected ? (
                <>
                  <Square className="h-4 w-4" />
                  Deselect All
                </>
              ) : (
                <>
                  <CheckSquare className="h-4 w-4" />
                  Select All
                </>
              )}
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {selectedCount} of {changes.totalChanges}
            </span>{' '}
            changes selected
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant={previewMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPreviewMode(!previewMode)}
          >
            {previewMode ? 'Edit Selection' : 'Preview Result'}
          </Button>
        </div>
      </div>

      {/* Change List */}
      {!previewMode && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {changeSelections.map((changeSel, idx) => {
            const change = changes.changes[idx];
            const isSelected = changeSel.selected;

            return (
              <div
                key={changeSel.changeId}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                  isSelected
                    ? 'bg-muted/50 border-primary/20'
                    : 'bg-muted/20 border-border opacity-60'
                }`}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleChange(changeSel.changeId)}
                  className="mt-1"
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        changeSel.changeType === 'add'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : changeSel.changeType === 'delete'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }
                    >
                      {changeSel.changeType === 'add'
                        ? 'Addition'
                        : changeSel.changeType === 'delete'
                        ? 'Deletion'
                        : 'Modification'}
                    </Badge>
                    {change.category && (
                      <Badge variant="secondary" className="text-xs">
                        {change.category}
                      </Badge>
                    )}
                  </div>
                  {changeSel.changeType === 'delete' && changeSel.originalText && (
                    <div className="text-sm line-through text-muted-foreground">
                      {changeSel.originalText}
                    </div>
                  )}
                  {changeSel.changeType === 'add' && changeSel.refinedText && (
                    <div className="text-sm text-emerald-700 dark:text-emerald-300">
                      + {changeSel.refinedText}
                    </div>
                  )}
                  {changeSel.changeType === 'modify' && (
                    <div className="space-y-1 text-sm">
                      <div className="line-through text-muted-foreground">
                        {changeSel.originalText}
                      </div>
                      <div className="text-emerald-700 dark:text-emerald-300">
                        → {changeSel.refinedText}
                      </div>
                    </div>
                  )}
                  {change.reason && (
                    <div className="text-xs text-muted-foreground italic mt-1">
                      {change.reason}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Mode */}
      {previewMode && (
        <div className="rounded-lg border p-4 bg-muted/20">
          <h4 className="text-sm font-semibold mb-3">Preview: Final Result</h4>
          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed">
            <DiffViewer
              content={previewContent}
              changes={filteredChanges}
              type="unified"
              showChanges={true}
            />
          </div>
        </div>
      )}

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
          <Button
            onClick={handleAccept}
            disabled={noneSelected}
            className="gap-2"
          >
            <Check className="h-4 w-4" />
            Accept Selected ({selectedCount})
          </Button>
        </div>
      </div>
    </div>
  );
}

