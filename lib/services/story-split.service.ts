/**
 * Story Split Service
 * Executes story splitting with transactional guarantees
 */

import { db } from '@/lib/db';
import { stories } from '@/lib/db/schema';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import { metrics } from '@/lib/observability/metrics';
import { logger } from '@/lib/observability/logger';
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

export class StorySplitService {
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
          throw new Error('Parent story not found');
        }

        // Convert parent to epic if requested
        if (payload.convertParentToEpic) {
          await tx
            .update(stories)
            .set({
              isEpic: true,
              status: 'backlog',
              updatedAt: new Date(),
            })
            .where(eq(stories.id, parentStoryId));
        }

        // Create child stories
        const childStories = [];
        const links = [];

        for (const childInput of payload.children) {
          const childId = nanoid();
          
          const [childStory] = await tx
            .insert(stories)
            .values({
              id: childId,
              organizationId: parentStory.organizationId,
              projectId: parentStory.projectId,
              epicId: payload.convertParentToEpic ? parentStoryId : parentStory.epicId,
              parentId: payload.convertParentToEpic ? parentStoryId : null,
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
            })
            .returning();

          childStories.push(childStory);

          // TODO: Create story links when story_links table is added to schema
          // const linkId = nanoid();
          links.push({ id: nanoid(), relation: 'split_child' });
        }

        // TODO: Create audit record when story_split_audit table is added to schema
        const auditId = nanoid();

        return {
          parentStory,
          childStories,
          links,
          auditId,
        };
      });

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

      return result;
    } catch (error) {
      metrics.increment('story_split.error', 1);
      logger.error(`Story split transaction failed for story ${parentStoryId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }
}

export const storySplitService = new StorySplitService();

