/**
 * Embeddings Health Check API
 * Returns status of vector search infrastructure
 */

import { NextResponse } from 'next/server';
import { EmbeddingsService } from '@/lib/services/embeddings.service';

export async function GET() {
  try {
    const embeddingsService = new EmbeddingsService();
    const health = await embeddingsService.healthCheck();

    const isHealthy = health.database && health.openrouterApi && health.indexExists;

    return NextResponse.json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      checks: health,
      enabled: embeddingsService.isEnabled(),
      timestamp: new Date().toISOString(),
    }, {
      status: isHealthy ? 200 : 503
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

