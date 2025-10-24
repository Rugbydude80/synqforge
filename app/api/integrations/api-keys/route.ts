/**
 * API Keys API
 * Returns "coming soon" status for Q2 2026 release
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  return NextResponse.json(
    {
      status: 'coming_soon',
      message: 'API access will be available from Q2 2026',
      releaseQuarter: '2026-Q2',
      apiKeys: []
    },
    { status: 200 }
  )
}

export async function POST(_req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  return NextResponse.json(
    {
      status: 'coming_soon',
      message: 'API access will be available from Q2 2026',
      releaseQuarter: '2026-Q2'
    },
    { status: 403 }
  )
}

