import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { ProjectsRepository } from '@/lib/repositories/projects'
import { CreateProjectSchema } from '@/lib/types'
import { successResponse, errorResponse } from '@/lib/utils/api-helpers'
import { checkFeatureLimit } from '@/lib/middleware/subscription'

/**
 * GET /api/organizations/[orgId]/projects
 * List all projects for the organization
 */
export const GET = withAuth(
  async (_request: NextRequest, { user }) => {
    try {
      const repository = new ProjectsRepository(user)
      const projects = await repository.getProjects()

      // Transform repository fields to match frontend expectations
      const transformedProjects = projects.map((project: any) => {
        const totalStories = Number(project.storyCount || 0)
        const completedStories = Number(project.completedStoryCount || 0)
        const progressPercentage = totalStories > 0
          ? Math.round((completedStories / totalStories) * 100)
          : 0

        return {
          ...project,
          totalStories,
          completedStories,
          progressPercentage,
          // Keep original fields for backward compatibility if needed
          storyCount: totalStories,
          completedStoryCount: completedStories,
        }
      })

      return successResponse(transformedProjects, { total: transformedProjects.length })
    } catch (error) {
      return errorResponse(error)
    }
  },
  { requireOrg: true }
)

/**
 * POST /api/organizations/[orgId]/projects
 * Create a new project
 */
export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    try {
      console.log('🚀 POST /api/organizations/[orgId]/projects - Start', {
        organizationId: user.organizationId,
        userId: user.id,
        timestamp: new Date().toISOString(),
      })
      
      // Check project creation limit before proceeding
      const limitCheck = await checkFeatureLimit(user, 'project')
      
      console.log('🔒 Limit check result:', {
        allowed: limitCheck.allowed,
        error: limitCheck.error,
        upgradeUrl: limitCheck.upgradeUrl,
      })
      
      if (!limitCheck.allowed) {
        console.error('❌ Project creation blocked - limit reached')
        // Return proper error response for limit exceeded
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'PROJECT_LIMIT_REACHED',
              message: limitCheck.error || 'Project limit reached',
              upgradeUrl: limitCheck.upgradeUrl,
            },
          },
          { status: 402 }
        )
      }
      
      console.log('✅ Limit check passed - proceeding with project creation')

      const body = await req.json()
      const data = CreateProjectSchema.parse(body)

      const repository = new ProjectsRepository(user)
      const project = await repository.createProject(data)

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

      return successResponse(transformedProject, { status: 201 })
    } catch (error) {
      return errorResponse(error)
    }
  },
  { requireOrg: true, allowedRoles: ['admin', 'member'] }
)
