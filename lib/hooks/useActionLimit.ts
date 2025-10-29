/**
 * useActionLimit Hook
 * 
 * React hook for checking AI action limits before generation.
 * Usage:
 * 
 * const { checkLimit, allowed, remaining } = useActionLimit(organizationId)
 * 
 * const handleGenerate = async () => {
 *   const result = await checkLimit()
 *   if (!result.allowed) {
 *     showUpgradePrompt(result.reason)
 *     return
 *   }
 *   // Proceed with generation
 * }
 */

'use client'

import { useState, useCallback } from 'react'

interface ActionLimitResult {
  allowed: boolean
  actionsRemaining: number
  currentUsage: number
  limit: number
  rolloverBalance?: number
  reason?: string
  suggestedPlan?: string
}

export function useActionLimit(organizationId: string) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<ActionLimitResult | null>(null)

  const checkLimit = useCallback(async (estimatedActions: number = 1): Promise<ActionLimitResult> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/subscriptions/enforce-limit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId,
          estimatedActions,
        }),
      })

      const data = await response.json()

      // Handle 402 Payment Required (limit exceeded)
      if (response.status === 402) {
        const result: ActionLimitResult = {
          allowed: false,
          actionsRemaining: 0,
          currentUsage: data.currentUsage || 0,
          limit: data.limit || 0,
          rolloverBalance: data.rolloverBalance,
          reason: data.reason || 'Action limit exceeded',
          suggestedPlan: data.suggestedPlan,
        }
        setLastResult(result)
        return result
      }

      // Handle other errors
      if (!response.ok) {
        throw new Error(data.message || 'Failed to check action limit')
      }

      // Success
      const result: ActionLimitResult = {
        allowed: true,
        actionsRemaining: data.actionsRemaining || 0,
        currentUsage: data.currentUsage || 0,
        limit: data.limit || 0,
        rolloverBalance: data.rolloverBalance,
      }
      setLastResult(result)
      return result

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check action limit'
      setError(errorMessage)
      
      // Return safe default (blocked)
      return {
        allowed: false,
        actionsRemaining: 0,
        currentUsage: 0,
        limit: 0,
        reason: errorMessage,
      }
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  return {
    checkLimit,
    loading,
    error,
    lastResult,
    allowed: lastResult?.allowed ?? null,
    remaining: lastResult?.actionsRemaining ?? null,
  }
}

