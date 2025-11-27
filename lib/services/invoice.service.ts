import { InvoicesRepository } from '@/lib/repositories/invoices'
import { TimeEntriesRepository } from '@/lib/repositories/time-entries'
import { ClientsRepository } from '@/lib/repositories/clients'
import { db } from '@/lib/db'
import { organizations, timeEntries, stories, epics } from '@/lib/db/schema'
import { eq, and, sql, inArray } from 'drizzle-orm'
import { UserContext } from '@/lib/middleware/auth'
import type { CreateInvoiceInput, UpdateInvoiceInput } from '@/lib/repositories/invoices'

export interface InvoiceLineItem {
  description: string
  hours: number
  rate: number
  amount: number
  storyId?: string
  epicId?: string
}

export class InvoiceService {
  private invoicesRepo: InvoicesRepository
  private timeEntriesRepo: TimeEntriesRepository
  private clientsRepo: ClientsRepository

  constructor(userContext: UserContext) {
    this.invoicesRepo = new InvoicesRepository(userContext)
    this.timeEntriesRepo = new TimeEntriesRepository(userContext)
    this.clientsRepo = new ClientsRepository(userContext)
  }

  /**
   * Generate invoice number (format: INV-YYYY-NNN)
   */
  async generateInvoiceNumber(organizationId: string): Promise<string> {
    const now = new Date()
    const year = now.getFullYear()

    // Get and increment last invoice number
    const [org] = await db
      .select({ lastInvoiceNumber: organizations.lastInvoiceNumber })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1)

    const currentNumber = (org?.lastInvoiceNumber || 0) + 1

    // Update organization with new number
    await db
      .update(organizations)
      .set({ lastInvoiceNumber: currentNumber })
      .where(eq(organizations.id, organizationId))

    // Format: INV-YYYY-NNN (e.g., INV-2025-001)
    const paddedNumber = currentNumber.toString().padStart(3, '0')
    return `INV-${year}-${paddedNumber}`
  }

  /**
   * Group time entries by story/epic for readable line items
   */
  async groupTimeEntriesByStory(entries: any[]): Promise<InvoiceLineItem[]> {
    if (entries.length === 0) {
      return []
    }

    // Batch fetch all stories
    const storyIds = entries
      .map(e => e.storyId)
      .filter((id): id is string => !!id)
      .filter((id, index, self) => self.indexOf(id) === index) // Unique

    const storyMap = new Map<string, { title: string; epicId?: string }>()
    if (storyIds.length > 0) {
      const storyData = await db
        .select({
          id: stories.id,
          title: stories.title,
          epicId: stories.epicId,
        })
        .from(stories)
        .where(inArray(stories.id, storyIds))

      for (const story of storyData) {
        storyMap.set(story.id, { title: story.title, epicId: story.epicId || undefined })
      }
    }

    // Group entries
    const grouped = new Map<string, {
      storyId?: string
      epicId?: string
      description: string
      totalMinutes: number
      entries: any[]
    }>()

    for (const entry of entries) {
      const key = entry.storyId || 'other'
      
      if (!grouped.has(key)) {
        let description = entry.description || 'Time entry'
        let epicId = entry.epicId

        if (entry.storyId && storyMap.has(entry.storyId)) {
          const story = storyMap.get(entry.storyId)!
          description = story.title
          if (story.epicId) {
            epicId = story.epicId
          }
        }

        grouped.set(key, {
          storyId: entry.storyId,
          epicId,
          description,
          totalMinutes: 0,
          entries: [],
        })
      }

      const group = grouped.get(key)!
      group.totalMinutes += entry.durationMinutes || 0
      group.entries.push(entry)
    }

    // Convert to line items
    const lineItems: InvoiceLineItem[] = []
    for (const [key, group] of grouped.entries()) {
      const hours = group.totalMinutes / 60
      const rate = parseFloat(group.entries[0].billingRate || '0')
      const amount = hours * rate

      lineItems.push({
        description: group.description,
        hours: Math.round(hours * 100) / 100, // Round to 2 decimals
        rate,
        amount: Math.round(amount * 100) / 100,
        storyId: group.storyId,
        epicId: group.epicId,
      })
    }

    return lineItems
  }

  /**
   * Create invoice from time entries
   */
  async createInvoiceFromTimeEntries(
    clientId: string,
    timeEntryIds: string[],
    issueDate: Date,
    dueDate: Date,
    notes?: string
  ) {
    if (timeEntryIds.length === 0) {
      throw new Error('No time entries selected')
    }

    // Get time entries
    const entries = await this.timeEntriesRepo.getTimeEntries({
      invoiceId: null, // Only unbilled
    })

    const selectedEntries = entries.filter(e => timeEntryIds.includes(e.id))
    if (selectedEntries.length === 0) {
      throw new Error('No valid time entries found')
    }

    // Verify all entries belong to the client
    const client = await this.clientsRepo.getClientById(clientId)
    if (!client) {
      throw new Error('Client not found')
    }

    const invalidEntries = selectedEntries.filter(e => e.clientId !== clientId)
    if (invalidEntries.length > 0) {
      throw new Error('Some time entries do not belong to this client')
    }

    // Group entries by story/epic
    const lineItems = await this.groupTimeEntriesByStory(selectedEntries)

    // Calculate totals
    const totalHours = lineItems.reduce((sum, item) => sum + item.hours, 0)
    const totalAmount = lineItems.reduce((sum, item) => sum + item.amount, 0)

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber(client.organizationId)

    // Create invoice
    const invoice = await this.invoicesRepo.createInvoice({
      clientId,
      invoiceNumber,
      issueDate,
      dueDate,
      totalHours,
      totalAmount,
      currency: client.currency || 'USD',
      lineItems,
      notes,
    })

    // Link time entries to invoice
    await this.invoicesRepo.linkTimeEntriesToInvoice(invoice.id, timeEntryIds)

    return invoice
  }

  /**
   * Calculate invoice total from line items
   */
  calculateInvoiceTotal(lineItems: InvoiceLineItem[]): { totalHours: number; totalAmount: number } {
    const totalHours = lineItems.reduce((sum, item) => sum + item.hours, 0)
    const totalAmount = lineItems.reduce((sum, item) => sum + item.amount, 0)

    return {
      totalHours: Math.round(totalHours * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
    }
  }

  /**
   * Get invoice items (time entries grouped)
   */
  async getInvoiceItems(invoiceId: string) {
    const invoice = await this.invoicesRepo.getInvoiceById(invoiceId)
    if (!invoice) {
      throw new Error('Invoice not found')
    }

    return invoice.lineItems as InvoiceLineItem[]
  }

  /**
   * Review time entries before creating invoice
   */
  async reviewTimeEntries(clientId: string) {
    const entries = await this.timeEntriesRepo.getUnbilledTimeEntries(clientId)
    
    // Group by story for review
    const grouped = await this.groupTimeEntriesByStory(entries)

    return {
      entries,
      groupedItems: grouped,
      totalHours: grouped.reduce((sum, item) => sum + item.hours, 0),
      totalAmount: grouped.reduce((sum, item) => sum + item.amount, 0),
    }
  }

  /**
   * Update invoice
   */
  async updateInvoice(invoiceId: string, input: UpdateInvoiceInput) {
    return this.invoicesRepo.updateInvoice(invoiceId, input)
  }

  /**
   * Mark invoice as sent
   */
  async sendInvoice(invoiceId: string) {
    return this.invoicesRepo.updateInvoice(invoiceId, {
      status: 'sent',
    })
  }

  /**
   * Mark invoice as paid
   */
  async markInvoicePaid(invoiceId: string, paidDate: Date) {
    return this.invoicesRepo.updateInvoice(invoiceId, {
      status: 'paid',
      paidDate,
    })
  }
}

