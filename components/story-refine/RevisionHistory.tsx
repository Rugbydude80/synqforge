'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Edit, Eye, RotateCcw, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Revision {
  id: string;
  storyId: string;
  content: string;
  revisionType: 'manual_edit' | 'refinement' | 'auto_save' | 'initial';
  revisionNote?: string;
  createdAt: Date;
  createdBy: string;
  changeCount?: number;
  wordCountDelta?: number;
}

interface RevisionHistoryProps {
  storyId: string;
  onPreview?: (revision: Revision) => void;
  onRestore?: (revision: Revision) => void;
}

export function RevisionHistory({
  storyId,
  onPreview,
  onRestore,
}: RevisionHistoryProps) {
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRevisions();
  }, [storyId]);

  const loadRevisions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/stories/${storyId}/revisions`);
      
      if (!response.ok) {
        throw new Error('Failed to load revisions');
      }

      const data = await response.json();
      setRevisions(data.revisions || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = (revision: Revision) => {
    onPreview?.(revision);
  };

  const handleRestore = async (revision: Revision) => {
    if (!confirm('Are you sure you want to restore this revision? This will replace the current story content.')) {
      return;
    }

    try {
      const response = await fetch(`/api/stories/${storyId}/revisions/${revision.id}/restore`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to restore revision');
      }

      onRestore?.(revision);
      await loadRevisions(); // Reload to update list
    } catch (err: any) {
      alert(`Failed to restore revision: ${err.message}`);
    }
  };

  const getRevisionIcon = (type: string) => {
    switch (type) {
      case 'refinement':
        return <Sparkles className="h-4 w-4 text-purple-500" />;
      case 'manual_edit':
        return <Edit className="h-4 w-4 text-blue-500" />;
      default:
        return <Edit className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRevisionBadgeColor = (type: string) => {
    switch (type) {
      case 'refinement':
        return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300';
      case 'manual_edit':
        return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Refinement History</CardTitle>
          <CardDescription>View and restore previous versions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Refinement History</CardTitle>
          <CardDescription>View and restore previous versions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-destructive">{error}</div>
        </CardContent>
      </Card>
    );
  }

  if (revisions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Refinement History</CardTitle>
          <CardDescription>View and restore previous versions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-8">
            No revision history available yet.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Refinement History</CardTitle>
        <CardDescription>View and restore previous versions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {revisions.map((revision) => (
            <div
              key={revision.id}
              className="flex items-start gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="mt-1">
                {getRevisionIcon(revision.revisionType)}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant="outline"
                        className={getRevisionBadgeColor(revision.revisionType)}
                      >
                        {revision.revisionType === 'refinement'
                          ? 'AI Refinement'
                          : revision.revisionType === 'manual_edit'
                          ? 'Manual Edit'
                          : 'Auto Save'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(revision.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    {revision.revisionNote && (
                      <div className="text-sm font-medium mt-1">
                        {revision.revisionNote}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {revision.changeCount !== undefined && (
                    <Badge variant="secondary" className="text-xs">
                      {revision.changeCount} changes
                    </Badge>
                  )}
                  {revision.wordCountDelta !== undefined && (
                    <Badge variant="secondary" className="text-xs">
                      {revision.wordCountDelta > 0 ? '+' : ''}
                      {revision.wordCountDelta} words
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handlePreview(revision)}
                    className="gap-2"
                  >
                    <Eye className="h-3 w-3" />
                    Preview
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRestore(revision)}
                    className="gap-2"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Restore
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

