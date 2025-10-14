import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/middleware/auth';
import { storiesRepository } from '@/lib/repositories/stories.repository';
import { ProjectsRepository } from '@/lib/repositories/projects';
import { EpicsRepository } from '@/lib/repositories/epics';
import { batchCreateStoriesSchema } from '@/lib/validations/ai';
import { z } from 'zod';
import { aiGenerationRateLimit, checkRateLimit, getResetTimeMessage } from '@/lib/rate-limit';
import { checkFeatureLimit } from '@/lib/middleware/subscription';

async function batchCreateStories(req: NextRequest, context: AuthContext) {
  const projectsRepo = new ProjectsRepository(context.user);
  const epicsRepo = new EpicsRepository(context.user);

  try {
    // Parse and validate request body
    const body = await req.json();
    const validatedData = batchCreateStoriesSchema.parse(body);

    const rateLimitResult = await checkRateLimit(
      `ai:batch-create-stories:${context.user.id}`,
      aiGenerationRateLimit
    );

    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);
      return NextResponse.json(
        {
          error: 'Too many AI-assisted operations. Please retry later.',
          retryAfter: getResetTimeMessage(rateLimitResult.reset),
        },
        {
          status: 429,
          headers: { 'Retry-After': retryAfter.toString() },
        }
      );
    }

    // Check story creation limit before batch creating
    const storyLimitCheck = await checkFeatureLimit(context.user, 'story', validatedData.projectId);
    if (!storyLimitCheck.allowed) {
      return NextResponse.json(
        {
          error: storyLimitCheck.error,
          upgradeUrl: storyLimitCheck.upgradeUrl,
        },
        { status: 402 }
      );
    }

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

    // Create all stories
    const createdStories = [];
    const errors = [];

    for (const storyData of validatedData.stories) {
      try {
        const story = await storiesRepository.create({
          projectId: validatedData.projectId,
          epicId: validatedData.epicId,
          title: storyData.title,
          description: storyData.description,
          acceptanceCriteria: storyData.acceptanceCriteria || [],
          priority: storyData.priority,
          storyPoints: storyData.storyPoints ?? undefined,
          status: 'backlog',
        }, context.user.id);

        createdStories.push(story);
      } catch (error) {
        errors.push({
          story: storyData.title,
          error: error instanceof Error ? error.message : 'Failed to create story',
        });
      }
    }

    return NextResponse.json({
      success: true,
      created: createdStories.length,
      total: validatedData.stories.length,
      stories: createdStories,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error('Batch create stories error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create stories',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

export const POST = withAuth(batchCreateStories);
