/**
 * Centralized error handling with Sentry integration
 */

import { logger } from '@/lib/observability/logger'
import { metrics, METRICS } from '@/lib/observability/metrics'

export enum ErrorCode {
  // Authentication
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',

  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',

  // Resources
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',

  // Billing
  INSUFFICIENT_CREDITS = 'INSUFFICIENT_CREDITS',
  SUBSCRIPTION_REQUIRED = 'SUBSCRIPTION_REQUIRED',
  PAYMENT_REQUIRED = 'PAYMENT_REQUIRED',

  // AI Services
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  AI_TIMEOUT = 'AI_TIMEOUT',
  AI_RATE_LIMIT = 'AI_RATE_LIMIT',

  // System
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR = 'DATABASE_ERROR',
}

export class AppError extends Error {
  public readonly code: ErrorCode
  public readonly statusCode: number
  public readonly isOperational: boolean
  public readonly context?: Record<string, any>

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, any>
  ) {
    super(message)
    this.code = code
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.context = context

    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * Handle errors and send to monitoring services
 */
export function handleError(error: Error | AppError, context?: Record<string, any>): void {
  // Log error
  logger.error(error.message, error, context)

  // Track error metric
  metrics.increment(METRICS.API_ERROR, 1, {
    error_code: error instanceof AppError ? error.code : 'UNKNOWN',
  })

  // Send to Sentry in production
  if (process.env.NODE_ENV === 'production') {
    // Sentry.captureException(error, { extra: context })
  }

  // Alert for critical errors
  if (error instanceof AppError && !error.isOperational) {
    // Send to PagerDuty/OpsGenie
    alertOnCallTeam(error, context)
  }
}

function alertOnCallTeam(error: AppError, context?: Record<string, any>): void {
  // In production, send to PagerDuty, OpsGenie, or Slack
  console.error('[CRITICAL] Non-operational error detected:', error.message, context)
}

/**
 * Create specific error types
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, ErrorCode.UNAUTHORIZED, 401)
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, ErrorCode.FORBIDDEN, 403)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, ErrorCode.NOT_FOUND, 404)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, ErrorCode.VALIDATION_ERROR, 400, true, context)
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
    super(message, ErrorCode.RATE_LIMIT_EXCEEDED, 429, true, { retryAfter })
  }
}

export class QuotaExceededError extends AppError {
  constructor(message: string = 'Quota exceeded') {
    super(message, ErrorCode.QUOTA_EXCEEDED, 429)
  }
}

export class SubscriptionRequiredError extends AppError {
  constructor(feature: string, requiredTier: string) {
    super(
      `${feature} requires ${requiredTier} plan`,
      ErrorCode.SUBSCRIPTION_REQUIRED,
      402,
      true,
      { feature, requiredTier }
    )
  }
}

export class AIServiceError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, ErrorCode.AI_SERVICE_ERROR, 500, true, context)
  }
}
