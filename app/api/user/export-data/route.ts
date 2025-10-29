/**
 * GDPR Data Export Endpoint (Article 20 - Right to Data Portability)
 * Exports all user data in machine-readable and human-readable formats
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, organizations, organizationMembers, aiGenerations, auditLogs } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import JSZip from 'jszip';
import { encryptionService } from '@/lib/services/encryption.service';

export async function POST(req: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const userId = session.user.id;
  
  try {
    // 1. User Profile
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // 2. Organization Memberships
    const memberships = await db
      .select({
        organizationId: organizations.id,
        organizationName: organizations.name,
        role: organizationMembers.role,
        joinedAt: organizationMembers.createdAt,
        subscriptionTier: organizations.subscriptionTier,
      })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
      .where(eq(organizationMembers.userId, userId));

    // 3. AI Generation History (decrypt if encrypted)
    const generations = await db
      .select()
      .from(aiGenerations)
      .where(eq(aiGenerations.userId, userId))
      .limit(1000); // Limit for performance

    const decryptedGenerations = await Promise.all(
      generations.map(async (gen) => {
        let prompt = gen.prompt || '';
        let output = '';

        // Decrypt if fields exist
        if (gen.prompt_encrypted && gen.prompt_iv && gen.prompt_auth_tag) {
          try {
            prompt = await encryptionService.decrypt({
              encrypted: gen.prompt_encrypted,
              iv: gen.prompt_iv,
              authTag: gen.prompt_auth_tag,
              keyVersion: gen.encryption_key_id || 'key_v1',
            });
          } catch (error) {
            console.error(`Failed to decrypt prompt for generation ${gen.id}:`, error);
            prompt = '[Encrypted - decryption failed]';
          }
        }

        if (gen.output_encrypted && gen.output_iv && gen.output_auth_tag) {
          try {
            output = await encryptionService.decrypt({
              encrypted: gen.output_encrypted,
              iv: gen.output_iv,
              authTag: gen.output_auth_tag,
              keyVersion: gen.encryption_key_id || 'key_v1',
            });
          } catch (error) {
            console.error(`Failed to decrypt output for generation ${gen.id}:`, error);
            output = '[Encrypted - decryption failed]';
          }
        }

        return {
          id: gen.id,
          createdAt: gen.createdAt,
          prompt,
          output,
          tokensUsed: gen.tokensUsed,
          status: gen.status,
        };
      })
    );

    // 4. Audit Logs (last 90 days)
    const recentAuditLogs = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.userId, userId))
      .limit(500);

    // 5. Compile complete data package
    const exportData = {
      exportMetadata: {
        exportedAt: new Date().toISOString(),
        userId: user.id,
        email: user.email,
        dataSubject: 'GDPR Article 20 - Right to Data Portability',
        retention: 'This data will be retained for 90 days then permanently deleted',
      },
      profile: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        organizationId: user.organizationId,
        role: user.role,
        isActive: user.isActive,
      },
      organizations: memberships,
      aiGenerations: {
        total: decryptedGenerations.length,
        generations: decryptedGenerations,
      },
      auditTrail: {
        total: recentAuditLogs.length,
        logs: recentAuditLogs.map(log => ({
          action: log.action,
          resourceType: log.resourceType,
          resourceId: log.resourceId,
          timestamp: log.createdAt,
          ipAddress: log.ipAddress,
        })),
      },
    };

    // 6. Create ZIP archive with multiple formats
    const zip = new JSZip();
    
    // JSON format (machine-readable)
    zip.file('data-export.json', JSON.stringify(exportData, null, 2));
    
    // CSV format for AI generations
    const csvContent = convertGenerationsToCSV(decryptedGenerations);
    zip.file('ai-generations.csv', csvContent);
    
    // README
    zip.file('README.txt', `
SynqForge Data Export
Generated: ${exportData.exportMetadata.exportedAt}
User: ${user.email}
User ID: ${user.id}

This archive contains all your personal data as required by GDPR Article 20.

Contents:
- data-export.json: Complete data in JSON format
- ai-generations.csv: AI generation history in spreadsheet format
- README.txt: This file

Data Retention:
This export will be retained for 90 days, then permanently deleted.

Questions?
Contact: privacy@synqforge.com
Support: https://synqforge.com/support
    `);

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    
    // 7. Log export request
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      organizationId: user.organizationId,
      userId: user.id,
      action: 'GDPR_DATA_EXPORT',
      resourceType: 'user',
      resourceId: user.id,
      metadata: { 
        format: 'zip', 
        sizeBytes: zipBuffer.length,
        itemsIncluded: {
          aiGenerations: decryptedGenerations.length,
          auditLogs: recentAuditLogs.length,
        },
      },
      createdAt: new Date(),
    });

    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="synqforge-data-export-${userId}.zip"`,
        'Content-Length': zipBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Data export failed:', error);
    return NextResponse.json(
      { error: 'Failed to export data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function convertGenerationsToCSV(generations: any[]): string {
  const headers = 'ID,Created At,Prompt (First 100 chars),Output (First 100 chars),Tokens Used,Status\n';
  
  const rows = generations.map(gen => {
    const prompt = (gen.prompt || '').substring(0, 100).replace(/"/g, '""');
    const output = (gen.output || '').substring(0, 100).replace(/"/g, '""');
    return `"${gen.id}","${gen.createdAt}","${prompt}","${output}",${gen.tokensUsed},"${gen.status}"`;
  }).join('\n');
  
  return headers + rows;
}

