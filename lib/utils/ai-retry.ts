/**
 * AI Error Recovery Utility
 * 
 * Provides retry logic with exponential backoff for AI service calls.
 * Handles transient errors (rate limits, timeouts) vs permanent errors.
 */

export interface RetryOptions {
  maxRetries?: number
  initialDelayMs?: number
  maxDelayMs?: number
  backoffMultiplier?: number
  retryableErrors?: string[]
}

export interface RetryResult<T> {
  success: boolean
  data?: T
  error?: Error
  attempts: number
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableErrors: [
    'rate_limit',
    'rate limit',
    'timeout',
    'network',
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    '429',
    '500',
    '502',
    '503',
    '504',
  ],
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: Error, retryableErrors: string[]): boolean {
  const errorMessage = error.message.toLowerCase()
  const errorName = error.name.toLowerCase()
  const errorStack = error.stack?.toLowerCase() || ''

  return retryableErrors.some((pattern) => {
    const patternLower = pattern.toLowerCase()
    return (
      errorMessage.includes(patternLower) ||
      errorName.includes(patternLower) ||
      errorStack.includes(patternLower)
    )
  })
}

/**
 * Calculate delay for retry attempt
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  const delay = options.initialDelayMs * Math.pow(options.backoffMultiplier, attempt)
  return Math.min(delay, options.maxDelayMs)
}

/**
 * Retry a function with exponential backoff
 * 
 * @param fn Function to retry
 * @param options Retry configuration
 * @returns Result with success status, data, error, and attempt count
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options }
  let lastError: Error | undefined
  let attempts = 0

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    attempts++
    try {
      const data = await fn()
      return {
        success: true,
        data,
        attempts,
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Don't retry on last attempt
      if (attempt === config.maxRetries) {
        break
      }

      // Check if error is retryable
      if (!isRetryableError(lastError, config.retryableErrors)) {
        return {
          success: false,
          error: lastError,
          attempts,
        }
      }

      // Calculate delay and wait before retry
      const delay = calculateDelay(attempt, config)
      console.warn(
        `[AI Retry] Attempt ${attempt + 1}/${config.maxRetries} failed: ${lastError.message}. Retrying in ${delay}ms...`
      )
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  return {
    success: false,
    error: lastError || new Error('Unknown error'),
    attempts,
  }
}

/**
 * Wrap AI API call with retry logic
 */
export async function callAIWithRetry<T>(
  apiCall: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const result = await retryWithBackoff(apiCall, options)

  if (!result.success) {
    throw result.error || new Error('AI call failed after retries')
  }

  return result.data!
}

