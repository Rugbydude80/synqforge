import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { storyTemplatesRepository } from '@/lib/repositories/story-templates.repository'
import { z } from 'zod'

const createTemplateSchema = z.object({
  templateName: z.string().min(1),
  category: z.enum(['authentication', 'crud', 'payments', 'notifications', 'admin', 'api', 'custom']),
  description: z.string().optional(),
  isPublic: z.boolean().optional(),
  stories: z.array(
    z.object({
      title: z.string().min(1),
      description: z.string(),
      acceptanceCriteria: z.array(z.string()),
      storyPoints: z.number().optional(),
      storyType: z.enum(['feature', 'bug', 'task', 'spike']).optional(),
      tags: z.array(z.string()).optional(),
    })
  ),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = createTemplateSchema.parse(body)

    const template = await storyTemplatesRepository.createTemplate({
      organizationId: session.user.organizationId,
      createdBy: session.user.id,
      ...validated,
    })

    return NextResponse.json(template)
  } catch (error) {
    console.error('Create template error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') as any

    const templates = await storyTemplatesRepository.listTemplates(
      session.user.organizationId,
      category
    )

    return NextResponse.json(templates)
  } catch (error) {
    console.error('List templates error:', error)
    return NextResponse.json({ error: 'Failed to list templates' }, { status: 500 })
  }
}
