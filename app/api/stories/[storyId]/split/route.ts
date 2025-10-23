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

    // Validate all children
    const validation = storySplitValidationService.validateAllChildren(
      payload.children
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

    metrics.increment('story_split_validated', 1);

    // Check story exists and user has access
    const storiesRepo = new StoriesRepository(context.user);
    const parentStory = await storiesRepo.getStoryById(context.params.storyId);

    if (!parentStory) {
      return NextResponse.json(
        { error: 'Story not found' },
        { status: 404 }
      );
    }

    // Execute split transaction
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

