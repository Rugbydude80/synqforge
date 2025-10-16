/**
 * Application metrics for monitoring and alerting
 * Compatible with Prometheus, Datadog, CloudWatch
 */

export class Metrics {
  private static instance: Metrics
  private metrics: Map<string, number>

  private constructor() {
    this.metrics = new Map()
  }

  static getInstance(): Metrics {
    if (!Metrics.instance) {
      Metrics.instance = new Metrics()
    }
    return Metrics.instance
  }

  /**
   * Increment a counter
   */
  increment(metric: string, value: number = 1, tags?: Record<string, string>): void {
    const key = this.getKey(metric, tags)
    const current = this.metrics.get(key) || 0
    this.metrics.set(key, current + value)

    // In production, send to metrics service
    if (process.env.NODE_ENV === 'production') {
      // Send to Datadog/Prometheus
    }
  }

  /**
   * Record a gauge value
   */
  gauge(metric: string, value: number, tags?: Record<string, string>): void {
    const key = this.getKey(metric, tags)
    this.metrics.set(key, value)
  }

  /**
   * Record timing/duration
   */
  timing(metric: string, durationMs: number, tags?: Record<string, string>): void {
    const key = this.getKey(metric, tags)
    this.metrics.set(key, durationMs)
  }

  /**
   * Record histogram value
   */
  histogram(metric: string, value: number, tags?: Record<string, string>): void {
    const key = this.getKey(metric, tags)
    this.metrics.set(key, value)
  }

  private getKey(metric: string, tags?: Record<string, string>): string {
    if (!tags) return metric
    const tagString = Object.entries(tags)
      .map(([k, v]) => `${k}:${v}`)
      .join(',')
    return `${metric}{${tagString}}`
  }

  /**
   * Get all metrics (for /metrics endpoint)
   */
  getAll(): Record<string, number> {
    return Object.fromEntries(this.metrics)
  }
}

export const metrics = Metrics.getInstance()

// Common metrics
export const METRICS = {
  API_REQUEST: 'api.request.count',
  API_LATENCY: 'api.request.latency',
  API_ERROR: 'api.error.count',
  AI_REQUEST: 'ai.request.count',
  AI_TOKENS: 'ai.tokens.used',
  AI_LATENCY: 'ai.request.latency',
  DB_QUERY: 'db.query.count',
  DB_LATENCY: 'db.query.latency',
  RATE_LIMIT_HIT: 'rate_limit.hit',
  SUBSCRIPTION_CREATED: 'subscription.created',
  SUBSCRIPTION_UPGRADED: 'subscription.upgraded',
  SEAT_ADDED: 'seat.added',
  STORY_CREATED: 'story.created',
}
