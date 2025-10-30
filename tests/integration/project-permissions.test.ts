import test from 'node:test'
import assert from 'node:assert/strict'
import { db, generateId } from '@/lib/db'
import { projects, users, organizations, projectMembers } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { verifyProjectAccess } from '@/lib/middleware/auth'

/**
 * Project-Level Permissions Tests
 * 
 * Tests for High Priority Issue #8: Missing Project-Level Permissions
 * 
 * These tests verify:
 * - Project members table exists and works correctly
 * - Users can be assigned different roles per project
 * - Project access checks respect project-level permissions
 * - Organization admins have access to all projects
 */

// Cleanup helper
async function cleanupTestData(orgId: string, userId?: string, projectId?: string) {
  if (projectId) {
    await db.delete(projectMembers).where(eq(projectMembers.projectId, projectId))
    await db.delete(projects).where(eq(projects.id, projectId))
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
async function createTestUser(orgId: string, role: 'owner' | 'admin' | 'member' | 'viewer' = 'member') {
  const userId = generateId()
  await db.insert(users).values({
    id: userId,
    email: `test-${Date.now()}@example.com`,
    name: 'Test User',
    organizationId: orgId,
    role,
    isActive: true,
  })
  return userId
}

// Create test project
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

test.describe('Project-Level Permissions - High Priority #8', () => {
  test('should create project member with role', async () => {
    const orgId = await createTestOrganization()
    const ownerId = await createTestUser(orgId, 'admin')
    const memberId = await createTestUser(orgId, 'member')
    const projectId = await createTestProject(orgId, ownerId)

    try {
      // Add project member
      await db.insert(projectMembers).values({
        id: generateId(),
        projectId,
        userId: memberId,
        organizationId: orgId,
        role: 'viewer',
      })

      // Verify project member exists
      const [member] = await db
        .select()
        .from(projectMembers)
        .where(eq(projectMembers.userId, memberId))
        .limit(1)

      assert.ok(member, 'Project member should exist')
      assert.equal(member.role, 'viewer', 'Should have viewer role')
    } finally {
      await cleanupTestData(orgId, undefined, projectId)
      await cleanupTestData(orgId, ownerId)
      await cleanupTestData(orgId, memberId)
    }
  })

  test('should check project access with project-level permissions', async () => {
    const orgId = await createTestOrganization()
    const ownerId = await createTestUser(orgId, 'admin')
    const memberId = await createTestUser(orgId, 'member')
    const projectId = await createTestProject(orgId, ownerId)

    try {
      // Add project member
      await db.insert(projectMembers).values({
        id: generateId(),
        projectId,
        userId: memberId,
        organizationId: orgId,
        role: 'member',
      })

      // Verify project access
      const hasAccess = await verifyProjectAccess(projectId, orgId, memberId)
      assert.equal(hasAccess, true, 'Project member should have access')
    } finally {
      await cleanupTestData(orgId, undefined, projectId)
      await cleanupTestData(orgId, ownerId)
      await cleanupTestData(orgId, memberId)
    }
  })

  test('should deny access to non-members', async () => {
    const orgId = await createTestOrganization()
    const ownerId = await createTestUser(orgId, 'admin')
    const nonMemberId = await createTestUser(orgId, 'member')
    const projectId = await createTestProject(orgId, ownerId)

    try {
      // Don't add nonMemberId to project members

      // Verify project access is denied
      const hasAccess = await verifyProjectAccess(projectId, orgId, nonMemberId)
      assert.equal(hasAccess, false, 'Non-member should not have access')
    } finally {
      await cleanupTestData(orgId, undefined, projectId)
      await cleanupTestData(orgId, ownerId)
      await cleanupTestData(orgId, nonMemberId)
    }
  })

  test('should allow organization admins access to all projects', async () => {
    const orgId = await createTestOrganization()
    const adminId = await createTestUser(orgId, 'admin')
    const ownerId = await createTestUser(orgId, 'member')
    const projectId = await createTestProject(orgId, ownerId)

    try {
      // Admin is not explicitly added to project members

      // Verify admin has access (as org admin)
      const hasAccess = await verifyProjectAccess(projectId, orgId, adminId)
      assert.equal(hasAccess, true, 'Organization admin should have access to all projects')
    } finally {
      await cleanupTestData(orgId, undefined, projectId)
      await cleanupTestData(orgId, adminId)
      await cleanupTestData(orgId, ownerId)
    }
  })

  test('should support different roles per project', async () => {
    const orgId = await createTestOrganization()
    const ownerId = await createTestUser(orgId, 'admin')
    const memberId = await createTestUser(orgId, 'member')
    const project1Id = await createTestProject(orgId, ownerId)
    const project2Id = await createTestProject(orgId, ownerId)

    try {
      // Add member with different roles to different projects
      await db.insert(projectMembers).values([
        {
          id: generateId(),
          projectId: project1Id,
          userId: memberId,
          organizationId: orgId,
          role: 'viewer',
        },
        {
          id: generateId(),
          projectId: project2Id,
          userId: memberId,
          organizationId: orgId,
          role: 'member',
        },
      ])

      // Verify roles are different
      const [member1] = await db
        .select()
        .from(projectMembers)
        .where(eq(projectMembers.projectId, project1Id))
        .limit(1)

      const [member2] = await db
        .select()
        .from(projectMembers)
        .where(eq(projectMembers.projectId, project2Id))
        .limit(1)

      assert.equal(member1.role, 'viewer', 'Project 1 should have viewer role')
      assert.equal(member2.role, 'member', 'Project 2 should have member role')
    } finally {
      await cleanupTestData(orgId, undefined, project1Id)
      await cleanupTestData(orgId, undefined, project2Id)
      await cleanupTestData(orgId, ownerId)
      await cleanupTestData(orgId, memberId)
    }
  })
})

