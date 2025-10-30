import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getTokenBalance } from '@/lib/services/ai-usage.service'

/**
 * GET /api/billing/confirm-tokens
 * 
 * Confirm that tokens are available for an organization.
 * Used to poll for tokens after purchase to handle race conditions.
 * 
 * Query params:
 * - organizationId: Organization ID (required)
 * - expectedTokens: Minimum tokens expected (optional, defaults to 1)
 * 
 * Returns:
 * - available: boolean - Whether tokens are available
 * - balance: number - Current token balance
 * - expectedTokens: number - Expected tokens
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

    const { searchParams } = req.nextUrl
    const organizationId = searchParams.get('organizationId')
    const expectedTokensStr = searchParams.get('expectedTokens')

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Missing organizationId parameter' },
        { status: 400 }
      )
    }

    const expectedTokens = expectedTokensStr ? parseInt(expectedTokensStr, 10) : 1

    if (isNaN(expectedTokens) || expectedTokens < 0) {
      return NextResponse.json(
        { error: 'Invalid expectedTokens parameter' },
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

    // Get token balance
    const balance = await getTokenBalance(organizationId)

    return NextResponse.json({
      available: balance >= expectedTokens,
      balance,
      expectedTokens,
      organizationId,
    })
  } catch (error) {
    console.error('Error confirming tokens:', error)

    return NextResponse.json(
      { error: 'Failed to confirm tokens' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/billing/confirm-tokens
 * 
 * Confirm tokens with polling support.
 * 
 * Body:
 * - organizationId: Organization ID (required)
 * - expectedTokens: Minimum tokens expected (optional, defaults to 1)
 * - maxAttempts: Maximum polling attempts (optional, defaults to 10)
 * - delayMs: Delay between attempts in milliseconds (optional, defaults to 200)
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

    const body = await req.json()
    const { organizationId, expectedTokens = 1, maxAttempts = 10, delayMs = 200 } = body

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Missing organizationId' },
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

    // Poll for tokens
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const balance = await getTokenBalance(organizationId)

      if (balance >= expectedTokens) {
        return NextResponse.json({
          success: true,
          available: true,
          balance,
          expectedTokens,
          attempts: attempt + 1,
          organizationId,
        })
      }

      if (attempt < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    }

    // Timed out
    const finalBalance = await getTokenBalance(organizationId)
    return NextResponse.json({
      success: false,
      available: false,
      balance: finalBalance,
      expectedTokens,
      attempts: maxAttempts,
      organizationId,
      message: 'Tokens not available after polling timeout',
    })
  } catch (error) {
    console.error('Error confirming tokens:', error)

    return NextResponse.json(
      { error: 'Failed to confirm tokens' },
      { status: 500 }
    )
  }
}

