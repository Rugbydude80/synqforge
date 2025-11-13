/**
 * TypeScript types for Story Refinement feature
 */

export interface DiffChange {
  type: 'add' | 'delete' | 'modify' | 'unchanged';
  originalText?: string;
  refinedText?: string;
  position: number;
  length: number;
  reason?: string; // AI explanation for the change
  category?: 'clarity' | 'grammar' | 'readability' | 'conciseness' | 'specificity'; // Category of change
  changeId?: string; // Unique ID for granular control
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

