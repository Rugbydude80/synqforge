import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { InvoiceService } from '@/lib/services/invoice.service'

/**
 * GET /api/invoices/[invoiceId]/review
 * Get time entries for review before invoicing
 */
async function reviewTimeEntries(request: NextRequest, context: any) {
  try {
    const clientId = request.nextUrl.searchParams.get('clientId')
    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId is required' },
        { status: 400 }
      )
    }

    const service = new InvoiceService(context.user)
    const review = await service.reviewTimeEntries(clientId)

    return NextResponse.json({ data: review })
  } catch (error: any) {
    console.error('Error reviewing time entries:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to review time entries' },
      { status: 500 }
    )
  }
}

export const GET = withAuth(reviewTimeEntries, { requireOrg: true })

