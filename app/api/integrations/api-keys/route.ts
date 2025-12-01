/**
 * API Keys Management API
 * GET /api/integrations/api-keys - List user's API keys
 * POST /api/integrations/api-keys - Create new API key
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { generateApiKey, listApiKeys } from '@/lib/services/api-key.service'
import { db } from '@/lib/db'
import { users, organizations } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

/**
 * GET /api/integrations/api-keys
 * List user's API keys
 */
export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user and organization
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1)

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const apiKeys = await listApiKeys(user.organizationId, user.id)

    return NextResponse.json({
      data: apiKeys.map((key) => ({
        id: key.id,
        name: key.name,
        description: key.description,
        keyPrefix: key.keyPrefix,
        lastUsedAt: key.lastUsedAt,
        createdAt: key.createdAt,
        expiresAt: key.expiresAt,
        isActive: key.isActive,
        scopes: key.scopes,
      })),
    })
  } catch (error) {
    console.error('Error listing API keys:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/integrations/api-keys
 * Create new API key
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user and organization
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1)

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check subscription tier
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, user.organizationId))
      .limit(1)

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    const allowedTiers = ['pro', 'team', 'enterprise', 'admin']
    if (!allowedTiers.includes(org.subscriptionTier || '')) {
      return NextResponse.json(
        {
          error: 'Subscription Required',
          message: 'API access requires Pro tier or above',
        },
        { status: 402 }
      )
    }

    const body = await req.json()
    const { name, description, scopes } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    if (!scopes || !Array.isArray(scopes) || scopes.length === 0) {
      return NextResponse.json(
        { error: 'At least one scope is required' },
        { status: 400 }
      )
    }

    const result = await generateApiKey({
      organizationId: user.organizationId,
      userId: user.id,
      name,
      description: description || undefined,
      scopes,
    })

    return NextResponse.json({
      data: {
        id: result.record.id,
        name: result.record.name,
        description: result.record.description,
        keyPrefix: result.record.keyPrefix,
        createdAt: result.record.createdAt,
        scopes: result.record.scopes,
      },
      key: result.key, // Only returned once!
    })
  } catch (error) {
    console.error('Error creating API key:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
