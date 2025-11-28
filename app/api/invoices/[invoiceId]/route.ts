import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { InvoiceService } from '@/lib/services/invoice.service'

/**
 * GET /api/invoices/[invoiceId]
 * Get invoice by ID
 */
async function getInvoice(_request: NextRequest, context: any) {
  try {
    const { invoiceId } = context.params
    const service = new InvoiceService(context.user)
    const invoice = await service['invoicesRepo'].getInvoiceById(invoiceId)

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: invoice })
  } catch (error: any) {
    console.error('Error fetching invoice:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch invoice' },
      { status: 500 }
    )
  }
}

export const GET = withAuth(getInvoice, { requireOrg: true })

