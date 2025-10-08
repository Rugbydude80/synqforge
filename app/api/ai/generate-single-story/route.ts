import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/middleware/auth';
import { aiService } from '@/lib/services/ai.service';
import { z } from 'zod';

const generateSingleStorySchema = z.object({
  requirement: z.string().min(10, 'Requirement must be at least 10 characters'),
  projectId: z.string().min(1, 'Project ID is required'),
  projectContext: z.string().optional(),
});

async function generateSingleStory(req: NextRequest, context: AuthContext) {
  try {
    // Parse and validate request body
    const body = await req.json();
    const validatedData = generateSingleStorySchema.parse(body);

    // Generate a single story using AI
    const response = await aiService.generateStories(
      validatedData.requirement,
      validatedData.projectContext,
      1, // Generate only 1 story
      'claude-sonnet-4-5-20250929'
    );

    if (!response.stories || response.stories.length === 0) {
      return NextResponse.json(
        { error: 'AI failed to generate a valid story. Please try again with a more detailed requirement.' },
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
