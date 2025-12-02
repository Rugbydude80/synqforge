'use client'

import * as React from 'react'
import { Play, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface TimerButtonProps {
  storyId: string
  onTimerStart?: (entryId: string) => void
  onTimerStop?: () => void
}

export function TimerButton({ storyId, onTimerStart, onTimerStop }: TimerButtonProps) {
  const [isRunning, setIsRunning] = React.useState(false)
  const [currentEntryId, setCurrentEntryId] = React.useState<string | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0)
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null)

  // Check for running timer on mount
  React.useEffect(() => {
    checkRunningTimer()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId])

  // Update elapsed time display
  React.useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1)
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning])

  const checkRunningTimer = async () => {
    try {
      const response = await fetch(`/api/stories/${storyId}/time`, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        // Check if there's a running timer (entry without endedAt)
        const runningEntry = data.data?.find((e: any) => !e.endedAt)
        if (runningEntry) {
          setIsRunning(true)
          setCurrentEntryId(runningEntry.id)
          // Calculate elapsed time
          const startTime = new Date(runningEntry.startedAt).getTime()
          const now = Date.now()
          setElapsedSeconds(Math.floor((now - startTime) / 1000))
        }
      }
    } catch (error) {
      console.error('Error checking timer:', error)
    }
  }

  const handleStart = async () => {
    try {
      const response = await fetch(`/api/stories/${storyId}/time?action=start`, {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to start timer')
      }

      const data = await response.json()
      setIsRunning(true)
      setCurrentEntryId(data.data.id)
      setElapsedSeconds(0)
      onTimerStart?.(data.data.id)
      toast.success('Timer started')
    } catch (error: any) {
      toast.error(error.message || 'Failed to start timer')
    }
  }

  const handleStop = async () => {
    if (!currentEntryId) return

    try {
      const response = await fetch(`/api/stories/${storyId}/time?action=stop`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId: currentEntryId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to stop timer')
      }

      const data = await response.json()
      setIsRunning(false)
      setCurrentEntryId(null)
      setElapsedSeconds(0)
      onTimerStop?.()
      toast.success(`Timer stopped. ${(data.data.durationMinutes || 0) / 60} hours tracked`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to stop timer')
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Button
      variant={isRunning ? 'destructive' : 'default'}
      size="sm"
      onClick={isRunning ? handleStop : handleStart}
      className="gap-2"
    >
      {isRunning ? (
        <>
          <Square className="h-4 w-4" />
          Stop {formatTime(elapsedSeconds)}
        </>
      ) : (
        <>
          <Play className="h-4 w-4" />
          Start Timer
        </>
      )}
    </Button>
  )
}

