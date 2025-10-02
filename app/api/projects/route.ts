import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { ProjectsRepository } from '@/lib/repositories/projects'
import { CreateProjectInput, UpdateProjectInput } from '@/lib/types'

/**
 * GET /api/projects
 * Get all projects for the current user's organization
 */
async function getProjects(req: NextRequest, context: any) {
  const projectsRepo = new ProjectsRepository(context.user)

  try {
    const projects = await projectsRepo.getProjects()
    return NextResponse.json({ success: true, data: projects })
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/projects
 * Create a new project
 */
async function createProject(req: NextRequest, context: any) {
  const projectsRepo = new ProjectsRepository(context.user)

  try {
    const body = await req.json()
    const projectData: CreateProjectInput = {
      name: body.name,
      description: body.description,
      slug: body.slug,
      ownerId: body.ownerId || context.user.id,
    }

    const project = await projectsRepo.createProject(projectData)
    return NextResponse.json({ success: true, data: project }, { status: 201 })
  } catch (error) {
    console.error('Error creating project:', error)

    if (error instanceof Error) {
      if (error.name === 'ValidationError') {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }
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
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
}

export const GET = withAuth(getProjects, { requireOrg: true })
export const POST = withAuth(createProject, { requireOrg: true })

