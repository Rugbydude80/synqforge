/**
 * AI Story Generation with Claude 4.5 Haiku
 * Cost-controlled, tier-aware story generation
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { HaikuService } from '@/lib/ai/haiku-service'
import { getUsageSummary } from '@/lib/ai/usage-enforcement'
import { db } from '@/lib/db'
import { users, organizations } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import type { SubscriptionTier } from '@/lib/utils/subscription'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { prompt, complexity } = body

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    // Get user and organization
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1)

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, user.organizationId))
      .limit(1)

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const tier = (org.plan || org.subscriptionTier || 'free') as SubscriptionTier

    // Generate story using Haiku
    const response = await HaikuService.generateStory({
      organizationId: org.id,
      userId: user.id,
      tier,
      userRequest: prompt,
      taskComplexity: complexity || 'medium',
    })

    // Get current usage summary
    const usageSummary = await getUsageSummary(org.id)

    return NextResponse.json({
      success: true,
      story: response.content,
      usage: {
        ...response.usage,
        model: response.model,
        cached: response.cached,
        throttled: response.throttled,
      },
      limits: {
        tier: usageSummary.tier,
        currentUsage: usageSummary.currentUsage,
        softLimit: usageSummary.softLimit,
        hardLimit: usageSummary.hardLimit,
        usagePercentage: usageSummary.usagePercentage,
      },
    })
  } catch (error) {
    console.error('Story generation error:', error)

    if (error instanceof Error) {
      // Rate limit or usage limit errors
      if (error.message.includes('limit') || error.message.includes('exceeded')) {
        return NextResponse.json(
          {
            error: error.message,
            type: 'quota_exceeded',
          },
          { status: 429 }
        )
      }

      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ error: 'Failed to generate story' }, { status: 500 })
  }
}

/**
 * GET - Get usage summary
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1)

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const usageSummary = await getUsageSummary(user.organizationId)

    return NextResponse.json({
      success: true,
      usage: usageSummary,
    })
  } catch (error) {
    console.error('Usage summary error:', error)
    return NextResponse.json({ error: 'Failed to get usage summary' }, { status: 500 })
  }
}
