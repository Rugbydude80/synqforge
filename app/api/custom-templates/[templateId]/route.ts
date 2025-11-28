import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { customDocumentTemplatesRepository } from '@/lib/repositories/custom-document-templates.repository'
import { checkSubscriptionTier } from '@/lib/middleware/subscription-guard'
import { isSuperAdmin } from '@/lib/auth/super-admin'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

type RouteParams = { templateId: string }

const updateTemplateSchema = z.object({
  templateName: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
})

/**
 * GET /api/custom-templates/[templateId]
 * Get a specific custom template
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<RouteParams> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { templateId } = await context.params

    // Check subscription tier - Pro/Team/Enterprise only (or super admin)
    const [user] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1)

    const isSuperAdminUser = user && isSuperAdmin(user.email)
    
    if (!isSuperAdminUser) {
      const tierCheck = await checkSubscriptionTier(session.user.organizationId, 'pro')
      if (!tierCheck.hasAccess) {
        return NextResponse.json(
          {
            error: 'Custom document templates are only available on Pro, Team, or Enterprise plans',
            currentTier: tierCheck.currentTier,
            requiredTier: 'pro',
            upgradeUrl: tierCheck.upgradeUrl || '/settings/billing',
          },
          { status: 403 }
        )
      }
    }

    const template = await customDocumentTemplatesRepository.getById(
      templateId,
      session.user.organizationId
    )

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Return template metadata (without binary data unless requested)
    return NextResponse.json({
      id: template.id,
      templateName: template.templateName,
      description: template.description,
      fileName: template.fileName,
      fileType: template.fileType,
      fileSize: template.fileSize,
      usageCount: template.usageCount,
      isActive: template.isActive,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      format: template.templateFormat,
      extractedContent: template.extractedContent?.substring(0, 500), // Preview only
    })
  } catch (error) {
    console.error('Get custom template error:', error)
    return NextResponse.json({ error: 'Failed to get template' }, { status: 500 })
  }
}

/**
 * PATCH /api/custom-templates/[templateId]
 * Update a custom template
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<RouteParams> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { templateId } = await context.params

    // Check subscription tier
    const tierCheck = await checkSubscriptionTier(session.user.organizationId, 'pro')
    if (!tierCheck.hasAccess) {
      return NextResponse.json(
        {
          error: 'Custom document templates are only available on Pro, Team, or Enterprise plans',
          currentTier: tierCheck.currentTier,
          requiredTier: 'pro',
          upgradeUrl: tierCheck.upgradeUrl || '/settings/billing',
        },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validated = updateTemplateSchema.parse(body)

    const updated = await customDocumentTemplatesRepository.update(
      templateId,
      session.user.organizationId,
      validated
    )

    if (!updated) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: updated.id,
      templateName: updated.templateName,
      description: updated.description,
      isActive: updated.isActive,
      updatedAt: updated.updatedAt,
    })
  } catch (error) {
    console.error('Update custom template error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
  }
}

/**
 * DELETE /api/custom-templates/[templateId]
 * Delete a custom template
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<RouteParams> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { templateId } = await context.params

    // Check subscription tier
    const tierCheck = await checkSubscriptionTier(session.user.organizationId, 'pro')
    if (!tierCheck.hasAccess) {
      return NextResponse.json(
        {
          error: 'Custom document templates are only available on Pro, Team, or Enterprise plans',
          currentTier: tierCheck.currentTier,
          requiredTier: 'pro',
          upgradeUrl: tierCheck.upgradeUrl || '/settings/billing',
        },
        { status: 403 }
      )
    }

    await customDocumentTemplatesRepository.delete(templateId, session.user.organizationId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete custom template error:', error)
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 })
  }
}


