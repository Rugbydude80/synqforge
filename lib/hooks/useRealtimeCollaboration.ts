/**
 * Real-time Collaboration Hook
 * Manages WebSocket connections, presence, and live updates
 */

'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Ably from 'ably'
import { useSession } from 'next-auth/react'

interface UseRealtimeOptions {
  organizationId: string
  projectId: string
  onStoryUpdate?: (event: any) => void
  onStoryMoved?: (event: any) => void
  onSprintUpdate?: (event: any) => void
  onComment?: (event: any) => void
  onPresenceChange?: (members: PresenceData[]) => void
}

interface PresenceData {
  userId: string
  userName: string
  userEmail: string
  currentView?: string
  cursor?: { x: number; y: number }
  isTyping?: boolean
}

export function useRealtimeCollaboration(options: UseRealtimeOptions) {
  const { data: session } = useSession()
  const [isConnected, setIsConnected] = useState(false)
  const [presenceMembers, setPresenceMembers] = useState<PresenceData[]>([])
  const [reconnecting, setReconnecting] = useState(false)
  const ablyRef = useRef<Ably.Realtime | null>(null)
  const channelRef = useRef<Ably.RealtimeChannel | null>(null)

  const channelName = `project:${options.organizationId}:${options.projectId}`

  // Initialize Ably connection
  useEffect(() => {
    if (!session?.user?.id) return

    let mounted = true

    async function connect() {
      try {
        // Get auth token from server
        const response = await fetch('/api/realtime/auth', {
          method: 'POST',
        })

        if (!response.ok) {
          throw new Error('Failed to authenticate')
        }

        await response.json()

        // Create Ably client with token
        const ably = new Ably.Realtime({
          authCallback: async (_tokenParams, callback) => {
            try {
              const res = await fetch('/api/realtime/auth', { method: 'POST' })
              const data = await res.json()
              callback(null, data.tokenRequest)
            } catch (error) {
              callback(String(error), null)
            }
          },
          echoMessages: false,
        })

        if (!mounted) {
          ably.close()
          return
        }

        ablyRef.current = ably

        // Connection state handlers
        ably.connection.on('connected', () => {
          if (mounted) {
            setIsConnected(true)
            setReconnecting(false)
            console.log('[Realtime] Connected to Ably')
          }
        })

        ably.connection.on('disconnected', () => {
          if (mounted) {
            setIsConnected(false)
            console.log('[Realtime] Disconnected from Ably')
          }
        })

        ably.connection.on('connecting', () => {
          if (mounted) {
            setReconnecting(true)
            console.log('[Realtime] Reconnecting...')
          }
        })

        ably.connection.on('failed', (error) => {
          if (mounted) {
            setIsConnected(false)
            setReconnecting(false)
            console.error('[Realtime] Connection failed:', error)
          }
        })

        // Get channel
        const channel = ably.channels.get(channelName)
        channelRef.current = channel

        // Subscribe to events
        channel.subscribe('story:updated', (message) => {
          if (mounted && options.onStoryUpdate) {
            options.onStoryUpdate(message.data)
          }
        })

        channel.subscribe('story:moved', (message) => {
          if (mounted && options.onStoryMoved) {
            options.onStoryMoved(message.data)
          }
        })

        channel.subscribe('sprint:updated', (message) => {
          if (mounted && options.onSprintUpdate) {
            options.onSprintUpdate(message.data)
          }
        })

        channel.subscribe('story:commented', (message) => {
          if (mounted && options.onComment) {
            options.onComment(message.data)
          }
        })

        // Presence handlers
        channel.presence.subscribe('enter', () => {
          if (mounted) {
            updatePresenceMembers()
          }
        })

        channel.presence.subscribe('leave', () => {
          if (mounted) {
            updatePresenceMembers()
          }
        })

        channel.presence.subscribe('update', () => {
          if (mounted) {
            updatePresenceMembers()
          }
        })

        // Enter presence
        if (session?.user?.id && session?.user?.email) {
          await channel.presence.enter({
            userId: session.user.id,
            userName: session.user.name || session.user.email,
            userEmail: session.user.email,
          })
        }

        // Get initial presence
        updatePresenceMembers()
      } catch (error) {
        console.error('[Realtime] Connection error:', error)
        if (mounted) {
          setIsConnected(false)
          setReconnecting(false)
        }
      }
    }

    async function updatePresenceMembers() {
      if (!channelRef.current) return

      try {
        const members = await channelRef.current.presence.get()
        if (mounted) {
          const presenceData = members.map((m) => m.data as PresenceData)
          setPresenceMembers(presenceData)
          if (options.onPresenceChange) {
            options.onPresenceChange(presenceData)
          }
        }
      } catch (error) {
        console.error('[Realtime] Failed to get presence:', error)
      }
    }

    connect()

    return () => {
      mounted = false
      if (channelRef.current) {
        channelRef.current.presence.leave()
        channelRef.current.unsubscribe()
      }
      if (ablyRef.current) {
        ablyRef.current.close()
      }
    }
  }, [session?.user?.id, channelName])

  // Update presence data
  const updatePresence = useCallback(
    async (data: Partial<PresenceData>) => {
      if (!channelRef.current || !session?.user) return

      try {
        await channelRef.current.presence.update({
          userId: session.user.id,
          userName: session.user.name || session.user.email,
          userEmail: session.user.email!,
          ...data,
        })
      } catch (error) {
        console.error('[Realtime] Failed to update presence:', error)
      }
    },
    [session?.user]
  )

  // Publish story update
  const publishStoryUpdate = useCallback(
    async (storyId: string, changes: any) => {
      if (!channelRef.current || !session?.user?.id) return

      try {
        await channelRef.current.publish('story:updated', {
          type: 'story:updated',
          userId: session.user.id,
          timestamp: Date.now(),
          data: { storyId, changes },
        })
      } catch (error) {
        console.error('[Realtime] Failed to publish story update:', error)
      }
    },
    [session?.user?.id]
  )

  return {
    isConnected,
    reconnecting,
    presenceMembers,
    updatePresence,
    publishStoryUpdate,
  }
}
