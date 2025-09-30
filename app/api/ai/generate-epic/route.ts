import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { aiService } from '@/lib/services/ai.service';
import { EpicsRepository } from '@/lib/repositories/epics';
import { ProjectsRepository } from '@/lib/repositories/projects';
import { generateEpicSchema } from '@/lib/validations/ai';
import { successResponse, errorResponse, parseRequestBody } from '@/lib/utils/api-helpers';
import { z } from 'zod';

/**
 * POST /api/ai/generate-epic
 * Generate an epic using AI based on requirements
 */
export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    try {
      // Parse and validate request body
      const validatedData = await parseRequestBody(req, generateEpicSchema);

      // Initialize repositories
      const projectsRepository = new ProjectsRepository(user);
      const epicsRepository = new EpicsRepository(user);

      // Verify user has access to the project
      const project = await projectsRepository.getProjectById(validatedData.projectId);
      if (!project) {
        return NextResponse.json(
          { 
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Project not found or access denied'
            }
          },
          { status: 404 }
        );
      }

      // Build project context
      const projectContext = validatedData.context || 
        `Project: ${project.name}\nDescription: ${project.description || 'No description'}`;

      // Generate epic using AI
      const generatedEpic = await aiService.generateEpic(
        validatedData.requirements,
        projectContext,
        validatedData.model
      );

      // Note: AI usage tracking is handled internally by the aiService
      // when it makes the actual API call to the AI provider

      // Optional: Auto-create the epic
      const createEpicParam = req.nextUrl.searchParams.get('create');
      let createdEpic = null;

      if (createEpicParam === 'true') {
        createdEpic = await epicsRepository.createEpic({
          projectId: validatedData.projectId,
          title: generatedEpic.title,
          description: generatedEpic.description,
          goals: generatedEpic.goals,
          priority: generatedEpic.priority,
          status: 'planned',
          aiGenerated: true,
          aiGenerationPrompt: validatedData.requirements,
        });
      }

      return successResponse({
        epic: generatedEpic,
        created: createdEpic || undefined,
        project: {
          id: project.id,
          name: project.name,
        },
      });

    } catch (error) {
      console.error('Generate epic error:', error);
      return errorResponse(error);
    }
  },
  { 
    allowedRoles: ['admin', 'member'],
    requireProject: true 
  }
);