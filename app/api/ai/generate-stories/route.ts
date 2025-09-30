import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { openRouterService } from '@/lib/services/openrouter.service';
import { projectsRepository } from '@/lib/repositories/projects.repository';
import { epicsRepository } from '@/lib/repositories/epics.repository';
import { generateStoriesSchema } from '@/lib/validations/ai';
import { z } from 'zod';

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validatedData = generateStoriesSchema.parse(body);

    // Verify user has access to the project
    const project = await projectsRepository.getById(
      validatedData.projectId,
      session.user.id
    );

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    // If epicId provided, verify it exists and belongs to the project
    if (validatedData.epicId) {
      const epic = await epicsRepository.getById(
        validatedData.epicId,
        session.user.id
      );

      if (!epic || epic.projectId !== validatedData.projectId) {
        return NextResponse.json(
          { error: 'Epic not found or does not belong to this project' },
          { status: 404 }
        );
      }
    }

    // Generate stories using AI
    const stories = await openRouterService.generateStories(
      validatedData.requirements,
      validatedData.context
    );

    return NextResponse.json({
      success: true,
      stories,
      count: stories.length,
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
