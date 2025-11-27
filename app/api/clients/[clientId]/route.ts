import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { ClientService } from '@/lib/services/client.service'
import { z } from 'zod'

const updateClientSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  logoUrl: z.string().url().optional(),
  primaryContactName: z.string().optional(),
  primaryContactEmail: z.string().email().optional(),
  contractStartDate: z.string().datetime().optional().transform((val) => val ? new Date(val) : undefined),
  contractEndDate: z.string().datetime().optional().transform((val) => val ? new Date(val) : undefined),
  defaultBillingRate: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  status: z.enum(['active', 'archived']).optional(),
  settings: z.record(z.any()).optional(),
})

/**
 * GET /api/clients/[clientId]
 * Get client by ID
 */
async function getClient(_request: NextRequest, context: any) {
  try {
    const { clientId } = await context.params
    const clientService = new ClientService(context.user)
    const client = await clientService.getClientById(clientId)

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: client })
  } catch (error: any) {
    console.error('Error fetching client:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch client' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/clients/[clientId]
 * Update client
 */
async function updateClient(request: NextRequest, context: any) {
  try {
    const { clientId } = await context.params
    const body = await request.json()
    const validated = updateClientSchema.parse(body)

    const clientService = new ClientService(context.user)
    const client = await clientService.updateClient(clientId, validated)

    return NextResponse.json({ data: client })
  } catch (error: any) {
    console.error('Error updating client:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    if (error.message === 'Client not found') {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to update client' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/clients/[clientId]
 * Archive client (soft delete)
 */
async function deleteClient(_request: NextRequest, context: any) {
  try {
    const { clientId } = await context.params
    const clientService = new ClientService(context.user)
    await clientService.archiveClient(clientId)

    return NextResponse.json({ message: 'Client archived successfully' })
  } catch (error: any) {
    console.error('Error archiving client:', error)
    
    if (error.message === 'Client not found') {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to archive client' },
      { status: 500 }
    )
  }
}

export const GET = withAuth(getClient, { requireOrg: true })
export const PUT = withAuth(updateClient, { requireOrg: true })
export const DELETE = withAuth(deleteClient, { requireOrg: true })

