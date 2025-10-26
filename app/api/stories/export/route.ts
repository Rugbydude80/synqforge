import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { requireTier, requireFeatureEnabled } from '@/lib/middleware/subscription-guard'
import { db } from '@/lib/db'
import { stories, epics, users, projects } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import {
  exportStoriesToExcel,
  exportStoriesToDocx,
  exportStoriesToPdf,
  type ExportStory,
} from '@/lib/export/exporters'

/**
 * GET /api/stories/export
 * Export stories with optional filters
 * Requires: Core tier or higher + exportsEnabled feature
 */
async function exportStories(req: NextRequest, context: any) {
  // Check if user has Core tier or higher for export functionality
  const tierCheck = await requireTier(context.user, 'core')
  if (tierCheck) return tierCheck

  // Check if exports are enabled for this organization
  const featureCheck = await requireFeatureEnabled(context.user, 'exportsEnabled')
  if (featureCheck) return featureCheck

  const { searchParams } = new URL(req.url)
  const format = searchParams.get('format') || 'excel'
  const projectId = searchParams.get('projectId')
  const epicId = searchParams.get('epicId')

  try {
    if (!projectId) {
      // If no project specified, get all stories in user's organization
      // We'll need to filter by organization through projects
      const userProjects = await db
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.organizationId, context.user.organizationId))

      if (userProjects.length === 0) {
        return NextResponse.json(
          { error: 'No projects found' },
          { status: 404 }
        )
      }
    }

    // Fetch stories with related data
    const baseQuery = db
      .select({
        id: stories.id,
        title: stories.title,
        description: stories.description,
        status: stories.status,
        priority: stories.priority,
        storyPoints: stories.storyPoints,
        acceptanceCriteria: stories.acceptanceCriteria,
        createdAt: stories.createdAt,
        assigneeName: users.name,
        assigneeEmail: users.email,
        epicTitle: epics.title,
        projectName: projects.name,
      })
      .from(stories)
      .leftJoin(users, eq(stories.assigneeId, users.id))
      .leftJoin(epics, eq(stories.epicId, epics.id))
      .leftJoin(projects, eq(stories.projectId, projects.id))

    let storiesData
    if (projectId && epicId) {
      storiesData = await baseQuery.where(and(
        eq(stories.projectId, projectId),
        eq(stories.epicId, epicId)
      ))
    } else if (projectId) {
      storiesData = await baseQuery.where(eq(stories.projectId, projectId))
    } else if (epicId) {
      storiesData = await baseQuery.where(and(
        eq(projects.organizationId, context.user.organizationId),
        eq(stories.epicId, epicId)
      ))
    } else {
      storiesData = await baseQuery.where(eq(projects.organizationId, context.user.organizationId))
    }

    if (storiesData.length === 0) {
      return NextResponse.json(
        { error: 'No stories found to export' },
        { status: 404 }
      )
    }

    const exportData: ExportStory[] = storiesData.map(s => ({
      id: s.id,
      title: s.title,
      description: s.description || undefined,
      status: s.status || 'todo',
      priority: s.priority || 'medium',
      storyPoints: s.storyPoints || undefined,
      acceptanceCriteria: s.acceptanceCriteria || undefined,
      assignedTo: s.assigneeName || s.assigneeEmail || undefined,
      epicTitle: s.epicTitle || undefined,
      projectName: s.projectName || undefined,
      createdAt: s.createdAt?.toISOString() || new Date().toISOString(),
    }))

    let buffer: Buffer
    let contentType: string
    let filename: string

    switch (format.toLowerCase()) {
      case 'excel':
      case 'xlsx':
        buffer = exportStoriesToExcel(exportData)
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        filename = 'stories-export.xlsx'
        break

      case 'word':
      case 'docx':
        buffer = await exportStoriesToDocx(exportData)
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        filename = 'stories-export.docx'
        break

      case 'pdf':
        buffer = await exportStoriesToPdf(exportData)
        contentType = 'application/pdf'
        filename = 'stories-export.pdf'
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
    console.error('Error exporting stories:', error)
    return NextResponse.json(
      { error: 'Failed to export stories' },
      { status: 500 }
    )
  }
}

export const GET = withAuth(exportStories)
