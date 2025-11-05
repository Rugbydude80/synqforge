import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/middleware/auth';
import { aiService } from '@/lib/services/ai.service';
import { fileProcessorService } from '@/lib/services/file-processor.service';
import { z } from 'zod';
import { aiGenerationRateLimit, checkRateLimit, getResetTimeMessage } from '@/lib/rate-limit';
import { checkAIUsageLimit, checkDocumentAnalysisAccess } from '@/lib/services/ai-usage.service';
import { AI_TOKEN_COSTS } from '@/lib/constants';
import { canUseAI, incrementTokenUsage, canIngestDocument, incrementDocIngestion } from '@/lib/billing/fair-usage-guards';
import { piiDetectionService } from '@/lib/services/pii-detection.service';

async function analyzeDocument(req: NextRequest, context: AuthContext) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const rateLimitResult = await checkRateLimit(
      `ai:analyze-document:${context.user.id}`,
      aiGenerationRateLimit
    );

    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);
      return NextResponse.json(
        {
          error: 'Too many document analyses. Try again later.',
          retryAfter: getResetTimeMessage(rateLimitResult.reset),
        },
        {
          status: 429,
          headers: { 'Retry-After': retryAfter.toString() },
        }
      );
    }

    // Check fair-usage document ingestion limit (HARD BLOCK)
    const docCheck = await canIngestDocument(context.user.organizationId, context.user.id)
    if (!docCheck.allowed) {
      return NextResponse.json(
        {
          error: docCheck.reason,
          upgradeUrl: docCheck.upgradeUrl,
          manageUrl: docCheck.manageUrl,
          used: docCheck.used,
          limit: docCheck.limit,
          percentage: docCheck.percentage,
        },
        { status: 402 }
      )
    }

    // Show 90% warning if approaching limit
    if (docCheck.isWarning && docCheck.reason) {
      console.warn(`Fair-usage warning for org ${context.user.organizationId}: ${docCheck.reason}`)
    }

    // Check document analysis access (Pro/Enterprise feature)
    const accessCheck = await checkDocumentAnalysisAccess(context.user);
    if (!accessCheck.allowed) {
      return NextResponse.json(
        {
          error: accessCheck.reason,
          upgradeUrl: accessCheck.upgradeUrl,
        },
        { status: 402 }
      );
    }

    // Check fair-usage AI token limit (HARD BLOCK)
    const estimatedTokens = AI_TOKEN_COSTS.DOCUMENT_ANALYSIS
    const aiCheck = await canUseAI(context.user.organizationId, estimatedTokens, context.user.id)

    if (!aiCheck.allowed) {
      return NextResponse.json(
        {
          error: aiCheck.reason,
          upgradeUrl: aiCheck.upgradeUrl,
          manageUrl: aiCheck.manageUrl,
          used: aiCheck.used,
          limit: aiCheck.limit,
          percentage: aiCheck.percentage,
        },
        { status: 402 }
      )
    }

    // Show 90% warning if approaching limit
    if (aiCheck.isWarning && aiCheck.reason) {
      console.warn(`Fair-usage warning for org ${context.user.organizationId}: ${aiCheck.reason}`)
    }

    // Legacy usage check (keep for backward compatibility)
    const usageCheck = await checkAIUsageLimit(context.user, AI_TOKEN_COSTS.DOCUMENT_ANALYSIS);
    if (!usageCheck.allowed) {
      return NextResponse.json(
        {
          error: usageCheck.reason,
          upgradeUrl: usageCheck.upgradeUrl,
          usage: usageCheck.usage,
        },
        { status: 402 }
      );
    }

    // Process the file to extract text
    const buffer = Buffer.from(await file.arrayBuffer());
    const processed = await fileProcessorService.extractText(
      buffer,
      file.type,
      file.name
    );
    const extractedText = processed.content;

    // ✅ CRITICAL: PII Detection - Block documents with sensitive data
    try {
      const piiCheck = await piiDetectionService.scanForPII(
        extractedText,
        context.user.organizationId,
        { userId: context.user.id, feature: 'document_analysis' }
      );

      if (piiCheck.hasPII && piiCheck.severity !== 'low') {
        console.warn(`PII detected in document analysis for org ${context.user.organizationId}:`, piiCheck.detectedTypes);
        return NextResponse.json(
          {
            error: 'PII_DETECTED',
            message: 'Your document contains sensitive personal information that cannot be processed',
            detectedTypes: piiCheck.detectedTypes,
            severity: piiCheck.severity,
            recommendations: piiCheck.recommendations,
            redactedPreview: piiCheck.redactedText?.substring(0, 200),
          },
          { status: 400 }
        );
      }
    } catch (piiError) {
      // Log PII detection error but don't block request
      console.error('PII detection error:', piiError);
    }

    // Analyze the document with AI
    const response = await aiService.analyzeDocument(
      extractedText,
      'requirements'
    );

    // Track AI usage with real token data
    await aiService.trackUsage(
      context.user.id,
      context.user.organizationId,
      response.model,
      response.usage,
      'requirements_analysis',
      extractedText,
      JSON.stringify(response.analysis)
    );

    // Track fair-usage token consumption
    const actualTokensUsed = response.usage?.totalTokens || estimatedTokens
    await incrementTokenUsage(context.user.organizationId, actualTokensUsed)

    // Track fair-usage document ingestion
    await incrementDocIngestion(context.user.organizationId)

    return NextResponse.json({
      success: true,
      analysis: response.analysis,
      usage: response.usage,
      fairUsageWarning: aiCheck.isWarning || docCheck.isWarning
        ? (aiCheck.reason || docCheck.reason)
        : undefined,
    });

  } catch (error) {
    console.error('Analyze document error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to analyze document',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

export const POST = withAuth(analyzeDocument);
