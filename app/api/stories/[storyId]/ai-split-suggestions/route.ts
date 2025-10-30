import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/middleware/auth';
import { StoriesRepository } from '@/lib/repositories/stories';
import { storySplitAnalysisService } from '@/lib/services/story-split-analysis.service';
import { aiService } from '@/lib/services/ai.service';
import { aiGenerationRateLimit, checkRateLimit, getResetTimeMessage } from '@/lib/rate-limit';
import { canUseAI, incrementTokenUsage } from '@/lib/billing/fair-usage-guards';
import { AI_TOKEN_COSTS } from '@/lib/constants';
import { metrics } from '@/lib/observability/metrics';
import { MODEL } from '@/lib/ai/client';

async function getAISplitSuggestions(
  req: NextRequest,
  context: AuthContext & { params: { storyId: string } }
) {
  try {
    // Check rate limit
    const rateLimitResult = await checkRateLimit(
      `ai:split-story:${context.user.id}`,
      aiGenerationRateLimit
    );

    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);
      return NextResponse.json(
        {
          error: 'Too many AI requests. Please try again later.',
          retryAfter: getResetTimeMessage(rateLimitResult.reset),
        },
        {
          status: 429,
          headers: { 'Retry-After': retryAfter.toString() },
        }
      );
    }

    // Check AI usage limits
    const estimatedTokens = AI_TOKEN_COSTS.STORY_SPLIT;
    const aiCheck = await canUseAI(context.user.organizationId, estimatedTokens, context.user.id);

    if (!aiCheck.allowed) {
      return NextResponse.json(
        {
          error: aiCheck.reason,
          upgradeUrl: aiCheck.upgradeUrl,
          manageUrl: aiCheck.manageUrl,
        },
        { status: 402 }
      );
    }

    // Get the story
    const storiesRepo = new StoriesRepository(context.user);
    const story = await storiesRepo.getStoryById(context.params.storyId);

    if (!story) {
      return NextResponse.json(
        { error: 'Story not found' },
        { status: 404 }
      );
    }

    // Get INVEST/SPIDR analysis
    const analysis = storySplitAnalysisService.analyzeStoryForSplit(story);

    // Check if story should be split (only warn, don't block)
    // The user has already passed the split-analysis check in the modal
    if (!analysis.splittingRecommended) {
      console.log('[ai-split-suggestions] Warning: Splitting not recommended but proceeding with AI suggestions');
    }

    metrics.increment('ai_story_split_requested', 1);

    // Get AI suggestions
    const acceptanceCriteria = Array.isArray(story.acceptanceCriteria)
      ? story.acceptanceCriteria
      : story.acceptanceCriteria
      ? [story.acceptanceCriteria]
      : [];

    console.log('[ai-split-suggestions] Calling AI service with:', {
      title: story.title,
      hasDescription: !!story.description,
      criteriaCount: acceptanceCriteria.length,
      storyPoints: story.storyPoints,
    });

    const splitResponse = await aiService.suggestStorySplit(
      story.title,
      story.description || '',
      acceptanceCriteria,
      story.storyPoints,
      analysis.invest,
      analysis.spidr
    );

    console.log('[ai-split-suggestions] AI service response:', {
      suggestionCount: splitResponse.suggestions.length,
      splitStrategy: splitResponse.splitStrategy,
    });

    // Validate coverage and generate additional stories if needed
    const { storySplitValidationService } = await import('@/lib/services/story-split-validation.service');
    const validation = storySplitValidationService.validateAllChildren(
      splitResponse.suggestions,
      acceptanceCriteria
    );

    let finalSuggestions = splitResponse.suggestions;
    let totalTokens = splitResponse.usage.totalTokens;

    // If coverage < 100%, generate additional stories for uncovered criteria
    if (validation.coverage.coveragePercentage < 100 && validation.coverage.uncoveredCriteria.length > 0) {
      console.log('[ai-split-suggestions] Coverage incomplete:', {
        coverage: validation.coverage.coveragePercentage,
        uncoveredCount: validation.coverage.uncoveredCriteria.length,
        uncoveredCriteria: validation.coverage.uncoveredCriteria,
      });

      // Generate additional stories to cover the gaps
      const gapFillResponse = await aiService.suggestStorySplit(
        story.title,
        story.description || '',
        validation.coverage.uncoveredCriteria, // Only the uncovered criteria
        story.storyPoints,
        analysis.invest,
        analysis.spidr,
        MODEL, // model parameter
        true // isGapFill flag
      );

      // Add the gap-fill stories to the original suggestions
      finalSuggestions = [...splitResponse.suggestions, ...gapFillResponse.suggestions];
      totalTokens += gapFillResponse.usage.totalTokens;

      console.log('[ai-split-suggestions] Generated additional stories for gaps:', {
        additionalCount: gapFillResponse.suggestions.length,
        totalCount: finalSuggestions.length,
      });

      // Verify we now have 100% coverage
      const finalValidation = storySplitValidationService.validateAllChildren(
        finalSuggestions,
        acceptanceCriteria
      );

      if (finalValidation.coverage.coveragePercentage === 100) {
        console.log('[ai-split-suggestions] ✅ Achieved 100% coverage after gap-fill');
      } else {
        console.warn('[ai-split-suggestions] ⚠️ Still incomplete coverage after gap-fill:', {
          coverage: finalValidation.coverage.coveragePercentage,
        });
      }
    }

    // Track usage
    await incrementTokenUsage(
      context.user.organizationId,
      totalTokens
    );

    // Track in database
    await aiService.trackUsage(
      context.user.id,
      context.user.organizationId,
      splitResponse.model,
      {
        promptTokens: splitResponse.usage.promptTokens + (totalTokens - splitResponse.usage.totalTokens),
        completionTokens: splitResponse.usage.completionTokens,
        totalTokens,
      },
      'story_generation',
      `Split story: ${story.title}`,
      JSON.stringify(finalSuggestions),
      {
        storyId: story.id,
        splitStrategy: splitResponse.splitStrategy,
        suggestionCount: finalSuggestions.length,
        coveragePercentage: validation.coverage.coveragePercentage,
        gapFillUsed: finalSuggestions.length > splitResponse.suggestions.length,
      }
    );

    metrics.increment('ai_story_split_success', 1);

    return NextResponse.json({
      success: true,
      suggestions: finalSuggestions,
      splitStrategy: splitResponse.splitStrategy,
      reasoning: splitResponse.reasoning,
      analysis,
      usage: {
        promptTokens: splitResponse.usage.promptTokens,
        completionTokens: splitResponse.usage.completionTokens,
        totalTokens,
      },
      coverage: validation.coverage.coveragePercentage,
    });
  } catch (error) {
    console.error('[ai-split-suggestions] ===== ERROR =====');
    console.error('[ai-split-suggestions] Error type:', typeof error);
    console.error('[ai-split-suggestions] Error:', error);
    
    if (error instanceof Error) {
      console.error('[ai-split-suggestions] Error.name:', error.name);
      console.error('[ai-split-suggestions] Error.message:', error.message);
      console.error('[ai-split-suggestions] Error.stack:', error.stack);
    }
    
    metrics.increment('ai_story_split_failed', 1);

    const errorMessage = error instanceof Error ? error.message : 'Failed to generate split suggestions';
    const isAIError = errorMessage.includes('AI') || errorMessage.includes('model') || errorMessage.includes('token');
    
    return NextResponse.json(
      {
        error: errorMessage,
        details: isAIError ? 'The AI service encountered an error. Please try again.' : undefined,
        errorType: error instanceof Error ? error.name : 'Unknown',
      },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getAISplitSuggestions);

