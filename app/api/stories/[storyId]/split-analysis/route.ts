import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/middleware/auth';
import { StoriesRepository } from '@/lib/repositories/stories';
import { storySplitAnalysisService } from '@/lib/services/story-split-analysis.service';
import { metrics } from '@/lib/observability/metrics';

async function getSplitAnalysis(
  req: NextRequest,
  context: AuthContext & { params: { storyId: string } }
) {
  try {
    // Track split story modal opens
    metrics.increment('story_split_opened', 1);

    const storiesRepo = new StoriesRepository(context.user);
    const story = await storiesRepo.getStoryById(context.params.storyId);

    if (!story) {
      return NextResponse.json(
        { error: 'Story not found' },
        { status: 404 }
      );
    }

    const analysis = storySplitAnalysisService.analyzeStoryForSplit(story);

    return NextResponse.json({ analysis });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getSplitAnalysis);

