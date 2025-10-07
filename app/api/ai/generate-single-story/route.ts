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
    console.log('Request body:', body);

    const validatedData = generateSingleStorySchema.parse(body);
    console.log('Validated data:', validatedData);

    // Generate a single story using AI
    console.log('Calling AI service...');
    const stories = await aiService.generateStories(
      validatedData.requirement,
      validatedData.projectContext,
      1, // Generate only 1 story
      'claude-sonnet-4-5-20250929'
    );
    console.log('AI response received:', stories);

    if (!stories || stories.length === 0) {
      console.error('AI returned empty stories array');
      return NextResponse.json(
        { error: 'AI failed to generate a valid story. Please try again with a more detailed requirement.' },
        { status: 500 }
      );
    }

    const story = stories[0];
    console.log('Story to return:', story);

    // Track AI usage
    await aiService.trackUsage(
      context.user.id,
      context.user.organizationId,
      'claude-sonnet-4-5-20250929',
      { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
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
