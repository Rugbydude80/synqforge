import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { checkFeatureLimit } from '@/lib/middleware/subscription'
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
 */
async function exportStories(req: NextRequest, context: any) {
  // Check if user can export
  const exportCheck = await checkFeatureLimit(context.user, 'export')
  if (!exportCheck.allowed) {
    return NextResponse.json(
      { error: exportCheck.error },
      { status: 403 }
    )
  }

  const { searchParams } = new URL(req.url)
  const format = searchParams.get('format') || 'excel'
  const projectId = searchParams.get('projectId')
  const epicId = searchParams.get('epicId')

  try {
    // Build query conditions
    const conditions = [eq(stories.projectId, projectId || '')]

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
    let query = db
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
      .leftJoin(users, eq(stories.assignedTo, users.id))
      .leftJoin(epics, eq(stories.epicId, epics.id))
      .leftJoin(projects, eq(stories.projectId, projects.id))

    if (projectId) {
      query = query.where(eq(stories.projectId, projectId))
    } else {
      query = query.where(eq(projects.organizationId, context.user.organizationId))
    }

    if (epicId) {
      query = query.where(eq(stories.epicId, epicId))
    }

    const storiesData = await query

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
      status: s.status,
      priority: s.priority,
      storyPoints: s.storyPoints || undefined,
      acceptanceCriteria: s.acceptanceCriteria || undefined,
      assignedTo: s.assigneeName || s.assigneeEmail || undefined,
      epicTitle: s.epicTitle || undefined,
      projectName: s.projectName || undefined,
      createdAt: s.createdAt.toISOString(),
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

    return new NextResponse(buffer, {
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
