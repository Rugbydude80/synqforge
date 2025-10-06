import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { projectDocumentsRepository } from '@/lib/repositories/project-documents.repository'

export async function GET(request: NextRequest) {
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

    const documents = await projectDocumentsRepository.listByProject(projectId)

    return NextResponse.json(documents)
  } catch (error) {
    console.error('List documents error:', error)
    return NextResponse.json({ error: 'Failed to list documents' }, { status: 500 })
  }
}
