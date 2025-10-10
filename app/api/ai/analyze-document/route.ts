import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/middleware/auth';
import { aiService } from '@/lib/services/ai.service';
import { fileProcessorService } from '@/lib/services/file-processor.service';
import { z } from 'zod';
import { aiGenerationRateLimit, checkRateLimit, getResetTimeMessage } from '@/lib/rate-limit';

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

    // Process the file to extract text
    const buffer = Buffer.from(await file.arrayBuffer());
    const processed = await fileProcessorService.extractText(
      buffer,
      file.type,
      file.name
    );
    const extractedText = processed.content;

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

    return NextResponse.json({
      success: true,
      analysis: response.analysis,
      usage: response.usage,
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
