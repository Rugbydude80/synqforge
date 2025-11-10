import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/middleware/auth';
import { aiService } from '@/lib/services/ai.service';
import { ProjectsRepository } from '@/lib/repositories/projects';
import { NotFoundError, ForbiddenError } from '@/lib/types';
import { z } from 'zod';
import { aiGenerationRateLimit, checkRateLimit, getResetTimeMessage } from '@/lib/rate-limit';
import { checkAIUsageLimit } from '@/lib/services/ai-usage.service';
import { AI_TOKEN_COSTS } from '@/lib/constants';
import { canUseAI, incrementTokenUsage } from '@/lib/billing/fair-usage-guards';
import { validateTemplateAccess, getDefaultTemplateKey } from '@/lib/ai/prompt-templates';
import { MODEL } from '@/lib/ai/client';
import { piiDetectionService } from '@/lib/services/pii-detection.service';
import { aiContextActionsService } from '@/lib/services/ai-context-actions.service';
import { ContextLevel } from '@/lib/types/context.types';

const THINKING_MODEL = 'anthropic/claude-3-opus-20240229'; // Advanced model for thinking mode

const generateSingleStorySchema = z.object({
  requirement: z
    .string()
    .min(10, 'Requirement must be at least 10 characters')
    .max(2000, 'Requirement must be under 2,000 characters'),
  projectId: z.string().min(1, 'Project ID is required'),
  projectContext: z
    .string()
    .max(2000, 'Project context must be under 2,000 characters')
    .optional(),
  contextLevel: z.nativeEnum(ContextLevel).optional().default(ContextLevel.STANDARD),
  epicId: z.string().optional(),
  promptTemplate: z.string().optional(), // Optional template selection
});

async function generateSingleStory(req: NextRequest, context: AuthContext) {
  const projectsRepo = new ProjectsRepository(context.user);

  try {
    // Parse and validate request body
    const body = await req.json();
    const validatedData = generateSingleStorySchema.parse(body);

    const rateLimitResult = await checkRateLimit(
      `ai:generate-single-story:${context.user.id}`,
      aiGenerationRateLimit
    );

    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please slow down.',
          retryAfter: getResetTimeMessage(rateLimitResult.reset),
        },
        {
          status: 429,
          headers: { 'Retry-After': retryAfter.toString() },
        }
      );
    }

    // Check fair-usage AI token limit (HARD BLOCK)
    const estimatedTokens = AI_TOKEN_COSTS.STORY_GENERATION
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

    // ✅ NEW: Check AI Context Level access and quota
    const contextLevel = validatedData.contextLevel || ContextLevel.STANDARD;
    
    // Check tier access
    const tierCheck = await aiContextActionsService.checkTierAccess(
      context.user.organizationId,
      contextLevel
    );

    if (!tierCheck.hasAccess) {
      return NextResponse.json(
        {
          error: 'Access denied',
          message: tierCheck.upgradeMessage,
          currentTier: tierCheck.currentTier,
          requiredTier: tierCheck.requiredTier,
          upgradeUrl: '/pricing',
        },
        { status: 403 }
      );
    }

    // Check AI action quota
    const actionCheck = await aiContextActionsService.canPerformAction(
      context.user.organizationId,
      context.user.id,
      contextLevel
    );

    if (!actionCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Insufficient AI actions',
          message: actionCheck.reason,
          actionsRemaining: actionCheck.actionsRemaining,
          monthlyLimit: actionCheck.monthlyLimit,
          actionCost: actionCheck.actionCost,
          upgradeUrl: '/pricing',
        },
        { status: 429 }
      );
    }

    // ✅ CRITICAL: PII Detection - Block prompts with sensitive data
    try {
      const piiCheck = await piiDetectionService.scanForPII(
        validatedData.requirement,
        context.user.organizationId,
        { userId: context.user.id, feature: 'story_generation' }
      );

      if (piiCheck.hasPII && piiCheck.severity !== 'low') {
        console.warn(`PII detected in story generation for org ${context.user.organizationId}:`, piiCheck.detectedTypes);
        return NextResponse.json(
          {
            error: 'PII_DETECTED',
            message: 'Your prompt contains sensitive personal information that cannot be processed',
            detectedTypes: piiCheck.detectedTypes,
            severity: piiCheck.severity,
            recommendations: piiCheck.recommendations,
            redactedPreview: piiCheck.redactedText?.substring(0, 200),
          },
          { status: 400 }
        );
      }

      // Low severity PII (addresses, postal codes) - log warning but allow
      if (piiCheck.hasPII && piiCheck.severity === 'low') {
        console.warn(`Low-severity PII detected (${piiCheck.detectedTypes.join(', ')}), allowing request for org ${context.user.organizationId}`);
      }
    } catch (piiError) {
      // Don't block request if PII detection fails - log error and continue
      console.error('PII detection failed:', piiError);
    }

    // Legacy usage check (keep for backward compatibility)
    const usageCheck = await checkAIUsageLimit(context.user, AI_TOKEN_COSTS.STORY_GENERATION);

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

    try {
      await projectsRepo.getProjectById(validatedData.projectId);
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ForbiddenError) {
        return NextResponse.json(
          { error: 'Project not found or access denied' },
          { status: 404 }
        );
      }
      throw error;
    }

    // Validate and sanitize template selection
    const templateKey = validatedData.promptTemplate || getDefaultTemplateKey();
    const isAdmin = context.user.role === 'admin' || context.user.role === 'owner';
    const templateValidation = validateTemplateAccess(templateKey, isAdmin);
    
    if (!templateValidation.valid) {
      return NextResponse.json(
        { error: templateValidation.error },
        { status: 403 }
      );
    }

    // ✅ NEW: Select model based on context level
    const selectedModel = contextLevel === ContextLevel.COMPREHENSIVE_THINKING 
      ? THINKING_MODEL 
      : MODEL;

    console.log(`🤖 Using ${selectedModel} for ${contextLevel} context level`);

    // Generate a single story using AI
    let response;
    try {
      response = await aiService.generateStories(
        validatedData.requirement,
        validatedData.projectContext,
        1, // Generate only 1 story
        selectedModel,
        templateKey
      );
    } catch (aiError) {
      console.error('AI generation error:', aiError);
      return NextResponse.json(
        { 
          error: 'AI service error. Please try again.',
          details: process.env.NODE_ENV === 'development' ? (aiError instanceof Error ? aiError.message : String(aiError)) : undefined
        },
        { status: 500 }
      );
    }

    if (!response.stories || response.stories.length === 0) {
      console.error('No stories generated from AI response');
      return NextResponse.json(
        { 
          error: 'AI failed to generate a valid story. Please try again with a more detailed requirement.',
          hint: 'Try providing more context about the feature or user need.'
        },
        { status: 500 }
      );
    }

    const story = response.stories[0];

    // Track AI usage with real token data and template selection
    await aiService.trackUsage(
      context.user.id,
      context.user.organizationId,
      response.model,
      response.usage,
      'story_generation',
      validatedData.requirement,
      JSON.stringify(story),
      {
        promptTemplate: templateKey, // Track which template was used
        singleStory: true
      }
    );

    // Track fair-usage token consumption
    const actualTokensUsed = response.usage?.totalTokens || estimatedTokens
    await incrementTokenUsage(context.user.organizationId, actualTokensUsed)

    // ✅ NEW: Deduct AI actions based on context level
    try {
      const deductionResult = await aiContextActionsService.deductActions(
        context.user.organizationId,
        context.user.id,
        contextLevel,
        {
          promptTemplate: templateKey,
          model: selectedModel,
          tokensUsed: actualTokensUsed,
        }
      );

      console.log(`✅ AI actions deducted: ${deductionResult.actionsUsed}/${actionCheck.monthlyLimit} (${deductionResult.actionsRemaining} remaining)`);
    } catch (deductionError) {
      console.error('Failed to deduct AI actions:', deductionError);
      // Don't fail the request if deduction fails, but log it
    }

    return NextResponse.json({
      success: true,
      story,
      fairUsageWarning: aiCheck.isWarning ? aiCheck.reason : undefined,
      aiActions: {
        used: actionCheck.actionsUsed + actionCheck.actionCost,
        remaining: actionCheck.actionsRemaining - actionCheck.actionCost,
        monthlyLimit: actionCheck.monthlyLimit,
        contextLevel,
        actionCost: actionCheck.actionCost,
      },
    });

  } catch (error) {
    console.error('Generate single story error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    // Check if it's an API key error
    if (error instanceof Error && error.message.includes('ANTHROPIC_API_KEY')) {
      return NextResponse.json(
        { error: 'AI service is not configured. Please contact support.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate story',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

export const POST = withAuth(generateSingleStory);
