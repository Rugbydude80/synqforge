/**
 * AI Refinement Service
 * Handles AI-powered story refinement using OpenRouter/Qwen
 * SPECIALIZED FOR USER STORIES (Agile/Software Requirements), NOT Creative Fiction
 */

import { openai, MODEL } from '@/lib/ai/client';
import { logger } from '@/lib/observability/logger';
import { RefinementOptions } from '@/components/story-refine/InstructionInput';

export interface RefinementContext {
  contentType?: 'title' | 'description' | 'criterion';
  currentWordCount?: number;
}

export interface ChangeExplanation {
  original: string;
  refined: string;
  reason: string;
  category: 'clarity' | 'grammar' | 'readability' | 'conciseness' | 'specificity';
}

export interface RefinementResult {
  refinedContent: string;
  explanations?: ChangeExplanation[];
}

/**
 * Check if text looks like a UI label (should not be refined)
 */
function isUILabel(text: string): boolean {
  if (!text || text.trim().length === 0) return true;
  
  const trimmed = text.trim();
  const words = trimmed.toLowerCase().split(/\s+/);
  
  // Common UI labels that should never be refined
  const uiKeywords = [
    'assign', 'user', 'users', 'dialog', 'submit', 'cancel', 'save', 'edit',
    'delete', 'close', 'open', 'back', 'next', 'previous', 'search', 'filter',
    'sort', 'refresh', 'loading', 'error', 'success', 'warning', 'info',
    'preview', 'final result', 'original', 'refined', 'changes', 'accept',
    'reject', 'refine again'
  ];
  
  // If text is 1-3 words and matches UI keywords, it's probably a label
  if (words.length <= 3) {
    return words.some(w => uiKeywords.includes(w));
  }
  
  // Check if it's a very short phrase that looks like a label
  if (words.length <= 5 && trimmed.length < 50) {
    const lowerText = trimmed.toLowerCase();
    if (uiKeywords.some(keyword => lowerText.includes(keyword))) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get content-type-specific instructions for refinement
 */
function getTypeSpecificInstructions(type?: string): string {
  switch (type) {
    case 'title':
      return `\n\nCONTENT TYPE: User Story Title\nThis is a user story title, typically in the format "As a [role], I want [feature], so that [benefit]".\n- Preserve the "As a... I want... so that..." structure if present\n- Improve clarity and specificity\n- Keep it concise and focused\n- Do NOT change the format or add narrative elements`;
    
    case 'description':
      return `\n\nCONTENT TYPE: User Story Description\nThis is a detailed user story description explaining the requirement.\n- Focus on clarity and completeness\n- Remove ambiguity\n- Ensure technical accuracy\n- Preserve domain-specific terminology\n- Do NOT add creative narrative elements`;
    
    case 'criterion':
      return `\n\nCONTENT TYPE: Acceptance Criterion\nThis is an acceptance criterion - a testable condition for the user story.\n- Make it specific and testable\n- Use clear, unambiguous language\n- Ensure it's measurable\n- Keep it focused on a single condition\n- Format as a clear, actionable statement`;
    
    default:
      return '';
  }
}

/**
 * Refine a user story field using AI based on user instructions
 * SPECIALIZED FOR AGILE USER STORIES, NOT CREATIVE FICTION
 */
export async function refineStoryWithAI(
  originalContent: string,
  instructions: string,
  context?: RefinementContext,
  options?: RefinementOptions
): Promise<RefinementResult> {
  // Validate input doesn't look like UI labels
  if (isUILabel(originalContent)) {
    logger.warn('Attempted to refine UI label, skipping', { content: originalContent });
    return {
      refinedContent: originalContent, // Return unchanged
      explanations: undefined,
    };
  }

  // Build focus instructions from options
  const focusInstructions = options?.focus?.length
    ? `\nFocus areas: ${options.focus.join(', ')}`
    : '';
  
  const intensityInstruction = options?.intensity
    ? `\nRefinement intensity: ${options.intensity}`
    : '';
  
  const preserveInstruction = options?.preserve?.length
    ? `\nPreserve these elements unchanged: ${options.preserve.join(', ')}`
    : '';

  const typeInstructions = getTypeSpecificInstructions(context?.contentType);

  const systemPrompt = `You are an expert Agile coach and user story refinement specialist specializing in software development requirements.

CRITICAL CONTEXT:
- You are refining USER STORIES (software requirements), NOT creative fiction or narrative stories
- User stories are Agile/Scrum requirements written for software development teams
- Stories follow formats like: "As a [role], I want [feature], so that [benefit]"
- Stories have: Title, Description, and Acceptance Criteria

REFINEMENT GOALS:
1. Improve clarity and remove ambiguity
2. Ensure INVEST principles (Independent, Negotiable, Valuable, Estimable, Small, Testable)
3. Fix grammar and readability issues
4. Make acceptance criteria specific and testable
5. Preserve technical terminology, system names, and domain-specific language
6. Enhance precision without changing meaning

CRITICAL RULES - DO NOT:
- Change UI labels, navigation text, or button labels (e.g., "assign", "users", "dialog", "submit")
- Modify technical IDs, URLs, code references, or system identifiers
- Add creative narrative elements or fictional content
- Change the "As a... I want... so that..." format structure
- Capitalize common words unnecessarily (e.g., "assign" → "Assign")
- Change synonyms arbitrarily without improving clarity
- Modify field labels or metadata

CRITICAL RULES - DO:
- Preserve domain-specific terminology exactly
- Keep technical references unchanged
- Maintain the user story format structure
- Improve clarity and testability
- Remove ambiguity
- Make acceptance criteria measurable
- Enhance readability without changing meaning${focusInstructions}${intensityInstruction}${preserveInstruction}

RESPONSE FORMAT:
- Return ONLY the refined content
- Do NOT add explanations, meta-commentary, or notes
- Do NOT wrap content in quotes or markdown
- Preserve original formatting and structure`;

  const userPrompt = `ORIGINAL USER STORY CONTENT:

${originalContent}

USER'S REFINEMENT INSTRUCTIONS:

${instructions}${typeInstructions}

Please refine this user story content according to the instructions above. Return ONLY the refined content without any explanations or additional text.`;

  try {
    logger.info('Starting AI user story refinement', {
      instructionLength: instructions.length,
      originalLength: originalContent.length,
      contentType: context?.contentType,
      options: options ? JSON.stringify(options) : undefined,
    });

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
    });

    const refinedContent = response.choices[0]?.message?.content;

    if (!refinedContent) {
      throw new Error('AI returned empty response');
    }

    // Clean up the response - remove any markdown formatting or quotes
    let cleanedContent = refinedContent.trim();
    
    // Remove markdown code blocks if present
    if (cleanedContent.startsWith('```')) {
      const lines = cleanedContent.split('\n');
      cleanedContent = lines.slice(1, -1).join('\n').trim();
    }
    
    // Remove surrounding quotes if present
    if ((cleanedContent.startsWith('"') && cleanedContent.endsWith('"')) ||
        (cleanedContent.startsWith("'") && cleanedContent.endsWith("'"))) {
      cleanedContent = cleanedContent.slice(1, -1);
    }

    logger.info('AI user story refinement completed', {
      refinedLength: cleanedContent.length,
      tokensUsed: response.usage?.total_tokens,
      contentType: context?.contentType,
    });

    return {
      refinedContent: cleanedContent,
      explanations: undefined, // Will be generated by diff service
    };
  } catch (error) {
    logger.error('AI refinement error', {
      error: error instanceof Error ? error.message : String(error),
      contentType: context?.contentType,
    });
    throw new Error('Failed to refine user story with AI. Please try again.');
  }
}

/**
 * Refine a complete user story (title, description, acceptance criteria)
 */
export async function refineCompleteUserStory(
  story: {
    title: string;
    description?: string | null;
    acceptanceCriteria?: string[] | null;
  },
  instructions: string,
  options?: RefinementOptions
): Promise<{
  title: string;
  description: string;
  acceptanceCriteria: string[];
}> {
  // Refine title
  const titleResult = await refineStoryWithAI(
    story.title,
    `${instructions}\nFocus: Refine user story title for clarity and proper format`,
    { contentType: 'title' },
    options
  );

  // Refine description if present
  let description = story.description || '';
  if (description && description.trim().length > 0 && !isUILabel(description)) {
    const descResult = await refineStoryWithAI(
      description,
      `${instructions}\nFocus: Refine story description for clarity and completeness`,
      { contentType: 'description' },
      options
    );
    description = descResult.refinedContent;
  }

  // Refine each acceptance criterion individually
  const acceptanceCriteria: string[] = [];
  if (story.acceptanceCriteria && story.acceptanceCriteria.length > 0) {
    const acResults = await Promise.all(
      story.acceptanceCriteria
        .filter(ac => ac && ac.trim().length > 0 && !isUILabel(ac))
        .map(ac =>
          refineStoryWithAI(
            ac,
            `${instructions}\nFocus: Refine acceptance criterion to be specific and testable`,
            { contentType: 'criterion' },
            options
          )
        )
    );
    acceptanceCriteria.push(...acResults.map(r => r.refinedContent));
  }

  return {
    title: titleResult.refinedContent,
    description,
    acceptanceCriteria,
  };
}

/**
 * Generate explanations for changes (can be called separately or integrated)
 */
export async function generateChangeExplanations(
  _original: string,
  _refined: string,
  _changes: Array<{ originalText?: string; refinedText?: string; type: string }>
): Promise<ChangeExplanation[]> {
  // For significant changes, we could make an AI call to explain them
  // For now, return empty array - can be enhanced later
  return [];
}

/**
 * Estimate token count for a text (rough estimation)
 */
export function estimateTokenCount(text: string): number {
  // Rough estimation: ~4 characters per token
  return Math.ceil(text.length / 4);
}

/**
 * Validate story length before refinement
 */
export function validateStoryLength(content: string): boolean {
  const wordCount = content.split(/\s+/).length;
  const MAX_WORDS = 10000;
  return wordCount <= MAX_WORDS;
}
