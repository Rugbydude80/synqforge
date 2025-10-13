import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { ProjectsRepository } from '@/lib/repositories/projects'
import { checkFeatureLimit } from '@/lib/middleware/subscription'
import { db } from '@/lib/db'
import { stories, epics, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import {
  exportProjectsToExcel,
  exportProjectsToDocx,
  exportProjectsToPdf,
  type ExportProject,
} from '@/lib/export/exporters'

/**
 * GET /api/projects/[projectId]/export
 * Export a single project with its data
 */
async function exportProject(
  req: NextRequest,
  context: any
) {
  // Check if user can export
  const exportCheck = await checkFeatureLimit(context.user, 'export')
  if (!exportCheck.allowed) {
    return NextResponse.json(
      { error: exportCheck.error },
      { status: 403 }
    )
  }

  const projectsRepo = new ProjectsRepository(context.user)
  const { searchParams } = new URL(req.url)
  const format = searchParams.get('format') || 'excel'
  const projectId = context.params.projectId

  try {
    // Get project with stats
    const project = await projectsRepo.getProjectById(projectId)

    const exportData: ExportProject = {
      id: project.id,
      name: project.name,
      description: project.description || undefined,
      status: project.status,
      createdAt: project.createdAt.toISOString(),
      totalStories: Number(project.storyCount) || 0,
      completedStories: Number(project.completedStoryCount) || 0,
      totalEpics: Number(project.epicCount) || 0,
    }

    let buffer: Buffer
    let contentType: string
    let filename: string

    switch (format.toLowerCase()) {
      case 'excel':
      case 'xlsx':
        buffer = exportProjectsToExcel([exportData])
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        filename = `${project.name}-export.xlsx`
        break

      case 'word':
      case 'docx':
        buffer = await exportProjectsToDocx([exportData])
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        filename = `${project.name}-export.docx`
        break

      case 'pdf':
        buffer = await exportProjectsToPdf([exportData])
        contentType = 'application/pdf'
        filename = `${project.name}-export.pdf`
        break

      default:
        return NextResponse.json(
          { error: 'Invalid format. Supported formats: excel, word, pdf' },
          { status: 400 }
        )
    }

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Error exporting project:', error)
    return NextResponse.json(
      { error: 'Failed to export project' },
      { status: 500 }
    )
  }
}

export const GET = withAuth(exportProject)
