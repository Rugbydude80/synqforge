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
              // @ts-expect-error - isEpic not in current schema
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
              projectId: parentStory.projectId,
              epicId: payload.convertParentToEpic ? parentStoryId : parentStory.epicId,
              // @ts-expect-error - parentId not in current schema
              parentId: payload.convertParentToEpic ? parentStoryId : null,
              // @ts-expect-error - splitFromId not in current schema
              splitFromId: parentStoryId,
              title: childInput.title,
              description: `${childInput.personaGoal}\n\n${childInput.description}`,
              acceptanceCriteria: childInput.acceptanceCriteria.join('\n\n'),
              storyPoints: childInput.estimatePoints,
              status: 'backlog',
              priority: parentStory.priority || 'medium',
              storyType: 'feature',
              aiGenerated: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .returning();

          childStories.push(childStory);

          // Create story links (using raw SQL since table not in schema yet)
          const linkId = nanoid();
          await tx.execute({
            sql: `INSERT INTO story_links (id, story_id, related_story_id, relation, created_at)
                  VALUES ($1, $2, $3, $4, $5)`,
            params: [linkId, parentStoryId, childId, 'split_child', new Date()],
          });

          await tx.execute({
            sql: `INSERT INTO story_links (id, story_id, related_story_id, relation, created_at)
                  VALUES ($1, $2, $3, $4, $5)`,
            params: [nanoid(), childId, parentStoryId, 'split_parent', new Date()],
          });

          links.push({ id: linkId, relation: 'split_child' });
        }

        // Create audit record
        const auditId = nanoid();
        await tx.execute({
          sql: `INSERT INTO story_split_audit (id, parent_story_id, user_id, converted_to_epic, child_count, invest_rationale, spidr_strategy, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          params: [
            auditId,
            parentStoryId,
            userId,
            payload.convertParentToEpic,
            childStories.length,
            JSON.stringify(payload.investRationale),
            JSON.stringify(payload.spidrStrategy),
            new Date(),
          ],
        });

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
      logger.error('Story split transaction failed', {
        parentStoryId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}

export const storySplitService = new StorySplitService();

