import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { aiService } from '@/lib/services/ai.service';
import { EpicsRepository } from '@/lib/repositories/epics';
import { ProjectsRepository } from '@/lib/repositories/projects';
import { generateEpicSchema } from '@/lib/validations/ai';
import { successResponse, errorResponse } from '@/lib/utils/api-helpers';
import { aiGenerationRateLimit, checkRateLimit, getResetTimeMessage } from '@/lib/rate-limit';
import { checkAIUsageLimit } from '@/lib/services/ai-usage.service';
import { AI_TOKEN_COSTS } from '@/lib/constants';

/**
 * POST /api/ai/generate-epic
 * Generate an epic using AI based on requirements
 */
export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    try {
      // Parse and validate request body
      const body = await req.json();
      const validatedData = generateEpicSchema.parse(body);

      const rateLimitResult = await checkRateLimit(
        `ai:generate-epic:${user.id}`,
        aiGenerationRateLimit
      );

      if (!rateLimitResult.success) {
        const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'RATE_LIMITED',
              message: `Too many requests. Try again in ${getResetTimeMessage(rateLimitResult.reset)}.`,
            },
          },
          {
            status: 429,
            headers: { 'Retry-After': retryAfter.toString() },
          }
        );
      }

      // Check AI usage limits
      const usageCheck = await checkAIUsageLimit(user, AI_TOKEN_COSTS.EPIC_CREATION);

      if (!usageCheck.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'USAGE_LIMIT_EXCEEDED',
              message: usageCheck.reason,
            },
            upgradeUrl: usageCheck.upgradeUrl,
            usage: usageCheck.usage,
          },
          { status: 402 }
        );
      }

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
      const projectContext = validatedData.projectContext ||
        `Project: ${project.name}\nDescription: ${project.description || 'No description'}`;

      // Generate epic using AI
      const response = await aiService.generateEpic(
        validatedData.description,
        projectContext
      );

      // Track AI usage with real token data
      await aiService.trackUsage(
        user.id,
        user.organizationId,
        response.model,
        response.usage,
        'epic_creation',
        validatedData.description,
        JSON.stringify(response.epic)
      );

      // Optional: Auto-create the epic
      const createEpicParam = req.nextUrl.searchParams.get('create');
      let createdEpic = null;

      if (createEpicParam === 'true') {
        createdEpic = await epicsRepository.createEpic({
          projectId: validatedData.projectId,
          title: response.epic.title,
          description: response.epic.description,
          goals: response.epic.goals.join('\n'),
          priority: response.epic.priority,
          aiGenerated: true,
          aiGenerationPrompt: validatedData.description,
        });
      }

      return successResponse({
        epic: response.epic,
        created: createdEpic || undefined,
        usage: response.usage,
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
