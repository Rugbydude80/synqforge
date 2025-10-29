/**
 * PII Detection Service for GDPR Compliance
 * Scans user input for personally identifiable information
 * Blocks requests containing sensitive data before AI processing
 */

// TODO: Re-enable when piiDetectionLog table is created
// import { db, generateId } from '@/lib/db';

export interface PIIPattern {
  regex: RegExp;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  redactLabel: string;
}

export interface PIIDetectionResult {
  hasPII: boolean;
  detectedTypes: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  redactedText?: string;
  recommendations: string[];
  matchCount: number;
}

export class PIIDetectionService {
  private readonly patterns: Record<string, PIIPattern> = {
    // Critical - Financial & Identity
    ssn: {
      regex: /\b\d{3}-\d{2}-\d{4}\b/g,
      severity: 'critical',
      message: 'Social Security Number detected',
      redactLabel: 'SSN',
    },
    creditCard: {
      regex: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g,
      severity: 'critical',
      message: 'Credit card number detected',
      redactLabel: 'CREDIT_CARD',
    },
    cvv: {
      regex: /\b(CVV|CVC|CSC)[:= ]*\d{3,4}\b/gi,
      severity: 'critical',
      message: 'Credit card security code detected',
      redactLabel: 'CVV',
    },
    iban: {
      regex: /\b[A-Z]{2}\d{2}[A-Z0-9]{1,30}\b/g,
      severity: 'critical',
      message: 'IBAN account number detected',
      redactLabel: 'IBAN',
    },

    // High - Government IDs
    passport: {
      regex: /\b[A-Z]{1,2}\d{6,9}\b/g,
      severity: 'high',
      message: 'Passport number detected',
      redactLabel: 'PASSPORT',
    },
    driverLicense: {
      regex: /\b(DL|DRIVERS?[\s-]?LICENSE)[:= ]*[A-Z0-9]{5,20}\b/gi,
      severity: 'high',
      message: 'Driver license number detected',
      redactLabel: 'DRIVERS_LICENSE',
    },
    nationalId: {
      regex: /\b(NIN|NATIONAL[\s-]?ID)[:= ]*\d{9,12}\b/gi,
      severity: 'high',
      message: 'National ID number detected',
      redactLabel: 'NATIONAL_ID',
    },

    // Medium - Contact Information
    email: {
      regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      severity: 'medium',
      message: 'Email address detected',
      redactLabel: 'EMAIL',
    },
    phone: {
      regex: /\b(\+\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}\b/g,
      severity: 'medium',
      message: 'Phone number detected',
      redactLabel: 'PHONE',
    },
    ipAddress: {
      regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
      severity: 'medium',
      message: 'IP address detected',
      redactLabel: 'IP_ADDRESS',
    },

    // Low - Addresses (can be legitimate for user stories)
    fullAddress: {
      regex: /\b\d+\s+[A-Za-z\s]+,\s*[A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5}\b/g,
      severity: 'low',
      message: 'Full address detected',
      redactLabel: 'ADDRESS',
    },
    postalCode: {
      regex: /\b\d{5}(-\d{4})?\b/g,
      severity: 'low',
      message: 'Postal code detected',
      redactLabel: 'POSTAL_CODE',
    },

    // Medium - Health & Biometric
    medicalRecord: {
      regex: /\b(MRN|MEDICAL[\s-]?RECORD)[:= ]*[A-Z0-9]{6,15}\b/gi,
      severity: 'high',
      message: 'Medical record number detected',
      redactLabel: 'MEDICAL_RECORD',
    },
    birthdate: {
      regex: /\b(DOB|DATE[\s-]?OF[\s-]?BIRTH)[:= ]*\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/gi,
      severity: 'medium',
      message: 'Date of birth detected',
      redactLabel: 'DOB',
    },
  };

  /**
   * Scan text for PII
   */
  async scanForPII(
    text: string,
    organizationId: string,
    context?: { userId?: string; feature?: string }
  ): Promise<PIIDetectionResult> {
    const detectedTypes: string[] = [];
    const matches: Array<{ type: string; severity: string }> = [];
    let redactedText = text;
    let matchCount = 0;

    // Scan for each pattern type
    for (const [type, pattern] of Object.entries(this.patterns)) {
      const foundMatches = text.match(pattern.regex);
      
      if (foundMatches && foundMatches.length > 0) {
        detectedTypes.push(type);
        matchCount += foundMatches.length;
        matches.push({ type, severity: pattern.severity });
        
        // Redact PII
        redactedText = redactedText.replace(
          pattern.regex,
          `[REDACTED_${pattern.redactLabel}]`
        );
      }
    }

    const hasPII = detectedTypes.length > 0;
    const severity = hasPII ? this.getMaxSeverity(matches) : 'low';

    if (hasPII) {
      // Log PII detection attempt
      await this.logPIIDetection({
        organizationId,
        detectedTypes,
        severity,
        matchCount,
        userId: context?.userId,
        feature: context?.feature,
      });
    }

    return {
      hasPII,
      detectedTypes,
      severity,
      redactedText: hasPII ? redactedText : undefined,
      matchCount,
      recommendations: hasPII ? this.getRecommendations(detectedTypes, severity) : [],
    };
  }

  /**
   * Enforce PII protection (throws error if PII detected)
   */
  async enforcePIIProtection(
    text: string,
    organizationId: string,
    context?: { userId?: string; feature?: string }
  ): Promise<void> {
    const result = await this.scanForPII(text, organizationId, context);

    if (result.hasPII) {
      // Don't throw error for low severity (addresses/postal codes)
      // These are often legitimate in user stories
      if (result.severity === 'low') {
        console.warn(`Low-severity PII detected (${result.detectedTypes.join(', ')}), allowing request`);
        return;
      }

      throw new Error(
        JSON.stringify({
          code: 'PII_DETECTED',
          message: 'Your input contains sensitive personal information that cannot be processed',
          detectedTypes: result.detectedTypes,
          severity: result.severity,
          recommendations: result.recommendations,
          // Show first 200 chars of redacted text as preview
          redactedPreview: result.redactedText?.substring(0, 200) + (result.redactedText && result.redactedText.length > 200 ? '...' : ''),
        })
      );
    }
  }

  /**
   * Get maximum severity from detected types
   */
  private getMaxSeverity(matches: Array<{ type: string; severity: string }>): 'low' | 'medium' | 'high' | 'critical' {
    const severities = matches.map(m => m.severity);
    
    if (severities.includes('critical')) return 'critical';
    if (severities.includes('high')) return 'high';
    if (severities.includes('medium')) return 'medium';
    return 'low';
  }

  /**
   * Get recommendations based on detected PII types
   */
  private getRecommendations(detectedTypes: string[], severity: string): string[] {
    const recommendations = [
      'Remove all sensitive personal information from your input',
      'Use placeholder values (e.g., "user@example.com", "123-456-7890")',
    ];

    if (detectedTypes.includes('creditCard') || detectedTypes.includes('ssn')) {
      recommendations.push('NEVER include financial or identity documents in AI prompts');
    }

    if (detectedTypes.includes('email') || detectedTypes.includes('phone')) {
      recommendations.push('Replace real contact information with fictional examples');
    }

    if (severity === 'critical') {
      recommendations.push('⚠️ CRITICAL: Contact support@synqforge.com if you need to process sensitive data under a Data Processing Agreement');
    }

    return recommendations;
  }

  /**
   * Log PII detection for audit trail
   */
  private async logPIIDetection(data: {
    organizationId: string;
    detectedTypes: string[];
    severity: string;
    matchCount: number;
    userId?: string;
    feature?: string;
  }): Promise<void> {
    try {
      // TODO: Implement PII detection logging when table is created
      // await db.insert(piiDetectionLog).values({
      //   id: generateId(),
      //   organizationId: data.organizationId,
      //   detectedTypes: data.detectedTypes,
      //   severity: data.severity,
      //   matchCount: data.matchCount,
      //   userId: data.userId,
      //   feature: data.feature || 'unknown',
      //   detectedAt: new Date(),
      // });
      console.log('[PII Detection]', {
        organizationId: data.organizationId,
        detectedTypes: data.detectedTypes,
        severity: data.severity,
        matchCount: data.matchCount,
        feature: data.feature || 'unknown',
      });
    } catch (error) {
      // Don't fail PII detection if logging fails
      console.error('Failed to log PII detection:', error);
    }
  }

  /**
   * Get PII detection statistics for organization
   */
  async getStatistics(organizationId: string, _days: number = 30): Promise<{
    totalDetections: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
    trend: 'increasing' | 'decreasing' | 'stable';
  }> {
    // This would query the piiDetectionLog table
    // Implementation depends on schema
    return {
      totalDetections: 0,
      bySeverity: {},
      byType: {},
      trend: 'stable',
    };
  }
}

// Singleton instance
export const piiDetectionService = new PIIDetectionService();

/**
 * Middleware-friendly PII guard
 */
export async function enforcePIIProtection(
  prompt: string,
  organizationId: string,
  context?: { userId?: string; feature?: string }
): Promise<void> {
  return piiDetectionService.enforcePIIProtection(prompt, organizationId, context);
}

