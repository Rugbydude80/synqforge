import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/middleware/auth';
import { StoriesRepository } from '@/lib/repositories/stories';
import { storySplitAnalysisService } from '@/lib/services/story-split-analysis.service';
import { aiService } from '@/lib/services/ai.service';
import { aiGenerationRateLimit, checkRateLimit, getResetTimeMessage } from '@/lib/rate-limit';
import { canUseAI, incrementTokenUsage } from '@/lib/billing/fair-usage-guards';
import { AI_TOKEN_COSTS } from '@/lib/constants';
import { metrics } from '@/lib/observability/metrics';

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
    const aiCheck = await canUseAI(context.user.organizationId, estimatedTokens);

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

    // Check if story should be split
    if (!analysis.splittingRecommended) {
      return NextResponse.json(
        {
          error: 'AI suggests this story does not need splitting',
          analysis,
        },
        { status: 400 }
      );
    }

    metrics.increment('ai_story_split_requested', 1);

    // Get AI suggestions
    const acceptanceCriteria = Array.isArray(story.acceptanceCriteria)
      ? story.acceptanceCriteria
      : story.acceptanceCriteria
      ? [story.acceptanceCriteria]
      : [];

    const splitResponse = await aiService.suggestStorySplit(
      story.title,
      story.description || '',
      acceptanceCriteria,
      story.storyPoints,
      analysis.invest,
      analysis.spidr
    );

    // Track usage
    await incrementTokenUsage(
      context.user.organizationId,
      splitResponse.usage.totalTokens
    );

    // Track in database
    await aiService.trackUsage(
      context.user.id,
      context.user.organizationId,
      splitResponse.model,
      splitResponse.usage,
      'story_generation',
      `Split story: ${story.title}`,
      JSON.stringify(splitResponse.suggestions),
      {
        storyId: story.id,
        splitStrategy: splitResponse.splitStrategy,
        suggestionCount: splitResponse.suggestions.length,
      }
    );

    metrics.increment('ai_story_split_success', 1);

    return NextResponse.json({
      success: true,
      suggestions: splitResponse.suggestions,
      splitStrategy: splitResponse.splitStrategy,
      reasoning: splitResponse.reasoning,
      analysis,
      usage: splitResponse.usage,
    });
  } catch (error) {
    console.error('AI split suggestions failed:', error);
    
    metrics.increment('ai_story_split_failed', 1);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate split suggestions',
      },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getAISplitSuggestions);

