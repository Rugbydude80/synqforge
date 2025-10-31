import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/middleware/auth';
import { StoriesRepository } from '@/lib/repositories/stories';
import { storySplitService } from '@/lib/services/story-split.service';
import { storySplitValidationService } from '@/lib/services/story-split-validation.service';
import { metrics } from '@/lib/observability/metrics';
import { z } from 'zod';

const childStorySchema = z.object({
  title: z.string().min(5),
  personaGoal: z.string().min(10),
  description: z.string().min(20),
  acceptanceCriteria: z.array(z.string()).min(2),
  estimatePoints: z.number().min(1).max(5),
  optionalDependencies: z.array(z.number()).optional(),
  providesUserValue: z.boolean(),
});

const splitStorySchema = z.object({
  convertParentToEpic: z.boolean(),
  children: z.array(childStorySchema).min(2),
  investRationale: z.any().optional(),
  spidrStrategy: z.any().optional(),
});

async function splitStory(
  req: NextRequest,
  context: AuthContext & { params: { storyId: string } }
) {
  try {
    const body = await req.json();
    const payload = splitStorySchema.parse(body);

    metrics.increment('story_split_suggested', 1, {
      child_count: payload.children.length.toString(),
    });

    // Get parent story to check acceptance criteria
    const storiesRepo = new StoriesRepository(context.user);
    const parentStory = await storiesRepo.getStoryById(context.params.storyId);

    if (!parentStory) {
      return NextResponse.json(
        { error: 'Story not found' },
        { status: 404 }
      );
    }

    // Get parent acceptance criteria for coverage validation
    const parentAcceptanceCriteria = Array.isArray(parentStory.acceptanceCriteria)
      ? parentStory.acceptanceCriteria
      : parentStory.acceptanceCriteria
      ? [parentStory.acceptanceCriteria]
      : [];

    // Validate all children with coverage check
    const validation = storySplitValidationService.validateAllChildren(
      payload.children,
      parentAcceptanceCriteria.length > 0 ? parentAcceptanceCriteria : undefined
    );

    if (!validation.allValid) {
      metrics.increment('story_split_blocked', 1, {
        reason: 'validation_failed',
      });

      return NextResponse.json(
        {
          error: 'Validation failed',
          validationResults: validation.results,
        },
        { status: 400 }
      );
    }

    // CRITICAL: Enforce 100% coverage (unless super admin)
    // Check if user is super admin (bypass coverage requirement for testing)
    const SUPER_ADMIN_EMAILS = ['chrisjrobertson@outlook.com', 'chris@synqforge.com'];
    const userEmail = context.user.email?.toLowerCase().trim();
    const isSuperAdmin = userEmail && SUPER_ADMIN_EMAILS.some(
      adminEmail => adminEmail.toLowerCase() === userEmail
    );

    if (parentAcceptanceCriteria.length > 0 && validation.coverage.coveragePercentage < 100 && !isSuperAdmin) {
      metrics.increment('story_split_blocked', 1, {
        reason: 'incomplete_coverage',
        coverage: validation.coverage.coveragePercentage.toString(),
      });

      return NextResponse.json(
        {
          error: 'Cannot complete split: Incomplete coverage',
          message: `Coverage is ${validation.coverage.coveragePercentage}%. All acceptance criteria must be covered.`,
          coverage: {
            percentage: validation.coverage.coveragePercentage,
            missingCriteria: validation.coverage.uncoveredCriteria,
            totalCriteria: parentAcceptanceCriteria.length,
            coveredCriteria: validation.coverage.coveredCriteria.length,
          },
          validationResults: validation.results,
        },
        { status: 400 }
      );
    }

    metrics.increment('story_split_validated', 1);

    // Check if story can be converted to epic
    if (payload.convertParentToEpic) {
      // Check if story is already an epic
      if (parentStory.isEpic) {
        return NextResponse.json(
          { 
            error: 'Epic conversion failed: This story is already an epic',
            validationResults: validation.results,
          },
          { status: 400 }
        );
      }
      
      // Check if story has tasks (epics shouldn't have tasks)
      // Note: This is a placeholder - implement actual task check if needed
      // if (parentStory.hasTasks) {
      //   return NextResponse.json(
      //     { error: 'Epic conversion failed: Stories with tasks cannot be converted to epics' },
      //     { status: 400 }
      //   );
      // }
    }

    // Execute split transaction
    try {
      const result = await storySplitService.splitStoryTx(
        context.params.storyId,
        context.user.id,
        payload
      );

      return NextResponse.json({
        success: true,
        parentStory: result.parentStory,
        childStories: result.childStories,
        auditId: result.auditId,
      });
    } catch (splitError: any) {
      // Check if error is related to epic conversion
      const errorMessage = splitError?.message || 'Split failed';
      if (errorMessage.toLowerCase().includes('epic') || errorMessage.toLowerCase().includes('convert')) {
        return NextResponse.json(
          { 
            error: `Epic conversion failed: ${errorMessage}`,
            validationResults: validation.results,
          },
          { status: 400 }
        );
      }
      throw splitError; // Re-throw other errors
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    metrics.increment('story_split_blocked', 1, {
      reason: 'server_error',
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Split failed' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(splitStory);

