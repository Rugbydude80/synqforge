/**
 * Story Generation Service
 * Generates user stories from capabilities with validation and auto-fix
 */

import { openai } from '@/lib/ai/client';
import { nanoid } from 'nanoid';
import {
  GenerateStoryRequest,
  GenerateStoryResponse,
  AcceptanceCriterion,
} from './types';
import { validationService } from './validation.service';
import { piiRedactionService } from './pii-redaction.service';
import { logger } from '@/lib/observability/logger';
import { metrics } from '@/lib/observability/metrics';
import { callAIWithRetry } from '@/lib/utils/ai-retry';

export class StoryGenerationService {
  private _isConfigured: boolean | null = null;

  /**
   * Check if service is configured (lazy validation)
   */
  private ensureConfigured(): void {
    if (this._isConfigured === null) {
      this._isConfigured = !!process.env.OPENROUTER_API_KEY;
      if (!this._isConfigured) {
        throw new Error('OPENROUTER_API_KEY is required');
      }
    }
  }

  /**
   * Convert model name to OpenRouter format
   */
  private getOpenRouterModel(model: string): string {
    // If already in OpenRouter format, return as-is
    if (model.includes('/')) {
      return model;
    }
    // Convert Anthropic model names to OpenRouter format
    if (model.startsWith('claude')) {
      return `anthropic/${model}`;
    }
    // Return as-is for other models (e.g., qwen models)
    return model;
  }

  /**
   * Generate story from capability
   */
  async generateStory(request: GenerateStoryRequest): Promise<GenerateStoryResponse> {
    // Lazy validation - only check when actually used (not during build)
    this.ensureConfigured();
    
    // Generate request ID if not provided
    const requestId = request.requestId || nanoid();

    logger.info('Starting story generation', {
      requestId,
      projectId: request.projectId,
      capabilityKey: request.capability.key,
    });

    // Build prompt
    const prompt = this.buildStoryPrompt(request);

    // Audit log (1% sample with PII redaction)
    piiRedactionService.auditLog('story-generation.prompt', { prompt }, { requestId });

    // Call AI with retry logic via OpenRouter
    const startTime = Date.now();
    const openRouterModel = this.getOpenRouterModel(request.model);
    const response = await callAIWithRetry(
      () => openai.chat.completions.create({
        model: openRouterModel,
        max_tokens: 3000,
        temperature: 0.7,
        messages: [{
          role: 'user',
          content: prompt,
        }],
      }),
      {
        maxRetries: 3,
        initialDelayMs: 1000,
        retryableErrors: ['rate_limit', 'rate limit', 'timeout', '429', '500', '502', '503', '504'],
      }
    );

    const latency = Date.now() - startTime;
    metrics.timing('ai.latency', latency, { operation: 'story-generation' });

    // Extract text (OpenRouter/OpenAI format)
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No text content in AI response');
    }

    // Parse story
    const story = this.parseStory(content);

    // Audit log output
    piiRedactionService.auditLog('story-generation.output', { story }, { requestId });

    // Validate and auto-fix
    const validation = await validationService.validateStory(
      story.acceptanceCriteria,
      request.capability.hasUI,
      request.capability.themes,
      request.qualityThreshold
    );

    // Token usage (OpenRouter/OpenAI format)
    const usage = {
      promptTokens: response.usage?.prompt_tokens || 0,
      completionTokens: response.usage?.completion_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0,
    };

    metrics.increment('ai.tokens', usage.totalTokens, {
      operation: 'story-generation',
      model: request.model,
    });

    // Use validated ACs
    story.acceptanceCriteria = validation.acceptanceCriteria;

    return {
      requestId,
      capabilityKey: request.capability.key,
      story,
      validation,
      usage,
      model: request.model,
    };
  }

  /**
   * Build story generation prompt
   */
  private buildStoryPrompt(request: GenerateStoryRequest): string {
    const { capability, projectContext } = request;

    return `You are an expert Agile analyst. Generate a complete user story for this capability.

Capability:
- Title: ${capability.title}
- Description: ${capability.description}
- Themes: ${capability.themes.join(', ')}
- Has UI: ${capability.hasUI}
- Requires WCAG: ${capability.requiresWCAG}
- Requires Persistence: ${capability.requiresPersistence}

${projectContext ? `Project Context:\n${projectContext}\n` : ''}

CRITICAL RULES:
1. Title: Concise story title (10-200 chars)
2. Description: "As a [persona], I want [capability], so that [outcome]"
3. Acceptance Criteria: EXACTLY 4-7 ACs (no more, no less)

Each AC must be in Given/When/Then format:
- given: precondition (5+ chars)
- when: action/trigger (5+ chars)  
- then: expected outcome (5+ chars) - NO compound "and/or" clauses
- is_interactive: true if When contains: ${['click', 'select', 'enter', 'type', 'submit'].join(', ')}
- performance_target_ms: milliseconds if performance critical
- themes: relevant themes

4. ALWAYS include at least one "no-results" AC if data display involved (use keywords: no results, no records, no items, empty, nothing found)

5. For UI stories (hasUI=true):
   - Include WCAG 2.1 AA accessibility note
   - Include responsive design note if mobile relevant

6. For persistence stories (requiresPersistence=true):
   - Include AC about state persisting across navigation/refresh

7. Technical hints: Implementation notes (optional)

8. Stop sequences: Use proper JSON ending - no truncation

Output ONLY valid JSON (no markdown, no commentary):
{
  "title": "Filter Products by Category",
  "description": "As a shopper, I want to filter products by category, so that I can quickly find items I'm interested in",
  "acceptanceCriteria": [
    {
      "given": "I am on the product listing page",
      "when": "I select a category filter",
      "then": "only products in that category are displayed within 2 seconds",
      "is_interactive": true,
      "performance_target_ms": 2000,
      "themes": ["filtering", "performance"]
    },
    {
      "given": "no products match the selected category",
      "when": "results load",
      "then": "a clear message 'No products found' is shown with an option to reset filters",
      "is_interactive": false,
      "themes": ["error-handling", "data-display"]
    }
  ],
  "technicalHints": ["Use indexed queries on category field", "Cache filter results for 5 minutes"],
  "estimate": ${capability.estimate}
}`;
  }

  /**
   * Parse story from AI response
   */
  private parseStory(text: string): {
    title: string;
    description: string;
    acceptanceCriteria: AcceptanceCriterion[];
    technicalHints: string[];
    estimate: number;
  } {
    try {
      // Extract JSON from response (handle markdown blocks)
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
      const jsonText = jsonMatch[1] || text;

      const parsed = JSON.parse(jsonText.trim());

      return {
        title: parsed.title || '',
        description: parsed.description || '',
        acceptanceCriteria: parsed.acceptanceCriteria || [],
        technicalHints: parsed.technicalHints || [],
        estimate: parsed.estimate || 3,
      };
    } catch (error) {
      logger.error('Failed to parse story', error as Error, {
        text: text.substring(0, 500),
      });
      throw new Error('Failed to parse AI response');
    }
  }
}

export const storyGenerationService = new StoryGenerationService();

