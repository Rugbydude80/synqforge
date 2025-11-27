import PDFDocument from 'pdfkit'
import { InvoiceService, InvoiceLineItem } from './invoice.service'
import { ClientsRepository } from '@/lib/repositories/clients'
import { UserContext } from '@/lib/middleware/auth'

export class PDFInvoiceService {
  private invoiceService: InvoiceService
  private clientsRepo: ClientsRepository

  constructor(userContext: UserContext) {
    this.invoiceService = new InvoiceService(userContext)
    this.clientsRepo = new ClientsRepository(userContext)
  }

  /**
   * Generate PDF invoice
   */
  async generateInvoicePDF(invoiceId: string): Promise<Buffer> {
    const invoice = await this.invoiceService['invoicesRepo'].getInvoiceById(invoiceId)
    if (!invoice) {
      throw new Error('Invoice not found')
    }

    const client = await this.clientsRepo.getClientById(invoice.clientId)
    if (!client) {
      throw new Error('Client not found')
    }

    // Get branding
    const branding = await this.invoiceService['clientsRepo'].getClientById(invoice.clientId)
    const settings = (branding?.settings as Record<string, any>) || {}
    const primaryColor = settings.primaryColor || '#6366f1'

    // Create PDF
    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    const buffers: Buffer[] = []

    doc.on('data', buffers.push.bind(buffers))
    doc.on('end', () => {})

    // Header
    doc.fillColor(primaryColor)
    doc.fontSize(24).text('INVOICE', { align: 'right' })
    doc.moveDown()

    // Invoice details
    doc.fillColor('#000000')
    doc.fontSize(10)
    doc.text(`Invoice #: ${invoice.invoiceNumber}`, { align: 'right' })
    doc.text(`Issue Date: ${new Date(invoice.issueDate).toLocaleDateString()}`, { align: 'right' })
    doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, { align: 'right' })
    doc.moveDown(2)

    // Bill To
    doc.fontSize(12).font('Helvetica-Bold').text('Bill To:', { continued: true })
    doc.font('Helvetica').text(` ${client.name}`)
    if (client.primaryContactEmail) {
      doc.fontSize(10).text(client.primaryContactEmail)
    }
    doc.moveDown(2)

    // Line items table
    doc.fontSize(10)
    const lineItems = invoice.lineItems as InvoiceLineItem[]

    // Table header
    doc.fillColor('#ffffff')
    doc.rect(50, doc.y, 495, 25).fill()
    doc.fillColor('#000000')
    doc.font('Helvetica-Bold')
    doc.text('Description', 55, doc.y - 20)
    doc.text('Hours', 350, doc.y - 20, { width: 60, align: 'right' })
    doc.text('Rate', 415, doc.y - 20, { width: 60, align: 'right' })
    doc.text('Amount', 480, doc.y - 20, { width: 60, align: 'right' })
    doc.moveDown()

    // Table rows
    doc.font('Helvetica')
    let yPos = doc.y
    for (const item of lineItems) {
      if (yPos > 700) {
        // New page if needed
        doc.addPage()
        yPos = 50
      }

      doc.text(item.description, 55, yPos, { width: 290 })
      doc.text(item.hours.toFixed(2), 350, yPos, { width: 60, align: 'right' })
      doc.text(`${invoice.currency} ${item.rate.toFixed(2)}`, 415, yPos, { width: 60, align: 'right' })
      doc.text(`${invoice.currency} ${item.amount.toFixed(2)}`, 480, yPos, { width: 60, align: 'right' })
      yPos += 25
    }

    doc.moveDown()

    // Totals
    const totalHours = parseFloat(invoice.totalHours.toString())
    const totalAmount = parseFloat(invoice.totalAmount.toString())

    doc.font('Helvetica-Bold')
    doc.text('Total Hours:', 350, doc.y, { width: 60, align: 'right' })
    doc.text(totalHours.toFixed(2), 415, doc.y, { width: 60, align: 'right' })
    doc.moveDown()

    doc.fontSize(14)
    doc.text('Total Amount:', 350, doc.y, { width: 60, align: 'right' })
    doc.text(`${invoice.currency} ${totalAmount.toFixed(2)}`, 415, doc.y, { width: 60, align: 'right' })

    // Notes
    if (invoice.notes) {
      doc.moveDown(2)
      doc.fontSize(10).font('Helvetica')
      doc.text('Notes:', { continued: true })
      doc.text(` ${invoice.notes}`)
    }

    // Footer
    doc.fontSize(8).fillColor('#666666')
    doc.text(
      'Thank you for your business!',
      50,
      doc.page.height - 50,
      { align: 'center', width: doc.page.width - 100 }
    )

    doc.end()

    // Wait for PDF to be generated
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      doc.on('data', (chunk) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)
    })
  }
}

