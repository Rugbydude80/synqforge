import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { Redis } from '@upstash/redis'

interface HealthCheck {
  timestamp: string
  status: 'ok' | 'degraded' | 'error'
  version: string
  uptime: number
  services: {
    database: 'ok' | 'error' | 'unknown'
    redis: 'ok' | 'error' | 'not-configured' | 'unknown'
    ai: 'configured' | 'not-configured'
  }
  environment: string
  responseTime: string
}

/**
 * Health check endpoint for monitoring and uptime checks
 * GET /api/health
 * 
 * Returns 200 if all critical services are ok
 * Returns 503 if any critical service is down
 */
export async function GET() {
  const startTime = Date.now()

  const health: Omit<HealthCheck, 'responseTime'> = {
    timestamp: new Date().toISOString(),
    status: 'ok',
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    services: {
      database: 'unknown',
      redis: 'unknown',
      ai: 'not-configured'
    },
    environment: process.env.NODE_ENV || 'development'
  }

  // Check database connection
  try {
    await db.execute(sql`SELECT 1`)
    health.services.database = 'ok'
  } catch {
    health.services.database = 'error'
    health.status = 'error'
  }

  // Check Redis connection (non-critical)
  try {
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN
    
    if (redisUrl && redisToken) {
      const redis = new Redis({ url: redisUrl, token: redisToken })
      await redis.get('health-check')
      health.services.redis = 'ok'
    } else {
      health.services.redis = 'not-configured'
    }
  } catch {
    health.services.redis = 'error'
    health.status = 'degraded'
  }

  // Check AI service configuration
  if (process.env.ANTHROPIC_API_KEY) {
    health.services.ai = 'configured'
  }

  const duration = Date.now() - startTime

  // Return 503 if critical services are down, 200 otherwise
  const statusCode = health.status === 'error' ? 503 : 200

  return NextResponse.json(
    {
      ...health,
      responseTime: `${duration}ms`
    },
    {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    }
  )
}
