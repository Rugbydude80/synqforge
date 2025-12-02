import { TimeEntriesRepository } from '@/lib/repositories/time-entries'
import { ClientsRepository } from '@/lib/repositories/clients'
import { db } from '@/lib/db'
import { stories, projects } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { UserContext } from '@/lib/middleware/auth'
import type { CreateTimeEntryInput, UpdateTimeEntryInput, TimeEntryFilters } from '@/lib/repositories/time-entries'

export class TimeTrackingService {
  private timeEntriesRepo: TimeEntriesRepository
  private clientsRepo: ClientsRepository

  constructor(userContext: UserContext) {
    this.timeEntriesRepo = new TimeEntriesRepository(userContext)
    this.clientsRepo = new ClientsRepository(userContext)
  }

  /**
   * Start timer for a story
   */
  async startTimer(storyId: string, userId: string, description?: string) {
    // Check for overlapping entries
    const now = new Date()
    const overlapping = await this.timeEntriesRepo.findOverlappingEntries(userId, now)
    
    if (overlapping.length > 0) {
      throw new Error('You already have a running timer. Please stop it first.')
    }

    // Get story to determine client/project context
    const [story] = await db
      .select({
        id: stories.id,
        projectId: stories.projectId,
      })
      .from(stories)
      .where(eq(stories.id, storyId))
      .limit(1)

    // Get project to get clientId
    let clientId: string | undefined
    if (story?.projectId) {
      const [project] = await db
        .select({
          id: projects.id,
          clientId: projects.clientId,
        })
        .from(projects)
        .where(eq(projects.id, story.projectId))
        .limit(1)
      
      clientId = project?.clientId || undefined
    }

    // Resolve billing rate
    const billingRate = await this.resolveBillingRate(
      clientId,
      story?.projectId || undefined,
      undefined
    )

    const input: CreateTimeEntryInput = {
      storyId,
      userId,
      startedAt: now,
      description,
      billingRate: billingRate ?? undefined,
    }

    if (clientId) {
      input.clientId = clientId
    }
    if (story?.projectId) {
      input.projectId = story.projectId
    }

    return this.timeEntriesRepo.createTimeEntry(input)
  }

  /**
   * Stop timer
   */
  async stopTimer(entryId: string) {
    const entry = await this.timeEntriesRepo.getTimeEntryById(entryId)
    if (!entry) {
      throw new Error('Time entry not found')
    }

    if (entry.endedAt) {
      throw new Error('Timer is already stopped')
    }

    const now = new Date()
    const durationMinutes = Math.round((now.getTime() - entry.startedAt.getTime()) / (1000 * 60))

    return this.timeEntriesRepo.updateTimeEntry(entryId, {
      endedAt: now,
      durationMinutes,
    })
  }

  /**
   * Create manual time entry
   */
  async createTimeEntry(input: CreateTimeEntryInput) {
    // Validate no overlapping entries if both start and end are provided
    if (input.startedAt && input.endedAt) {
      const overlapping = await this.timeEntriesRepo.findOverlappingEntries(
        input.userId,
        input.startedAt,
        input.endedAt
      )

      if (overlapping.length > 0) {
        throw new Error('Time entry overlaps with existing entry. Please adjust the time range.')
      }
    }

    // Resolve billing rate if not provided
    if (!input.billingRate) {
      const rate = await this.resolveBillingRate(
        input.clientId,
        input.projectId,
        undefined
      )
      input.billingRate = rate ?? undefined
    }

    return this.timeEntriesRepo.createTimeEntry(input)
  }

  /**
   * Update time entry
   */
  async updateTimeEntry(entryId: string, input: UpdateTimeEntryInput) {
    const existing = await this.timeEntriesRepo.getTimeEntryById(entryId)
    if (!existing) {
      throw new Error('Time entry not found')
    }

    // Validate no overlapping entries if dates are being changed
    if (input.startedAt || input.endedAt) {
      const startDate = input.startedAt || existing.startedAt
      const endDate = input.endedAt || existing.endedAt

      if (startDate && endDate) {
        const overlapping = await this.timeEntriesRepo.findOverlappingEntries(
          existing.userId,
          startDate,
          endDate,
          entryId
        )

        if (overlapping.length > 0) {
          throw new Error('Updated time entry overlaps with existing entry.')
        }
      }
    }

    return this.timeEntriesRepo.updateTimeEntry(entryId, input)
  }

  /**
   * Get time entries with filters
   */
  async getTimeEntries(filters?: TimeEntryFilters) {
    return this.timeEntriesRepo.getTimeEntries(filters)
  }

  /**
   * Get total hours for a story
   */
  async getTotalHoursForStory(storyId: string) {
    return this.timeEntriesRepo.getTotalHoursForStory(storyId)
  }

  /**
   * Get total hours for a client
   */
  async getTotalHoursForClient(clientId: string, billableOnly: boolean = false) {
    return this.timeEntriesRepo.getTotalHoursForClient(clientId, billableOnly)
  }

  /**
   * Get billable hours for a client
   */
  async getBillableHours(clientId: string) {
    return this.timeEntriesRepo.getTotalHoursForClient(clientId, true)
  }

  /**
   * Validate no overlapping time entries for a user
   */
  async validateNoOverlappingEntries(userId: string, startedAt: Date, endedAt?: Date, excludeEntryId?: string) {
    const overlapping = await this.timeEntriesRepo.findOverlappingEntries(
      userId,
      startedAt,
      endedAt,
      excludeEntryId
    )

    return {
      isValid: overlapping.length === 0,
      overlappingEntries: overlapping,
    }
  }

  /**
   * Resolve billing rate hierarchy: client default → project override → entry override
   */
  async resolveBillingRate(clientId?: string, projectId?: string, entryRate?: number): Promise<number | null> {
    // Entry-level override takes precedence
    if (entryRate !== undefined && entryRate !== null) {
      return entryRate
    }

    // Project-level override
    if (projectId) {
      const [project] = await db
        .select({ billingRate: projects.billingRate })
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1)

      if (project?.billingRate) {
        return parseFloat(project.billingRate)
      }
    }

    // Client default
    if (clientId) {
      const client = await this.clientsRepo.getClientById(clientId)
      if (client?.defaultBillingRate) {
        return parseFloat(client.defaultBillingRate)
      }
    }

    return null
  }
}

