import { NextResponse } from 'next/server'
import { metrics } from '@/lib/observability/metrics'

/**
 * GET /api/metrics
 * Prometheus-compatible metrics endpoint
 */
export async function GET() {
  const allMetrics = metrics.getAll()

  // Convert to Prometheus format
  const prometheusFormat = Object.entries(allMetrics)
    .map(([key, value]) => `${key.replace(/\./g, '_')} ${value}`)
    .join('\n')

  return new NextResponse(prometheusFormat, {
    headers: {
      'Content-Type': 'text/plain; version=0.0.4',
    },
  })
}
