/**
 * PII Redaction Service
 * Redacts sensitive information from audit logs
 */

import { PII_PATTERNS } from './types';
import { logger } from '@/lib/observability/logger';

export class PIIRedactionService {
  /**
   * Redact PII from text
   */
  redact(text: string): string {
    let redacted = text;

    // Redact emails
    redacted = redacted.replace(PII_PATTERNS.email, '[EMAIL_REDACTED]');

    // Redact phone numbers
    redacted = redacted.replace(PII_PATTERNS.phone, '[PHONE_REDACTED]');

    // Redact tokens in URLs
    redacted = redacted.replace(PII_PATTERNS.token, '?token=[REDACTED]');

    // Redact API keys in URLs
    redacted = redacted.replace(PII_PATTERNS.apiKey, '?api_key=[REDACTED]');

    return redacted;
  }

  /**
   * Redact PII from structured data
   */
  redactObject<T extends Record<string, any>>(obj: T): T {
    const redacted: any = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        redacted[key] = this.redact(value);
      } else if (Array.isArray(value)) {
        redacted[key] = value.map(item =>
          typeof item === 'string' ? this.redact(item) :
          typeof item === 'object' && item !== null ? this.redactObject(item) :
          item
        );
      } else if (typeof value === 'object' && value !== null) {
        redacted[key] = this.redactObject(value);
      } else {
        redacted[key] = value;
      }
    }

    return redacted as T;
  }

  /**
   * Sample audit log (1% of prompts/outputs)
   */
  shouldSample(): boolean {
    return Math.random() < 0.01;
  }

  /**
   * Log audit entry with PII redaction
   */
  auditLog(
    action: string,
    data: Record<string, any>,
    context: {
      userId?: string;
      organizationId?: string;
      requestId?: string;
    }
  ): void {
    if (!this.shouldSample()) return;

    const redactedData = this.redactObject(data);

    logger.info(`[AUDIT] ${action}`, {
      ...context,
      data: redactedData,
      timestamp: new Date().toISOString(),
    });
  }
}

export const piiRedactionService = new PIIRedactionService();

