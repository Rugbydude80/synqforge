/**
 * Real-time Collaboration Service using Ably
 * Handles WebSocket connections, presence tracking, and live updates
 */

import Ably from 'ably'

// Initialize Ably client (server-side only)
let ablyClient: Ably.Realtime | null = null

function getAblyClient(): Ably.Realtime | null {
  if (!process.env.ABLY_API_KEY) {
    // In development, return null if ABLY_API_KEY is not configured
    // This allows the app to build without real-time features
    if (process.env.NODE_ENV === 'development') {
      console.warn('ABLY_API_KEY not configured - real-time features disabled')
      return null
    }
    throw new Error('ABLY_API_KEY not configured')
  }

  if (!ablyClient) {
    ablyClient = new Ably.Realtime({
      key: process.env.ABLY_API_KEY,
      echoMessages: false,
    })
  }

  return ablyClient
}

// Event types for real-time updates
export type RealtimeEventType =
  | 'story:updated'
  | 'story:moved'
  | 'story:assigned'
  | 'story:commented'
  | 'sprint:updated'
  | 'epic:updated'
  | 'presence:join'
  | 'presence:leave'
  | 'user:typing'

export interface RealtimeEvent<T = any> {
  type: RealtimeEventType
  userId: string
  timestamp: number
  data: T
}

// Presence data for collaborative features
export interface PresenceData {
  userId: string
  userName: string
  userEmail: string
  currentView?: string
  cursor?: { x: number; y: number }
  isTyping?: boolean
}

export class RealtimeService {
  private client: Ably.Realtime | null

  constructor() {
    this.client = getAblyClient()
  }

  /**
   * Check if real-time features are enabled
   */
  isEnabled(): boolean {
    return this.client !== null
  }

  /**
   * Get Ably authentication token for client-side connection
   */
  async createTokenRequest(clientId: string) {
    if (!this.client) {
      throw new Error('Real-time service not configured')
    }

    const tokenRequest = await this.client.auth.createTokenRequest({
      clientId,
      capability: {
        '*': ['subscribe', 'publish', 'presence'],
      },
    })

    return tokenRequest
  }

  /**
   * Publish event to a channel
   */
  async publish<T>(
    channelName: string,
    eventType: RealtimeEventType,
    userId: string,
    data: T
  ) {
    if (!this.client) {
      // Silently skip in development if not configured
      return
    }

    const channel = this.client.channels.get(channelName)

    const event: RealtimeEvent<T> = {
      type: eventType,
      userId,
      timestamp: Date.now(),
      data,
    }

    await channel.publish(eventType, event)
  }

  /**
   * Broadcast story update to all listeners
   */
  async broadcastStoryUpdate(
    organizationId: string,
    projectId: string,
    storyId: string,
    userId: string,
    changes: any
  ) {
    const channelName = `project:${organizationId}:${projectId}`

    await this.publish(channelName, 'story:updated', userId, {
      storyId,
      changes,
    })
  }

  /**
   * Broadcast story moved (kanban drag-drop)
   */
  async broadcastStoryMoved(
    organizationId: string,
    projectId: string,
    storyId: string,
    userId: string,
    fromStatus: string,
    toStatus: string
  ) {
    const channelName = `project:${organizationId}:${projectId}`

    await this.publish(channelName, 'story:moved', userId, {
      storyId,
      fromStatus,
      toStatus,
    })
  }

  /**
   * Broadcast sprint update
   */
  async broadcastSprintUpdate(
    organizationId: string,
    projectId: string,
    sprintId: string,
    userId: string,
    changes: any
  ) {
    const channelName = `project:${organizationId}:${projectId}`

    await this.publish(channelName, 'sprint:updated', userId, {
      sprintId,
      changes,
    })
  }

  /**
   * Broadcast new comment
   */
  async broadcastNewComment(
    organizationId: string,
    storyId: string,
    userId: string,
    commentData: any
  ) {
    const channelName = `story:${organizationId}:${storyId}`

    await this.publish(channelName, 'story:commented', userId, commentData)
  }

  /**
   * Get presence members for a channel
   */
  async getPresence(channelName: string): Promise<PresenceData[]> {
    if (!this.client) {
      return []
    }

    const channel = this.client.channels.get(channelName)
    const presenceSet = await channel.presence.get()

    return presenceSet.map((member) => member.data as PresenceData)
  }

  /**
   * Update presence for a user
   */
  async updatePresence(channelName: string, data: PresenceData) {
    if (!this.client) {
      return
    }

    const channel = this.client.channels.get(channelName)
    await channel.presence.enter(data)
  }

  /**
   * Remove presence for a user
   */
  async leavePresence(channelName: string) {
    if (!this.client) {
      return
    }

    const channel = this.client.channels.get(channelName)
    await channel.presence.leave()
  }

  /**
   * Close connection
   */
  async disconnect() {
    if (ablyClient) {
      ablyClient.close()
      ablyClient = null
    }
  }
}

// Singleton instance
export const realtimeService = new RealtimeService()
