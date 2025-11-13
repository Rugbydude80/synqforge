/**
 * Diff Service
 * Generates diffs between original and refined story content
 */

import { DiffChange } from '@/types/refinement';

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

/**
 * Infer change category and reason based on the type of change
 */
function inferChangeCategory(
  originalText: string,
  refinedText: string,
  type: 'add' | 'delete' | 'modify'
): { category: 'clarity' | 'grammar' | 'readability' | 'conciseness' | 'specificity'; reason: string } {
  const orig = originalText?.toLowerCase() || '';
  const refined = refinedText?.toLowerCase() || '';
  
  // Simple heuristics for categorizing changes
  if (type === 'delete') {
    return {
      category: 'conciseness',
      reason: 'Removed redundant or unnecessary text',
    };
  }
  
  if (type === 'add') {
    if (refined.length > orig.length * 1.5) {
      return {
        category: 'specificity',
        reason: 'Added descriptive details',
      };
    }
    return {
      category: 'clarity',
      reason: 'Added clarifying information',
    };
  }
  
  // Modification
  const origWords = orig.split(/\s+/).length;
  const refinedWords = refined.split(/\s+/).length;
  
  // Check for grammar fixes (common patterns)
  const grammarPatterns = [
    /(was|were)\s+(.*?)\s+(was|were)/i,
    /(is|are)\s+(.*?)\s+(is|are)/i,
    /\b(their|there|they're)\b/i,
    /\b(its|it's)\b/i,
  ];
  
  for (const pattern of grammarPatterns) {
    if (pattern.test(orig) && !pattern.test(refined)) {
      return {
        category: 'grammar',
        reason: 'Fixed grammatical error',
      };
    }
  }
  
  // Check for readability improvements
  if (refinedWords < origWords * 0.8) {
    return {
      category: 'conciseness',
      reason: 'Simplified for better readability',
    };
  }
  
  if (refinedWords > origWords * 1.2) {
    return {
      category: 'specificity',
      reason: 'Added more descriptive detail',
    };
  }
  
  // Default to clarity
  return {
    category: 'clarity',
    reason: 'Improved clarity and readability',
  };
}

/**
 * Generate a diff between original and refined content
 * Uses word-level comparison for better granularity
 */
export function generateStoryDiff(
  original: string,
  refined: string
): DiffResult {
  const result: DiffResult = {
    additions: 0,
    deletions: 0,
    modifications: 0,
    totalChanges: 0,
    changes: [],
    originalWordCount: original.split(/\s+/).length,
    refinedWordCount: refined.split(/\s+/).length,
    wordCountDelta: 0,
  };

  // Simple word-level diff implementation
  const originalWords = original.split(/(\s+)/);
  const refinedWords = refined.split(/(\s+)/);

  // Use a simple LCS-like approach for word comparison
  const changes: DiffChange[] = [];
  let originalPos = 0;
  let refinedPos = 0;
  let position = 0;
  let changeIdCounter = 0;

  while (originalPos < originalWords.length || refinedPos < refinedWords.length) {
    const origWord = originalWords[originalPos];
    const refWord = refinedWords[refinedPos];

    if (originalPos >= originalWords.length) {
      // Addition
      result.additions++;
      const categoryInfo = inferChangeCategory('', refWord, 'add');
      changes.push({
        type: 'add',
        refinedText: refWord,
        position,
        length: refWord.length,
        changeId: `change-${changeIdCounter++}`,
        reason: categoryInfo.reason,
        category: categoryInfo.category,
      });
      position += refWord.length;
      refinedPos++;
    } else if (refinedPos >= refinedWords.length) {
      // Deletion
      result.deletions++;
      const categoryInfo = inferChangeCategory(origWord, '', 'delete');
      changes.push({
        type: 'delete',
        originalText: origWord,
        position,
        length: 0,
        changeId: `change-${changeIdCounter++}`,
        reason: categoryInfo.reason,
        category: categoryInfo.category,
      });
      originalPos++;
    } else if (origWord === refWord) {
      // Unchanged
      changes.push({
        type: 'unchanged',
        originalText: origWord,
        refinedText: refWord,
        position,
        length: origWord.length,
        changeId: `change-${changeIdCounter++}`,
      });
      position += origWord.length;
      originalPos++;
      refinedPos++;
    } else {
      // Check if it's a modification or separate add/delete
      // Look ahead to see if next words match
      const nextOrigMatch =
        originalPos + 1 < originalWords.length &&
        originalWords[originalPos + 1] === refWord;
      const nextRefMatch =
        refinedPos + 1 < refinedWords.length &&
        refinedWords[refinedPos + 1] === origWord;

      if (nextOrigMatch) {
        // This is an addition
        result.additions++;
        const categoryInfo = inferChangeCategory('', refWord, 'add');
        changes.push({
          type: 'add',
          refinedText: refWord,
          position,
          length: refWord.length,
          changeId: `change-${changeIdCounter++}`,
          reason: categoryInfo.reason,
          category: categoryInfo.category,
        });
        position += refWord.length;
        refinedPos++;
      } else if (nextRefMatch) {
        // This is a deletion
        result.deletions++;
        const categoryInfo = inferChangeCategory(origWord, '', 'delete');
        changes.push({
          type: 'delete',
          originalText: origWord,
          position,
          length: 0,
          changeId: `change-${changeIdCounter++}`,
          reason: categoryInfo.reason,
          category: categoryInfo.category,
        });
        originalPos++;
      } else {
        // Modification
        result.modifications++;
        const categoryInfo = inferChangeCategory(origWord, refWord, 'modify');
        changes.push({
          type: 'modify',
          originalText: origWord,
          refinedText: refWord,
          position,
          length: refWord.length,
          changeId: `change-${changeIdCounter++}`,
          reason: categoryInfo.reason,
          category: categoryInfo.category,
        });
        position += refWord.length;
        originalPos++;
        refinedPos++;
      }
    }
  }

  result.changes = changes;
  result.totalChanges =
    result.additions + result.deletions + result.modifications;
  result.wordCountDelta = result.refinedWordCount - result.originalWordCount;

  return result;
}

/**
 * Highlight changes in text for display
 */
export function highlightChanges(
  text: string,
  changes: DiffChange[],
  type: 'original' | 'refined'
): string {
  // This function can be used server-side to prepare HTML with highlights
  let highlightedText = '';

  changes.forEach((change) => {
    if (type === 'original') {
      if (change.type === 'delete' || change.type === 'modify') {
        highlightedText += `<mark class="deletion">${change.originalText}</mark>`;
      } else if (change.type === 'unchanged') {
        highlightedText += change.originalText || '';
      }
    } else {
      if (change.type === 'add' || change.type === 'modify') {
        highlightedText += `<mark class="addition">${change.refinedText}</mark>`;
      } else if (change.type === 'unchanged') {
        highlightedText += change.refinedText || '';
      }
    }
  });

  return highlightedText;
}
