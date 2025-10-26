import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { ProjectsRepository } from '@/lib/repositories/projects'
import { requireTier, requireFeatureEnabled } from '@/lib/middleware/subscription-guard'
import {
  exportProjectsToExcel,
  exportProjectsToDocx,
  exportProjectsToPdf,
  type ExportProject,
} from '@/lib/export/exporters'

/**
 * GET /api/projects/[projectId]/export
 * Export a single project with its data
 * Requires: Core tier or higher + exportsEnabled feature
 */
async function exportProject(
  req: NextRequest,
  context: any
) {
  // Check if user has Core tier or higher for export functionality
  const tierCheck = await requireTier(context.user, 'core')
  if (tierCheck) return tierCheck

  // Check if exports are enabled for this organization
  const featureCheck = await requireFeatureEnabled(context.user, 'exportsEnabled')
  if (featureCheck) return featureCheck

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
      status: project.status || 'active',
      createdAt: project.createdAt?.toISOString() || new Date().toISOString(),
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

    return new NextResponse(buffer as unknown as BodyInit, {
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
