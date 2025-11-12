/**
 * Diff Service
 * Generates diffs between original and refined story content
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

  while (originalPos < originalWords.length || refinedPos < refinedWords.length) {
    const origWord = originalWords[originalPos];
    const refWord = refinedWords[refinedPos];

    if (originalPos >= originalWords.length) {
      // Addition
      result.additions++;
      changes.push({
        type: 'add',
        refinedText: refWord,
        position,
        length: refWord.length,
      });
      position += refWord.length;
      refinedPos++;
    } else if (refinedPos >= refinedWords.length) {
      // Deletion
      result.deletions++;
      changes.push({
        type: 'delete',
        originalText: origWord,
        position,
        length: 0,
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
        changes.push({
          type: 'add',
          refinedText: refWord,
          position,
          length: refWord.length,
        });
        position += refWord.length;
        refinedPos++;
      } else if (nextRefMatch) {
        // This is a deletion
        result.deletions++;
        changes.push({
          type: 'delete',
          originalText: origWord,
          position,
          length: 0,
        });
        originalPos++;
      } else {
        // Modification
        result.modifications++;
        changes.push({
          type: 'modify',
          originalText: origWord,
          refinedText: refWord,
          position,
          length: refWord.length,
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

