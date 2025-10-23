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
    try {
      metrics.increment('story_split_opened', 1);
    } catch (metricsError) {
      console.error('Metrics error:', metricsError);
    }

    const storiesRepo = new StoriesRepository(context.user);
    const story = await storiesRepo.getStoryById(context.params.storyId);

    if (!story) {
      return NextResponse.json(
        { error: 'Story not found' },
        { status: 404 }
      );
    }

    // Drizzle ORM auto-parses JSON columns, so acceptanceCriteria is already string[] | null
    // Just ensure it's the right type
    const storyForAnalysis = {
      ...story,
      acceptanceCriteria: Array.isArray(story.acceptanceCriteria) ? story.acceptanceCriteria : null,
    };

    const analysis = storySplitAnalysisService.analyzeStoryForSplit(storyForAnalysis);

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('Story split analysis error:', error);
    console.error('Story ID:', context.params.storyId);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getSplitAnalysis);

