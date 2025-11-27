import { db, generateId } from '@/lib/db'
import { timeEntries, stories, projects, clients, users } from '@/lib/db/schema'
import { eq, and, desc, isNull, gte, lte, sql } from 'drizzle-orm'
import { UserContext } from '@/lib/middleware/auth'

export interface CreateTimeEntryInput {
  clientId?: string
  projectId?: string
  storyId?: string
  userId: string
  startedAt: Date
  endedAt?: Date
  durationMinutes?: number
  description?: string
  billable?: boolean
  billingRate?: number
}

export interface UpdateTimeEntryInput {
  startedAt?: Date
  endedAt?: Date
  durationMinutes?: number
  description?: string
  billable?: boolean
  billingRate?: number
}

export interface TimeEntryFilters {
  clientId?: string
  projectId?: string
  storyId?: string
  userId?: string
  invoiceId?: string | null // null means unbilled
  startDate?: Date
  endDate?: Date
  billable?: boolean
}

export class TimeEntriesRepository {
  constructor(private userContext: UserContext) {}

  /**
   * Get time entries with optional filters
   */
  async getTimeEntries(filters?: TimeEntryFilters) {
    try {
      const conditions = [eq(timeEntries.organizationId, this.userContext.organizationId)]

      if (filters?.clientId) {
        conditions.push(eq(timeEntries.clientId, filters.clientId))
      }
      if (filters?.projectId) {
        conditions.push(eq(timeEntries.projectId, filters.projectId))
      }
      if (filters?.storyId) {
        conditions.push(eq(timeEntries.storyId, filters.storyId))
      }
      if (filters?.userId) {
        conditions.push(eq(timeEntries.userId, filters.userId))
      }
      if (filters?.invoiceId !== undefined) {
        if (filters.invoiceId === null) {
          conditions.push(isNull(timeEntries.invoiceId))
        } else {
          conditions.push(eq(timeEntries.invoiceId, filters.invoiceId))
        }
      }
      if (filters?.billable !== undefined) {
        conditions.push(eq(timeEntries.billable, filters.billable))
      }
      if (filters?.startDate) {
        conditions.push(gte(timeEntries.startedAt, filters.startDate))
      }
      if (filters?.endDate) {
        conditions.push(lte(timeEntries.startedAt, filters.endDate))
      }

      return await db
        .select({
          id: timeEntries.id,
          organizationId: timeEntries.organizationId,
          clientId: timeEntries.clientId,
          projectId: timeEntries.projectId,
          storyId: timeEntries.storyId,
          userId: timeEntries.userId,
          startedAt: timeEntries.startedAt,
          endedAt: timeEntries.endedAt,
          durationMinutes: timeEntries.durationMinutes,
          description: timeEntries.description,
          billable: timeEntries.billable,
          billingRate: timeEntries.billingRate,
          invoiceId: timeEntries.invoiceId,
          createdAt: timeEntries.createdAt,
          updatedAt: timeEntries.updatedAt,
          // Join data
          story: {
            id: stories.id,
            title: stories.title,
            projectId: stories.projectId,
          },
          project: {
            id: projects.id,
            name: projects.name,
            clientId: projects.clientId,
          },
          client: {
            id: clients.id,
            name: clients.name,
          },
          user: {
            id: users.id,
            name: users.name,
            email: users.email,
          },
        })
        .from(timeEntries)
        .leftJoin(stories, eq(timeEntries.storyId, stories.id))
        .leftJoin(projects, eq(timeEntries.projectId, projects.id))
        .leftJoin(clients, eq(timeEntries.clientId, clients.id))
        .leftJoin(users, eq(timeEntries.userId, users.id))
        .where(and(...conditions))
        .orderBy(desc(timeEntries.startedAt))
    } catch (error) {
      console.error('Get time entries error:', error)
      throw new Error('Failed to fetch time entries')
    }
  }

  /**
   * Get time entry by ID
   */
  async getTimeEntryById(entryId: string) {
    try {
      const [entry] = await db
        .select()
        .from(timeEntries)
        .where(
          and(
            eq(timeEntries.id, entryId),
            eq(timeEntries.organizationId, this.userContext.organizationId)
          )
        )
        .limit(1)

      return entry || null
    } catch (error) {
      console.error('Get time entry by ID error:', error)
      throw new Error('Failed to fetch time entry')
    }
  }

  /**
   * Create a new time entry
   */
  async createTimeEntry(input: CreateTimeEntryInput) {
    try {
      const entryId = generateId()

      // Calculate duration if endedAt is provided
      let durationMinutes = input.durationMinutes
      if (input.endedAt && input.startedAt && !durationMinutes) {
        durationMinutes = Math.round((input.endedAt.getTime() - input.startedAt.getTime()) / (1000 * 60))
      }

      const [newEntry] = await db
        .insert(timeEntries)
        .values({
          id: entryId,
          organizationId: this.userContext.organizationId,
          clientId: input.clientId || null,
          projectId: input.projectId || null,
          storyId: input.storyId || null,
          userId: input.userId,
          startedAt: input.startedAt,
          endedAt: input.endedAt || null,
          durationMinutes: durationMinutes || null,
          description: input.description || null,
          billable: input.billable !== undefined ? input.billable : true,
          billingRate: input.billingRate ? input.billingRate.toString() : null,
        })
        .returning()

      return newEntry
    } catch (error) {
      console.error('Create time entry error:', error)
      throw new Error('Failed to create time entry')
    }
  }

  /**
   * Update time entry
   */
  async updateTimeEntry(entryId: string, input: UpdateTimeEntryInput) {
    try {
      const updateData: any = {
        updatedAt: new Date(),
      }

      if (input.startedAt !== undefined) updateData.startedAt = input.startedAt
      if (input.endedAt !== undefined) {
        updateData.endedAt = input.endedAt
        // Recalculate duration if both dates are provided
        if (input.startedAt !== undefined && input.endedAt) {
          updateData.durationMinutes = Math.round((input.endedAt.getTime() - input.startedAt.getTime()) / (1000 * 60))
        } else if (input.endedAt) {
          // Need to get existing startedAt
          const existing = await this.getTimeEntryById(entryId)
          if (existing?.startedAt) {
            updateData.durationMinutes = Math.round((input.endedAt.getTime() - existing.startedAt.getTime()) / (1000 * 60))
          }
        }
      }
      if (input.durationMinutes !== undefined) updateData.durationMinutes = input.durationMinutes
      if (input.description !== undefined) updateData.description = input.description
      if (input.billable !== undefined) updateData.billable = input.billable
      if (input.billingRate !== undefined) {
        updateData.billingRate = input.billingRate ? input.billingRate.toString() : null
      }

      const [updatedEntry] = await db
        .update(timeEntries)
        .set(updateData)
        .where(
          and(
            eq(timeEntries.id, entryId),
            eq(timeEntries.organizationId, this.userContext.organizationId)
          )
        )
        .returning()

      if (!updatedEntry) {
        throw new Error('Time entry not found')
      }

      return updatedEntry
    } catch (error: any) {
      console.error('Update time entry error:', error)
      if (error.message === 'Time entry not found') {
        throw error
      }
      throw new Error('Failed to update time entry')
    }
  }

  /**
   * Delete time entry
   */
  async deleteTimeEntry(entryId: string) {
    try {
      const [deletedEntry] = await db
        .delete(timeEntries)
        .where(
          and(
            eq(timeEntries.id, entryId),
            eq(timeEntries.organizationId, this.userContext.organizationId)
          )
        )
        .returning()

      if (!deletedEntry) {
        throw new Error('Time entry not found')
      }

      return deletedEntry
    } catch (error: any) {
      console.error('Delete time entry error:', error)
      if (error.message === 'Time entry not found') {
        throw error
      }
      throw new Error('Failed to delete time entry')
    }
  }

  /**
   * Get unbilled time entries for a client
   */
  async getUnbilledTimeEntries(clientId: string) {
    return this.getTimeEntries({
      clientId,
      invoiceId: null,
      billable: true,
    })
  }

  /**
   * Check for overlapping time entries for a user
   */
  async findOverlappingEntries(userId: string, startedAt: Date, endedAt?: Date, excludeEntryId?: string) {
    try {
      const conditions = [
        eq(timeEntries.userId, userId),
        eq(timeEntries.organizationId, this.userContext.organizationId),
      ]

      if (excludeEntryId) {
        conditions.push(sql`${timeEntries.id} != ${excludeEntryId}`)
      }

      // If endedAt is provided, check for overlaps
      if (endedAt) {
        conditions.push(
          sql`(
            (${timeEntries.startedAt} <= ${endedAt} AND (${timeEntries.endedAt} IS NULL OR ${timeEntries.endedAt} >= ${startedAt}))
          )`
        )
      } else {
        // If no endedAt (running timer), check if any entry overlaps with startedAt
        conditions.push(
          sql`(
            ${timeEntries.startedAt} <= ${startedAt} AND (${timeEntries.endedAt} IS NULL OR ${timeEntries.endedAt} >= ${startedAt})
          )`
        )
      }

      return await db
        .select()
        .from(timeEntries)
        .where(and(...conditions))
    } catch (error) {
      console.error('Find overlapping entries error:', error)
      throw new Error('Failed to check for overlapping entries')
    }
  }

  /**
   * Get total hours for a story
   */
  async getTotalHoursForStory(storyId: string) {
    try {
      const [result] = await db.execute(sql`
        SELECT 
          COALESCE(SUM(${timeEntries.durationMinutes}), 0)::int as total_minutes
        FROM ${timeEntries}
        WHERE ${timeEntries.storyId} = ${storyId}
        AND ${timeEntries.organizationId} = ${this.userContext.organizationId}
      `) as any[]

      return {
        totalMinutes: Number(result?.total_minutes) || 0,
        totalHours: (Number(result?.total_minutes) || 0) / 60,
      }
    } catch (error) {
      console.error('Get total hours for story error:', error)
      throw new Error('Failed to calculate total hours')
    }
  }

  /**
   * Get total hours for a client
   */
  async getTotalHoursForClient(clientId: string, billableOnly: boolean = false) {
    try {
      const conditions = [
        sql`${timeEntries.clientId} = ${clientId}`,
        sql`${timeEntries.organizationId} = ${this.userContext.organizationId}`,
      ]

      if (billableOnly) {
        conditions.push(sql`${timeEntries.billable} = true`)
      }

      const [result] = await db.execute(sql`
        SELECT 
          COALESCE(SUM(${timeEntries.durationMinutes}), 0)::int as total_minutes,
          COUNT(*)::int as entry_count
        FROM ${timeEntries}
        WHERE ${and(...conditions)}
      `) as any[]

      return {
        totalMinutes: Number(result?.total_minutes) || 0,
        totalHours: (Number(result?.total_minutes) || 0) / 60,
        entryCount: Number(result?.entry_count) || 0,
      }
    } catch (error) {
      console.error('Get total hours for client error:', error)
      throw new Error('Failed to calculate total hours')
    }
  }
}

