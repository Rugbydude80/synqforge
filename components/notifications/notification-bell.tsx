'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Bell, Check, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import Link from 'next/link'

interface Notification {
  id: string
  type: string
  entityType: string
  entityId: string
  message: string
  read: boolean
  actionUrl: string | null
  createdAt: string
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadNotifications()
    loadUnreadCount()

    // Poll for new notifications every 30 seconds
    const interval = setInterval(() => {
      loadUnreadCount()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const loadNotifications = async () => {
    try {
      const res = await fetch('/api/notifications?limit=10')
      if (!res.ok) throw new Error('Failed to load notifications')
      const data = await res.json()
      if (Array.isArray(data)) {
        setNotifications(data)
      } else {
        setNotifications([])
      }
    } catch (_error) {
      console.error('Failed to load notifications:', _error)
      setNotifications([])
    }
  }

  const loadUnreadCount = async () => {
    try {
      const res = await fetch('/api/notifications/unread-count')
      if (!res.ok) throw new Error('Failed to load unread count')
      const data = await res.json()
      if (typeof data.count === 'number') {
        setUnreadCount(data.count)
      }
    } catch (_error) {
      console.error('Failed to load unread count:', _error)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const res = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      })

      if (!res.ok) throw new Error('Failed to mark as read')

      await loadNotifications()
      await loadUnreadCount()
    } catch {
      toast.error('Failed to mark as read')
    }
  }

  const markAllAsRead = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      })

      if (!res.ok) throw new Error('Failed to mark all as read')

      await loadNotifications()
      await loadUnreadCount()
      toast.success('All notifications marked as read')
    } catch {
      toast.error('Failed to mark all as read')
    } finally {
      setLoading(false)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'story_assigned':
        return '📋'
      case 'comment_mention':
        return '💬'
      case 'comment_reply':
        return '↩️'
      case 'sprint_starting':
        return '🚀'
      case 'story_blocked':
        return '🚫'
      case 'epic_completed':
        return '✅'
      default:
        return '🔔'
    }
  }

  return (
    <div className="relative">
      {/* Bell Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <Card className="absolute right-0 top-12 w-96 max-h-[600px] overflow-hidden shadow-lg z-50">
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">Notifications</h3>
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    disabled={loading}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Mark all read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Notification List */}
            <div className="overflow-y-auto max-h-[500px]">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b hover:bg-gray-50 transition-colors cursor-pointer ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => {
                      if (!notification.read) {
                        markAsRead(notification.id)
                      }
                      if (notification.actionUrl) {
                        setIsOpen(false)
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm mb-1">{notification.message}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(
                              new Date(notification.createdAt),
                              { addSuffix: true }
                            )}
                          </span>
                          {!notification.read && (
                            <Badge variant="secondary" className="text-xs">
                              New
                            </Badge>
                          )}
                        </div>
                        {notification.actionUrl && (
                          <Link
                            href={notification.actionUrl}
                            className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                          >
                            View →
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-2 border-t bg-gray-50 text-center">
                <Link
                  href="/notifications"
                  className="text-sm text-blue-600 hover:underline"
                  onClick={() => setIsOpen(false)}
                >
                  View all notifications
                </Link>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
