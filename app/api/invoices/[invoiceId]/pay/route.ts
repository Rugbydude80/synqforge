import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/lib/middleware/auth'
import { InvoiceService } from '@/lib/services/invoice.service'
import { formatErrorResponse, isApplicationError } from '@/lib/errors/custom-errors'
import { z } from 'zod'

const payInvoiceSchema = z.object({
  paidDate: z.string().datetime().transform((val) => new Date(val)),
})

/**
 * POST /api/invoices/[invoiceId]/pay
 * Mark invoice as paid
 */
async function payInvoice(request: NextRequest, context: AuthContext & { params: { invoiceId: string } }) {
  try {
    const { invoiceId } = context.params
    const body = await request.json()
    const { paidDate } = payInvoiceSchema.parse(body)
    
    const service = new InvoiceService(context.user)
    const invoice = await service.markInvoicePaid(invoiceId, paidDate)

    return NextResponse.json({ 
      data: invoice,
      message: 'Invoice marked as paid'
    })
  } catch (error) {
    console.error('Error marking invoice as paid:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    
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

export const POST = withAuth(payInvoice, { requireOrg: true })

