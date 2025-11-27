import { db, generateId } from '@/lib/db'
import { invoices, clients, timeEntries } from '@/lib/db/schema'
import { eq, and, desc, sql } from 'drizzle-orm'
import { UserContext } from '@/lib/middleware/auth'

export interface CreateInvoiceInput {
  clientId: string
  invoiceNumber: string
  issueDate: Date
  dueDate: Date
  totalHours: number
  totalAmount: number
  currency?: string
  lineItems: Array<{
    description: string
    hours: number
    rate: number
    amount: number
    storyId?: string
    epicId?: string
  }>
  notes?: string
}

export interface UpdateInvoiceInput {
  status?: 'draft' | 'sent' | 'paid' | 'overdue'
  issueDate?: Date
  dueDate?: Date
  paidDate?: Date
  totalHours?: number
  totalAmount?: number
  currency?: string
  lineItems?: Array<{
    description: string
    hours: number
    rate: number
    amount: number
    storyId?: string
    epicId?: string
  }>
  notes?: string
  pdfUrl?: string
}

export interface InvoiceFilters {
  clientId?: string
  status?: 'draft' | 'sent' | 'paid' | 'overdue'
  startDate?: Date
  endDate?: Date
}

export class InvoicesRepository {
  constructor(private userContext: UserContext) {}

  /**
   * Get all invoices with optional filters
   */
  async getInvoices(filters?: InvoiceFilters) {
    try {
      const conditions = [eq(invoices.organizationId, this.userContext.organizationId)]

      if (filters?.clientId) {
        conditions.push(eq(invoices.clientId, filters.clientId))
      }
      if (filters?.status) {
        conditions.push(eq(invoices.status, filters.status))
      }
      if (filters?.startDate) {
        conditions.push(sql`${invoices.issueDate} >= ${filters.startDate}`)
      }
      if (filters?.endDate) {
        conditions.push(sql`${invoices.issueDate} <= ${filters.endDate}`)
      }

      return await db
        .select({
          id: invoices.id,
          organizationId: invoices.organizationId,
          clientId: invoices.clientId,
          invoiceNumber: invoices.invoiceNumber,
          status: invoices.status,
          issueDate: invoices.issueDate,
          dueDate: invoices.dueDate,
          paidDate: invoices.paidDate,
          totalHours: invoices.totalHours,
          totalAmount: invoices.totalAmount,
          currency: invoices.currency,
          lineItems: invoices.lineItems,
          notes: invoices.notes,
          pdfUrl: invoices.pdfUrl,
          createdAt: invoices.createdAt,
          updatedAt: invoices.updatedAt,
          // Join client data
          client: {
            id: clients.id,
            name: clients.name,
            primaryContactEmail: clients.primaryContactEmail,
          },
        })
        .from(invoices)
        .leftJoin(clients, eq(invoices.clientId, clients.id))
        .where(and(...conditions))
        .orderBy(desc(invoices.issueDate))
    } catch (error) {
      console.error('Get invoices error:', error)
      throw new Error('Failed to fetch invoices')
    }
  }

  /**
   * Get invoice by ID
   */
  async getInvoiceById(invoiceId: string) {
    try {
      const [invoice] = await db
        .select()
        .from(invoices)
        .where(
          and(
            eq(invoices.id, invoiceId),
            eq(invoices.organizationId, this.userContext.organizationId)
          )
        )
        .limit(1)

      return invoice || null
    } catch (error) {
      console.error('Get invoice by ID error:', error)
      throw new Error('Failed to fetch invoice')
    }
  }

  /**
   * Create a new invoice
   */
  async createInvoice(input: CreateInvoiceInput) {
    try {
      const invoiceId = generateId()

      const [newInvoice] = await db
        .insert(invoices)
        .values({
          id: invoiceId,
          organizationId: this.userContext.organizationId,
          clientId: input.clientId,
          invoiceNumber: input.invoiceNumber,
          status: 'draft',
          issueDate: input.issueDate,
          dueDate: input.dueDate,
          totalHours: input.totalHours.toString(),
          totalAmount: input.totalAmount.toString(),
          currency: input.currency || 'USD',
          lineItems: input.lineItems,
          notes: input.notes || null,
        })
        .returning()

      return newInvoice
    } catch (error: any) {
      console.error('Create invoice error:', error)
      if (error.code === '23505') { // Unique violation
        throw new Error('Invoice number already exists')
      }
      throw new Error('Failed to create invoice')
    }
  }

  /**
   * Update invoice
   */
  async updateInvoice(invoiceId: string, input: UpdateInvoiceInput) {
    try {
      const updateData: any = {
        updatedAt: new Date(),
      }

      if (input.status !== undefined) updateData.status = input.status
      if (input.issueDate !== undefined) updateData.issueDate = input.issueDate
      if (input.dueDate !== undefined) updateData.dueDate = input.dueDate
      if (input.paidDate !== undefined) updateData.paidDate = input.paidDate
      if (input.totalHours !== undefined) updateData.totalHours = input.totalHours.toString()
      if (input.totalAmount !== undefined) updateData.totalAmount = input.totalAmount.toString()
      if (input.currency !== undefined) updateData.currency = input.currency
      if (input.lineItems !== undefined) updateData.lineItems = input.lineItems
      if (input.notes !== undefined) updateData.notes = input.notes
      if (input.pdfUrl !== undefined) updateData.pdfUrl = input.pdfUrl

      const [updatedInvoice] = await db
        .update(invoices)
        .set(updateData)
        .where(
          and(
            eq(invoices.id, invoiceId),
            eq(invoices.organizationId, this.userContext.organizationId)
          )
        )
        .returning()

      if (!updatedInvoice) {
        throw new Error('Invoice not found')
      }

      return updatedInvoice
    } catch (error: any) {
      console.error('Update invoice error:', error)
      if (error.message === 'Invoice not found') {
        throw error
      }
      if (error.code === '23505') {
        throw new Error('Invoice number already exists')
      }
      throw new Error('Failed to update invoice')
    }
  }

  /**
   * Link time entries to invoice
   */
  async linkTimeEntriesToInvoice(invoiceId: string, timeEntryIds: string[]) {
    try {
      if (timeEntryIds.length === 0) {
        return
      }

      await db
        .update(timeEntries)
        .set({
          invoiceId,
          updatedAt: new Date(),
        })
        .where(
          and(
            sql`${timeEntries.id} = ANY(${timeEntryIds})`,
            eq(timeEntries.organizationId, this.userContext.organizationId)
          )
        )

      return true
    } catch (error) {
      console.error('Link time entries to invoice error:', error)
      throw new Error('Failed to link time entries to invoice')
    }
  }

  /**
   * Get time entries for an invoice
   */
  async getInvoiceTimeEntries(invoiceId: string) {
    try {
      return await db
        .select()
        .from(timeEntries)
        .where(
          and(
            eq(timeEntries.invoiceId, invoiceId),
            eq(timeEntries.organizationId, this.userContext.organizationId)
          )
        )
        .orderBy(timeEntries.startedAt)
    } catch (error) {
      console.error('Get invoice time entries error:', error)
      throw new Error('Failed to fetch invoice time entries')
    }
  }
}

