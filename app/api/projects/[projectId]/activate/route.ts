import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { ProjectsRepository } from '@/lib/repositories/projects'

/**
 * POST /api/projects/[projectId]/activate
 * Mark a project as active
 */
async function activateProject(req: NextRequest, context: any) {
  const projectsRepo = new ProjectsRepository(context.user)

  try {
    const projectId = req.nextUrl.pathname.split('/')[3]

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    // Update project status to active
    const updatedProject = await projectsRepo.updateProject(projectId, {
      status: 'active'
    })

    return NextResponse.json({
      success: true,
      message: 'Project marked as active',
      project: updatedProject
    })
  } catch (error) {
    console.error('Error activating project:', error)

    if (error instanceof Error) {
      if (error.name === 'NotFoundError') {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        )
      }
      if (error.name === 'ForbiddenError') {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to activate project' },
      { status: 500 }
    )
  }
}

export const POST = withAuth(activateProject)
