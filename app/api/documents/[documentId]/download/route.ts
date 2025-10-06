import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { projectDocumentsRepository } from '@/lib/repositories/project-documents.repository'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await params
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    const document = await projectDocumentsRepository.downloadDocument(documentId, projectId)

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Map file type to MIME type
    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      txt: 'text/plain',
      md: 'text/markdown',
    }

    const mimeType = mimeTypes[document.fileType] || 'application/octet-stream'

    // Return binary file (convert Buffer to Uint8Array for NextResponse)
    return new NextResponse(new Uint8Array(document.fileBytes), {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${document.fileName}"`,
        'Content-Length': document.fileBytes.length.toString(),
      },
    })
  } catch (error) {
    console.error('Download document error:', error)
    return NextResponse.json({ error: 'Failed to download document' }, { status: 500 })
  }
}
