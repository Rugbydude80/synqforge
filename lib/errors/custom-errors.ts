/**
 * Custom Error Classes for SynqForge
 * 
 * Provides specific error types for better error handling and debugging.
 * All custom errors extend the base ApplicationError class.
 * 
 * @see {@link https://nodejs.org/api/errors.html} Node.js Error Documentation
 */

/**
 * Base application error class
 * All custom errors should extend this class
 */
export class ApplicationError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      code: this.code,
      details: this.details,
      stack: process.env.NODE_ENV === 'development' ? this.stack : undefined,
    };
  }
}

/**
 * Validation Error - thrown when input validation fails
 * @example throw new ValidationError('Invalid email format', { email: 'invalid@' })
 */
export class ValidationError extends ApplicationError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

/**
 * Authentication Error - thrown when authentication fails or is missing
 * @example throw new AuthenticationError('Invalid token')
 */
export class AuthenticationError extends ApplicationError {
  constructor(message: string = 'Authentication required', details?: Record<string, any>) {
    super(message, 401, 'AUTHENTICATION_ERROR', details);
  }
}

/**
 * Authorization Error - thrown when user lacks required permissions
 * @example throw new AuthorizationError('Admin access required')
 */
export class AuthorizationError extends ApplicationError {
  constructor(message: string = 'Insufficient permissions', details?: Record<string, any>) {
    super(message, 403, 'AUTHORIZATION_ERROR', details);
  }
}

/**
 * Not Found Error - thrown when requested resource doesn't exist
 * @example throw new NotFoundError('Story', storyId)
 */
export class NotFoundError extends ApplicationError {
  constructor(resource: string, identifier?: string, details?: Record<string, any>) {
    const message = identifier 
      ? `${resource} with ID '${identifier}' not found`
      : `${resource} not found`;
    super(message, 404, 'NOT_FOUND', { resource, identifier, ...details });
  }
}

/**
 * Conflict Error - thrown when operation conflicts with current state
 * @example throw new ConflictError('Story already exists with this title')
 */
export class ConflictError extends ApplicationError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 409, 'CONFLICT_ERROR', details);
  }
}

/**
 * Rate Limit Error - thrown when rate limit is exceeded
 * @example throw new RateLimitError('story-updates', 100, 3600)
 */
export class RateLimitError extends ApplicationError {
  constructor(
    resource: string,
    limit: number,
    windowSeconds: number,
    details?: Record<string, any>
  ) {
    const message = `Rate limit exceeded for ${resource}. Limit: ${limit} requests per ${windowSeconds} seconds`;
    super(message, 429, 'RATE_LIMIT_ERROR', {
      resource,
      limit,
      windowSeconds,
      retryAfter: windowSeconds,
      ...details,
    });
  }
}

/**
 * Quota Exceeded Error - thrown when subscription quota is exceeded
 * @example throw new QuotaExceededError('AI tokens', 5000, 5000, 'pro')
 */
export class QuotaExceededError extends ApplicationError {
  constructor(
    resource: string,
    used: number,
    limit: number,
    currentTier: string,
    details?: Record<string, any>
  ) {
    const message = `Quota exceeded for ${resource}. Used: ${used}/${limit}. Upgrade from ${currentTier} tier for more.`;
    super(message, 402, 'QUOTA_EXCEEDED', {
      resource,
      used,
      limit,
      currentTier,
      upgradeRequired: true,
      ...details,
    });
  }
}

/**
 * Business Logic Error - thrown when business rules are violated
 * @example throw new BusinessLogicError('Cannot split a story that is already done')
 */
export class BusinessLogicError extends ApplicationError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 422, 'BUSINESS_LOGIC_ERROR', details);
  }
}

/**
 * External Service Error - thrown when external API/service fails
 * @example throw new ExternalServiceError('Anthropic API', 'API timeout after 30s')
 */
export class ExternalServiceError extends ApplicationError {
  constructor(service: string, reason: string, details?: Record<string, any>) {
    const message = `External service error: ${service} - ${reason}`;
    super(message, 502, 'EXTERNAL_SERVICE_ERROR', { service, reason, ...details });
  }
}

/**
 * Database Error - thrown when database operations fail
 * @example throw new DatabaseError('Failed to insert story', originalError)
 */
export class DatabaseError extends ApplicationError {
  constructor(message: string, originalError?: Error, details?: Record<string, any>) {
    super(message, 500, 'DATABASE_ERROR', {
      originalError: originalError?.message,
      ...details,
    });
  }
}

/**
 * Configuration Error - thrown when configuration is invalid or missing
 * @example throw new ConfigurationError('ANTHROPIC_API_KEY environment variable not set')
 */
export class ConfigurationError extends ApplicationError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 500, 'CONFIGURATION_ERROR', details);
  }
}

/**
 * Type guard to check if error is an ApplicationError
 */
export function isApplicationError(error: unknown): error is ApplicationError {
  return error instanceof ApplicationError;
}

/**
 * Type guard to check if error is a specific error type
 */
export function isErrorType<T extends ApplicationError>(
  error: unknown,
  errorClass: new (...args: any[]) => T
): error is T {
  return error instanceof errorClass;
}

/**
 * Convert any error to ApplicationError
 * Useful for wrapping unknown errors
 */
export function toApplicationError(error: unknown): ApplicationError {
  if (isApplicationError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new ApplicationError(error.message, 500, 'UNKNOWN_ERROR', {
      originalName: error.name,
      originalStack: error.stack,
    });
  }

  if (typeof error === 'string') {
    return new ApplicationError(error, 500, 'UNKNOWN_ERROR');
  }

  return new ApplicationError(
    'An unknown error occurred',
    500,
    'UNKNOWN_ERROR',
    { error: String(error) }
  );
}

/**
 * Error response formatter for API routes
 */
export function formatErrorResponse(error: unknown): {
  error: string;
  message: string;
  code?: string;
  statusCode: number;
  details?: Record<string, any>;
  stack?: string;
} {
  const appError = toApplicationError(error);

  return {
    error: appError.name,
    message: appError.message,
    code: appError.code,
    statusCode: appError.statusCode,
    details: appError.details,
    stack: process.env.NODE_ENV === 'development' ? appError.stack : undefined,
  };
}

