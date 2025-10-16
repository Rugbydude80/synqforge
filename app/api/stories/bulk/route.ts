import { NextRequest, NextResponse } from 'next/server';
import { withAuth, canModify } from '@/lib/middleware/auth';
import { storiesRepository } from '@/lib/repositories/stories.repository';
import {
  safeValidateBulkCreateStories,
  BulkCreateStoriesInput
} from '@/lib/validations/story';
import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * POST /api/stories/bulk - Create multiple stories at once
 */
async function bulkCreateStories(req: NextRequest, context: { user: any }) {
  try {
    // Check if user can modify stories
    if (!canModify(context.user)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Insufficient permissions to create stories' },
        { status: 403 }
      );
    }

    const body = await req.json();

    // Validate input
    const validationResult = safeValidateBulkCreateStories(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          message: 'Invalid bulk story data',
          details: validationResult.error.issues
        },
        { status: 400 }
      );
    }

    const bulkData = validationResult.data as BulkCreateStoriesInput;

    // Verify project exists and belongs to user's organization
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, bulkData.projectId)
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found', message: 'The specified project does not exist' },
        { status: 404 }
      );
    }

    if (project.organizationId !== context.user.organizationId) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Access denied to this project' },
        { status: 403 }
      );
    }

    // Create all stories
    const createdStories = await storiesRepository.bulkCreate(
      bulkData.stories.map(story => ({
        ...story,
        projectId: bulkData.projectId
      })) as any,
      context.user.id
    );

    return NextResponse.json({
      success: true,
      created: createdStories,
      createdCount: createdStories.length,
      errors: [] // Repository handles individual story errors internally
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error bulk creating stories:', error);

    // Handle specific errors from repository
    if (error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Not found', message: error.message },
        { status: 404 }
      );
    }

    if (error.message.includes('does not belong to')) {
      return NextResponse.json(
        { error: 'Forbidden', message: error.message },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to create stories' },
      { status: 500 }
    );
  }
}

// Export the route handler with authentication
export const POST = withAuth(bulkCreateStories, {
  allowedRoles: ['admin', 'member']
});
