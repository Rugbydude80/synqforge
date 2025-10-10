/**
 * Presence Indicators Component
 * Shows active users viewing the current sprint/story
 */

'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface PresenceMember {
  userId: string
  userName: string
  userEmail: string
  currentView?: string
  isTyping?: boolean
}

interface PresenceIndicatorsProps {
  members: PresenceMember[]
  maxVisible?: number
  size?: 'sm' | 'md' | 'lg'
}

export function PresenceIndicators({
  members,
  maxVisible = 5,
  size = 'md',
}: PresenceIndicatorsProps) {
  if (members.length === 0) {
    return null
  }

  const visibleMembers = members.slice(0, maxVisible)
  const hiddenCount = Math.max(0, members.length - maxVisible)

  const sizeClasses = {
    sm: 'h-6 w-6 text-xs',
    md: 'h-8 w-8 text-sm',
    lg: 'h-10 w-10 text-base',
  }

  const sizeClass = sizeClasses[size]

  return (
    <TooltipProvider>
      <div className="flex items-center -space-x-2">
        {visibleMembers.map((member) => (
          <Tooltip key={member.userId}>
            <TooltipTrigger asChild>
              <div className="relative">
                <Avatar className={`${sizeClass} border-2 border-background ring-2 ring-brand-emerald-500`}>
                  <AvatarImage
                    src={`https://api.dicebear.com/7.x/initials/svg?seed=${member.userName}`}
                    alt={member.userName}
                  />
                  <AvatarFallback className="bg-brand-purple-100 text-brand-purple-700 dark:bg-brand-purple-900 dark:text-brand-purple-100">
                    {getInitials(member.userName)}
                  </AvatarFallback>
                </Avatar>
                {/* Typing indicator */}
                {member.isTyping && (
                  <div className="absolute -bottom-1 -right-1">
                    <div className="flex items-center space-x-0.5 bg-brand-emerald-500 rounded-full px-1.5 py-0.5">
                      <span className="w-1 h-1 bg-white rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-1 h-1 bg-white rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-1 h-1 bg-white rounded-full animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                )}
                {/* Active indicator */}
                {!member.isTyping && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-brand-emerald-500 border-2 border-background rounded-full" />
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-sm">
                <div className="font-medium">{member.userName}</div>
                <div className="text-muted-foreground text-xs">{member.userEmail}</div>
                {member.currentView && (
                  <div className="text-xs text-brand-emerald-600 dark:text-brand-emerald-400 mt-1">
                    Viewing: {formatView(member.currentView)}
                  </div>
                )}
                {member.isTyping && (
                  <div className="text-xs text-brand-emerald-600 dark:text-brand-emerald-400 mt-1">
                    Typing...
                  </div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        ))}

        {hiddenCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={`${sizeClass} flex items-center justify-center rounded-full bg-muted border-2 border-background text-muted-foreground font-medium cursor-pointer hover:bg-muted/80`}
              >
                +{hiddenCount}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-sm">
                {members.slice(maxVisible).map((member) => (
                  <div key={member.userId} className="py-0.5">
                    {member.userName}
                  </div>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  )
}

/**
 * Lightweight presence badge for smaller contexts
 */
export function PresenceBadge({ count }: { count: number }) {
  if (count === 0) return null

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-brand-emerald-100 dark:bg-brand-emerald-900/30 text-brand-emerald-700 dark:text-brand-emerald-300 text-xs font-medium">
      <div className="w-2 h-2 bg-brand-emerald-500 rounded-full animate-pulse" />
      {count} {count === 1 ? 'viewer' : 'viewers'}
    </div>
  )
}

/**
 * Connection status indicator
 */
export function ConnectionStatus({
  isConnected,
  reconnecting,
}: {
  isConnected: boolean
  reconnecting: boolean
}) {
  if (isConnected) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-brand-emerald-100 dark:bg-brand-emerald-900/30 text-brand-emerald-700 dark:text-brand-emerald-300 text-xs font-medium">
              <div className="w-2 h-2 bg-brand-emerald-500 rounded-full" />
              Live
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Real-time updates enabled</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  if (reconnecting) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-xs font-medium">
        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
        Reconnecting...
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-medium">
      <div className="w-2 h-2 bg-red-500 rounded-full" />
      Offline
    </div>
  )
}

// Helper functions
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatView(view: string): string {
  // Format "sprint:123" -> "Sprint #123"
  const [type, id] = view.split(':')
  if (!type || !id) return view

  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1)
  return `${typeLabel} #${id.slice(0, 8)}`
}
