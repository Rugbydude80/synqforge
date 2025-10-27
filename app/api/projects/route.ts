import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { ProjectsRepository } from '@/lib/repositories/projects'
import { CreateProjectInput } from '@/lib/types'
import { canCreateProject, getSubscriptionLimits } from '@/lib/middleware/subscription'
import { db } from '@/lib/db'
import { projects } from '@/lib/db/schema'
import { eq, count } from 'drizzle-orm'

/**
 * GET /api/projects
 * Get all projects for the current user's organization
 */
async function getProjects(_request: NextRequest, context: any) {
  const projectsRepo = new ProjectsRepository(context.user)

  try {
    const projects = await projectsRepo.getProjects()
    return NextResponse.json({ data: projects, total: projects.length })
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
    // Check project limit before creating
    const canCreate = await canCreateProject(context.user)
    if (!canCreate) {
      const limits = await getSubscriptionLimits(context.user)
      
      // Get current project count for error message
      const [result] = await db
        .select({ count: count() })
        .from(projects)
        .where(eq(projects.organizationId, context.user.organizationId))
      const currentCount = result?.count || 0
      
      console.warn('🚫 Project creation blocked - limit reached:', {
        userId: context.user.id,
        organizationId: context.user.organizationId,
        currentCount,
        maxAllowed: limits.maxProjects,
        tier: limits.displayName,
      })
      
      return NextResponse.json(
        {
          error: 'Project limit reached',
          message: `You've reached your project limit (${currentCount}/${limits.maxProjects}). Upgrade to create more projects.`,
          currentTier: limits.displayName,
          currentCount,
          maxAllowed: limits.maxProjects,
          upgradeUrl: '/pricing',
          code: 'PROJECT_LIMIT_REACHED',
        },
        { status: 402 }
      )
    }

    const body = await req.json()
    const projectData: CreateProjectInput = {
      name: body.name,
      key: body.key,
      description: body.description,
      slug: body.slug,
      ownerId: body.ownerId || context.user.id,
    }

    const project = await projectsRepo.createProject(projectData)
    
    console.log('✅ Project created successfully:', {
      projectId: project.id,
      userId: context.user.id,
      organizationId: context.user.organizationId,
    })
    
    return NextResponse.json(project, { status: 201 })
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

export const GET = withAuth(getProjects)
export const POST = withAuth(createProject)


