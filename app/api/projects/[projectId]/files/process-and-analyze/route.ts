import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { blobService } from '@/lib/services/blob.service';
import { fileProcessorService } from '@/lib/services/file-processor.service';
import { fileUploadsRepository } from '@/lib/repositories/file-uploads.repository';
import { ProjectsRepository } from '@/lib/repositories/projects';
import { EpicsRepository } from '@/lib/repositories/epics';
import { aiService } from '@/lib/services/ai.service';

/**
 * POST /api/projects/[projectId]/files/process-and-analyze
 * Upload file, extract content, analyze with AI, and optionally create epics/stories
 */
export const POST = withAuth(
  async (req: NextRequest, { user }, { params }: { params: { projectId: string } }) => {
    try {
      const { projectId } = params;

      // Initialize repositories
      const projectsRepository = new ProjectsRepository(user);
      const epicsRepository = new EpicsRepository(user);

      // Verify user has access to the project
      const project = await projectsRepository.getProjectById(projectId);
      if (!project) {
        return NextResponse.json(
          { error: 'Project not found or access denied' },
          { status: 404 }
        );
      }

      // Parse form data
      const formData = await req.formData();
      const file = formData.get('file') as File;
      const documentType = (formData.get('documentType') as string) || 'requirements';
      const autoCreateEpics = formData.get('autoCreateEpics') === 'true';
      const autoCreateStories = formData.get('autoCreateStories') === 'true';

      if (!file) {
        return NextResponse.json(
          { error: 'No file provided' },
          { status: 400 }
        );
      }

      // Validate file
      const validation = blobService.validateFile(file);
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }

      // Step 1: Upload to Vercel Blob
      const uploadedFile = await blobService.uploadFile(file, {
        filename: file.name,
        contentType: file.type,
        projectId,
        uploadedBy: user.id,
      });

      // Step 2: Extract content
      const buffer = Buffer.from(await file.arrayBuffer());
      let extractedContent: string;
      let extractionMetadata: Record<string, any>;

      try {
        const processed = await fileProcessorService.extractText(
          buffer,
          file.type,
          file.name
        );
        extractedContent = processed.content;
        extractionMetadata = processed.metadata;
      } catch (error) {
        // Save file record even if extraction fails
        await fileUploadsRepository.create({
          organizationId: user.organizationId,
          projectId,
          filename: file.name,
          originalFilename: file.name,
          fileSize: uploadedFile.size,
          contentType: file.type,
          storagePath: uploadedFile.pathname,
          uploadedBy: user.id,
          metadata: {
            extractionError: error instanceof Error ? error.message : 'Failed to extract content',
          },
        });

        return NextResponse.json(
          { 
            error: 'Failed to extract content from file',
            details: error instanceof Error ? error.message : 'Unknown error'
          },
          { status: 400 }
        );
      }

      // Validate extracted content
      const contentValidation = fileProcessorService.validateContent(extractedContent);
      if (!contentValidation.valid) {
        await fileUploadsRepository.create({
          organizationId: user.organizationId,
          projectId,
          filename: file.name,
          originalFilename: file.name,
          fileSize: uploadedFile.size,
          contentType: file.type,
          storagePath: uploadedFile.pathname,
          uploadedBy: user.id,
          extractedText: extractedContent,
          metadata: { ...extractionMetadata, contentError: contentValidation.error },
        });

        return NextResponse.json(
          { error: contentValidation.error },
          { status: 400 }
        );
      }

      // Step 3: Analyze with AI
      const analysis = await aiService.analyzeDocument(
        extractedContent,
        documentType as any
      );

      // Step 4: Save file record with analysis
      const fileRecord = await fileUploadsRepository.create({
        organizationId: user.organizationId,
        projectId,
        filename: file.name,
        originalFilename: file.name,
        fileSize: uploadedFile.size,
        contentType: file.type,
        storagePath: uploadedFile.pathname,
        uploadedBy: user.id,
        extractedText: extractedContent,
        aiAnalysis: {
          summary: analysis.summary,
          keyPoints: analysis.keyPoints,
          requirements: analysis.requirements,
          suggestedStories: analysis.suggestedStories,
          suggestedEpics: analysis.suggestedEpics,
          confidence: analysis.confidence,
        },
        metadata: {
          ...extractionMetadata,
          analysis: {
            summary: analysis.summary,
            keyPointsCount: analysis.keyPoints.length,
            suggestedEpicsCount: analysis.suggestedEpics.length,
            suggestedStoriesCount: analysis.suggestedStories.length,
          },
        },
      });

      // Step 5: Optionally create epics and stories
      const createdEpics = [];
      const createdStories = [];

      if (autoCreateEpics) {
        for (const epicSuggestion of analysis.suggestedEpics) {
          try {
            const epic = await epicsRepository.createEpic({
              projectId,
              title: epicSuggestion.title,
              description: epicSuggestion.description,
              goals: epicSuggestion.goals || [],
              priority: epicSuggestion.priority || 'medium',
              status: 'planned',
              aiGenerated: true,
              aiGenerationPrompt: `Generated from document analysis: ${analysis.summary}`,
            });
            createdEpics.push(epic);
          } catch (error) {
            console.error('Failed to create epic:', error);
          }
        }
      }

      if (autoCreateStories) {
        // Note: We'll need to create a stories repository for this
        // For now, we'll just return the suggested stories
        createdStories.push(...analysis.suggestedStories);
      }

      return NextResponse.json({
        success: true,
        file: {
          id: fileRecord.id,
          filename: fileRecord.filename,
          fileSize: fileRecord.fileSize,
          storagePath: fileRecord.storagePath,
          uploadedAt: fileRecord.createdAt,
        },
        extraction: {
          wordCount: extractionMetadata.wordCount,
          characterCount: extractionMetadata.characterCount,
          pageCount: extractionMetadata.pageCount,
        },
        analysis: {
          summary: analysis.summary,
          keyPoints: analysis.keyPoints,
          requirements: analysis.requirements,
          suggestedEpics: analysis.suggestedEpics,
          suggestedStories: analysis.suggestedStories,
          confidence: analysis.confidence,
        },
        created: {
          epics: createdEpics.length,
          stories: createdStories.length,
          epicsList: autoCreateEpics ? createdEpics : undefined,
          storiesList: autoCreateStories ? createdStories : undefined,
        },
      });

    } catch (error) {
      console.error('Process and analyze error:', error);

      return NextResponse.json(
        { 
          error: error instanceof Error ? error.message : 'Failed to process and analyze file',
          details: process.env.NODE_ENV === 'development' ? error : undefined
        },
        { status: 500 }
      );
    }
  },
  { 
    allowedRoles: ['admin', 'member'],
    requireProject: true 
  }
);

// Configure Next.js to handle large file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};
