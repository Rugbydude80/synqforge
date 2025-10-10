import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/middleware/auth';
import { aiService } from '@/lib/services/ai.service';
import { ProjectsRepository } from '@/lib/repositories/projects';
import { NotFoundError, ForbiddenError } from '@/lib/types';
import { z } from 'zod';
import { aiGenerationRateLimit, checkRateLimit, getResetTimeMessage } from '@/lib/rate-limit';

const generateSingleStorySchema = z.object({
  requirement: z
    .string()
    .min(10, 'Requirement must be at least 10 characters')
    .max(2000, 'Requirement must be under 2,000 characters'),
  projectId: z.string().min(1, 'Project ID is required'),
  projectContext: z
    .string()
    .max(2000, 'Project context must be under 2,000 characters')
    .optional(),
});

async function generateSingleStory(req: NextRequest, context: AuthContext) {
  const projectsRepo = new ProjectsRepository(context.user);

  try {
    // Parse and validate request body
    const body = await req.json();
    const validatedData = generateSingleStorySchema.parse(body);

    const rateLimitResult = await checkRateLimit(
      `ai:generate-single-story:${context.user.id}`,
      aiGenerationRateLimit
    );

    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please slow down.',
          retryAfter: getResetTimeMessage(rateLimitResult.reset),
        },
        {
          status: 429,
          headers: { 'Retry-After': retryAfter.toString() },
        }
      );
    }

    try {
      await projectsRepo.getProjectById(validatedData.projectId);
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ForbiddenError) {
        return NextResponse.json(
          { error: 'Project not found or access denied' },
          { status: 404 }
        );
      }
      throw error;
    }

    // Generate a single story using AI
    let response;
    try {
      response = await aiService.generateStories(
        validatedData.requirement,
        validatedData.projectContext,
        1, // Generate only 1 story
        'claude-sonnet-4-5-20250929'
      );
    } catch (aiError) {
      console.error('AI generation error:', aiError);
      return NextResponse.json(
        { 
          error: 'AI service error. Please try again.',
          details: process.env.NODE_ENV === 'development' ? (aiError instanceof Error ? aiError.message : String(aiError)) : undefined
        },
        { status: 500 }
      );
    }

    if (!response.stories || response.stories.length === 0) {
      console.error('No stories generated from AI response');
      return NextResponse.json(
        { 
          error: 'AI failed to generate a valid story. Please try again with a more detailed requirement.',
          hint: 'Try providing more context about the feature or user need.'
        },
        { status: 500 }
      );
    }

    const story = response.stories[0];

    // Track AI usage with real token data
    await aiService.trackUsage(
      context.user.id,
      context.user.organizationId,
      response.model,
      response.usage,
      'story_generation',
      validatedData.requirement,
      JSON.stringify(story)
    );

    return NextResponse.json({
      success: true,
      story,
    });

  } catch (error) {
    console.error('Generate single story error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    // Check if it's an API key error
    if (error instanceof Error && error.message.includes('ANTHROPIC_API_KEY')) {
      return NextResponse.json(
        { error: 'AI service is not configured. Please contact support.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate story',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

export const POST = withAuth(generateSingleStory);
