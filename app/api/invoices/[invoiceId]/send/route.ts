import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/lib/middleware/auth'
import { InvoiceService } from '@/lib/services/invoice.service'
import { formatErrorResponse, isApplicationError } from '@/lib/errors/custom-errors'

/**
 * POST /api/invoices/[invoiceId]/send
 * Mark invoice as sent
 */
async function sendInvoice(_request: NextRequest, context: AuthContext & { params: { invoiceId: string } }) {
  try {
    const { invoiceId } = context.params
    const service = new InvoiceService(context.user)
    
    const invoice = await service.sendInvoice(invoiceId)

    return NextResponse.json({ 
      data: invoice,
      message: 'Invoice marked as sent'
    })
  } catch (error) {
    console.error('Error sending invoice:', error)
    
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

export const POST = withAuth(sendInvoice, { requireOrg: true })

