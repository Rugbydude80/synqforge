import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { PrioritizationRepository } from '@/lib/repositories/prioritization'

export const GET = withAuth(
  async (_req: NextRequest, { user, params }) => {
    try {
      const { reportId } = await params
      const repo = new PrioritizationRepository(user)
      const report = await repo.getReport(reportId)
      return NextResponse.json(report)
    } catch (error: any) {
      console.error('[PRIORITIZATION_REPORT_DETAIL] error', error)
      return NextResponse.json(
        { error: 'Failed to load report', message: error?.message || 'Unknown error' },
        { status: 400 }
      )
    }
  },
  { requireOrg: true }
)
