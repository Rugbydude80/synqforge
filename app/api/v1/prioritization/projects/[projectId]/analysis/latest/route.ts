import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { PrioritizationRepository } from '@/lib/repositories/prioritization'

export const GET = withAuth(
  async (req: NextRequest, { user, params }) => {
    try {
      const { projectId } = await params
      const framework = req.nextUrl.searchParams.get('framework') as any
      const repo = new PrioritizationRepository(user)
      const { data } = await repo.listReports(projectId, {
        limit: 1,
        offset: 0,
        framework: framework && ['WSJF', 'RICE', 'MoSCoW'].includes(framework) ? framework : undefined,
      })
      const latest = data[0] || null
      return NextResponse.json({ data: latest })
    } catch (error: any) {
      console.error('[PRIORITIZATION_LATEST] error', error)
      return NextResponse.json(
        { code: 'REPORT_LATEST_FAILED', error: 'Failed to load latest report', message: error?.message || 'Unknown error' },
        { status: 400 }
      )
    }
  },
  { requireProject: true }
)
