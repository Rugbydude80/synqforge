/**
 * Production-ready logging service
 * 
 * Replaces console.log/error/warn statements with structured logging
 * Integrates with error tracking services in production
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  userId?: string
  organizationId?: string
  requestId?: string
  [key: string]: any
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private isProduction = process.env.NODE_ENV === 'production'

  /**
   * Debug-level logs (development only)
   */
  debug(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      console.log(`[DEBUG] ${message}`, context || '')
    }
  }

  /**
   * Info-level logs
   */
  info(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      console.log(`[INFO] ${message}`, context || '')
    } else {
      // In production, send to logging service
      this.sendToLoggingService('info', message, context)
    }
  }

  /**
   * Warning-level logs
   */
  warn(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      console.warn(`[WARN] ${message}`, context || '')
    } else {
      this.sendToLoggingService('warn', message, context)
    }
  }

  /**
   * Error-level logs (always logged)
   */
  error(message: string, error?: Error | unknown, context?: LogContext) {
    const errorDetails = error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      : { error: String(error) }

    if (this.isDevelopment) {
      console.error(`[ERROR] ${message}`, errorDetails, context || '')
    } else {
      // In production, send to error tracking
      this.sendToErrorTracking(message, error, context)
    }
  }

  /**
   * API request logging
   */
  apiRequest(method: string, path: string, context?: LogContext) {
    this.info(`API Request: ${method} ${path}`, context)
  }

  /**
   * API response logging
   */
  apiResponse(method: string, path: string, statusCode: number, duration: number, context?: LogContext) {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info'
    const message = `API Response: ${method} ${path} - ${statusCode} (${duration}ms)`
    
    if (level === 'error') {
      this.error(message, undefined, context)
    } else if (level === 'warn') {
      this.warn(message, context)
    } else {
      this.debug(message, context)
    }
  }

  /**
   * Send logs to external logging service (e.g., DataDog, CloudWatch)
   * TODO: Implement actual integration
   */
  private sendToLoggingService(level: LogLevel, message: string, context?: LogContext) {
    // For now, just log to console in production
    // TODO: Integrate with actual logging service
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      level,
      message,
      ...context,
    }
    
    console.log(JSON.stringify(logEntry))
  }

  /**
   * Send errors to error tracking service (e.g., Sentry)
   * TODO: Implement Sentry integration
   */
  private sendToErrorTracking(message: string, error?: Error | unknown, context?: LogContext) {
    // For now, log to console
    // TODO: Integrate with Sentry or similar
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : String(error),
      ...context,
    }))
  }
}

// Export singleton instance
export const logger = new Logger()

// Export helper functions for backward compatibility
export const log = {
  debug: (message: string, context?: LogContext) => logger.debug(message, context),
  info: (message: string, context?: LogContext) => logger.info(message, context),
  warn: (message: string, context?: LogContext) => logger.warn(message, context),
  error: (message: string, error?: Error | unknown, context?: LogContext) => logger.error(message, error, context),
  apiRequest: (method: string, path: string, context?: LogContext) => logger.apiRequest(method, path, context),
  apiResponse: (method: string, path: string, statusCode: number, duration: number, context?: LogContext) => 
    logger.apiResponse(method, path, statusCode, duration, context),
}
