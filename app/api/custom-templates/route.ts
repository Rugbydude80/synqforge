import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { customDocumentTemplatesRepository } from '@/lib/repositories/custom-document-templates.repository'
import { customTemplateParserService } from '@/lib/services/custom-template-parser.service'
import { checkSubscriptionTier, getSubscriptionDetails } from '@/lib/middleware/subscription-guard'
import { isSuperAdmin } from '@/lib/auth/super-admin'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_FILE_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown']

// Template limits per subscription tier
const TEMPLATE_LIMITS: Record<string, number> = {
  pro: 10,
  team: 25,
  enterprise: Infinity, // Unlimited
}

/**
 * Get template limit for organization
 */
async function getTemplateLimit(organizationId: string, isSuperAdminUser: boolean): Promise<number> {
  if (isSuperAdminUser) {
    return Infinity // Super admins have unlimited templates
  }
  
  const subscriptionDetails = await getSubscriptionDetails(organizationId)
  const tier = subscriptionDetails?.subscriptionTier || 'free'
  
  return TEMPLATE_LIMITS[tier] || 0
}

/**
 * POST /api/custom-templates
 * Upload a custom document template
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    const formData = await request.formData()
    const file = formData.get('file') as File
    const templateName = formData.get('templateName') as string
    const description = formData.get('description') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!templateName || !templateName.trim()) {
      return NextResponse.json({ error: 'Template name is required' }, { status: 400 })
    }

    // Check template limit
    const templateLimit = await getTemplateLimit(session.user.organizationId, isSuperAdminUser)
    if (templateLimit !== Infinity) {
      const currentCount = await customDocumentTemplatesRepository.count(session.user.organizationId)
      if (currentCount >= templateLimit) {
        const subscriptionDetails = await getSubscriptionDetails(session.user.organizationId)
        const currentTier = subscriptionDetails?.subscriptionTier || 'free'
        return NextResponse.json(
          {
            error: `Template limit reached. Your ${currentTier} plan allows ${templateLimit} templates.`,
            currentCount,
            limit: templateLimit,
            upgradeUrl: '/settings/billing',
          },
          { status: 403 }
        )
      }
    }

    // Validate template name
    if (templateName.length > 255) {
      return NextResponse.json(
        { error: 'Template name exceeds 255 characters' },
        { status: 400 }
      )
    }

    if (!/^[a-zA-Z0-9\s\-_]+$/.test(templateName)) {
      return NextResponse.json(
        { error: 'Template name contains invalid characters. Use only letters, numbers, spaces, hyphens, and underscores.' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 })
    }

    // Validate file type - check both MIME type and file signature
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { 
          error: 'Invalid file type. Allowed: PDF, DOCX, TXT, MD',
          details: `Detected MIME type: ${file.type || 'unknown'}. Please ensure file extension matches content type.`
        },
        { status: 400 }
      )
    }

    // Additional validation: Check file signature for PDF (first 4 bytes should be %PDF)
    if (file.type === 'application/pdf') {
      const firstBytes = Buffer.from(await file.slice(0, 4).arrayBuffer())
      if (firstBytes.toString('ascii') !== '%PDF') {
        return NextResponse.json(
          { 
            error: 'Invalid PDF file. File signature does not match PDF format.',
            details: 'The file may be corrupted or not a valid PDF file.'
          },
          { status: 400 }
        )
      }
    }

    // Map MIME types to our enum
    let fileType: 'pdf' | 'docx' | 'txt' | 'md'
    if (file.type === 'application/pdf') {
      fileType = 'pdf'
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      fileType = 'docx'
    } else if (file.type === 'text/plain') {
      fileType = 'txt'
    } else {
      fileType = 'md'
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const fileBytes = Buffer.from(arrayBuffer)

    // Parse document to extract template format
    const { content, format } = await customTemplateParserService.parseDocument(
      fileBytes,
      fileType,
      file.name
    )

    // Validate parsed format with detailed feedback
    if (!format || !format.sections || format.sections.length === 0) {
      return NextResponse.json(
        {
          error: 'Could not extract template format from document',
          details: [
            'Please ensure the document contains clear sections and structure.',
            'Required sections: Title, Description, or Acceptance Criteria',
            'Use clear section headers like "Title:", "Description:", "Acceptance Criteria:"',
            'Download the starter template for reference: /api/custom-templates/download-starter'
          ]
        },
        { status: 400 }
      )
    }

    // Validate that at least one required field is present
    const requiredFields = ['title', 'description', 'acceptanceCriteria', 'acceptance_criteria', 'ac']
    const hasRequiredField = format.requiredFields?.some((field: string) => 
      requiredFields.some(req => field.toLowerCase().includes(req))
    ) || format.sections.some((section: string) =>
      requiredFields.some(req => section.toLowerCase().includes(req))
    )

    if (!hasRequiredField) {
      return NextResponse.json(
        {
          error: 'Template missing required sections',
          details: [
            'Template must include at least one of: Title, Description, or Acceptance Criteria',
            'Found sections: ' + (format.sections?.join(', ') || 'none'),
            'Download the starter template for reference: /api/custom-templates/download-starter'
          ]
        },
        { status: 400 }
      )
    }

    // Create template
    const template = await customDocumentTemplatesRepository.create({
      organizationId: session.user.organizationId,
      templateName,
      description: description || undefined,
      fileName: file.name,
      fileType,
      fileSize: file.size,
      fileBytes,
      extractedContent: content,
      templateFormat: format,
      createdBy: session.user.id,
    })

    // Return template metadata (without binary data)
    return NextResponse.json({
      id: template.id,
      templateName: template.templateName,
      description: template.description,
      fileName: template.fileName,
      fileType: template.fileType,
      fileSize: template.fileSize,
      usageCount: template.usageCount,
      createdAt: template.createdAt,
      format: template.templateFormat,
    })
  } catch (error) {
    console.error('Upload custom template error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload template' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/custom-templates
 * List all custom templates for the organization
 */
export async function GET(request: NextRequest) {
  let session: any = null
  try {
    session = await getServerSession(authOptions)
    if (!session?.user?.id || !session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    const url = new URL(request.url)
    const includeInactive = url.searchParams.get('includeInactive') === 'true'

    const templates = await customDocumentTemplatesRepository.list(
      session.user.organizationId,
      includeInactive
    )

    return NextResponse.json({ templates })
  } catch (error) {
    console.error('List custom templates error:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      organizationId: session?.user?.organizationId,
    })
    return NextResponse.json(
      { 
        error: 'Failed to list templates',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

