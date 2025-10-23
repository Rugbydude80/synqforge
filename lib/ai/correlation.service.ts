/**
 * Correlation and Idempotency Service
 * Handles request ID generation and correlation keys using stable SHA-256 hashing
 */

import { createHash } from 'crypto';
import { logger } from '@/lib/observability/logger';
import { metrics, METRICS } from '@/lib/observability/metrics';
import { CorrelationKey } from './types';

export class CorrelationService {
  /**
   * Generate a stable correlation key using SHA-256
   * Key is stable across processes/restarts
   */
  generateCorrelationKey(data: CorrelationKey): string {
    const payload = JSON.stringify({
      projectId: data.projectId,
      requestId: data.requestId,
      capabilityKey: data.capabilityKey || '',
    });

    return createHash('sha256')
      .update(payload)
      .digest('hex');
  }

  /**
   * Generate request ID if not provided
   */
  generateRequestId(): string {
    return crypto.randomUUID();
  }

  /**
   * Check if story already exists (idempotency check)
   */
  async checkStoryExists(
    projectId: string,
    requestId: string,
    capabilityKey: string
  ): Promise<boolean> {
    const correlationKey = this.generateCorrelationKey({
      projectId,
      requestId,
      capabilityKey,
    });

    try {
      const { db } = await import('@/lib/db');
      const { stories } = await import('@/lib/db/schema');
      const { eq } = await import('drizzle-orm');

      const [existing] = await db
        .select({ id: stories.id })
        .from(stories)
        .where(eq(stories.correlationKey, correlationKey))
        .limit(1);

      return !!existing;
    } catch (error) {
      logger.error('Error checking story existence', error as Error, {
        correlationKey,
        projectId,
        requestId,
        capabilityKey,
      });
      return false;
    }
  }

  /**
   * Check if epic already exists (idempotency check)
   */
  async checkEpicExists(
    projectId: string,
    requestId: string
  ): Promise<boolean> {
    const correlationKey = this.generateCorrelationKey({
      projectId,
      requestId,
    });

    try {
      const { db } = await import('@/lib/db');
      const { epics } = await import('@/lib/db/schema');
      const { eq } = await import('drizzle-orm');

      const [existing] = await db
        .select({ id: epics.id })
        .from(epics)
        .where(eq(epics.correlationKey, correlationKey))
        .limit(1);

      return !!existing;
    } catch (error) {
      logger.error('Error checking epic existence', error as Error, {
        correlationKey,
        projectId,
        requestId,
      });
      return false;
    }
  }

  /**
   * Track duplicate prevention metric
   */
  trackDuplicatePrevented(entityType: 'story' | 'epic'): void {
    const metricName = entityType === 'story' ? 
      'stories.dup_prevented' : 
      'epics.dup_prevented';

    metrics.increment(metricName, 1);

    logger.info(`Duplicate ${entityType} prevented`, {
      entityType,
    });
  }
}

export const correlationService = new CorrelationService();

