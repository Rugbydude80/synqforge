import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/middleware/auth';
import { aiService } from '@/lib/services/ai.service';
import { fileProcessorService } from '@/lib/services/file-processor.service';
import { z } from 'zod';

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

    // Process the file to extract text
    const buffer = Buffer.from(await file.arrayBuffer());
    const processed = await fileProcessorService.extractText(
      buffer,
      file.type,
      file.name
    );
    const extractedText = processed.content;

    // Analyze the document with AI
    const analysis = await aiService.analyzeDocument(
      extractedText,
      'requirements'
    );

    // Track AI usage
    await aiService.trackUsage(
      context.user.id,
      context.user.organizationId,
      'anthropic/claude-sonnet-4',
      { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      'requirements_analysis',
      extractedText,
      JSON.stringify(analysis)
    );

    return NextResponse.json({
      success: true,
      analysis,
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
