/**
 * TypeScript types for Story Refinement feature
 */

export interface DiffChange {
  type: 'add' | 'delete' | 'modify' | 'unchanged';
  originalText?: string;
  refinedText?: string;
  position: number;
  length: number;
}

export interface DiffResult {
  additions: number;
  deletions: number;
  modifications: number;
  totalChanges: number;
  changes: DiffChange[];
  originalWordCount: number;
  refinedWordCount: number;
  wordCountDelta: number;
}

export interface RefinementResponse {
  refinementId: string;
  originalContent: string;
  refinedContent: string;
  changes: DiffResult;
  processingTimeMs: number;
  storyTitle: string;
}

export type RefinementStage = 'input' | 'processing' | 'review';
export type RefinementStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'accepted'
  | 'rejected'
  | 'failed';

