import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { EpicsRepository } from '@/lib/repositories/epics'
import type { CreateEpicInput } from '@/lib/types'

/**
 * GET /api/epics
 * List epics with optional filters
 */
async function listEpics(req: NextRequest, context: any) {
  const epicsRepo = new EpicsRepository(context.user)
  const { searchParams } = req.nextUrl

  // Parse query parameters
  const filters: any = {}

  if (searchParams.has('projectId')) {
    filters.projectId = searchParams.get('projectId')!
  }
  if (searchParams.has('status')) {
    filters.status = searchParams.get('status')
  }
  if (searchParams.has('limit')) {
    filters.limit = parseInt(searchParams.get('limit')!, 10)
  }
  if (searchParams.has('offset')) {
    filters.offset = parseInt(searchParams.get('offset')!, 10)
  }

  try {
    // projectId is now optional - if not provided, returns all epics for the organization
    const epics = await epicsRepo.getEpics(filters.projectId)

    return NextResponse.json({
      data: epics,
      total: epics.length,
    })
  } catch (error) {
    console.error('Error listing epics:', error)
    return NextResponse.json(
      { error: 'Failed to list epics' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/epics
 * Create a new epic
 */
async function createEpic(req: NextRequest, context: any) {
  const epicsRepo = new EpicsRepository(context.user)

  try {
    const body = await req.json()

    const input: CreateEpicInput = {
      projectId: body.projectId,
      title: body.title,
      description: body.description,
      priority: body.priority || 'medium',
      startDate: body.startDate,
      targetDate: body.targetDate,
    }

    const epic = await epicsRepo.createEpic(input)

    return NextResponse.json(epic, { status: 201 })
  } catch (error) {
    console.error('Error creating epic:', error)

    if (error instanceof Error) {
      if (error.name === 'ValidationError') {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to create epic' },
      { status: 500 }
    )
  }
}

export const GET = withAuth(listEpics)
export const POST = withAuth(createEpic)
