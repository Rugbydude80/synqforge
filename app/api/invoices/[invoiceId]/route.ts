import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/lib/middleware/auth'
import { InvoiceService } from '@/lib/services/invoice.service'
import { formatErrorResponse, isApplicationError } from '@/lib/errors/custom-errors'

/**
 * GET /api/invoices/[invoiceId]
 * Get invoice by ID
 */
async function getInvoice(_request: NextRequest, context: AuthContext & { params: { invoiceId: string } }) {
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
  } catch (error) {
    console.error('Error fetching invoice:', error)
    
    if (isApplicationError(error)) {
      const response = formatErrorResponse(error)
      const { statusCode, ...errorBody } = response
      return NextResponse.json(errorBody, { status: statusCode })
    }
    
    const response = formatErrorResponse(error)
    const { statusCode, ...errorBody } = response
    return NextResponse.json(errorBody, { status: statusCode })
  }
}

export const GET = withAuth(getInvoice, { requireOrg: true })

