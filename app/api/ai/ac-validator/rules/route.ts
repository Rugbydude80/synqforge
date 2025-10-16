import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { withFeatureAndRoleGate } from '@/lib/middleware/feature-gate'
import {
  getValidationRules,
  saveValidationRules,
  resetValidationRules,
} from '@/lib/services/ac-validator.service'

/**
 * GET /api/ai/ac-validator/rules
 * Get validation rules for the organization
 */
async function getRules(req: NextRequest, context: any) {
  try {
    const rules = await getValidationRules(context.user.organizationId)
    return NextResponse.json({ rules })
  } catch (error: any) {
    console.error('Error fetching validation rules:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch validation rules' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/ai/ac-validator/rules
 * Save validation rules (admin only)
 */
async function saveRules(req: NextRequest, context: any) {
  try {
    const body = await req.json()
    const { rules } = body

    if (!rules || !Array.isArray(rules)) {
      return NextResponse.json(
        { error: 'rules array is required' },
        { status: 400 }
      )
    }

    await saveValidationRules(context.user.organizationId, rules)

    return NextResponse.json({
      success: true,
      message: 'Validation rules saved successfully',
    })
  } catch (error: any) {
    console.error('Error saving validation rules:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to save validation rules' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/ai/ac-validator/rules
 * Reset validation rules to defaults (admin only)
 */
async function resetRules(req: NextRequest, context: any) {
  try {
    await resetValidationRules(context.user.organizationId)

    return NextResponse.json({
      success: true,
      message: 'Validation rules reset to defaults',
    })
  } catch (error: any) {
    console.error('Error resetting validation rules:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to reset validation rules' },
      { status: 500 }
    )
  }
}

export const GET = withAuth(getRules)

// Only admins and owners can modify rules
export const POST = withAuth(
  withFeatureAndRoleGate('canUseACValidator', ['admin', 'owner'], saveRules)
)

export const DELETE = withAuth(
  withFeatureAndRoleGate('canUseACValidator', ['admin', 'owner'], resetRules)
)
