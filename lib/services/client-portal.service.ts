import { db, generateId } from '@/lib/db'
import { clientPortalAccess, projects, stories, epics, sprints } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'
import { ClientsRepository } from '@/lib/repositories/clients'
import { Resend } from 'resend'
import { randomBytes } from 'crypto'

const resend = new Resend(process.env.RESEND_API_KEY || 'dummy_key_for_build')

export class ClientPortalService {
  private clientsRepo: ClientsRepository

  constructor(organizationId: string) {
    this.clientsRepo = new ClientsRepository({ organizationId } as any)
  }

  /**
   * Generate portal token
   */
  async generatePortalToken(clientId: string, email: string, expiresInDays: number = 30): Promise<string> {
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    await db.insert(clientPortalAccess).values({
      id: generateId(),
      clientId,
      email,
      token,
      expiresAt,
    })

    return token
  }

  /**
   * Validate portal token
   */
  async validatePortalToken(token: string): Promise<{ valid: boolean; clientId?: string; email?: string }> {
    const [access] = await db
      .select()
      .from(clientPortalAccess)
      .where(eq(clientPortalAccess.token, token))
      .limit(1)

    if (!access) {
      return { valid: false }
    }

    // Check expiration
    if (new Date() > access.expiresAt) {
      return { valid: false }
    }

    // Update last accessed
    await db
      .update(clientPortalAccess)
      .set({ lastAccessedAt: new Date() })
      .where(eq(clientPortalAccess.id, access.id))

    return {
      valid: true,
      clientId: access.clientId,
      email: access.email,
    }
  }

  /**
   * Send portal invite email
   */
  async sendPortalInvite(clientId: string, email: string, expiresInDays: number = 30) {
    const client = await this.clientsRepo.getClientById(clientId)
    if (!client) {
      throw new Error('Client not found')
    }

    const token = await this.generatePortalToken(clientId, email, expiresInDays)
    const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/client-portal/${token}`

    // Send email via Resend
    if (process.env.RESEND_API_KEY) {
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'SynqForge <notifications@synqforge.app>',
          to: email,
          subject: `Access to ${client.name} project portal`,
          html: `
            <h2>You've been granted access to ${client.name}'s project portal</h2>
            <p>Click the link below to view project progress and updates:</p>
            <p><a href="${portalUrl}">Access Portal</a></p>
            <p>This link will expire in ${expiresInDays} days.</p>
          `,
        })
      } catch (error) {
        console.error('Failed to send portal invite email:', error)
        // Don't throw - token is still created
      }
    }

    return { token, portalUrl }
  }

  /**
   * Get client projects (read-only)
   */
  async getClientProjectsReadOnly(clientId: string) {
    // Verify client belongs to organization
    const client = await this.clientsRepo.getClientById(clientId)
    if (!client) {
      throw new Error('Client not found')
    }

    // Get projects with basic stats
    const projectsData = await db.execute(sql`
      SELECT 
        ${projects.id},
        ${projects.name},
        ${projects.description},
        ${projects.status},
        ${projects.createdAt},
        COUNT(DISTINCT ${stories.id})::int as story_count,
        COUNT(DISTINCT CASE WHEN ${stories.status} = 'done' THEN ${stories.id} END)::int as completed_story_count,
        COUNT(DISTINCT ${epics.id})::int as epic_count,
        COUNT(DISTINCT ${sprints.id})::int as sprint_count
      FROM ${projects}
      LEFT JOIN ${stories} ON ${stories.projectId} = ${projects.id}
      LEFT JOIN ${epics} ON ${epics.projectId} = ${projects.id}
      LEFT JOIN ${sprints} ON ${sprints.projectId} = ${projects.id}
      WHERE ${projects.clientId} = ${clientId}
      AND ${projects.organizationId} = ${client.organizationId}
      GROUP BY ${projects.id}
      ORDER BY ${projects.createdAt} DESC
    `) as any[]

    return projectsData.map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      status: p.status,
      createdAt: p.created_at,
      storyCount: Number(p.story_count) || 0,
      completedStoryCount: Number(p.completed_story_count) || 0,
      epicCount: Number(p.epic_count) || 0,
      sprintCount: Number(p.sprint_count) || 0,
      progressPercentage: p.story_count > 0 
        ? Math.round((p.completed_story_count / p.story_count) * 100)
        : 0,
    }))
  }

  /**
   * Get client branding from settings
   */
  async getClientBranding(clientId: string) {
    const client = await this.clientsRepo.getClientById(clientId)
    if (!client) {
      return null
    }

    const settings = (client.settings as Record<string, any>) || {}
    return {
      logoUrl: client.logoUrl || settings.logoUrl,
      primaryColor: settings.primaryColor || '#6366f1',
      secondaryColor: settings.secondaryColor || '#8b5cf6',
      textColor: settings.textColor || '#1f2937',
      clientName: client.name,
    }
  }

  /**
   * Revoke portal access
   */
  async revokePortalAccess(token: string) {
    await db
      .delete(clientPortalAccess)
      .where(eq(clientPortalAccess.token, token))
  }
}

