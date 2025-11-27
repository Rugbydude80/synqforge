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
    
    console.log(`[API] Received ${projects.length} projects from repository`)
    
    // Transform repository fields to match frontend expectations
    const transformedProjects = projects.map((project: any) => {
      // Ensure we're working with numbers, handle BigInt or string values
      const totalStories = Number(project.storyCount ?? 0)
      const completedStories = Number(project.completedStoryCount ?? 0)
      const totalEpics = Number(project.epicCount ?? 0)
      const progressPercentage = totalStories > 0
        ? Math.round((completedStories / totalStories) * 100)
        : 0

      // Log for debugging - always log first project
      if (project.id === projects[0]?.id) {
        console.log(`[API] Transforming project ${project.id} (${project.name}):`, {
          raw: {
            storyCount: project.storyCount,
            completedStoryCount: project.completedStoryCount,
            epicCount: project.epicCount,
          },
          transformed: {
            totalStories,
            completedStories,
            totalEpics,
            progressPercentage,
          },
        })
      }

      return {
        ...project,
        totalStories,
        completedStories,
        totalEpics,
        progressPercentage,
        // Keep original fields for backward compatibility if needed
        storyCount: totalStories,
        completedStoryCount: completedStories,
        epicCount: totalEpics,
      }
    })
    
    // Log final response
    console.log(`[API] Returning ${transformedProjects.length} projects`)
    if (transformedProjects.length > 0) {
      const sample = transformedProjects[0]
      console.log(`[API] Sample final project:`, {
        id: sample.id,
        name: sample.name,
        totalStories: sample.totalStories,
        completedStories: sample.completedStories,
        totalEpics: sample.totalEpics,
      })
    }
    
    return NextResponse.json(
      { data: transformedProjects, total: transformedProjects.length },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    )
  } catch (error) {
    console.error('Error fetching projects:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { 
        error: 'Failed to fetch projects',
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
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
      clientId: body.clientId || undefined,
    }

    const project = await projectsRepo.createProject(projectData)
    
    console.log('✅ Project created successfully:', {
      projectId: project.id,
      userId: context.user.id,
      organizationId: context.user.organizationId,
    })
    
    // Transform repository fields to match frontend expectations
    const totalStories = Number((project as any).storyCount || 0)
    const completedStories = Number((project as any).completedStoryCount || 0)
    const totalEpics = Number((project as any).epicCount || 0)
    const progressPercentage = totalStories > 0
      ? Math.round((completedStories / totalStories) * 100)
      : 0

    const transformedProject = {
      ...project,
      totalStories,
      completedStories,
      totalEpics,
      progressPercentage,
      // Keep original fields for backward compatibility if needed
      storyCount: totalStories,
      completedStoryCount: completedStories,
      epicCount: totalEpics,
    }
    
    return NextResponse.json(transformedProject, { status: 201 })
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


