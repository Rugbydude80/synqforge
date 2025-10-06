import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { projectDocumentsRepository } from '@/lib/repositories/project-documents.repository'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_FILE_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown']

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const projectId = formData.get('projectId') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
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

    // Store document in Neon
    const document = await projectDocumentsRepository.create({
      projectId,
      uploadedBy: session.user.id,
      fileName: file.name,
      fileType,
      fileSize: file.size,
      fileBytes,
    })

    // Return document metadata (without binary data)
    return NextResponse.json({
      id: document.id,
      projectId: document.projectId,
      fileName: document.fileName,
      fileType: document.fileType,
      fileSize: document.fileSize,
      createdAt: document.createdAt,
    })
  } catch (error) {
    console.error('Upload document error:', error)
    return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 })
  }
}
