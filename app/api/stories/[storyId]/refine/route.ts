import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/middleware/auth';
import { storiesRepository } from '@/lib/repositories/stories.repository';
import { assertStoryAccessible } from '@/lib/permissions/story-access';
import { openai, MODEL } from '@/lib/ai/client';
import { buildQwenPrompt, getTokenBudget } from '@/lib/ai/prompts-qwen-optimized';
import { SubscriptionTier } from '@/lib/utils/subscription';
import { db } from '@/lib/db';
import { organizations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import {
  NotFoundError,
  AuthorizationError,
  DatabaseError,
  formatErrorResponse,
  isApplicationError
} from '@/lib/errors/custom-errors';

/**
 * POST /api/stories/[storyId]/refine
 * Refine a story using AI to improve its quality based on INVEST principles
 */
async function refineStory(
  req: NextRequest,
  context: AuthContext & { params: { storyId: string } }
) {
  const storyId = context.params.storyId;

  try {
    if (!storyId) {
      return NextResponse.json(
        { error: 'Bad request', message: 'Story ID is required' },
        { status: 400 }
      );
    }

    // Verify story access
    await assertStoryAccessible(storyId, context.user.organizationId);

    // Get the story
    const story = await storiesRepository.getById(storyId);

    if (!story) {
      throw new NotFoundError('Story', storyId);
    }

    // Get organization tier
    const [organization] = await db
      .select({ subscriptionTier: organizations.subscriptionTier })
      .from(organizations)
      .where(eq(organizations.id, context.user.organizationId))
      .limit(1);

    const tier = (organization?.subscriptionTier || 'starter') as SubscriptionTier;

    // Format story for refinement prompt
    const storyText = `Title: ${story.title || ''}
Description: ${story.description || 'N/A'}
Acceptance Criteria:
${Array.isArray(story.acceptanceCriteria) 
  ? story.acceptanceCriteria.map((ac: string, i: number) => `${i + 1}. ${ac}`).join('\n')
  : 'N/A'}
Story Points: ${story.storyPoints || 'Not estimated'}
Priority: ${story.priority || 'Not set'}
Status: ${story.status || 'Not set'}`;

    // Get user request from body if provided
    let userRequest = 'Please refine this story to improve its quality.';
    try {
      const body = await req.json();
      if (body && typeof body === 'object' && 'userRequest' in body) {
        userRequest = body.userRequest || userRequest;
      }
    } catch {
      // Body is optional, use default message
    }

    // Build refinement prompt
    const maxTokens = getTokenBudget(tier, 'medium');
    const prompt = buildQwenPrompt('refinement', {
      tier,
      maxOutputTokens: maxTokens,
      userRequest,
    }, {
      existingStory: storyText,
    });

    // Call AI to refine the story
    const response = await openai.chat.completions.create({
      model: MODEL,
      max_tokens: maxTokens,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in AI response');
    }

    // Return the refined story analysis
    return NextResponse.json({
      success: true,
      refinement: content,
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
      model: MODEL,
    });

  } catch (error: any) {
    console.error('Error refining story:', error);
    console.error('Error stack:', error.stack);

    // Handle custom application errors
    if (isApplicationError(error)) {
      const response = formatErrorResponse(error);
      const { statusCode, ...errorBody } = response;
      return NextResponse.json(errorBody, { status: statusCode });
    }

    // Handle "Story not found" from repository
    if (error.message && error.message.includes('Story not found')) {
      const notFoundError = new NotFoundError('Story', storyId);
      const response = formatErrorResponse(notFoundError);
      const { statusCode, ...errorBody } = response;
      return NextResponse.json(errorBody, { status: statusCode });
    }

    // Handle database errors
    if (error.message && (error.message.includes('database') || error.message.includes('query'))) {
      const dbError = new DatabaseError('Failed to refine story', error instanceof Error ? error : undefined);
      const response = formatErrorResponse(dbError);
      const { statusCode, ...errorBody } = response;
      return NextResponse.json(errorBody, { status: statusCode });
    }

    const isDev = process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'preview';

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: isDev ? error.message : 'Failed to refine story',
        ...(isDev && { stack: error.stack }),
      },
      { status: 500 }
    );
  }
}

export const POST = withAuth(refineStory);

