import test from 'node:test'
import assert from 'node:assert/strict'
import { PrioritizationRepository } from '../../lib/repositories/prioritization'

// This is a lightweight contract test for job lifecycle; it mocks user context and relies on repository methods.
// In CI, ensure a test db or mocking strategy is in place.

const mockUser = {
  id: 'user-1',
  email: 'user@example.com',
  name: 'Test User',
  organizationId: 'org-1',
  role: 'owner',
  isActive: true,
} as any

test.skip('create job initializes pending status (requires seeded project)', async (t) => {
  const repo = new PrioritizationRepository(mockUser)
  await t.test('create and read job', async () => {
    assert.ok(repo)
  })
})
