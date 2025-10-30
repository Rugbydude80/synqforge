import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { db } from '@/lib/db'
import { organizations, users, projects, stories } from '@/lib/db/schema'
import { eq, and, gte, sql } from 'drizzle-orm'
import { getUsageSummary } from '@/lib/billing/guards'
import { getUsageSummary as getFairUsageSummary } from '@/lib/billing/fair-usage-guards'
import { isSuperAdmin } from '@/lib/auth/super-admin'

/**
 * GET /api/billing/usage?organizationId=xxx
 * Get current usage and entitlements for an organization
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const organizationId = req.nextUrl.searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Missing organizationId parameter' },
        { status: 400 }
      )
    }

    // Verify user belongs to organization
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1)

    if (!user || user.organizationId !== organizationId) {
      return NextResponse.json(
        { error: 'Unauthorized: User does not belong to organization' },
        { status: 403 }
      )
    }

    // Get organization with entitlements
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1)

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Count current seats (active users in organization)
    const [seatCount] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(users)
      .where(
        and(
          eq(users.organizationId, organizationId),
          eq(users.isActive, true)
        )
      )

    const currentSeats = seatCount?.count || 0

    // Count current projects
    const [projectCount] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(projects)
      .where(eq(projects.organizationId, organizationId))

    const currentProjects = projectCount?.count || 0

    // Count stories created this month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const [storyCount] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(stories)
      .where(
        and(
          eq(stories.organizationId, organizationId),
          gte(stories.createdAt, startOfMonth)
        )
      )

    const storiesThisMonth = storyCount?.count || 0

    // Get AI tokens used this month
    // This would integrate with your AI metering service
    const { getUsageMetering } = await import('@/lib/services/ai-metering.service')
    const aiUsage = await getUsageMetering(organizationId)
    const tokensThisMonth = aiUsage?.tokensUsed || 0

    // 🔓 SUPER ADMIN OVERRIDE - Show unlimited limits for super admins
    const isSuperAdminUser = isSuperAdmin(user.email)
    if (isSuperAdminUser) {
      console.log(`🔓 Super Admin detected (${user.email}) - showing unlimited limits`)
    }

    // Build entitlements object for guards
    const workspace = {
      seatsIncluded: isSuperAdminUser ? 999999 : organization.seatsIncluded,
      projectsIncluded: isSuperAdminUser ? 999999 : organization.projectsIncluded,
      storiesPerMonth: isSuperAdminUser ? 999999 : organization.storiesPerMonth,
      aiTokensIncluded: isSuperAdminUser ? 999999999 : organization.aiTokensIncluded,
      advancedAi: isSuperAdminUser ? true : organization.advancedAi,
      exportsEnabled: isSuperAdminUser ? true : organization.exportsEnabled,
      templatesEnabled: isSuperAdminUser ? true : organization.templatesEnabled,
      rbacLevel: isSuperAdminUser ? 'enterprise' : organization.rbacLevel,
      auditLevel: isSuperAdminUser ? 'full' : organization.auditLevel,
      ssoEnabled: isSuperAdminUser ? true : organization.ssoEnabled,
      supportTier: isSuperAdminUser ? 'priority' : organization.supportTier,
      fairUse: isSuperAdminUser ? false : organization.fairUse,
    }

    // Get usage checks
    const usageSummary = getUsageSummary(workspace, {
      seats: currentSeats,
      projects: currentProjects,
      storiesThisMonth,
      tokensThisMonth,
    })

    // Get fair-usage summary (token-based and doc ingestion limits)
    const fairUsage = await getFairUsageSummary(organizationId)

    return NextResponse.json({
      organization: {
        id: organization.id,
        name: organization.name,
        plan: isSuperAdminUser ? 'Super Admin' : organization.plan,
        planCycle: organization.planCycle,
        subscriptionStatus: isSuperAdminUser ? 'active' : organization.subscriptionStatus,
        subscriptionRenewalAt: organization.subscriptionRenewalAt,
        isSuperAdmin: isSuperAdminUser,
      },
      entitlements: workspace,
      usage: usageSummary,
      fairUsage: {
        tokens: fairUsage.tokens,
        docs: fairUsage.docs,
        billingPeriod: fairUsage.billingPeriod,
      },
      currentUsage: {
        seats: currentSeats,
        projects: currentProjects,
        storiesThisMonth,
        tokensThisMonth,
      },
    })
  } catch (error) {
    console.error('Error fetching usage:', error)

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch usage' },
      { status: 500 }
    )
  }
}
