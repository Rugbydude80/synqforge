'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { DiffResult, StructuredStory } from '@/types/refinement';
import { DiffViewer } from './DiffViewer';
import { cn } from '@/lib/utils';

interface StructuredReviewInterfaceProps {
  originalStory: StructuredStory;
  refinedStory: StructuredStory;
  changes: {
    title: DiffResult;
    description: DiffResult;
    acceptanceCriteria: DiffResult[];
    summary: {
      totalChanges: number;
      titleChanged: boolean;
      descriptionChanged: boolean;
      acChangedCount: number;
      totalACCount: number;
    };
  };
  onAccept: (saveToHistory: boolean) => void;
  onReject: () => void;
  onRefineAgain: () => void;
}

function FieldDiffSection({
  title,
  original,
  refined,
  diff,
  isExpanded: initialExpanded = true,
}: {
  title: string;
  original: string;
  refined: string;
  diff: DiffResult;
  isExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(initialExpanded);
  const hasChanges = diff.totalChanges > 0;

  return (
    <Card className={cn('transition-all', !hasChanges && 'opacity-60')}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">{title}</CardTitle>
            {hasChanges && (
              <Badge variant="secondary" className="text-xs">
                {diff.totalChanges} {diff.totalChanges === 1 ? 'change' : 'changes'}
              </Badge>
            )}
            {!hasChanges && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                No changes
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="h-7 w-7 p-0"
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {/* Original */}
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-2">
                Original
              </div>
              <div className="p-3 bg-muted/30 rounded border min-h-[80px] max-h-[400px] overflow-y-auto">
                {original ? (
                  <p className="whitespace-pre-wrap text-sm">{original}</p>
                ) : (
                  <p className="text-muted-foreground text-sm italic">No content</p>
                )}
              </div>
            </div>

            {/* Refined */}
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-2">
                Refined
              </div>
              <div className="p-3 bg-muted/30 rounded border min-h-[80px] max-h-[400px] overflow-y-auto">
                {refined ? (
                  <DiffViewer
                    content={refined}
                    changes={diff.changes}
                    type="refined"
                    showChanges={hasChanges}
                  />
                ) : (
                  <p className="text-muted-foreground text-sm italic">No content</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function AcceptanceCriterionDiff({
  index,
  original,
  refined,
  diff,
}: {
  index: number;
  original: string;
  refined: string;
  diff: DiffResult;
}) {
  const hasChanges = diff.totalChanges > 0;

  return (
    <div className={cn('border rounded-lg p-4', !hasChanges && 'opacity-60')}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            Criterion {index + 1}
          </span>
          {hasChanges && (
            <Badge variant="secondary" className="text-xs">
              {diff.totalChanges} {diff.totalChanges === 1 ? 'change' : 'changes'}
            </Badge>
          )}
          {!hasChanges && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              No changes
            </Badge>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {/* Original */}
        <div>
          <div className="text-xs text-muted-foreground mb-1">Original</div>
          <div className="p-2 bg-muted/20 rounded text-sm min-h-[60px]">
            {original ? (
              <p className="whitespace-pre-wrap">{original}</p>
            ) : (
              <p className="text-muted-foreground italic">No content</p>
            )}
          </div>
        </div>

        {/* Refined */}
        <div>
          <div className="text-xs text-muted-foreground mb-1">Refined</div>
          <div className="p-2 bg-muted/20 rounded text-sm min-h-[60px]">
            {refined ? (
              <DiffViewer
                content={refined}
                changes={diff.changes}
                type="refined"
                showChanges={hasChanges}
              />
            ) : (
              <p className="text-muted-foreground italic">No content</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function StructuredReviewInterface({
  originalStory,
  refinedStory,
  changes,
  onAccept,
  onReject,
  onRefineAgain,
}: StructuredReviewInterfaceProps) {
  const [saveToHistory, setSaveToHistory] = useState(true);

  const { summary } = changes;
  const hasAnyChanges = summary.totalChanges > 0;

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      {hasAnyChanges && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div>
              <h3 className="font-semibold mb-3">Refinement Summary</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Changes:</span>
                  <span className="font-medium">{summary.totalChanges} {summary.totalChanges === 1 ? 'change' : 'changes'}</span>
                </div>
                {summary.titleChanged && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Title:</span>
                    <span className="font-medium">{changes.title.totalChanges} {changes.title.totalChanges === 1 ? 'change' : 'changes'}</span>
                  </div>
                )}
                {summary.descriptionChanged && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Description:</span>
                    <span className="font-medium">{changes.description.totalChanges} {changes.description.totalChanges === 1 ? 'change' : 'changes'}</span>
                  </div>
                )}
                {summary.acChangedCount > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Acceptance Criteria:</span>
                    <span className="font-medium">
                      {changes.acceptanceCriteria
                        .filter(ac => ac.totalChanges > 0)
                        .reduce((sum, ac) => sum + ac.totalChanges, 0)} changes across {summary.acChangedCount} {summary.acChangedCount === 1 ? 'criterion' : 'criteria'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Title Section */}
      <FieldDiffSection
        title="Story Title"
        original={originalStory.title}
        refined={refinedStory.title}
        diff={changes.title}
        isExpanded={changes.title.totalChanges > 0}
      />

      {/* Description Section */}
      <FieldDiffSection
        title="Description"
        original={originalStory.description}
        refined={refinedStory.description}
        diff={changes.description}
        isExpanded={changes.description.totalChanges > 0}
      />

      {/* Acceptance Criteria Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Acceptance Criteria ({originalStory.acceptanceCriteria.length})
            {summary.acChangedCount > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {summary.acChangedCount} {summary.acChangedCount === 1 ? 'changed' : 'changed'}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {originalStory.acceptanceCriteria.map((originalAC, index) => (
            <AcceptanceCriterionDiff
              key={index}
              index={index}
              original={originalAC}
              refined={refinedStory.acceptanceCriteria[index] || originalAC}
              diff={changes.acceptanceCriteria[index] || {
                additions: 0,
                deletions: 0,
                modifications: 0,
                totalChanges: 0,
                changes: [],
                originalWordCount: 0,
                refinedWordCount: 0,
                wordCountDelta: 0,
              }}
            />
          ))}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-4 border-t">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="saveToHistory"
            checked={saveToHistory}
            onChange={(e) => setSaveToHistory(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <label htmlFor="saveToHistory" className="text-sm text-muted-foreground cursor-pointer">
            Save to revision history
          </label>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onReject}>
            <X className="h-4 w-4 mr-2" />
            Reject
          </Button>
          <Button variant="outline" onClick={onRefineAgain}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Refine Again
          </Button>
          <Button onClick={() => onAccept(saveToHistory)}>
            <Check className="h-4 w-4 mr-2" />
            Accept Refinement
          </Button>
        </div>
      </div>
    </div>
  );
}

