/**
 * Conditional logging utility for development/production environments
 * Prevents console.log pollution in production while keeping error logging
 */

const isDev = process.env.NODE_ENV === 'development'
const isTest = process.env.NODE_ENV === 'test'

interface LogContext {
  [key: string]: unknown
}

/**
 * Structured logger with conditional output based on environment
 */
export const logger = {
  /**
   * Debug-level logging (development only)
   */
  debug: (message: string, context?: LogContext) => {
    if (isDev && !isTest) {
      console.log(`[DEBUG] ${message}`, context || '')
    }
  },

  /**
   * Info-level logging (development only)
   */
  info: (message: string, context?: LogContext) => {
    if (isDev && !isTest) {
      console.log(`[INFO] ${message}`, context || '')
    }
  },

  /**
   * Warning-level logging (all environments)
   */
  warn: (message: string, context?: LogContext) => {
    if (!isTest) {
      console.warn(`[WARN] ${message}`, context || '')
    }
  },

  /**
   * Error-level logging (all environments)
   * Errors are always logged regardless of environment
   */
  error: (message: string, error?: Error | unknown, context?: LogContext) => {
    if (!isTest) {
      console.error(`[ERROR] ${message}`, {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name,
        } : error,
        ...context,
      })
    }
  },

  /**
   * Log API requests (development only)
   */
  api: (method: string, url: string, status?: number, duration?: number) => {
    if (isDev && !isTest) {
      console.log(`[API] ${method} ${url}`, {
        status,
        duration: duration ? `${duration}ms` : undefined,
      })
    }
  },

  /**
   * Log database queries (development only)
   */
  db: (query: string, duration?: number) => {
    if (isDev && !isTest) {
      console.log(`[DB] ${query.substring(0, 100)}...`, {
        duration: duration ? `${duration}ms` : undefined,
      })
    }
  },
}

/**
 * Legacy console methods with deprecation warnings
 * @deprecated Use logger.info() instead
 */
if (typeof console !== 'undefined') {
  const originalLog = console.log
  const originalWarn = console.warn

  if (!isDev) {
    // Override console.log in production to warn about usage
    console.log = (...args: any[]) => {
      if (args[0]?.includes?.('[')) {
        // Allow tagged logs
        originalLog(...args)
      } else {
        // Warn about untagged logs
        originalWarn('[DEPRECATED] Use logger.info() instead of console.log()', ...args)
      }
    }
  }
}
