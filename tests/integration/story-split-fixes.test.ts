/**
 * Story Split Feature Fixes - Integration Tests
 * 
 * Verifies the three P0/P1 fixes:
 * 1. Parent story reload after epic conversion
 * 2. "Small" validation changed to warning (not error)
 * 3. Explicit null fields for tags, labels, assigneeId
 */

import { describe, test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert'
import { db, generateId } from '@/lib/db'
import { stories, storyLinks, projects, organizations, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { storySplitService } from '@/lib/services/story-split.service'
import { storySplitValidationService } from '@/lib/services/story-split-validation.service'
import type { ChildStoryInput } from '@/lib/services/story-split-validation.service'

describe('Story Split Feature Fixes', () => {
  let testOrgId: string
  let testUserId: string
  let testProjectId: string

  beforeEach(async () => {
    // Setup test organization, user, and project
    testOrgId = generateId()
    testUserId = generateId()
    testProjectId = generateId()

    await db.insert(organizations).values({
      id: testOrgId,
      name: 'Test Organization',
      slug: `test-org-${Date.now()}`,
      subscriptionTier: 'starter',
      plan: 'starter',
      subscriptionStatus: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    await db.insert(users).values({
      id: testUserId,
      email: `test-${Date.now()}@example.com`,
      name: 'Test User',
      organizationId: testOrgId,
      role: 'owner',
      createdAt: new Date(),
    })

    await db.insert(projects).values({
      id: testProjectId,
      organizationId: testOrgId,
      name: 'Test Project',
      key: 'TEST',
      slug: `test-project-${Date.now()}`,
      description: 'Test project for story split tests',
      status: 'active',
      ownerId: testUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  })

  afterEach(async () => {
    // Cleanup test data
    await db.delete(storyLinks).where(eq(storyLinks.storyId, testProjectId))
    await db.delete(stories).where(eq(stories.projectId, testProjectId))
    await db.delete(projects).where(eq(projects.id, testProjectId))
    await db.delete(users).where(eq(users.organizationId, testOrgId))
    await db.delete(organizations).where(eq(organizations.id, testOrgId))
  })

  // ============================================================================
  // P0 FIX 1: Parent Story Reload After Epic Conversion
  // ============================================================================

  describe('P0 FIX 1: Parent Story Reload After Epic Conversion', () => {
    test('should return updated parent story with isEpic=true, epicId=null, status=backlog after epic conversion', async () => {
      // Arrange: Create a parent story that is NOT an epic
      const parentStoryId = generateId()
      const originalEpicId = generateId() // Parent belongs to another epic

      await db.insert(stories).values({
        id: parentStoryId,
        organizationId: testOrgId,
        projectId: testProjectId,
        title: 'Parent Story for Epic Conversion Test',
        description: 'This story will be converted to an epic',
        acceptanceCriteria: [
          'First acceptance criterion',
          'Second acceptance criterion',
        ],
        storyPoints: 8,
        status: 'in_progress',
        priority: 'high',
        storyType: 'feature',
        epicId: originalEpicId,
        isEpic: false,
        createdBy: testUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // Act: Split with epic conversion
      const validChildren: ChildStoryInput[] = [
        {
          title: 'Child Story 1',
          personaGoal: 'As a user, I want to test epic conversion',
          description: 'This is a valid child story description with enough characters',
          acceptanceCriteria: ['First acceptance criterion'],
          estimatePoints: 3,
          providesUserValue: true,
        },
        {
          title: 'Child Story 2',
          personaGoal: 'As a user, I want to verify parent reload',
          description: 'This is another valid child story description with enough characters',
          acceptanceCriteria: ['Second acceptance criterion'],
          estimatePoints: 2,
          providesUserValue: true,
        },
      ]

      const result = await storySplitService.splitStoryTx(
        parentStoryId,
        testUserId,
        {
          convertParentToEpic: true,
          children: validChildren,
        }
      )

      // Assert: Returned parent story should match database state
      assert.strictEqual(result.parentStory.isEpic, true, 'Returned parentStory.isEpic should be true')
      assert.strictEqual(result.parentStory.epicId, null, 'Returned parentStory.epicId should be null')
      assert.strictEqual(result.parentStory.status, 'backlog', 'Returned parentStory.status should be backlog')

      // Assert: Database should match returned object
      const [dbParentStory] = await db
        .select()
        .from(stories)
        .where(eq(stories.id, parentStoryId))
        .limit(1)

      assert.ok(dbParentStory, 'Parent story should exist in database')
      assert.strictEqual(dbParentStory.isEpic, true, 'Database parentStory.isEpic should be true')
      assert.strictEqual(dbParentStory.epicId, null, 'Database parentStory.epicId should be null')
      assert.strictEqual(dbParentStory.status, 'backlog', 'Database parentStory.status should be backlog')

      // Assert: Returned object matches database
      assert.strictEqual(
        result.parentStory.isEpic,
        dbParentStory.isEpic,
        'Returned isEpic should match database'
      )
      assert.strictEqual(
        result.parentStory.epicId,
        dbParentStory.epicId,
        'Returned epicId should match database'
      )
      assert.strictEqual(
        result.parentStory.status,
        dbParentStory.status,
        'Returned status should match database'
      )
    })

    test('should NOT reload parent when convertParentToEpic is false', async () => {
      // Arrange: Create a parent story
      const parentStoryId = generateId()

      await db.insert(stories).values({
        id: parentStoryId,
        organizationId: testOrgId,
        projectId: testProjectId,
        title: 'Parent Story Without Epic Conversion',
        description: 'This story will NOT be converted to an epic',
        acceptanceCriteria: ['AC1', 'AC2'],
        storyPoints: 5,
        status: 'in_progress',
        priority: 'medium',
        storyType: 'feature',
        isEpic: false,
        createdBy: testUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const originalStatus = 'in_progress'
      const originalIsEpic = false

      // Act: Split WITHOUT epic conversion
      const validChildren: ChildStoryInput[] = [
        {
          title: 'Child Story 1',
          personaGoal: 'As a user, I want to test',
          description: 'Valid description with enough characters',
          acceptanceCriteria: ['AC1'],
          estimatePoints: 2,
          providesUserValue: true,
        },
        {
          title: 'Child Story 2',
          personaGoal: 'As a user, I want to verify',
          description: 'Another valid description with enough characters',
          acceptanceCriteria: ['AC2'],
          estimatePoints: 3,
          providesUserValue: true,
        },
      ]

      const result = await storySplitService.splitStoryTx(
        parentStoryId,
        testUserId,
        {
          convertParentToEpic: false,
          children: validChildren,
        }
      )

      // Assert: Parent story should remain unchanged
      assert.strictEqual(result.parentStory.isEpic, originalIsEpic, 'Parent should not be converted to epic')
      assert.strictEqual(result.parentStory.status, originalStatus, 'Parent status should remain unchanged')
    })
  })

  // ============================================================================
  // P0 FIX 2: "Small" Validation Changed to Warning
  // ============================================================================

  describe('P0 FIX 2: "Small" Validation Changed to Warning', () => {
    test('should mark child with estimatePoints = 0 as invalid (error)', () => {
      // Arrange
      const child: ChildStoryInput = {
        title: 'Invalid Child Story',
        personaGoal: 'As a user, I want to test',
        description: 'Valid description with enough characters',
        acceptanceCriteria: ['AC1', 'AC2'],
        estimatePoints: 0, // Invalid
        providesUserValue: true,
      }

      // Act
      const result = storySplitValidationService.validateChild(child, [child])

      // Assert
      assert.strictEqual(result.valid, false, 'Child with 0 points should be invalid')
      assert.ok(
        result.errors.includes('story.split.validation.small.missing_estimate'),
        'Should have error for missing/invalid estimate'
      )
      assert.strictEqual(result.small, false, 'Small validation should fail')
    })

    test('should mark child with estimatePoints = 3 as valid with no warnings', () => {
      // Arrange
      const child: ChildStoryInput = {
        title: 'Valid Small Child Story',
        personaGoal: 'As a user, I want to test small stories',
        description: 'Valid description with enough characters to pass validation',
        acceptanceCriteria: ['AC1', 'AC2'],
        estimatePoints: 3, // Valid and small
        providesUserValue: true,
      }

      // Act
      const result = storySplitValidationService.validateChild(child, [child])

      // Assert
      assert.strictEqual(result.valid, true, 'Child with 3 points should be valid')
      assert.strictEqual(result.errors.length, 0, 'Should have no errors')
      assert.strictEqual(
        result.warnings.filter(w => w.includes('small')).length,
        0,
        'Should have no small-related warnings'
      )
      assert.strictEqual(result.small, true, 'Small validation should pass')
    })

    test('should mark child with estimatePoints = 8 as valid WITH warning', () => {
      // Arrange
      const child: ChildStoryInput = {
        title: 'Large Child Story',
        personaGoal: 'As a user, I want to test large stories',
        description: 'Valid description with enough characters to pass validation',
        acceptanceCriteria: ['AC1', 'AC2'],
        estimatePoints: 8, // >5, should be warning
        providesUserValue: true,
      }

      // Act
      const result = storySplitValidationService.validateChild(child, [child])

      // Assert
      assert.strictEqual(result.valid, true, 'Child with 8 points should be valid')
      assert.strictEqual(result.errors.length, 0, 'Should have no errors')
      assert.ok(
        result.warnings.includes('story.split.validation.small.too_large'),
        'Should have warning for story being too large'
      )
      assert.strictEqual(result.small, true, 'Small validation should pass (with warning)')
    })

    test('validateAllChildren should mark all valid when one child has >5 points', () => {
      // Arrange
      const children: ChildStoryInput[] = [
        {
          title: 'Small Child',
          personaGoal: 'As a user, I want small story',
          description: 'Valid description with enough characters',
          acceptanceCriteria: ['AC1', 'AC2'],
          estimatePoints: 3,
          providesUserValue: true,
        },
        {
          title: 'Large Child',
          personaGoal: 'As a user, I want large story',
          description: 'Valid description with enough characters',
          acceptanceCriteria: ['AC3', 'AC4'],
          estimatePoints: 8, // >5
          providesUserValue: true,
        },
      ]

      // Act
      const result = storySplitValidationService.validateAllChildren(children, ['AC1', 'AC2', 'AC3', 'AC4'])

      // Assert
      assert.strictEqual(result.allValid, true, 'All children should be valid')
      assert.strictEqual(result.results.length, 2, 'Should have 2 validation results')
      assert.strictEqual(result.results[0].valid, true, 'First child should be valid')
      assert.strictEqual(result.results[1].valid, true, 'Second child should be valid')
      assert.ok(
        result.results[1].warnings.includes('story.split.validation.small.too_large'),
        'Large child should have warning'
      )
      assert.strictEqual(
        result.results[1].errors.filter(e => e.includes('small')).length,
        0,
        'Large child should NOT have small-related error'
      )
    })
  })

  // ============================================================================
  // P1 FIX 3: Explicit Null Fields for Tags, Labels, AssigneeId
  // ============================================================================

  describe('P1 FIX 3: Explicit Null Fields for Tags, Labels, AssigneeId', () => {
    test('should create child stories with explicit null values for tags, labels, assigneeId', async () => {
      // Arrange: Create parent story with non-null tags, labels, and assigneeId
      const parentStoryId = generateId()
      const assigneeId = generateId()

      await db.insert(stories).values({
        id: parentStoryId,
        organizationId: testOrgId,
        projectId: testProjectId,
        title: 'Parent Story with Tags and Labels',
        description: 'Parent story that has tags, labels, and assignee',
        acceptanceCriteria: ['AC1', 'AC2'],
        storyPoints: 5,
        status: 'backlog',
        priority: 'medium',
        storyType: 'feature',
        tags: ['tag1', 'tag2'],
        labels: ['label1', 'label2'],
        assigneeId: assigneeId,
        isEpic: false,
        createdBy: testUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // Act: Split the story
      const validChildren: ChildStoryInput[] = [
        {
          title: 'Child Story 1',
          personaGoal: 'As a user, I want to test null fields',
          description: 'Valid description with enough characters',
          acceptanceCriteria: ['AC1'],
          estimatePoints: 2,
          providesUserValue: true,
        },
        {
          title: 'Child Story 2',
          personaGoal: 'As a user, I want to verify null fields',
          description: 'Another valid description with enough characters',
          acceptanceCriteria: ['AC2'],
          estimatePoints: 3,
          providesUserValue: true,
        },
      ]

      await storySplitService.splitStoryTx(
        parentStoryId,
        testUserId,
        {
          convertParentToEpic: false,
          children: validChildren,
        }
      )

      // Assert: Fetch child stories from database
      const childStories = await db
        .select()
        .from(stories)
        .where(eq(stories.splitFromId, parentStoryId))

      assert.strictEqual(childStories.length, 2, 'Should have 2 child stories')

      // Assert: Each child should have null tags, labels, assigneeId
      for (const child of childStories) {
        assert.strictEqual(child.tags, null, `Child ${child.id} tags should be null`)
        assert.strictEqual(child.labels, null, `Child ${child.id} labels should be null`)
        assert.strictEqual(child.assigneeId, null, `Child ${child.id} assigneeId should be null`)

        // Assert: Other fields should be correctly set per spec
        assert.strictEqual(child.organizationId, testOrgId, 'organizationId should be copied')
        assert.strictEqual(child.projectId, testProjectId, 'projectId should be copied')
        assert.strictEqual(child.priority, 'medium', 'priority should be copied')
        assert.strictEqual(child.storyType, 'feature', 'storyType should be feature')
        assert.strictEqual(child.status, 'backlog', 'status should be backlog')
        assert.strictEqual(child.isEpic, false, 'isEpic should be false')
        assert.strictEqual(child.splitFromId, parentStoryId, 'splitFromId should point to parent')
      }
    })

    test('should NOT copy parent tags, labels, assigneeId even when parent has them', async () => {
      // Arrange: Parent with tags, labels, assignee
      const parentStoryId = generateId()
      const parentAssigneeId = generateId()

      await db.insert(stories).values({
        id: parentStoryId,
        organizationId: testOrgId,
        projectId: testProjectId,
        title: 'Parent with All Fields',
        description: 'Parent story',
        acceptanceCriteria: ['AC1', 'AC2'],
        storyPoints: 5,
        status: 'backlog',
        priority: 'high',
        storyType: 'bug',
        tags: ['parent-tag-1', 'parent-tag-2'],
        labels: ['parent-label-1'],
        assigneeId: parentAssigneeId,
        isEpic: false,
        createdBy: testUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // Act: Split
      const validChildren: ChildStoryInput[] = [
        {
          title: 'Child Story',
          personaGoal: 'As a user, I want to test',
          description: 'Valid description with enough characters',
          acceptanceCriteria: ['AC1', 'AC2'],
          estimatePoints: 3,
          providesUserValue: true,
        },
        {
          title: 'Child Story 2',
          personaGoal: 'As a user, I want to verify',
          description: 'Another valid description with enough characters',
          acceptanceCriteria: ['AC1', 'AC2'],
          estimatePoints: 2,
          providesUserValue: true,
        },
      ]

      await storySplitService.splitStoryTx(
        parentStoryId,
        testUserId,
        {
          convertParentToEpic: false,
          children: validChildren,
        }
      )

      // Assert: Children should NOT inherit parent's tags, labels, assignee
      const childStories = await db
        .select()
        .from(stories)
        .where(eq(stories.splitFromId, parentStoryId))

      for (const child of childStories) {
        assert.strictEqual(child.tags, null, 'Child tags should be null, not copied from parent')
        assert.strictEqual(child.labels, null, 'Child labels should be null, not copied from parent')
        assert.strictEqual(child.assigneeId, null, 'Child assigneeId should be null, not copied from parent')
        assert.notStrictEqual(child.assigneeId, parentAssigneeId, 'Child should not have parent assigneeId')
      }
    })
  })
})



