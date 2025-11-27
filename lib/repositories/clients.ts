import { db, generateId } from '@/lib/db'
import { clients, projects, timeEntries, invoices } from '@/lib/db/schema'
import { eq, and, desc, sql } from 'drizzle-orm'
import { UserContext } from '@/lib/middleware/auth'

export interface CreateClientInput {
  name: string
  logoUrl?: string
  primaryContactName?: string
  primaryContactEmail?: string
  contractStartDate?: Date
  contractEndDate?: Date
  defaultBillingRate?: number
  currency?: string
  settings?: Record<string, any>
}

export interface UpdateClientInput {
  name?: string
  logoUrl?: string
  primaryContactName?: string
  primaryContactEmail?: string
  contractStartDate?: Date
  contractEndDate?: Date
  defaultBillingRate?: number
  currency?: string
  status?: 'active' | 'archived'
  settings?: Record<string, any>
}

export class ClientsRepository {
  constructor(private userContext: UserContext) {}

  /**
   * Get all clients for user's organization
   */
  async getClients(status?: 'active' | 'archived') {
    try {
      const conditions = [eq(clients.organizationId, this.userContext.organizationId)]
      
      if (status) {
        conditions.push(eq(clients.status, status))
      }

      return await db
        .select()
        .from(clients)
        .where(and(...conditions))
        .orderBy(desc(clients.createdAt))
    } catch (error) {
      console.error('Get clients error:', error)
      throw new Error('Failed to fetch clients')
    }
  }

  /**
   * Get client by ID
   */
  async getClientById(clientId: string) {
    try {
      const [client] = await db
        .select()
        .from(clients)
        .where(
          and(
            eq(clients.id, clientId),
            eq(clients.organizationId, this.userContext.organizationId)
          )
        )
        .limit(1)

      return client || null
    } catch (error) {
      console.error('Get client by ID error:', error)
      throw new Error('Failed to fetch client')
    }
  }

  /**
   * Create a new client
   */
  async createClient(input: CreateClientInput) {
    try {
      const clientId = generateId()

      const [newClient] = await db
        .insert(clients)
        .values({
          id: clientId,
          organizationId: this.userContext.organizationId,
          name: input.name,
          logoUrl: input.logoUrl || null,
          primaryContactName: input.primaryContactName || null,
          primaryContactEmail: input.primaryContactEmail || null,
          contractStartDate: input.contractStartDate || null,
          contractEndDate: input.contractEndDate || null,
          defaultBillingRate: input.defaultBillingRate ? input.defaultBillingRate.toString() : null,
          currency: input.currency || 'USD',
          status: 'active',
          settings: input.settings || {},
        })
        .returning()

      return newClient
    } catch (error: any) {
      console.error('Create client error:', error)
      if (error.code === '23505') { // Unique violation
        throw new Error('Client with this name already exists')
      }
      throw new Error('Failed to create client')
    }
  }

  /**
   * Update client
   */
  async updateClient(clientId: string, input: UpdateClientInput) {
    try {
      const updateData: any = {
        updatedAt: new Date(),
      }

      if (input.name !== undefined) updateData.name = input.name
      if (input.logoUrl !== undefined) updateData.logoUrl = input.logoUrl
      if (input.primaryContactName !== undefined) updateData.primaryContactName = input.primaryContactName
      if (input.primaryContactEmail !== undefined) updateData.primaryContactEmail = input.primaryContactEmail
      if (input.contractStartDate !== undefined) updateData.contractStartDate = input.contractStartDate
      if (input.contractEndDate !== undefined) updateData.contractEndDate = input.contractEndDate
      if (input.defaultBillingRate !== undefined) updateData.defaultBillingRate = input.defaultBillingRate.toString()
      if (input.currency !== undefined) updateData.currency = input.currency
      if (input.status !== undefined) updateData.status = input.status
      if (input.settings !== undefined) updateData.settings = input.settings

      const [updatedClient] = await db
        .update(clients)
        .set(updateData)
        .where(
          and(
            eq(clients.id, clientId),
            eq(clients.organizationId, this.userContext.organizationId)
          )
        )
        .returning()

      if (!updatedClient) {
        throw new Error('Client not found')
      }

      return updatedClient
    } catch (error: any) {
      console.error('Update client error:', error)
      if (error.message === 'Client not found') {
        throw error
      }
      if (error.code === '23505') {
        throw new Error('Client with this name already exists')
      }
      throw new Error('Failed to update client')
    }
  }

  /**
   * Archive client (soft delete)
   */
  async archiveClient(clientId: string) {
    try {
      const [archivedClient] = await db
        .update(clients)
        .set({
          status: 'archived',
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(clients.id, clientId),
            eq(clients.organizationId, this.userContext.organizationId)
          )
        )
        .returning()

      if (!archivedClient) {
        throw new Error('Client not found')
      }

      return archivedClient
    } catch (error: any) {
      console.error('Archive client error:', error)
      if (error.message === 'Client not found') {
        throw error
      }
      throw new Error('Failed to archive client')
    }
  }

  /**
   * Get client with projects
   */
  async getClientWithProjects(clientId: string) {
    try {
      const client = await this.getClientById(clientId)
      if (!client) {
        return null
      }

      const clientProjects = await db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.clientId, clientId),
            eq(projects.organizationId, this.userContext.organizationId)
          )
        )
        .orderBy(desc(projects.createdAt))

      return {
        ...client,
        projects: clientProjects,
      }
    } catch (error) {
      console.error('Get client with projects error:', error)
      throw new Error('Failed to fetch client with projects')
    }
  }

  /**
   * Get client statistics
   */
  async getClientStats(clientId: string) {
    try {
      const [stats] = await db.execute(sql`
        SELECT 
          COUNT(DISTINCT ${projects.id})::int as project_count,
          COUNT(DISTINCT ${timeEntries.id})::int as time_entry_count,
          COALESCE(SUM(${timeEntries.durationMinutes}), 0)::int as total_minutes,
          COUNT(DISTINCT ${invoices.id})::int as invoice_count,
          COALESCE(SUM(CASE WHEN ${invoices.status} = 'paid' THEN ${invoices.totalAmount} ELSE 0 END), 0)::decimal as total_paid
        FROM ${clients}
        LEFT JOIN ${projects} ON ${projects.clientId} = ${clients.id}
        LEFT JOIN ${timeEntries} ON ${timeEntries.clientId} = ${clients.id}
        LEFT JOIN ${invoices} ON ${invoices.clientId} = ${clients.id}
        WHERE ${clients.id} = ${clientId}
        AND ${clients.organizationId} = ${this.userContext.organizationId}
        GROUP BY ${clients.id}
      `) as any[]

      if (!stats || stats.length === 0) {
        return {
          projectCount: 0,
          timeEntryCount: 0,
          totalMinutes: 0,
          totalHours: 0,
          invoiceCount: 0,
          totalPaid: 0,
        }
      }

      const stat = stats[0]
      return {
        projectCount: Number(stat.project_count) || 0,
        timeEntryCount: Number(stat.time_entry_count) || 0,
        totalMinutes: Number(stat.total_minutes) || 0,
        totalHours: Number(stat.total_minutes) / 60 || 0,
        invoiceCount: Number(stat.invoice_count) || 0,
        totalPaid: Number(stat.total_paid) || 0,
      }
    } catch (error) {
      console.error('Get client stats error:', error)
      throw new Error('Failed to fetch client statistics')
    }
  }
}

