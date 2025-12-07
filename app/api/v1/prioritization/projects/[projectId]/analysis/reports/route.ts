import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { PrioritizationRepository } from '@/lib/repositories/prioritization'

export const GET = withAuth(
  async (_req: NextRequest, { user, params }) => {
    try {
      const { projectId } = await params
      const repo = new PrioritizationRepository(user)
      const reports = await repo.listReports(projectId)
      return NextResponse.json({ data: reports, total: reports.length })
    } catch (error: any) {
      console.error('[PRIORITIZATION_REPORTS] error', error)
      return NextResponse.json(
        { error: 'Failed to load reports', message: error?.message || 'Unknown error' },
        { status: 400 }
      )
    }
  },
  { requireProject: true }
)
