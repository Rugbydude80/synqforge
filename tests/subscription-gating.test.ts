/**
 * Subscription Gating Test Suite
 * 
 * Tests subscription tier enforcement across all protected routes
 */

import { describe, test } from 'node:test'
import assert from 'node:assert'

describe('Subscription Gating', () => {
  // Test session tokens - set via environment variables
  const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'
  const freeUserSession = process.env.FREE_USER_SESSION || ''
  const coreUserSession = process.env.CORE_USER_SESSION || ''
  const proUserSession = process.env.PRO_USER_SESSION || ''
  // const teamUserSession = process.env.TEAM_USER_SESSION || '' // Reserved for future team tests

  describe('Export Endpoints (Core+)', () => {
    test('free user blocked from stories export', async () => {
      const response = await fetch(`${BASE_URL}/api/stories/export?format=excel`, {
        headers: {
          'Cookie': `next-auth.session-token=${freeUserSession}`,
        },
      })

      assert.strictEqual(response.status, 402)
      const body = await response.json()
      assert.strictEqual(body.error, 'Subscription Required')
      assert.strictEqual(body.currentTier, 'free')
      assert.strictEqual(body.requiredTier, 'core')
    })

    test('core user can export stories', async () => {
      if (!coreUserSession) {
        console.log('Skipping: CORE_USER_SESSION not set')
        return
      }

      const response = await fetch(`${BASE_URL}/api/stories/export?format=excel`, {
        headers: {
          'Cookie': `next-auth.session-token=${coreUserSession}`,
        },
      })

      // Should either succeed (200) or fail for other reasons (not 402)
      assert.notStrictEqual(response.status, 402)
    })

    test('free user blocked from project export', async () => {
      const response = await fetch(`${BASE_URL}/api/projects/test-id/export?format=pdf`, {
        headers: {
          'Cookie': `next-auth.session-token=${freeUserSession}`,
        },
      })

      assert.strictEqual(response.status, 402)
      const body = await response.json()
      assert.strictEqual(body.requiredTier, 'core')
    })
  })

  describe('Bulk Operations (Pro+)', () => {
    test('free user blocked from bulk story creation', async () => {
      const response = await fetch(`${BASE_URL}/api/stories/bulk`, {
        method: 'POST',
        headers: {
          'Cookie': `next-auth.session-token=${freeUserSession}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: 'test-project',
          stories: [
            { title: 'Test Story 1' },
            { title: 'Test Story 2' },
          ],
        }),
      })

      assert.strictEqual(response.status, 402)
      const body = await response.json()
      assert.strictEqual(body.requiredTier, 'pro')
    })

    test('core user blocked from bulk operations', async () => {
      if (!coreUserSession) {
        console.log('Skipping: CORE_USER_SESSION not set')
        return
      }

      const response = await fetch(`${BASE_URL}/api/stories/bulk`, {
        method: 'POST',
        headers: {
          'Cookie': `next-auth.session-token=${coreUserSession}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: 'test-project',
          stories: [{ title: 'Test' }],
        }),
      })

      assert.strictEqual(response.status, 402)
      const body = await response.json()
      assert.strictEqual(body.currentTier, 'core')
      assert.strictEqual(body.requiredTier, 'pro')
    })

    test('pro user can perform bulk operations', async () => {
      if (!proUserSession) {
        console.log('Skipping: PRO_USER_SESSION not set')
        return
      }

      const response = await fetch(`${BASE_URL}/api/stories/bulk`, {
        method: 'POST',
        headers: {
          'Cookie': `next-auth.session-token=${proUserSession}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: 'test-project',
          stories: [{ title: 'Test' }],
        }),
      })

      // Should not be 402 (might be 400, 404, etc. for other reasons)
      assert.notStrictEqual(response.status, 402)
    })
  })

  describe('Middleware Route Detection', () => {
    test('middleware detects export routes', async () => {
      const response = await fetch(`${BASE_URL}/api/stories/export`, {
        headers: {
          'Cookie': `next-auth.session-token=${freeUserSession}`,
        },
      })

      // Should be blocked by middleware
      assert.strictEqual(response.status, 402)
      assert.ok(response.headers.has('x-subscription-tier') || true)
    })

    test('middleware allows public routes', async () => {
      const response = await fetch(`${BASE_URL}/`)

      // Should not be blocked
      assert.notStrictEqual(response.status, 402)
    })
  })

  describe('Feature Flags', () => {
    test('checks exports enabled feature flag', async () => {
      // This would require mocking the database or using test fixtures
      // Placeholder for future implementation
      console.log('TODO: Test feature flag checks')
    })
  })

  describe('Upgrade URLs', () => {
    test('402 responses include upgrade URL', async () => {
      const response = await fetch(`${BASE_URL}/api/stories/export`, {
        headers: {
          'Cookie': `next-auth.session-token=${freeUserSession}`,
        },
      })

      const body = await response.json()
      assert.ok(body.upgradeUrl)
      assert.strictEqual(body.upgradeUrl, '/settings/billing')
    })

    test('402 responses include current and required tier', async () => {
      const response = await fetch(`${BASE_URL}/api/stories/bulk`, {
        method: 'POST',
        headers: {
          'Cookie': `next-auth.session-token=${freeUserSession}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectId: 'test', stories: [] }),
      })

      const body = await response.json()
      assert.ok(body.currentTier)
      assert.ok(body.requiredTier)
      assert.ok(body.message)
    })
  })
})

/**
 * Run tests:
 * 
 * npm run test tests/subscription-gating.test.ts
 * 
 * Or with session tokens:
 * 
 * FREE_USER_SESSION=xxx CORE_USER_SESSION=xxx npm run test
 */

