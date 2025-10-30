import test from 'node:test'
import assert from 'node:assert/strict'
import { db, generateId } from '@/lib/db'
import { storyTemplates, templateStories, organizations, users, projects, stories } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { StoryTemplatesRepository } from '@/lib/repositories/story-templates.repository'

/**
 * Template Versioning Tests
 * 
 * Tests for High Priority Issue #6: Missing Template Versioning
 * 
 * These tests verify:
 * - Templates are versioned on creation
 * - Template updates create new versions
 * - Stories created from template reference template version
 * - Template version history can be retrieved
 * - Audit trail of template changes exists
 */

// Cleanup helper
async function cleanupTestData(orgId: string, templateId?: string, userId?: string) {
  if (templateId) {
    await db.delete(templateStories).where(eq(templateStories.templateId, templateId))
    await db.delete(storyTemplates).where(eq(storyTemplates.id, templateId))
  }
  if (userId) await db.delete(users).where(eq(users.id, userId))
  if (orgId) await db.delete(organizations).where(eq(organizations.id, orgId))
}

// Create test organization
async function createTestOrganization() {
  const orgId = generateId()
  await db.insert(organizations).values({
    id: orgId,
    name: 'Test Organization',
    slug: `test-org-${Date.now()}`,
    subscriptionTier: 'starter',
    subscriptionStatus: 'active',
  })
  return orgId
}

// Create test user
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

test.describe('Template Versioning - High Priority #6', () => {
  test('should create template with initial version', async () => {
    const orgId = await createTestOrganization()
    const userId = await createTestUser(orgId)
    const repo = new StoryTemplatesRepository()

    try {
      const template = await repo.createTemplate({
        organizationId: orgId,
        createdBy: userId,
        templateName: 'Test Template',
        category: 'custom',
        stories: [
          {
            title: 'Test Story',
            description: 'Test description',
            acceptanceCriteria: ['AC1', 'AC2'],
          },
        ],
      })

      // Verify template has version
      const [created] = await db
        .select()
        .from(storyTemplates)
        .where(eq(storyTemplates.id, template.id))
        .limit(1)

      assert.ok(created, 'Template should exist')
      assert.equal(created.version, 1, 'Should have initial version 1')

      // Verify version record was created
      const versions = await repo.getTemplateVersions(template.id)
      assert.ok(versions.length >= 1, 'Should have at least 1 version')
      assert.equal(versions[0].version, 1, 'Should have version 1')
    } finally {
      await cleanupTestData(orgId, undefined, userId)
    }
  })

  test('should create new version when template is updated', async () => {
    const orgId = await createTestOrganization()
    const userId = await createTestUser(orgId)
    const repo = new StoryTemplatesRepository()

    let template: any
    try {
      // Create initial template
      template = await repo.createTemplate({
        organizationId: orgId,
        createdBy: userId,
        templateName: 'Test Template',
        category: 'custom',
        stories: [
          {
            title: 'Original Story',
            description: 'Original description',
            acceptanceCriteria: ['AC1'],
          },
        ],
      })

      // Update template (should create new version)
      await repo.updateTemplate(template.id, {
        templateName: 'Updated Template',
        changedBy: userId,
        changeSummary: 'Updated template name and stories',
        stories: [
          {
            title: 'Updated Story',
            description: 'Updated description',
            acceptanceCriteria: ['AC1', 'AC2'],
          },
        ],
      })

      // Verify new version was created
      const versions = await repo.getTemplateVersions(template.id)
      assert.ok(versions.length >= 2, 'Should have at least 2 versions')
      assert.equal(versions[0].version, 2, 'Latest version should be 2')

      // Verify template version was incremented
      const [updated] = await db
        .select()
        .from(storyTemplates)
        .where(eq(storyTemplates.id, template.id))
        .limit(1)
      assert.equal(updated.version, 2, 'Template version should be 2')
    } finally {
      if (template) {
        await cleanupTestData(orgId, template.id, userId)
      } else {
        await cleanupTestData(orgId, undefined, userId)
      }
    }
  })

  test('should track which version was used when creating stories', async () => {
    const orgId = await createTestOrganization()
    const userId = await createTestUser(orgId)
    const repo = new StoryTemplatesRepository()

    let template: any
    try {
      // Create template
      template = await repo.createTemplate({
        organizationId: orgId,
        createdBy: userId,
        templateName: 'Test Template',
        category: 'custom',
        stories: [
          {
            title: 'Test Story',
            description: 'Test description',
            acceptanceCriteria: ['AC1'],
          },
        ],
      })

      // Create project
      const projectId = generateId()
      await db.insert(projects).values({
        id: projectId,
        organizationId: orgId,
        name: 'Test Project',
        key: 'TEST',
        slug: `test-project-${Date.now()}`,
        status: 'active',
        ownerId: userId,
      })

      // Apply template
      const createdStories = await repo.applyTemplate(template.id, {
        projectId,
        createdBy: userId,
      })

      assert.ok(createdStories.length > 0, 'Should create stories')

      // Verify stories reference template version
      const [story] = await db
        .select()
        .from(stories)
        .where(eq(stories.id, createdStories[0].id))
        .limit(1)
      assert.ok(story.templateVersionId, 'Story should have templateVersionId')
      assert.ok(story.templateVersionId.includes(template.id), 'Story should reference template')

      // Cleanup project and stories
      await db.delete(stories).where(eq(stories.projectId, projectId))
      await db.delete(projects).where(eq(projects.id, projectId))
    } finally {
      if (template) {
        await cleanupTestData(orgId, template.id, userId)
      } else {
        await cleanupTestData(orgId, undefined, userId)
      }
    }
  })

  test('should retrieve template version history', async () => {
    const orgId = await createTestOrganization()
    const userId = await createTestUser(orgId)
    const repo = new StoryTemplatesRepository()

    let template: any
    try {
      // Create template
      template = await repo.createTemplate({
        organizationId: orgId,
        createdBy: userId,
        templateName: 'Test Template',
        category: 'custom',
        stories: [
          {
            title: 'Test Story',
            description: 'Test description',
            acceptanceCriteria: ['AC1'],
          },
        ],
      })

      // Get version history
      const versions = await repo.getTemplateVersions(template.id)
      assert.ok(versions.length >= 1, 'Should have at least 1 version')
      assert.equal(versions[0].version, 1, 'Should have version 1')
    } finally {
      if (template) {
        await cleanupTestData(orgId, template.id, userId)
      } else {
        await cleanupTestData(orgId, undefined, userId)
      }
    }
  })

  test('should allow retrieving specific template version', async () => {
    const orgId = await createTestOrganization()
    const userId = await createTestUser(orgId)
    const repo = new StoryTemplatesRepository()

    let template: any
    try {
      // Create template
      template = await repo.createTemplate({
        organizationId: orgId,
        createdBy: userId,
        templateName: 'Test Template',
        category: 'custom',
        stories: [
          {
            title: 'Version 1 Story',
            description: 'Version 1 description',
            acceptanceCriteria: ['AC1'],
          },
        ],
      })

      // Get specific version
      const version1 = await repo.getTemplateVersion(template.id, 1)
      assert.ok(version1, 'Should retrieve version 1')
      assert.equal(version1.templateName, 'Test Template', 'Should have correct name')
      assert.ok(version1.storiesSnapshot, 'Should have stories snapshot')
    } finally {
      if (template) {
        await cleanupTestData(orgId, template.id, userId)
      } else {
        await cleanupTestData(orgId, undefined, userId)
      }
    }
  })
})

