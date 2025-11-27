import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { ClientService } from '@/lib/services/client.service'
import { z } from 'zod'

const createClientSchema = z.object({
  name: z.string().min(1).max(255),
  logoUrl: z.string().url().optional(),
  primaryContactName: z.string().optional(),
  primaryContactEmail: z.string().email().optional(),
  contractStartDate: z.string().datetime().optional().transform((val) => val ? new Date(val) : undefined),
  contractEndDate: z.string().datetime().optional().transform((val) => val ? new Date(val) : undefined),
  defaultBillingRate: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  settings: z.record(z.any()).optional(),
})

/**
 * GET /api/clients
 * Get all clients for organization
 */
async function getClients(_request: NextRequest, context: any) {
  try {
    const clientService = new ClientService(context.user)
    const status = _request.nextUrl.searchParams.get('status') as 'active' | 'archived' | null
    
    const clients = await clientService.getClients(status || undefined)
    
    return NextResponse.json({ data: clients })
  } catch (error: any) {
    console.error('Error fetching clients:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch clients' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/clients
 * Create a new client
 */
async function createClient(request: NextRequest, context: any) {
  try {
    const body = await request.json()
    const validated = createClientSchema.parse(body)

    const clientService = new ClientService(context.user)
    const client = await clientService.createClient(validated)

    return NextResponse.json({ data: client }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating client:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create client' },
      { status: 500 }
    )
  }
}

export const GET = withAuth(getClients, { requireOrg: true })
export const POST = withAuth(createClient, { requireOrg: true })

