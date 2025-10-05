import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { storiesRepository } from '@/lib/repositories/stories.repository';
import {
  safeValidateProjectStats
} from '@/lib/validations/story';
import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/stories/stats - Get project statistics for stories
 */
async function getProjectStats(req: NextRequest, context: { user: any }) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Bad request', message: 'Project ID is required as query parameter' },
        { status: 400 }
      );
    }

    // Validate input
    const validationResult = safeValidateProjectStats({ projectId });

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          message: 'Invalid project ID',
          details: validationResult.error.issues
        },
        { status: 400 }
      );
    }

    // Verify project exists and belongs to user's organization
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId)
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

    // Get project statistics
    const stats = await storiesRepository.getProjectStats(projectId);

    return NextResponse.json(stats);

  } catch (error: any) {
    console.error('Error fetching project stats:', error);

    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch project statistics' },
      { status: 500 }
    );
  }
}

// Export the route handler with authentication
export const GET = withAuth(getProjectStats, {
  allowedRoles: ['admin', 'member', 'viewer']
});
