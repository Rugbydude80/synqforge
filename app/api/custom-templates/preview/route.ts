import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { customTemplateParserService } from '@/lib/services/custom-template-parser.service'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_FILE_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown']

/**
 * POST /api/custom-templates/preview
 * Preview template structure without saving
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
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

    // Return preview data
    return NextResponse.json({
      sections: format.sections || [],
      format: {
        titleFormat: format.format?.titleFormat,
        acceptanceCriteriaFormat: format.format?.acceptanceCriteriaFormat,
        priorityFormat: format.format?.priorityFormat,
        storyPointsFormat: format.format?.storyPointsFormat,
        style: format.style,
      },
      requiredFields: format.requiredFields || [],
      content: content.substring(0, 2000), // Limit content for preview
      metadata: format.metadata,
    })
  } catch (error) {
    console.error('Preview template error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to preview template',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

