/**
 * Enhanced Story Split API with Add-On Support
 * 
 * Example implementation showing token deduction with add-on credits
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import { checkAllowance, deductTokens } from '@/lib/services/tokenService'
import { validateOperationLimits, getOrganizationContext } from '@/lib/middleware/featureGate'
import { getQuotaExceededPrompt } from '@/lib/config/tiers'
import { v4 as uuidv4 } from 'uuid'

// POST /api/stories/[storyId]/split-enhanced
export async function POST(
  req: NextRequest,
  { params }: { params: { storyId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { storyId } = params
    const body = await req.json()
    const { childrenCount = 2 } = body
    
    // Get organization context for feature gating
    const context = await getOrganizationContext(
      session.user.organizationId,
      session.user.id
    )
    
    if (!context) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }
    
    // Validate operation limits
    const limitValidation = await validateOperationLimits(
      'split',
      context,
      { childrenCount }
    )
    
    if (!limitValidation.valid) {
      return NextResponse.json(
        { error: limitValidation.error },
        { status: 400 }
      )
    }
    
    // Check allowance (includes add-on credits)
    const allowanceCheck = await checkAllowance(
      session.user.organizationId,
      'split',
      session.user.id
    )
    
    if (!allowanceCheck.allowed) {
      // Return quota exceeded with upgrade options
      const upgradePrompt = getQuotaExceededPrompt(
        context.tier,
        allowanceCheck.remaining
      )
      
      return NextResponse.json(
        {
          error: 'quota_exceeded',
          remaining: allowanceCheck.remaining,
          breakdown: allowanceCheck.breakdown,
          ...upgradePrompt,
        },
        { status: 429 }
      )
    }
    
    // Generate correlation ID for idempotency
    const correlationId = uuidv4()
    
    // Deduct tokens (idempotent)
    const deduction = await deductTokens(
      session.user.organizationId,
      'split',
      'story',
      storyId,
      correlationId,
      session.user.id
    )
    
    if (!deduction.success) {
      return NextResponse.json(
        { error: deduction.error || 'Failed to deduct tokens' },
        { status: 400 }
      )
    }
    
    // TODO: Perform actual split operation here
    // const splitResult = await splitStory(storyId, childrenCount)
    
    return NextResponse.json({
      success: true,
      storyId,
      tokensDeducted: deduction.tokensDeducted,
      source: deduction.source,
      balanceAfter: deduction.balanceAfter,
      correlationId: deduction.correlationId,
      message: 'Story split successfully',
    })
  } catch (error) {
    console.error('POST /api/stories/[storyId]/split-enhanced error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

