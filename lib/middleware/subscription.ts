/**
 * Subscription middleware to check user's subscription tier
 * and enforce feature limits
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { organizations, projects, stories } from '@/lib/db/schema'
import { eq, count } from 'drizzle-orm'
import type { UserContext } from './auth'

export interface SubscriptionLimits {
  maxProjects: number
  maxStoriesPerProject: number
  canExport: boolean
  canUseAdvancedAI: boolean
  canUseTemplates: boolean
}

const TIER_LIMITS: Record<string, SubscriptionLimits> = {
  free: {
    maxProjects: 1,
    maxStoriesPerProject: 50,
    canExport: false,
    canUseAdvancedAI: false,
    canUseTemplates: false,
  },
  pro: {
    maxProjects: Infinity,
    maxStoriesPerProject: Infinity,
    canExport: true,
    canUseAdvancedAI: true,
    canUseTemplates: true,
  },
  enterprise: {
    maxProjects: Infinity,
    maxStoriesPerProject: Infinity,
    canExport: true,
    canUseAdvancedAI: true,
    canUseTemplates: true,
  },
}

/**
 * Get subscription limits for a user's organization
 */
export async function getSubscriptionLimits(
  user: UserContext
): Promise<SubscriptionLimits> {
  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, user.organizationId))
    .limit(1)

  if (!organization || !organization.subscriptionTier) {
    return TIER_LIMITS.free
  }

  return TIER_LIMITS[organization.subscriptionTier] || TIER_LIMITS.free
}

/**
 * Check if user can create a new project
 */
export async function canCreateProject(user: UserContext): Promise<boolean> {
  const limits = await getSubscriptionLimits(user)

  if (limits.maxProjects === Infinity) {
    return true
  }

  const [result] = await db
    .select({ count: count() })
    .from(projects)
    .where(eq(projects.organizationId, user.organizationId))

  return (result?.count || 0) < limits.maxProjects
}

/**
 * Check if user can create a new story in a project
 */
export async function canCreateStory(
  user: UserContext,
  projectId: string
): Promise<boolean> {
  const limits = await getSubscriptionLimits(user)

  if (limits.maxStoriesPerProject === Infinity) {
    return true
  }

  const [result] = await db
    .select({ count: count() })
    .from(stories)
    .where(eq(stories.projectId, projectId))

  return (result?.count || 0) < limits.maxStoriesPerProject
}

/**
 * Check if user can export data
 */
export async function canExport(user: UserContext): Promise<boolean> {
  const limits = await getSubscriptionLimits(user)
  return limits.canExport
}

/**
 * Middleware wrapper to require specific subscription tier
 */
export function requireSubscription(requiredTier: 'pro' | 'enterprise') {
  return async (handler: Function) => {
    return async (req: Request, context: any) => {
      const user: UserContext = context.user

      if (!user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }

      const [organization] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, user.organizationId))
        .limit(1)

      if (!organization) {
        return NextResponse.json(
          { error: 'Organization not found' },
          { status: 404 }
        )
      }

      const currentTier = organization.subscriptionTier || 'free'

      // Check if current tier meets requirement
      const tierHierarchy = ['free', 'pro', 'enterprise']
      const currentTierIndex = tierHierarchy.indexOf(currentTier)
      const requiredTierIndex = tierHierarchy.indexOf(requiredTier)

      if (currentTierIndex < requiredTierIndex) {
        return NextResponse.json(
          {
            error: 'Subscription upgrade required',
            requiredTier,
            currentTier,
            upgradeUrl: '/pricing',
          },
          { status: 403 }
        )
      }

      return handler(req, context)
    }
  }
}

/**
 * Check feature limits and return appropriate error response
 */
export async function checkFeatureLimit(
  user: UserContext,
  feature: 'project' | 'story' | 'export',
  projectId?: string
): Promise<{ allowed: boolean; error?: string }> {
  switch (feature) {
    case 'project': {
      const allowed = await canCreateProject(user)
      return {
        allowed,
        error: allowed
          ? undefined
          : 'Project limit reached. Upgrade to Pro for unlimited projects.',
      }
    }

    case 'story': {
      if (!projectId) {
        return { allowed: false, error: 'Project ID required' }
      }
      const allowed = await canCreateStory(user, projectId)
      return {
        allowed,
        error: allowed
          ? undefined
          : 'Story limit reached for this project. Upgrade to Pro for unlimited stories.',
      }
    }

    case 'export': {
      const allowed = await canExport(user)
      return {
        allowed,
        error: allowed
          ? undefined
          : 'Export feature requires Pro subscription.',
      }
    }

    default:
      return { allowed: false, error: 'Unknown feature' }
  }
}
