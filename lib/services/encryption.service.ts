/**
 * Encryption Service for GDPR Compliance
 * Provides field-level encryption for sensitive data (prompts, PII)
 * Uses AES-256-GCM with authenticated encryption
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';
import { db } from '@/lib/db';
import { encryptionAuditLog } from '@/lib/db/schema';
import { generateId } from '@/lib/utils';

interface EncryptionResult {
  encrypted: Buffer;
  iv: Buffer;
  authTag: Buffer;
  keyVersion: string;
}

interface DecryptionInput {
  encrypted: Buffer;
  iv: Buffer;
  authTag: Buffer;
  keyVersion?: string;
}

export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyVersion = 'key_v1';
  private readonly ivLength = 16; // 128 bits
  private readonly authTagLength = 16; // 128 bits

  /**
   * Get encryption key from environment
   * Key should be rotated quarterly
   */
  private getEncryptionKey(version: string = this.keyVersion): Buffer {
    const envKey = process.env[`ENCRYPTION_${version.toUpperCase()}`];
    
    if (!envKey) {
      throw new Error(`Encryption key not configured for version: ${version}`);
    }

    // Ensure key is 32 bytes (256 bits)
    const keyHash = createHash('sha256').update(envKey).digest();
    return keyHash;
  }

  /**
   * Encrypt sensitive text (prompts, PII, etc.)
   */
  async encrypt(
    plaintext: string,
    organizationId: string,
    context?: { userId?: string; resourceType?: string; resourceId?: string }
  ): Promise<EncryptionResult> {
    try {
      const key = this.getEncryptionKey();
      const iv = randomBytes(this.ivLength);
      
      const cipher = createCipheriv(this.algorithm, key, iv);
      
      let encrypted = cipher.update(plaintext, 'utf8');
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      
      const authTag = cipher.getAuthTag();

      // Audit log encryption operation
      await this.logEncryptionOperation({
        organizationId,
        action: 'encrypt',
        keyVersion: this.keyVersion,
        resourceType: context?.resourceType || 'unknown',
        resourceId: context?.resourceId,
        userId: context?.userId,
      });

      return {
        encrypted,
        iv,
        authTag,
        keyVersion: this.keyVersion,
      };
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt encrypted text
   */
  async decrypt(input: DecryptionInput): Promise<string> {
    try {
      const keyVersion = input.keyVersion || this.keyVersion;
      const key = this.getEncryptionKey(keyVersion);
      
      const decipher = createDecipheriv(this.algorithm, key, input.iv);
      decipher.setAuthTag(input.authTag);
      
      let decrypted = decipher.update(input.encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      return decrypted.toString('utf8');
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data - data may be corrupted or key mismatch');
    }
  }

  /**
   * Encrypt AI generation prompt
   */
  async encryptPrompt(
    prompt: string,
    organizationId: string,
    userId: string
  ): Promise<EncryptionResult> {
    return this.encrypt(prompt, organizationId, {
      userId,
      resourceType: 'ai_generation_prompt',
    });
  }

  /**
   * Encrypt AI generation output
   */
  async encryptOutput(
    output: string,
    organizationId: string,
    userId: string
  ): Promise<EncryptionResult> {
    return this.encrypt(output, organizationId, {
      userId,
      resourceType: 'ai_generation_output',
    });
  }

  /**
   * Batch encrypt multiple prompts (for migration)
   */
  async batchEncrypt(
    items: Array<{ id: string; plaintext: string; organizationId: string }>
  ): Promise<Array<{ id: string; result: EncryptionResult }>> {
    const results = [];
    
    for (const item of items) {
      try {
        const result = await this.encrypt(item.plaintext, item.organizationId, {
          resourceId: item.id,
          resourceType: 'batch_migration',
        });
        results.push({ id: item.id, result });
      } catch (error) {
        console.error(`Failed to encrypt item ${item.id}:`, error);
        // Continue with other items
      }
    }
    
    return results;
  }

  /**
   * Log encryption operation for audit trail
   */
  private async logEncryptionOperation(data: {
    organizationId: string;
    action: 'encrypt' | 'decrypt' | 'rotate';
    keyVersion: string;
    resourceType?: string;
    resourceId?: string;
    userId?: string;
  }): Promise<void> {
    try {
      // Only log in production (avoid dev noise)
      if (process.env.NODE_ENV !== 'production') {
        return;
      }

      await db.insert(encryptionAuditLog).values({
        id: generateId(),
        organizationId: data.organizationId,
        action: data.action,
        keyVersion: data.keyVersion,
        resourceType: data.resourceType || 'unknown',
        resourceId: data.resourceId,
        userId: data.userId,
        createdAt: new Date(),
      });
    } catch (error) {
      // Don't fail encryption if audit logging fails
      console.error('Failed to log encryption operation:', error);
    }
  }

  /**
   * Key rotation utility
   * Migrates data from old key version to new key version
   */
  async rotateKey(
    encryptedData: Buffer,
    iv: Buffer,
    authTag: Buffer,
    oldKeyVersion: string,
    newKeyVersion: string,
    organizationId: string
  ): Promise<EncryptionResult> {
    // Decrypt with old key
    const decrypted = await this.decrypt({
      encrypted: encryptedData,
      iv,
      authTag,
      keyVersion: oldKeyVersion,
    });

    // Re-encrypt with new key
    const oldVersion = this.keyVersion;
    (this as any).keyVersion = newKeyVersion; // Temporarily switch version
    
    const result = await this.encrypt(decrypted, organizationId, {
      resourceType: 'key_rotation',
    });
    
    (this as any).keyVersion = oldVersion; // Restore
    
    await this.logEncryptionOperation({
      organizationId,
      action: 'rotate',
      keyVersion: `${oldKeyVersion} -> ${newKeyVersion}`,
    });

    return result;
  }

  /**
   * Generate new encryption key (for setup)
   * Run this once and store in environment variables
   */
  static generateNewKey(): string {
    const key = randomBytes(32); // 256 bits
    return key.toString('hex');
  }
}

// Singleton instance
export const encryptionService = new EncryptionService();

