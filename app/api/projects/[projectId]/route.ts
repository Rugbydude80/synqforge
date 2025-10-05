import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { ProjectsRepository } from '@/lib/repositories/projects'
import type { UpdateProjectInput } from '@/lib/types'

/**
 * GET /api/projects/[projectId]
 * Get a specific project by ID
 */
async function getProject(_req: NextRequest, context: any) {
  const projectsRepo = new ProjectsRepository(context.user)
  const { projectId } = context.params

  try {
    const project = await projectsRepo.getProjectById(projectId)
    return NextResponse.json({ success: true, data: project })
  } catch (error) {
    console.error('Error fetching project:', error)

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
      { error: 'Failed to fetch project' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/projects/[projectId]
 * Update a specific project
 */
async function updateProject(req: NextRequest, context: any) {
  const projectsRepo = new ProjectsRepository(context.user)
  const { projectId } = context.params

  try {
    const body = await req.json()
    const updateData: UpdateProjectInput = {}

    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.slug !== undefined) updateData.slug = body.slug
    if (body.status !== undefined) updateData.status = body.status
    if (body.ownerId !== undefined) updateData.ownerId = body.ownerId
    if (body.settings !== undefined) updateData.settings = body.settings

    const project = await projectsRepo.updateProject(projectId, updateData)
    return NextResponse.json({ success: true, data: project })
  } catch (error) {
    console.error('Error updating project:', error)

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
      if (error.name === 'ConflictError') {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/projects/[projectId]
 * Delete a specific project
 */
async function deleteProject(_req: NextRequest, context: any) {
  const projectsRepo = new ProjectsRepository(context.user)
  const { projectId } = context.params

  try {
    const result = await projectsRepo.deleteProject(projectId)
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Error deleting project:', error)

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
      if (error.name === 'ConflictError') {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    )
  }
}

export const GET = withAuth(getProject)
export const PUT = withAuth(updateProject)
export const DELETE = withAuth(deleteProject)