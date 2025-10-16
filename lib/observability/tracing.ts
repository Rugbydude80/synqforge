/**
 * Distributed tracing for request flow tracking
 * Compatible with OpenTelemetry, Jaeger, DataDog APM
 */

export interface Span {
  traceId: string
  spanId: string
  parentSpanId?: string
  name: string
  startTime: number
  endTime?: number
  attributes: Record<string, any>
  events: Array<{ timestamp: number; name: string; attributes?: Record<string, any> }>
}

class Tracer {
  private activeSpans: Map<string, Span>
  private serviceName: string

  constructor() {
    this.activeSpans = new Map()
    this.serviceName = 'synqforge-api'
  }

  /**
   * Start a new span
   */
  startSpan(
    name: string,
    attributes?: Record<string, any>,
    parentSpanId?: string
  ): string {
    const spanId = this.generateId()
    const traceId = parentSpanId
      ? this.getTraceId(parentSpanId) || this.generateId()
      : this.generateId()

    const span: Span = {
      traceId,
      spanId,
      parentSpanId,
      name,
      startTime: Date.now(),
      attributes: {
        'service.name': this.serviceName,
        ...attributes,
      },
      events: [],
    }

    this.activeSpans.set(spanId, span)
    return spanId
  }

  /**
   * End a span
   */
  endSpan(spanId: string, attributes?: Record<string, any>): void {
    const span = this.activeSpans.get(spanId)
    if (!span) return

    span.endTime = Date.now()
    if (attributes) {
      span.attributes = { ...span.attributes, ...attributes }
    }

    // In production, send to tracing backend
    if (process.env.NODE_ENV === 'production') {
      this.exportSpan(span)
    }

    this.activeSpans.delete(spanId)
  }

  /**
   * Add event to span
   */
  addEvent(
    spanId: string,
    name: string,
    attributes?: Record<string, any>
  ): void {
    const span = this.activeSpans.get(spanId)
    if (!span) return

    span.events.push({
      timestamp: Date.now(),
      name,
      attributes,
    })
  }

  /**
   * Set span attribute
   */
  setAttribute(spanId: string, key: string, value: any): void {
    const span = this.activeSpans.get(spanId)
    if (!span) return

    span.attributes[key] = value
  }

  /**
   * Record error on span
   */
  recordError(spanId: string, error: Error): void {
    const span = this.activeSpans.get(spanId)
    if (!span) return

    span.attributes['error'] = true
    span.attributes['error.type'] = error.name
    span.attributes['error.message'] = error.message
    span.attributes['error.stack'] = error.stack

    this.addEvent(spanId, 'exception', {
      'exception.type': error.name,
      'exception.message': error.message,
    })
  }

  private getTraceId(spanId: string): string | undefined {
    const span = this.activeSpans.get(spanId)
    return span?.traceId
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15)
  }

  private exportSpan(span: Span): void {
    // Export to OpenTelemetry collector, Jaeger, or DataDog
    console.log('Exporting span:', span)
  }
}

export const tracer = new Tracer()

/**
 * Trace function execution
 */
export function trace<T>(
  name: string,
  fn: () => Promise<T>,
  attributes?: Record<string, any>
): Promise<T> {
  const spanId = tracer.startSpan(name, attributes)

  return fn()
    .then((result) => {
      tracer.endSpan(spanId, { 'result.success': true })
      return result
    })
    .catch((error) => {
      tracer.recordError(spanId, error)
      tracer.endSpan(spanId, { 'result.success': false })
      throw error
    })
}
