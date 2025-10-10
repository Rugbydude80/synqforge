import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthContext } from '@/lib/middleware/auth'
import { aiService } from '@/lib/services/ai.service'
import { fileProcessorService } from '@/lib/services/file-processor.service'
import { projectDocumentsRepository } from '@/lib/repositories/project-documents.repository'
import { storiesRepository } from '@/lib/repositories/stories.repository'
import { aiGenerationRateLimit, checkRateLimit, getResetTimeMessage } from '@/lib/rate-limit'

/**
 * POST /api/projects/[projectId]/files/process-and-analyze
 * Upload file, extract content, analyze with AI, and optionally create stories
 */

async function processAndAnalyze(req: NextRequest, context: AuthContext) {
  try {
    const url = new URL(req.url)
    const pathSegments = url.pathname.split('/')
    const projectId = pathSegments[pathSegments.indexOf('projects') + 1]
    const formData = await req.formData()
    const file = formData.get('file') as File
    const createStories = formData.get('createStories') === 'true'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 })
    }

    const rateLimitResult = await checkRateLimit(
      `ai:process-document:${context.user.id}`,
      aiGenerationRateLimit
    )

    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000)
      return NextResponse.json(
        {
          error: `Too many document uploads. Try again in ${getResetTimeMessage(rateLimitResult.reset)}.`,
        },
        {
          status: 429,
          headers: { 'Retry-After': retryAfter.toString() },
        }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const processed = await fileProcessorService.extractText(buffer, file.type, file.name)

    const validation = fileProcessorService.validateContent(processed.content)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const document = await projectDocumentsRepository.create({
      projectId,
      uploadedBy: context.user.id,
      fileName: file.name,
      fileType: processed.metadata.fileType as any,
      fileSize: file.size,
      fileBytes: buffer,
      extractedContent: processed.content,
    })

    const response = await aiService.analyzeDocument(processed.content, 'requirements')

    await aiService.trackUsage(
      context.user.id,
      context.user.organizationId,
      response.model,
      response.usage,
      'requirements_analysis',
      processed.content,
      JSON.stringify(response.analysis)
    )

    const createdStories: any[] = []

    if (createStories && response.analysis.suggestedStories && response.analysis.suggestedStories.length > 0) {
      for (const storyData of response.analysis.suggestedStories) {
        const story = await storiesRepository.create({
          projectId,
          title: storyData.title,
          description: storyData.description || '',
          status: 'backlog',
          priority: (storyData.priority as any) || 'medium',
          storyPoints: storyData.storyPoints || undefined,
          acceptanceCriteria: storyData.acceptanceCriteria || [],
          aiGenerated: true,
        }, context.user.id)

        await projectDocumentsRepository.linkStory(document.id, projectId, story.id)
        createdStories.push(story)
      }
    }

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        fileName: document.fileName,
        fileSize: document.fileSize,
        extractedContent: fileProcessorService.summarizeContent(processed.content, 500),
        metadata: processed.metadata,
      },
      analysis: response.analysis,
      usage: response.usage,
      created: {
        stories: createdStories.length,
      },
    })
  } catch (error) {
    console.error('Process and analyze error:', error)
    return NextResponse.json(
      {
        error: 'Failed to process and analyze file',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export const POST = withAuth(processAndAnalyze)
