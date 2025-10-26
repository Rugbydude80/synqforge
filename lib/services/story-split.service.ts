/**
 * Story Split Service
 * 
 * Handles story splitting with transactional guarantees, converting parent stories to epics
 * and creating child stories with proper linkage and audit trails.
 */

import { db } from '@/lib/db';
import { stories } from '@/lib/db/schema';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import { metrics } from '@/lib/observability/metrics';
import { logger } from '@/lib/observability/logger';
import { NotFoundError, DatabaseError } from '@/lib/errors/custom-errors';
import type { ChildStoryInput } from './story-split-validation.service';

export interface SplitStoryPayload {
  convertParentToEpic: boolean;
  children: ChildStoryInput[];
  investRationale?: any;
  spidrStrategy?: any;
}

export interface SplitStoryResult {
  parentStory: any;
  childStories: any[];
  links: any[];
  auditId: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Converts a story to an epic by updating its status and isEpic flag
 * 
 * @param tx - Database transaction
 * @param storyId - Story ID to convert
 */
async function convertStoryToEpic(tx: any, storyId: string): Promise<void> {
  await tx
    .update(stories)
    .set({
      isEpic: true,
      status: 'backlog',
      updatedAt: new Date(),
    })
    .where(eq(stories.id, storyId));
}

/**
 * Creates child story data from parent story and child input
 * 
 * @param parentStory - Parent story object
 * @param childInput - Child story input data
 * @param userId - User creating the child story
 * @param parentStoryId - Parent story ID
 * @param convertParentToEpic - Whether parent is being converted to epic
 * @returns Story data ready for insertion
 */
function createChildStoryData(
  parentStory: any,
  childInput: ChildStoryInput,
  userId: string,
  parentStoryId: string,
  convertParentToEpic: boolean
) {
  return {
    id: nanoid(),
    organizationId: parentStory.organizationId,
    projectId: parentStory.projectId,
    epicId: convertParentToEpic ? parentStoryId : parentStory.epicId,
    parentId: convertParentToEpic ? parentStoryId : null,
    splitFromId: parentStoryId,
    title: childInput.title,
    description: `${childInput.personaGoal}\n\n${childInput.description}`,
    acceptanceCriteria: childInput.acceptanceCriteria,
    storyPoints: childInput.estimatePoints,
    status: 'backlog',
    priority: parentStory.priority || 'medium',
    storyType: 'feature',
    aiGenerated: false,
    createdBy: userId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Creates all child stories from the split payload
 * 
 * @param tx - Database transaction
 * @param parentStory - Parent story object
 * @param payload - Split payload with child story data
 * @param userId - User performing the split
 * @param parentStoryId - Parent story ID
 * @returns Array of created child stories and links
 */
async function createChildStories(
  tx: any,
  parentStory: any,
  payload: SplitStoryPayload,
  userId: string,
  parentStoryId: string
): Promise<{ childStories: any[]; links: any[] }> {
  const childStories = [];
  const links = [];

  for (const childInput of payload.children) {
    const childData = createChildStoryData(
      parentStory,
      childInput,
      userId,
      parentStoryId,
      payload.convertParentToEpic
    );

    const [childStory] = await tx
      .insert(stories)
      .values(childData)
      .returning();

    childStories.push(childStory);

    // TODO: Create story links when story_links table is added to schema
    links.push({ id: nanoid(), relation: 'split_child' });
  }

  return { childStories, links };
}

/**
 * Records metrics for a successful story split
 */
function recordSplitMetrics(
  payload: SplitStoryPayload,
  startTime: number,
  parentStoryId: string,
  userId: string
): void {
  metrics.increment('story_split.committed', 1, {
    converted_to_epic: payload.convertParentToEpic.toString(),
    child_count: payload.children.length.toString(),
  });

  const latency = Date.now() - startTime;
  metrics.timing('story_split.transaction_duration', latency);

  logger.info('Story split committed', {
    parentStoryId,
    userId,
    convertedToEpic: payload.convertParentToEpic,
    childCount: payload.children.length,
    latency,
  });
}

// ============================================================================
// MAIN SERVICE CLASS
// ============================================================================

/**
 * Service for handling story splitting operations
 */
export class StorySplitService {
  /**
   * Splits a story into multiple child stories with transactional guarantees
   * 
   * This operation:
   * 1. Optionally converts the parent story to an epic
   * 2. Creates child stories linked to the parent
   * 3. Records an audit trail (TODO: when audit table exists)
   * 4. Tracks metrics and logs the operation
   * 
   * All operations are performed within a database transaction to ensure atomicity.
   * If any step fails, all changes are rolled back.
   * 
   * @param parentStoryId - ID of the story to split
   * @param userId - ID of the user performing the split
   * @param payload - Split configuration including child story data
   * @returns Split result with parent, children, links, and audit ID
   * @throws {NotFoundError} Parent story not found
   * @throws {DatabaseError} Database transaction failed
   * 
   * @example
   * ```typescript
   * const result = await storySplitService.splitStoryTx(
   *   'story_123',
   *   'user_456',
   *   {
   *     convertParentToEpic: true,
   *     children: [
   *       { title: 'Child 1', personaGoal: '...', description: '...', acceptanceCriteria: [], estimatePoints: 3 },
   *       { title: 'Child 2', personaGoal: '...', description: '...', acceptanceCriteria: [], estimatePoints: 5 },
   *     ]
   *   }
   * );
   * ```
   */
  async splitStoryTx(
    parentStoryId: string,
    userId: string,
    payload: SplitStoryPayload
  ): Promise<SplitStoryResult> {
    const startTime = Date.now();

    try {
      const result = await db.transaction(async (tx) => {
        // Load parent story
        const [parentStory] = await tx
          .select()
          .from(stories)
          .where(eq(stories.id, parentStoryId))
          .limit(1);

        if (!parentStory) {
          throw new NotFoundError('Story', parentStoryId, 'Parent story not found');
        }

        // Convert parent to epic if requested
        if (payload.convertParentToEpic) {
          await convertStoryToEpic(tx, parentStoryId);
        }

        // Create child stories
        const { childStories, links } = await createChildStories(
          tx,
          parentStory,
          payload,
          userId,
          parentStoryId
        );

        // TODO: Create audit record when story_split_audit table is added to schema
        const auditId = nanoid();

        return {
          parentStory,
          childStories,
          links,
          auditId,
        };
      });

      // Record metrics
      recordSplitMetrics(payload, startTime, parentStoryId, userId);

      return result;
    } catch (error) {
      metrics.increment('story_split.error', 1);
      
      logger.error(
        `Story split transaction failed for story ${parentStoryId}`,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );

      // Re-throw as DatabaseError if not already a custom error
      if (error instanceof NotFoundError) {
        throw error;
      }

      throw new DatabaseError(
        'Story split transaction failed',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
}

/**
 * Singleton instance of the story split service
 */
export const storySplitService = new StorySplitService();
