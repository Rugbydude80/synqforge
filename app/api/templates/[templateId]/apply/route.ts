import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { storyTemplatesRepository } from '@/lib/repositories/story-templates.repository'
import { z } from 'zod'

type RouteParams = { templateId: string }

const applyTemplateSchema = z.object({
  projectId: z.string().min(1),
  epicId: z.string().optional(),
  variables: z.record(z.string()).optional(),
})

export async function POST(
  request: NextRequest,
  context: { params: Promise<RouteParams> }
) {
  const { templateId } = await context.params
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = applyTemplateSchema.parse(body)

    const createdStories = await storyTemplatesRepository.applyTemplate(templateId, {
      projectId: validated.projectId,
      epicId: validated.epicId,
      createdBy: session.user.id,
      variables: validated.variables,
    })

    return NextResponse.json({ stories: createdStories })
  } catch (error) {
    console.error('Apply template error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to apply template' }, { status: 500 })
  }
}
