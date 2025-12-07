import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { PrioritizationRepository } from '@/lib/repositories/prioritization'

export const GET = withAuth(
  async (req: NextRequest, { user, params }) => {
    try {
      const { projectId } = await params
      const search = req.nextUrl.searchParams
      const limit = Number(search.get('limit') || '20')
      const offset = Number(search.get('offset') || '0')
      const framework = search.get('framework') as any
      const repo = new PrioritizationRepository(user)
      const { data, total } = await repo.listReports(projectId, {
        limit: Number.isFinite(limit) ? limit : 20,
        offset: Number.isFinite(offset) ? offset : 0,
        framework: framework && ['WSJF', 'RICE', 'MoSCoW'].includes(framework) ? framework : undefined,
      })
      return NextResponse.json({ data, total })
    } catch (error: any) {
      console.error('[PRIORITIZATION_REPORTS] error', error)
      return NextResponse.json(
        { code: 'REPORT_LIST_FAILED', error: 'Failed to load reports', message: error?.message || 'Unknown error' },
        { status: 400 }
      )
    }
  },
  { requireProject: true }
)
