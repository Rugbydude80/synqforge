import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { users, projects, projectMembers } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export interface AuthContext {
  user: UserContext
  params: any
}

export interface UserContext {
  id: string
  email: string
  name: string | null
  organizationId: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  isActive: boolean
}

export interface AuthOptions {
  requireOrg?: boolean
  requireAdmin?: boolean
  requireProject?: boolean
  allowedRoles?: Array<'owner' | 'admin' | 'member' | 'viewer'>
}

/**
 * Authentication middleware for API routes
 * Wraps route handlers with authentication and authorization checks
 */
export function withAuth<T extends Record<string, string> = Record<string, string>>(
  handler: (req: NextRequest, context: AuthContext) => Promise<Response>,
  options: AuthOptions = {}
): (req: NextRequest, context: { params: Promise<T> }) => Promise<Response> {
  return async (req: NextRequest, context: { params: Promise<T> }) => {
    try {
      // Get session from NextAuth
      const session = await auth()
      
      if (!session || !session.user) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Authentication required' },
          { status: 401 }
        )
      }

      // Validate session user has required fields
      if (!session.user.id) {
        return NextResponse.json(
          { error: 'Invalid session', message: 'User ID not found in session' },
          { status: 401 }
        )
      }

      // Get full user context from database
      const userContext = await getUserContext(session.user.id)
      
      if (!userContext) {
        return NextResponse.json(
          { error: 'User not found', message: 'User account not found' },
          { status: 404 }
        )
      }

      if (!userContext.isActive) {
        return NextResponse.json(
          { error: 'Account disabled', message: 'Your account has been disabled' },
          { status: 403 }
        )
      }

      // Check organization access if required
      if (options.requireOrg) {
        // Check if orgId is in the URL path (for /api/organizations/[orgId]/... routes)
        const orgId = extractOrgId(req)
        
        // If orgId exists in URL, verify it matches user's org
        if (orgId && userContext.organizationId !== orgId) {
          return NextResponse.json(
            { error: 'Forbidden', message: 'Access denied to this organization' },
            { status: 403 }
          )
        }
        
        // Otherwise, just ensure user has an organization
        if (!userContext.organizationId) {
          return NextResponse.json(
            { error: 'Forbidden', message: 'No organization associated with your account' },
            { status: 403 }
          )
        }
      }

      // Check project access if required
      if (options.requireProject) {
        const projectId = extractProjectId(req)
        if (projectId) {
          const hasAccess = await verifyProjectAccess(projectId, userContext.organizationId, userContext.id)
          if (!hasAccess) {
            return NextResponse.json(
              { error: 'Forbidden', message: 'Access denied to this project' },
              { status: 403 }
            )
          }
        }
      }

      // Check role-based access
      if (options.requireAdmin && userContext.role !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden', message: 'Admin access required' },
          { status: 403 }
        )
      }

      if (options.allowedRoles && !options.allowedRoles.includes(userContext.role)) {
        return NextResponse.json(
          { error: 'Forbidden', message: 'Insufficient permissions' },
          { status: 403 }
        )
      }

      // Resolve params (Next.js 15 async params)
      const params: T = await context.params

      // Call the actual route handler with context
      return await handler(req, { user: userContext, params })
      
    } catch (error) {
      console.error('Auth middleware error:', error)
      return NextResponse.json(
        { error: 'Internal server error', message: 'An error occurred during authentication' },
        { status: 500 }
      )
    }
  }
}

/**
 * Get user context from database with caching
 */
async function getUserContext(userId: string): Promise<UserContext | null> {
  try {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        organizationId: users.organizationId,
        role: users.role,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (!user) return null

    return {
      ...user,
      role: user.role || 'viewer',
      isActive: user.isActive ?? true,
    }
  } catch (error) {
    console.error('Error fetching user context:', error)
    return null
  }
}

/**
 * Extract organization ID from URL path
 */
function extractOrgId(req: NextRequest): string | null {
  const pathParts = req.nextUrl.pathname.split('/')
  const orgIndex = pathParts.indexOf('organizations') + 1
  return pathParts[orgIndex] || null
}

/**
 * Extract project ID from URL path
 */
function extractProjectId(req: NextRequest): string | null {
  const pathParts = req.nextUrl.pathname.split('/')
  const projectIndex = pathParts.indexOf('projects') + 1
  return pathParts[projectIndex] || null
}

/**
 * Verify user has access to a project
 * CRITICAL FIX: Checks project-level permissions
 */
export async function verifyProjectAccess(
  projectId: string,
  organizationId: string,
  userId?: string
): Promise<boolean> {
  try {
    // First verify project exists and belongs to organization
    const [project] = await db
      .select({ id: projects.id, ownerId: projects.ownerId })
      .from(projects)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.organizationId, organizationId)
        )
      )
      .limit(1)

    if (!project) {
      return false
    }

    // If userId provided, check project-level permissions
    if (userId) {
      // Check if user is project owner
      if (project.ownerId === userId) {
        return true
      }

      // Check if user is organization admin/owner (they have access to all projects)
      const [user] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)

      if (user && (user.role === 'admin' || user.role === 'owner')) {
        return true
      }

      // Check project membership
      const [projectMember] = await db
        .select()
        .from(projectMembers)
        .where(
          and(
            eq(projectMembers.projectId, projectId),
            eq(projectMembers.userId, userId)
          )
        )
        .limit(1)

      return !!projectMember
    }

    // If no userId provided, just check project exists (backward compatibility)
    return true
  } catch (error) {
    console.error('Error verifying project access:', error)
    return false
  }
}

/**
 * Helper to check if user can modify resources (admin or member)
 */
export function canModify(userContext: UserContext): boolean {
  return userContext.role === 'admin' || userContext.role === 'member'
}

/**
 * Helper to check if user is viewer only
 */
export function isViewer(userContext: UserContext): boolean {
  return userContext.role === 'viewer'
}
