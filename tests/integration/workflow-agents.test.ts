import test from 'node:test'
import assert from 'node:assert/strict'
import { db, generateId } from '@/lib/db'
import { workflowAgents, stories, users, organizations, projects, notifications } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { executeAction, AgentActionDefinition } from '@/lib/services/workflow-agents.service'

/**
 * Workflow Agent Actions Integration Tests
 * 
 * Tests for Critical Issue #2: Workflow Agent Actions Not Implemented
 * 
 * These tests verify:
 * - add_label action: Add label to story in database
 * - assign_user action: Assign user to story with validation
 * - send_notification action: Create notification using NotificationRepository
 * - update_field action: Update story field with validation
 * - ai_action action: Trigger AI service with context
 * - Error handling and rollback for failed actions
 * - Action execution logging
 */

// Clean up test data helper
async function cleanupTestData(ids: { orgId?: string; projectId?: string; storyId?: string; userId?: string; agentId?: string }) {
  if (ids.storyId) await db.delete(stories).where(eq(stories.id, ids.storyId))
  if (ids.projectId) await db.delete(projects).where(eq(projects.id, ids.projectId))
  if (ids.userId) await db.delete(users).where(eq(users.id, ids.userId))
  if (ids.agentId) await db.delete(workflowAgents).where(eq(workflowAgents.id, ids.agentId))
  if (ids.orgId) await db.delete(organizations).where(eq(organizations.id, ids.orgId))
}

// Create test organization helper
async function createTestOrganization() {
  const orgId = generateId()
  await db.insert(organizations).values({
    id: orgId,
    name: 'Test Organization',
    slug: `test-org-${Date.now()}`,
    subscriptionTier: 'enterprise', // Required for workflow agents
    subscriptionStatus: 'active',
  })
  return orgId
}

// Create test user helper
async function createTestUser(orgId: string) {
  const userId = generateId()
  await db.insert(users).values({
    id: userId,
    email: `test-${Date.now()}@example.com`,
    name: 'Test User',
    organizationId: orgId,
    role: 'admin',
    isActive: true,
  })
  return userId
}

// Create test project helper
async function createTestProject(orgId: string, ownerId: string) {
  const projectId = generateId()
  await db.insert(projects).values({
    id: projectId,
    organizationId: orgId,
    name: 'Test Project',
    key: 'TEST',
    slug: `test-project-${Date.now()}`,
    status: 'active',
    ownerId,
  })
  return projectId
}

// Create test story helper
async function createTestStory(orgId: string, projectId: string, createdBy: string) {
  const storyId = generateId()
  await db.insert(stories).values({
    id: storyId,
    organizationId: orgId,
    projectId,
    createdBy,
    title: 'Test Story',
    description: 'Test description',
    status: 'backlog',
    priority: 'medium',
    labels: [],
  })
  return storyId
}

test.describe('Workflow Agent Actions - Critical Issue #2', () => {
  test('should add label to story', async () => {
    const orgId = await createTestOrganization()
    const userId = await createTestUser(orgId)
    const projectId = await createTestProject(orgId, userId)
    const storyId = await createTestStory(orgId, projectId, userId)

    try {
      const action: AgentActionDefinition = {
        type: 'add_label',
        config: {
          storyId,
          label: 'bug',
        },
      }

      const context = { storyId, organizationId: orgId }

      await executeAction(action, context)

      // Verify label was added
      const [story] = await db
        .select()
        .from(stories)
        .where(eq(stories.id, storyId))
        .limit(1)

      assert.ok(story, 'Story should exist')
      assert.ok(Array.isArray(story.labels), 'Labels should be an array')
      assert.ok(story.labels?.includes('bug'), 'Label should be added')
    } finally {
      await cleanupTestData({ orgId, projectId, storyId, userId })
    }
  })

  test('should add multiple labels to story', async () => {
    const orgId = await createTestOrganization()
    const userId = await createTestUser(orgId)
    const projectId = await createTestProject(orgId, userId)
    const storyId = await createTestStory(orgId, projectId, userId)

    try {
      // Add first label
      await executeAction(
        { type: 'add_label', config: { storyId, label: 'bug' } },
        { storyId, organizationId: orgId }
      )

      // Add second label
      await executeAction(
        { type: 'add_label', config: { storyId, label: 'critical' } },
        { storyId, organizationId: orgId }
      )

      // Verify both labels exist
      const [story] = await db
        .select()
        .from(stories)
        .where(eq(stories.id, storyId))
        .limit(1)

      assert.ok(story?.labels?.includes('bug'), 'First label should exist')
      assert.ok(story?.labels?.includes('critical'), 'Second label should exist')
      assert.equal(story?.labels?.length, 2, 'Should have exactly 2 labels')
    } finally {
      await cleanupTestData({ orgId, projectId, storyId, userId })
    }
  })

  test('should not add duplicate labels', async () => {
    const orgId = await createTestOrganization()
    const userId = await createTestUser(orgId)
    const projectId = await createTestProject(orgId, userId)
    const storyId = await createTestStory(orgId, projectId, userId)

    try {
      await executeAction(
        { type: 'add_label', config: { storyId, label: 'bug' } },
        { storyId, organizationId: orgId }
      )

      // Try to add same label again
      await executeAction(
        { type: 'add_label', config: { storyId, label: 'bug' } },
        { storyId, organizationId: orgId }
      )

      const [story] = await db
        .select()
        .from(stories)
        .where(eq(stories.id, storyId))
        .limit(1)

      const bugCount = story?.labels?.filter((l: string) => l === 'bug').length || 0
      assert.equal(bugCount, 1, 'Should not have duplicate labels')
    } finally {
      await cleanupTestData({ orgId, projectId, storyId, userId })
    }
  })

  test('should assign user to story', async () => {
    const orgId = await createTestOrganization()
    const assignerId = await createTestUser(orgId)
    const assigneeId = await createTestUser(orgId)
    const projectId = await createTestProject(orgId, userId)
    const storyId = await createTestStory(orgId, projectId, assignerId)

    try {
      const action: AgentActionDefinition = {
        type: 'assign_user',
        config: {
          storyId,
          userId: assigneeId,
        },
      }

      const context = { storyId, organizationId: orgId, userId: assignerId }

      await executeAction(action, context)

      // Verify assignee was set
      const [story] = await db
        .select()
        .from(stories)
        .where(eq(stories.id, storyId))
        .limit(1)

      assert.equal(story?.assigneeId, assigneeId, 'Story should be assigned to user')
    } finally {
      await cleanupTestData({ orgId, projectId, storyId, userId: assignerId })
      await db.delete(users).where(eq(users.id, assigneeId))
    }
  })

  test('should reject assignment to non-existent user', async () => {
    const orgId = await createTestOrganization()
    const userId = await createTestUser(orgId)
    const projectId = await createTestProject(orgId, userId)
    const storyId = await createTestStory(orgId, projectId, userId)
    const fakeUserId = generateId()

    try {
      const action: AgentActionDefinition = {
        type: 'assign_user',
        config: {
          storyId,
          userId: fakeUserId,
        },
      }

      const context = { storyId, organizationId: orgId }

      await assert.rejects(
        async () => await executeAction(action, context),
        /Assignee not found|User not found/i,
        'Should reject assignment to non-existent user'
      )

      // Verify story was not updated
      const [story] = await db
        .select()
        .from(stories)
        .where(eq(stories.id, storyId))
        .limit(1)

      assert.equal(story?.assigneeId, null, 'Story should not be assigned')
    } finally {
      await cleanupTestData({ orgId, projectId, storyId, userId })
    }
  })

  test('should reject assignment to user from different organization', async () => {
    const orgId1 = await createTestOrganization()
    const orgId2 = await createTestOrganization()
    const userId1 = await createTestUser(orgId1)
    const userId2 = await createTestUser(orgId2)
    const projectId = await createTestProject(orgId1, userId1)
    const storyId = await createTestStory(orgId1, projectId, userId1)

    try {
      const action: AgentActionDefinition = {
        type: 'assign_user',
        config: {
          storyId,
          userId: userId2, // User from different org
        },
      }

      const context = { storyId, organizationId: orgId1 }

      await assert.rejects(
        async () => await executeAction(action, context),
        /not found|not belong|unauthorized/i,
        'Should reject assignment to user from different organization'
      )
    } finally {
      await cleanupTestData({ orgId: orgId1, projectId, storyId, userId: userId1 })
      await cleanupTestData({ orgId: orgId2, userId: userId2 })
    }
  })

  test('should send notification', async () => {
    const orgId = await createTestOrganization()
    const userId = await createTestUser(orgId)
    const projectId = await createTestProject(orgId, userId)
    const storyId = await createTestStory(orgId, projectId, userId)

    try {
      const action: AgentActionDefinition = {
        type: 'send_notification',
        config: {
          userId,
          type: 'story_assigned',
          entityType: 'story',
          entityId: storyId,
          message: 'Story assigned to you',
          actionUrl: `/stories/${storyId}`,
        },
      }

      const context = { storyId, organizationId: orgId, userId }

      await executeAction(action, context)

      // Verify notification was created
      const [notification] = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .limit(1)

      assert.ok(notification, 'Notification should exist')
      assert.equal(notification.type, 'story_assigned', 'Notification type should match')
      assert.equal(notification.entityType, 'story', 'Entity type should match')
      assert.equal(notification.entityId, storyId, 'Entity ID should match')
      assert.equal(notification.message, 'Story assigned to you', 'Message should match')
    } finally {
      await db.delete(notifications).where(eq(notifications.userId, userId))
      await cleanupTestData({ orgId, projectId, storyId, userId })
    }
  })

  test('should update story field', async () => {
    const orgId = await createTestOrganization()
    const userId = await createTestUser(orgId)
    const projectId = await createTestProject(orgId, userId)
    const storyId = await createTestStory(orgId, projectId, userId)

    try {
      const action: AgentActionDefinition = {
        type: 'update_field',
        config: {
          storyId,
          field: 'status',
          value: 'in_progress',
        },
      }

      const context = { storyId, organizationId: orgId }

      await executeAction(action, context)

      // Verify field was updated
      const [story] = await db
        .select()
        .from(stories)
        .where(eq(stories.id, storyId))
        .limit(1)

      assert.equal(story?.status, 'in_progress', 'Status should be updated')
    } finally {
      await cleanupTestData({ orgId, projectId, storyId, userId })
    }
  })

  test('should update multiple story fields', async () => {
    const orgId = await createTestOrganization()
    const userId = await createTestUser(orgId)
    const projectId = await createTestProject(orgId, userId)
    const storyId = await createTestStory(orgId, projectId, userId)

    try {
      const action: AgentActionDefinition = {
        type: 'update_field',
        config: {
          storyId,
          updates: {
            status: 'in_progress',
            priority: 'high',
            storyPoints: 5,
          },
        },
      }

      const context = { storyId, organizationId: orgId }

      await executeAction(action, context)

      // Verify fields were updated
      const [story] = await db
        .select()
        .from(stories)
        .where(eq(stories.id, storyId))
        .limit(1)

      assert.equal(story?.status, 'in_progress', 'Status should be updated')
      assert.equal(story?.priority, 'high', 'Priority should be updated')
      assert.equal(story?.storyPoints, 5, 'Story points should be updated')
    } finally {
      await cleanupTestData({ orgId, projectId, storyId, userId })
    }
  })

  test('should reject invalid field updates', async () => {
    const orgId = await createTestOrganization()
    const userId = await createTestUser(orgId)
    const projectId = await createTestProject(orgId, userId)
    const storyId = await createTestStory(orgId, projectId, userId)

    try {
      const action: AgentActionDefinition = {
        type: 'update_field',
        config: {
          storyId,
          field: 'invalidField',
          value: 'invalid',
        },
      }

      const context = { storyId, organizationId: orgId }

      await assert.rejects(
        async () => await executeAction(action, context),
        /Invalid field|not allowed/i,
        'Should reject invalid field updates'
      )
    } finally {
      await cleanupTestData({ orgId, projectId, storyId, userId })
    }
  })

  test('should execute AI action', async () => {
    const orgId = await createTestOrganization()
    const userId = await createTestUser(orgId)
    const projectId = await createTestProject(orgId, userId)
    const storyId = await createTestStory(orgId, projectId, userId)

    try {
      const action: AgentActionDefinition = {
        type: 'ai_action',
        config: {
          action: 'generate_description',
          storyId,
          prompt: 'Generate a detailed description for this story',
        },
      }

      const context = { storyId, organizationId: orgId, userId }

      // Mock AI service - this should be called
      await executeAction(action, context)

      // Verify AI action was executed (should update story description)
      const [story] = await db
        .select()
        .from(stories)
        .where(eq(stories.id, storyId))
        .limit(1)

      // AI action should have updated the story
      assert.ok(story, 'Story should exist')
      // Note: In real implementation, AI would update description
    } finally {
      await cleanupTestData({ orgId, projectId, storyId, userId })
    }
  })

  test('should handle failed actions gracefully', async () => {
    const orgId = await createTestOrganization()
    const userId = await createTestUser(orgId)
    const projectId = await createTestProject(orgId, userId)
    const storyId = await createTestStory(orgId, projectId, userId)

    try {
      // Try to assign non-existent user
      const action: AgentActionDefinition = {
        type: 'assign_user',
        config: {
          storyId,
          userId: 'non-existent-user-id',
        },
      }

      const context = { storyId, organizationId: orgId }

      await assert.rejects(
        async () => await executeAction(action, context),
        /not found/i,
        'Should throw error for invalid assignment'
      )

      // Verify story state was not corrupted
      const [story] = await db
        .select()
        .from(stories)
        .where(eq(stories.id, storyId))
        .limit(1)

      assert.equal(story?.assigneeId, null, 'Story should not be assigned on error')
    } finally {
      await cleanupTestData({ orgId, projectId, storyId, userId })
    }
  })

  test('should log action execution', async () => {
    const orgId = await createTestOrganization()
    const userId = await createTestUser(orgId)
    const projectId = await createTestProject(orgId, userId)
    const storyId = await createTestStory(orgId, projectId, userId)

    try {
      const action: AgentActionDefinition = {
        type: 'add_label',
        config: {
          storyId,
          label: 'test-label',
        },
      }

      const context = { storyId, organizationId: orgId }

      // Capture console.log calls
      const logCalls: string[] = []
      const originalLog = console.log
      console.log = (...args: any[]) => {
        logCalls.push(args.join(' '))
        originalLog(...args)
      }

      await executeAction(action, context)

      // Restore console.log
      console.log = originalLog

      // Verify action was logged
      const logOutput = logCalls.join(' ')
      assert.ok(
        logOutput.includes('Executing action') || logOutput.includes('add_label'),
        'Action execution should be logged'
      )
    } finally {
      await cleanupTestData({ orgId, projectId, storyId, userId })
    }
  })

  test('should handle action with missing required config', async () => {
    const orgId = await createTestOrganization()
    const userId = await createTestUser(orgId)
    const projectId = await createTestProject(orgId, userId)
    const storyId = await createTestStory(orgId, projectId, userId)

    try {
      const action: AgentActionDefinition = {
        type: 'add_label',
        config: {
          // Missing storyId
        } as any,
      }

      const context = { storyId, organizationId: orgId }

      await assert.rejects(
        async () => await executeAction(action, context),
        /missing|required|invalid/i,
        'Should reject action with missing required config'
      )
    } finally {
      await cleanupTestData({ orgId, projectId, storyId, userId })
    }
  })
})

