import { db } from '@/lib/db'
import { stories } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

type AccessibleStoryMeta = {
  id: string
  projectId: string
}

/**
 * Ensure a story belongs to the caller's organisation.
 * Returns minimal metadata required by callers when access is granted.
 * Throws a generic "Story not found" error to avoid leaking existence.
 */
export async function assertStoryAccessible(
  storyId: string,
  organizationId: string
): Promise<AccessibleStoryMeta> {
  const [story] = await db
    .select({
      id: stories.id,
      projectId: stories.projectId,
    })
    .from(stories)
    .where(and(eq(stories.id, storyId), eq(stories.organizationId, organizationId)))
    .limit(1)

  if (!story) {
    throw new Error('Story not found')
  }

  return story
}

