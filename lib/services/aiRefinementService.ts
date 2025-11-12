/**
 * AI Refinement Service
 * Handles AI-powered story refinement using OpenRouter/Qwen
 */

import { openai, MODEL } from '@/lib/ai/client';
import { logger } from '@/lib/observability/logger';

export interface RefinementContext {
  genre?: string;
  targetAudience?: string;
  tone?: string;
  currentWordCount?: number;
}

/**
 * Refine a story using AI based on user instructions
 */
export async function refineStoryWithAI(
  originalContent: string,
  instructions: string,
  context?: RefinementContext
): Promise<string> {
  const systemPrompt = `You are an expert story editor and writing coach. Your task is to refine the provided story according to the user's specific instructions while maintaining the core narrative, characters, and plot structure.

CRITICAL GUIDELINES:
- Preserve the original story's voice, tone, and intent
- Only make changes that directly align with the user's instructions
- Maintain consistency in character names, plot points, timeline, and world-building
- Do not add major plot elements unless explicitly requested
- Ensure changes enhance readability, flow, and narrative quality
- Keep approximately the same story length unless instructed otherwise (±20%)
- Do not add meta-commentary, explanations, or notes
- Return ONLY the refined story text

FORMATTING:
- Preserve paragraph breaks and structure
- Maintain dialogue formatting
- Keep chapter markers if present`;

  const userPrompt = `ORIGINAL STORY:

${originalContent}

USER'S REFINEMENT INSTRUCTIONS:

${instructions}

${context?.genre ? `GENRE: ${context.genre}` : ''}
${context?.targetAudience ? `TARGET AUDIENCE: ${context.targetAudience}` : ''}
${context?.tone ? `DESIRED TONE: ${context.tone}` : ''}

Please refine the story according to the instructions above. Return ONLY the refined story text.`;

  try {
    logger.info('Starting AI story refinement', {
      instructionLength: instructions.length,
      originalLength: originalContent.length,
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

    logger.info('AI refinement completed', {
      refinedLength: refinedContent.length,
      tokensUsed: response.usage?.total_tokens,
    });

    return refinedContent.trim();
  } catch (error) {
    logger.error('AI refinement error', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error('Failed to refine story with AI. Please try again.');
  }
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

