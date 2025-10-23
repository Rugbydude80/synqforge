import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/middleware/auth';
import { StoriesRepository } from '@/lib/repositories/stories';
import { storySplitAnalysisService } from '@/lib/services/story-split-analysis.service';
import { metrics } from '@/lib/observability/metrics';

async function getSplitAnalysis(
  req: NextRequest,
  context: AuthContext & { params: { storyId: string } }
) {
  const storyId = context.params.storyId;
  
  try {
    console.log(`[split-analysis] Starting analysis for story: ${storyId}`);
    
    // Track split story modal opens
    try {
      metrics.increment('story_split_opened', 1);
    } catch (metricsError) {
      console.error('[split-analysis] Metrics error:', metricsError);
    }

    const storiesRepo = new StoriesRepository(context.user);
    const story = await storiesRepo.getStoryById(storyId);

    console.log(`[split-analysis] Story fetched:`, {
      id: story?.id,
      hasTitle: !!story?.title,
      hasDescription: !!story?.description,
      acceptanceCriteriaType: Array.isArray(story?.acceptanceCriteria) ? 'array' : typeof story?.acceptanceCriteria,
    });

    if (!story) {
      console.log(`[split-analysis] Story not found: ${storyId}`);
      return NextResponse.json(
        { error: 'Story not found' },
        { status: 404 }
      );
    }

    // Drizzle ORM auto-parses JSON columns, so acceptanceCriteria is already string[] | null
    // Just ensure it's the right type
    const storyForAnalysis = {
      id: story.id,
      title: story.title || '',
      description: story.description || null,
      acceptanceCriteria: Array.isArray(story.acceptanceCriteria) ? story.acceptanceCriteria : null,
      storyPoints: story.storyPoints || null,
      status: story.status || null,
      parentId: (story as any).parentId || null,
      isEpic: false, // Stories can't be epics in this context
    };

    console.log(`[split-analysis] Prepared story for analysis:`, {
      id: storyForAnalysis.id,
      titleLength: storyForAnalysis.title.length,
      hasDescription: !!storyForAnalysis.description,
      criteriaCount: storyForAnalysis.acceptanceCriteria?.length || 0,
    });

    console.log(`[split-analysis] About to call analyzeStoryForSplit...`);
    const analysis = storySplitAnalysisService.analyzeStoryForSplit(storyForAnalysis);
    console.log(`[split-analysis] analyzeStoryForSplit returned successfully`);
    
    console.log(`[split-analysis] Analysis completed:`, {
      storyId,
      splittingRecommended: analysis.splittingRecommended,
      investScore: analysis.invest.score,
      blockingReasonsCount: analysis.blockingReasons.length,
    });

    console.log(`[split-analysis] Returning success response`);
    return NextResponse.json({ analysis });
  } catch (error) {
    console.error(`[split-analysis] ===== ERROR CAUGHT =====`);
    console.error(`[split-analysis] Story ID: ${storyId}`);
    console.error(`[split-analysis] Error type: ${typeof error}`);
    console.error(`[split-analysis] Error instanceof Error: ${error instanceof Error}`);
    console.error(`[split-analysis] Error:`, error);
    
    if (error instanceof Error) {
      console.error(`[split-analysis] Error.name: ${error.name}`);
      console.error(`[split-analysis] Error.message: ${error.message}`);
      console.error(`[split-analysis] Error.stack:`, error.stack);
    }
    
    // Return detailed error for debugging
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : String(error),
        errorType: typeof error,
        errorName: error instanceof Error ? error.name : 'Unknown',
        storyId,
      },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getSplitAnalysis);

