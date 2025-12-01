import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/lib/middleware/auth'
import { ProjectsRepository } from '@/lib/repositories/projects'
import { formatErrorResponse, isApplicationError } from '@/lib/errors/custom-errors'
import { ValidationError, NotFoundError, AuthorizationError } from '@/lib/errors/custom-errors'

/**
 * POST /api/projects/[projectId]/activate
 * Mark a project as active
 */
async function activateProject(req: NextRequest, context: AuthContext & { params: { projectId: string } }) {
  const projectsRepo = new ProjectsRepository(context.user)

  try {
    const { projectId } = context.params

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
    
    if (isApplicationError(error)) {
      const response = formatErrorResponse(error)
      const { statusCode, ...errorBody } = response
      return NextResponse.json(errorBody, { status: statusCode })
    }
    
    const response = formatErrorResponse(error)
    const { statusCode, ...errorBody } = response
    return NextResponse.json(errorBody, { status: statusCode })
  }
}

export const POST = withAuth(activateProject)
