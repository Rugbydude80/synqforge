import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/middleware/auth';
import { aiService } from '@/lib/services/ai.service';
import { ProjectsRepository } from '@/lib/repositories/projects';
import { EpicsRepository } from '@/lib/repositories/epics';
import { generateStoriesSchema } from '@/lib/validations/ai';
import { z } from 'zod';

async function generateStories(req: NextRequest, context: AuthContext) {
  const projectsRepo = new ProjectsRepository(context.user);
  const epicsRepo = new EpicsRepository(context.user);

  try {
    // Parse and validate request body
    const body = await req.json();
    const validatedData = generateStoriesSchema.parse(body);

    // Verify user has access to the project
    const project = await projectsRepo.getProjectById(validatedData.projectId);

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    // If epicId provided, verify it exists and belongs to the project
    if (validatedData.epicId) {
      const epic = await epicsRepo.getEpicById(validatedData.epicId);

      if (!epic || epic.projectId !== validatedData.projectId) {
        return NextResponse.json(
          { error: 'Epic not found or does not belong to this project' },
          { status: 404 }
        );
      }
    }

    // Generate stories using AI
    const response = await aiService.generateStories(
      validatedData.requirements,
      validatedData.projectContext,
      5
    );

    // Track AI usage with real token data
    await aiService.trackUsage(
      context.user.id,
      context.user.organizationId,
      response.model,
      response.usage,
      'story_generation',
      validatedData.requirements,
      JSON.stringify(response.stories)
    );

    return NextResponse.json({
      success: true,
      stories: response.stories,
      count: response.stories.length,
      usage: response.usage,
    });

  } catch (error) {
    console.error('Generate stories error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate stories',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

export const POST = withAuth(generateStories);
