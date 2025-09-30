import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { openRouterService } from '@/lib/services/openrouter.service';
import { projectsRepository } from '@/lib/repositories/projects.repository';
import { analyzeDocumentSchema } from '@/lib/validations/ai';
import { z } from 'zod';

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validatedData = analyzeDocumentSchema.parse(body);

    // Verify user has access to the project
    const project = await projectsRepository.getById(
      validatedData.projectId,
      session.user.id
    );

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    // Analyze document using AI
    const analysis = await openRouterService.analyzeDocument(
      validatedData.documentText,
      validatedData.analysisType
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
