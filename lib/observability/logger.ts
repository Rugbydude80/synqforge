/**
 * Structured logging for production observability
 * Compatible with Datadog, New Relic, CloudWatch
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

export interface LogContext {
  userId?: string
  organizationId?: string
  requestId?: string
  traceId?: string
  spanId?: string
  [key: string]: any
}

class Logger {
  private serviceName: string
  private environment: string

  constructor() {
    this.serviceName = 'synqforge-api'
    this.environment = process.env.NODE_ENV || 'development'
  }

  private log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): void {
    const timestamp = new Date().toISOString()

    const logEntry = {
      timestamp,
      level,
      message,
      service: this.serviceName,
      environment: this.environment,
      ...context,
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      }),
    }

    // In production, send to logging service (Datadog, etc.)
    if (this.environment === 'production') {
      // Send to external logging service
      console.log(JSON.stringify(logEntry))
    } else {
      // Pretty print for development
      console.log(`[${level.toUpperCase()}] ${message}`, context || '')
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context)
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context)
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context)
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, context, error)
  }

  fatal(message: string, error?: Error, context?: LogContext): void {
    this.log(LogLevel.FATAL, message, context, error)
  }
}

export const logger = new Logger()
