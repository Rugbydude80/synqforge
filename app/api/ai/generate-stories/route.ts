import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/middleware/auth';
import { aiService } from '@/lib/services/ai.service';
import { ProjectsRepository } from '@/lib/repositories/projects';
import { EpicsRepository } from '@/lib/repositories/epics';
import { generateStoriesSchema } from '@/lib/validations/ai';
import { z } from 'zod';
import { aiGenerationRateLimit, checkRateLimit, getResetTimeMessage } from '@/lib/rate-limit';
import { checkAIUsageLimit } from '@/lib/services/ai-usage.service';
import { AI_TOKEN_COSTS } from '@/lib/constants';
import { canUseAI, incrementTokenUsage, checkBulkLimit } from '@/lib/billing/fair-usage-guards';
import { EmbeddingsService } from '@/lib/services/embeddings.service';
import { ContextLevel } from '@/lib/types/context.types';
import { validateTemplateAccess, getDefaultTemplateKey } from '@/lib/ai/prompt-templates';
import { piiDetectionService } from '@/lib/services/pii-detection.service';
import { customDocumentTemplatesRepository } from '@/lib/repositories/custom-document-templates.repository';
import { customTemplateParserService } from '@/lib/services/custom-template-parser.service';
import { checkSubscriptionTier } from '@/lib/middleware/subscription-guard';

async function generateStories(req: NextRequest, context: AuthContext) {
  const projectsRepo = new ProjectsRepository(context.user);
  const epicsRepo = new EpicsRepository(context.user);

  try {
    // Parse and validate request body
    const body = await req.json();
    const validatedData = generateStoriesSchema.parse(body);

    // Check rate limit first
    const rateLimitResult = await checkRateLimit(
      `ai:generate-stories:${context.user.id}`,
      aiGenerationRateLimit
    );

    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: getResetTimeMessage(rateLimitResult.reset),
        },
        {
          status: 429,
          headers: { 'Retry-After': retryAfter.toString() },
        }
      );
    }

    // NEW: Check fair-usage bulk limit
    const estimatedStoryCount = 5 // Default estimate
    const bulkCheck = await checkBulkLimit(context.user.organizationId, estimatedStoryCount, context.user.id)
    if (!bulkCheck.allowed) {
      return NextResponse.json(
        {
          error: bulkCheck.reason,
          upgradeUrl: bulkCheck.upgradeUrl,
          used: bulkCheck.used,
          limit: bulkCheck.limit,
        },
        { status: 402 } // Payment Required
      )
    }

    // NEW: Check fair-usage AI token limit (HARD BLOCK)
    const estimatedTokens = AI_TOKEN_COSTS.STORY_GENERATION * estimatedStoryCount
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
        { status: 402 } // Payment Required
      )
    }

    // Show 90% warning if approaching limit
    if (aiCheck.isWarning && aiCheck.reason) {
      console.warn(`Fair-usage warning for org ${context.user.organizationId}: ${aiCheck.reason}`)
    }

    // ✅ CRITICAL: PII Detection - Block prompts with sensitive data
    try {
      const piiCheck = await piiDetectionService.scanForPII(
        validatedData.requirements,
        context.user.organizationId,
        { userId: context.user.id, feature: 'bulk_story_generation' }
      );

      if (piiCheck.hasPII && piiCheck.severity !== 'low') {
        console.warn(`PII detected in bulk story generation for org ${context.user.organizationId}:`, piiCheck.detectedTypes);
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
    } catch (piiError) {
      // Log PII detection error but don't block request
      console.error('PII detection error:', piiError);
    }

    // Legacy usage check (keep for backward compatibility)
    const usageCheck = await checkAIUsageLimit(context.user, estimatedTokens);

    if (!usageCheck.allowed) {
      return NextResponse.json(
        {
          error: usageCheck.reason,
          upgradeUrl: usageCheck.upgradeUrl,
          usage: usageCheck.usage,
        },
        { status: 402 } // Payment Required
      );
    }

    // Verify user has access to the project
    const project = await projectsRepo.getProjectById(validatedData.projectId);

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    // If epicId provided, verify it exists and belongs to the project
    if (validatedData.epicId) {
      const epic = await epicsRepo.getEpicById(validatedData.epicId);

      if (!epic || epic.projectId !== validatedData.projectId) {
        return NextResponse.json(
          { error: 'Epic not found or does not belong to this project' },
          { status: 404 }
        );
      }
    }

    // Initialize embeddings service for semantic context
    const embeddingsService = new EmbeddingsService();
    let semanticContext = '';
    let semanticSearchUsed = false;

    // Add semantic context for COMPREHENSIVE context levels
    const contextLevel = (validatedData as any).contextLevel as ContextLevel | undefined;
    if (
      (contextLevel === ContextLevel.COMPREHENSIVE || 
       contextLevel === ContextLevel.COMPREHENSIVE_THINKING) &&
      validatedData.epicId &&
      embeddingsService.isEnabled()
    ) {
      console.log('🔍 Fetching semantic context for epic:', validatedData.epicId);

      const startTime = Date.now();
      try {
        const similarStories = await embeddingsService.findSimilarStories({
          queryText: validatedData.requirements,
          epicId: validatedData.epicId,
          limit: 5,
          minSimilarity: 0.7,
        });
        const searchTime = Date.now() - startTime;

        console.log(`⏱️  Semantic search completed in ${searchTime}ms`);

        if (similarStories.length > 0) {
          semanticSearchUsed = true;
          semanticContext += `\n\n# SEMANTICALLY SIMILAR STORIES IN THIS EPIC\n\n`;
          semanticContext += 'Consider these related stories for consistency:\n\n';
          semanticContext += similarStories
            .map(
              (s, idx) => `
${idx + 1}. **${s.title}** (${Math.round(s.similarity * 100)}% similar)
   - Priority: ${s.priority}
   - Status: ${s.status}
   - Description: ${s.description?.substring(0, 150) || 'N/A'}
   - Key AC: ${
              Array.isArray(s.acceptance_criteria)
                ? s.acceptance_criteria.slice(0, 2).join('; ')
                : 'None'
            }
          `.trim()
            )
            .join('\n\n');

          console.log(
            `✅ Added ${similarStories.length} similar stories to context (${semanticContext.length} chars)`
          );
        } else {
          console.log('ℹ️  No similar stories found above similarity threshold');
        }
      } catch (error) {
        console.error('❌ Semantic search failed, continuing without it:', error);
        // Continue generation without semantic context if search fails
      }
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

    // Handle custom document template if provided
    let customTemplateFormat: string | undefined;
    let customTemplateId: string | undefined;
    
    if (validatedData.customTemplateId) {
      // Check subscription tier for custom templates
      const tierCheck = await checkSubscriptionTier(context.user.organizationId, 'pro');
      if (!tierCheck.hasAccess) {
        return NextResponse.json(
          {
            error: 'Custom document templates are only available on Pro, Team, or Enterprise plans',
            currentTier: tierCheck.currentTier,
            requiredTier: 'pro',
            upgradeUrl: tierCheck.upgradeUrl || '/settings/billing',
          },
          { status: 403 }
        );
      }

      // Load custom template
      const customTemplate = await customDocumentTemplatesRepository.getById(
        validatedData.customTemplateId,
        context.user.organizationId
      );

      if (!customTemplate || !customTemplate.isActive) {
        return NextResponse.json(
          { error: 'Custom template not found or inactive' },
          { status: 404 }
        );
      }

      // Generate prompt enhancement from template format
      if (customTemplate.templateFormat) {
        customTemplateFormat = customTemplateParserService.generatePromptEnhancement(
          customTemplate.templateFormat as any
        );
        customTemplateId = customTemplate.id;
        
        // Increment usage count (async, don't block)
        customDocumentTemplatesRepository.incrementUsage(customTemplate.id).catch(
          (err) => console.error('Failed to increment template usage:', err)
        );
      }
    }

    // Combine project context with semantic context
    const enhancedContext = validatedData.projectContext 
      ? `${validatedData.projectContext}\n${semanticContext}`
      : semanticContext;

    // Generate stories using AI with selected template and custom format
    const response = await aiService.generateStories(
      validatedData.requirements,
      enhancedContext,
      5,
      undefined, // Use default model
      templateKey,
      customTemplateFormat
    );

    // Track AI usage with real token data and template selection
    await aiService.trackUsage(
      context.user.id,
      context.user.organizationId,
      response.model,
      response.usage,
      'story_generation',
      validatedData.requirements,
      JSON.stringify(response.stories),
      {
        promptTemplate: templateKey,
        customTemplateId: customTemplateId,
        storiesCount: response.stories.length,
        semanticSearchUsed
      }
    );

    // NEW: Track fair-usage token consumption
    const actualTokensUsed = response.usage?.totalTokens || estimatedTokens
    await incrementTokenUsage(context.user.organizationId, actualTokensUsed)

    // Generate embeddings for new stories (async, don't block response)
    if (response.stories && Array.isArray(response.stories)) {
      response.stories.forEach((story: any) => {
        if (story.id && story.title) {
          embeddingsService
            .embedStory(story.id, {
              title: story.title,
              description: story.description,
              acceptance_criteria: story.acceptanceCriteria || story.acceptance_criteria,
            })
            .catch((err) => {
              console.error(`Failed to embed story ${story.id}:`, err);
              // Don't fail the request if embedding fails
            });
        }
      });
    }

    return NextResponse.json({
      success: true,
      stories: response.stories,
      count: response.stories.length,
      usage: response.usage,
      fairUsageWarning: aiCheck.isWarning ? aiCheck.reason : undefined,
      meta: {
        semanticSearchUsed,
        contextLength: enhancedContext.length,
      },
    });

  } catch (error) {
    console.error('Generate stories error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate stories',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

export const POST = withAuth(generateStories);
