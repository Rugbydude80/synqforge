/**
 * Decomposition Service
 * Breaks requirements into capabilities with merging and caps enforcement
 */

import { Anthropic } from '@anthropic-ai/sdk';
import {
  DecompositionRequest,
  DecompositionResponse,
  Capability,
  ACCEPTANCE_THEMES,
} from './types';
import { similarityService } from './similarity.service';
import { correlationService } from './correlation.service';
import { piiRedactionService } from './pii-redaction.service';
import { logger } from '@/lib/observability/logger';
import { metrics, METRICS } from '@/lib/observability/metrics';

export class DecompositionService {
  private anthropic: Anthropic | null = null;
  private readonly SOFT_CAP = 4;
  private readonly HARD_CAP = 6;

  private getAnthropic(): Anthropic {
    if (!this.anthropic) {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY not found');
      }
      this.anthropic = new Anthropic({ apiKey });
    }
    return this.anthropic;
  }

  /**
   * Decompose requirements into capabilities
   */
  async decompose(request: DecompositionRequest): Promise<DecompositionResponse> {
    // Generate request ID if not provided
    const requestId = request.requestId || correlationService.generateRequestId();

    logger.info('Starting decomposition', {
      requestId,
      projectId: request.projectId,
    });

    // Build prompt
    const prompt = this.buildDecompositionPrompt(request);

    // Audit log (1% sample with PII redaction)
    piiRedactionService.auditLog('decomposition.prompt', { prompt }, { requestId });

    // Call AI
    const startTime = Date.now();
    const response = await this.getAnthropic().messages.create({
      model: request.model,
      max_tokens: 4000,
      temperature: 0.7,
      messages: [{
        role: 'user',
        content: prompt,
      }],
    });

    const latency = Date.now() - startTime;
    metrics.timing(METRICS.AI_LATENCY, latency, { operation: 'decomposition' });

    // Extract text
    const textContent = response.content.find(block => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in AI response');
    }

    // Parse capabilities
    let capabilities = this.parseCapabilities(textContent.text);

    // Audit log output
    piiRedactionService.auditLog('decomposition.output', { capabilities }, { requestId });

    // Enforce hard cap
    let hard_cap_enforced = false;
    if (capabilities.length > this.HARD_CAP) {
      logger.warn('Hard cap enforced', {
        requestId,
        capabilityCount: capabilities.length,
        hardCap: this.HARD_CAP,
      });
      capabilities = capabilities.slice(0, this.HARD_CAP);
      hard_cap_enforced = true;
    }

    // Check soft cap
    const soft_cap_exceeded = capabilities.length > this.SOFT_CAP;
    if (soft_cap_exceeded) {
      metrics.increment('cap.softCapExceeded_rate', 1);
      logger.info('Soft cap exceeded', {
        requestId,
        capabilityCount: capabilities.length,
        softCap: this.SOFT_CAP,
      });
    }

    // Calculate total estimate
    const total_estimate = capabilities.reduce((sum, cap) => sum + cap.estimate, 0);
    metrics.histogram('total_estimate', total_estimate);

    // Check if split recommended
    const split_recommended = total_estimate >= 8;
    if (split_recommended) {
      metrics.increment('split.recommended_rate', 1);
      logger.info('Split recommended', {
        requestId,
        totalEstimate: total_estimate,
      });
    }

    // Find merge suggestions
    const merge_suggestions = similarityService.findMergeSuggestions(
      capabilities,
      request.similarityThreshold,
      'anthropic',
      request.model
    );

    // Track merge metrics
    if (merge_suggestions.length > 0) {
      const avgSimilarity = merge_suggestions.reduce((sum, s) => sum + s.similarity, 0) / merge_suggestions.length;
      metrics.histogram('merge.avg_similarity', avgSimilarity, {
        provider: 'anthropic',
        model: request.model,
      });
    }

    // Token usage
    const usage = {
      promptTokens: response.usage.input_tokens,
      completionTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens,
    };

    metrics.increment(METRICS.AI_TOKENS, usage.totalTokens, {
      operation: 'decomposition',
      model: request.model,
    });

    return {
      requestId,
      capabilities,
      total_estimate,
      split_recommended,
      soft_cap_exceeded,
      hard_cap_enforced,
      merge_suggestions,
      usage,
      model: request.model,
    };
  }

  /**
   * Build decomposition prompt
   */
  private buildDecompositionPrompt(request: DecompositionRequest): string {
    return `You are an expert Agile analyst. Break down the following requirements into capabilities (user stories).

Requirements:
${request.requirements}

${request.projectContext ? `Project Context:\n${request.projectContext}\n` : ''}
${request.targetUsers ? `Target Users:\n${request.targetUsers}\n` : ''}
${request.businessGoals ? `Business Goals:\n${request.businessGoals}\n` : ''}

CRITICAL RULES:
1. Output 1-6 capabilities ONLY (hard limit)
2. Each capability must have:
   - key: unique identifier (e.g., "cap-filter-products")
   - title: brief capability name (10-200 chars)
   - description: what this capability does (20+ chars)
   - estimate: story points 1-8 (8 = large, recommend split)
   - themes: 1+ from: ${ACCEPTANCE_THEMES.join(', ')}
   - acceptanceCriteria: exactly 4-7 ACs in Given/When/Then format
   - technicalHints: array of implementation notes (optional)
   - hasUI: true if UI components involved
   - requiresWCAG: true if accessibility critical
   - requiresPersistence: true if state spans navigation/refresh

3. Each AC must have:
   - given: precondition
   - when: action/trigger
   - then: expected outcome (NO compound "and/or")
   - is_interactive: true if When uses: ${['click', 'select', 'enter', 'type', 'submit', 'tap', 'drag'].join(', ')}
   - performance_target_ms: milliseconds if performance critical
   - themes: relevant themes from capability

4. Always include a "no-results" AC if data display involved

Output ONLY valid JSON matching this structure (no markdown, no commentary):
{
  "capabilities": [
    {
      "key": "cap-example",
      "title": "Filter Products by Category",
      "description": "Users can filter product listings by category, price, and rating",
      "estimate": 3,
      "themes": ["filtering", "data-display"],
      "acceptanceCriteria": [
        {
          "given": "I am on the product listing page",
          "when": "I select a category filter",
          "then": "only products in that category are displayed within 2 seconds",
          "is_interactive": true,
          "performance_target_ms": 2000,
          "themes": ["filtering", "performance"]
        }
      ],
      "technicalHints": ["Use indexed queries", "Cache filter results"],
      "hasUI": true,
      "requiresWCAG": true,
      "requiresPersistence": true
    }
  ]
}`;
  }

  /**
   * Parse capabilities from AI response
   */
  private parseCapabilities(text: string): Capability[] {
    try {
      // Extract JSON from response (handle markdown blocks)
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
      const jsonText = jsonMatch[1] || text;

      const parsed = JSON.parse(jsonText.trim());

      if (!parsed.capabilities || !Array.isArray(parsed.capabilities)) {
        throw new Error('Invalid response: missing capabilities array');
      }

      // Validate each capability
      return parsed.capabilities.map((cap: any, i: number) => {
        return {
          key: cap.key || `cap-${i}`,
          title: cap.title || '',
          description: cap.description || '',
          estimate: cap.estimate || 3,
          themes: cap.themes || [],
          acceptanceCriteria: cap.acceptanceCriteria || [],
          technicalHints: cap.technicalHints || [],
          hasUI: cap.hasUI || false,
          requiresWCAG: cap.requiresWCAG || false,
          requiresPersistence: cap.requiresPersistence || false,
        };
      });
    } catch (error) {
      logger.error('Failed to parse capabilities', error as Error, {
        text: text.substring(0, 500),
      });
      throw new Error('Failed to parse AI response');
    }
  }
}

export const decompositionService = new DecompositionService();

