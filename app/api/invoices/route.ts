import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { InvoiceService } from '@/lib/services/invoice.service'
import { z } from 'zod'

const createInvoiceSchema = z.object({
  clientId: z.string(),
  timeEntryIds: z.array(z.string()).min(1),
  issueDate: z.string().datetime().transform((val) => new Date(val)),
  dueDate: z.string().datetime().transform((val) => new Date(val)),
  notes: z.string().optional(),
})

/**
 * GET /api/invoices
 * Get all invoices with optional filters
 */
async function getInvoices(request: NextRequest, context: any) {
  try {
    const service = new InvoiceService(context.user)
    const params = request.nextUrl.searchParams

    const filters = {
      clientId: params.get('clientId') || undefined,
      status: params.get('status') as 'draft' | 'sent' | 'paid' | 'overdue' | undefined,
      startDate: params.get('startDate') ? new Date(params.get('startDate')!) : undefined,
      endDate: params.get('endDate') ? new Date(params.get('endDate')!) : undefined,
    }

    const invoices = await service['invoicesRepo'].getInvoices(filters)
    return NextResponse.json({ data: invoices })
  } catch (error: any) {
    console.error('Error fetching invoices:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch invoices' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/invoices
 * Create invoice from time entries
 */
async function createInvoice(request: NextRequest, context: any) {
  try {
    const body = await request.json()
    const validated = createInvoiceSchema.parse(body)

    const service = new InvoiceService(context.user)
    const invoice = await service.createInvoiceFromTimeEntries(
      validated.clientId,
      validated.timeEntryIds,
      validated.issueDate,
      validated.dueDate,
      validated.notes
    )

    return NextResponse.json({ data: invoice }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating invoice:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create invoice' },
      { status: 500 }
    )
  }
}

export const GET = withAuth(getInvoices, { requireOrg: true })
export const POST = withAuth(createInvoice, { requireOrg: true })

