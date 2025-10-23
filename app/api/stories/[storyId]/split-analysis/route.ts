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

    // Ensure acceptanceCriteria is in the right format (array or null)
    let acceptanceCriteria = story.acceptanceCriteria;
    if (typeof acceptanceCriteria === 'string') {
      try {
        acceptanceCriteria = JSON.parse(acceptanceCriteria);
      } catch {
        // If it's a plain string, split by newlines
        acceptanceCriteria = acceptanceCriteria.split('\n').filter(line => line.trim());
      }
    }

    const storyForAnalysis = {
      ...story,
      acceptanceCriteria,
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

