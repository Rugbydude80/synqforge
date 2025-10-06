import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { storyTemplatesRepository } from '@/lib/repositories/story-templates.repository'

/**
 * Seed built-in templates for organization
 * POST /api/templates/seed
 */
export async function POST(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const templates = await storyTemplatesRepository.seedBuiltInTemplates(
      session.user.organizationId,
      session.user.id
    )

    return NextResponse.json({
      success: true,
      count: templates.length,
      templates: templates.map((t) => ({ id: t.id, name: t.templateName, category: t.category })),
    })
  } catch (error) {
    console.error('Seed templates error:', error)
    return NextResponse.json({ error: 'Failed to seed templates' }, { status: 500 })
  }
}
