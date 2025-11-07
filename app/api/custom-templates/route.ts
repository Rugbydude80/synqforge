import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { customDocumentTemplatesRepository } from '@/lib/repositories/custom-document-templates.repository'
import { customTemplateParserService } from '@/lib/services/custom-template-parser.service'
import { checkSubscriptionTier } from '@/lib/middleware/subscription-guard'
import { isSuperAdmin } from '@/lib/auth/super-admin'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_FILE_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown']

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

    if (!templateName) {
      return NextResponse.json({ error: 'Template name is required' }, { status: 400 })
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 })
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: PDF, DOCX, TXT, MD' },
        { status: 400 }
      )
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

    // Validate parsed format
    if (!format || !format.sections || format.sections.length === 0) {
      return NextResponse.json(
        { error: 'Could not extract template format from document. Please ensure the document contains clear sections and structure.' },
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

    const url = new URL(request.url)
    const includeInactive = url.searchParams.get('includeInactive') === 'true'

    const templates = await customDocumentTemplatesRepository.list(
      session.user.organizationId,
      includeInactive
    )

    return NextResponse.json({ templates })
  } catch (error) {
    console.error('List custom templates error:', error)
    return NextResponse.json({ error: 'Failed to list templates' }, { status: 500 })
  }
}

