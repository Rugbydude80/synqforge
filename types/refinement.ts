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

export interface StructuredStory {
  title: string;
  description: string;
  acceptanceCriteria: string[];
}

export interface StructuredDiffChanges {
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
}

export interface RefinementResponse {
  refinementId: string;
  // Legacy fields (deprecated, kept for backward compatibility)
  originalContent: string;
  refinedContent: string;
  // New structured fields
  originalStory: StructuredStory;
  refinedStory: StructuredStory;
  changes: StructuredDiffChanges;
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

