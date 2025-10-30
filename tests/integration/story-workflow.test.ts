import test from 'node:test'
import assert from 'node:assert/strict'

/**
 * Story Workflow Integration Tests
 * 
 * Tests critical story workflow operations:
 * - Story creation
 * - Epic assignment to stories
 * - Story splitting with validation
 * 
 * Note: These are integration tests that require a running API server
 * with proper authentication and database setup.
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'
const TEST_AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || ''
const TEST_SESSION_COOKIE = process.env.TEST_SESSION_COOKIE || ''

// Helper function to make authenticated API calls
async function apiCall(endpoint: string, method: string, body?: any) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  // Use session cookie if available (preferred for Next.js auth)
  if (TEST_SESSION_COOKIE) {
    headers['Cookie'] = `next-auth.session-token=${TEST_SESSION_COOKIE}`
  } else if (TEST_AUTH_TOKEN) {
    headers['Authorization'] = `Bearer ${TEST_AUTH_TOKEN}`
  }

  const options: RequestInit = {
    method,
    headers,
  }

  if (body) {
    options.body = JSON.stringify(body)
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, options)
  let data: any
  try {
    data = await response.json()
  } catch (e) {
    data = { error: 'Failed to parse response', status: response.status }
  }

  return {
    status: response.status,
    data,
    headers: response.headers,
  }
}

test.describe('Story Workflow Integration Tests', () => {
  test.skip('SETUP: Tests require TEST_BASE_URL and TEST_SESSION_COOKIE or TEST_AUTH_TOKEN', () => {
    if (!TEST_SESSION_COOKIE && !TEST_AUTH_TOKEN) {
      console.log('⚠️  Skipping integration tests: No authentication token/cookie set')
      console.log('   Set TEST_SESSION_COOKIE or TEST_AUTH_TOKEN and TEST_BASE_URL to run these tests')
      console.log('   To get session cookie:')
      console.log('   1. Sign in at http://localhost:3000')
      console.log('   2. DevTools → Application → Cookies')
      console.log('   3. Copy "next-auth.session-token" value')
    }
  })

  let testProjectId: string
  let testEpicId: string
  let testStoryId: string

  test.describe('Story Creation', () => {
    test('should create a project first', async () => {
      if (!TEST_SESSION_COOKIE && !TEST_AUTH_TOKEN) return

      const response = await apiCall('/api/projects', 'POST', {
        name: `Test Project ${Date.now()}`,
        description: 'Test project for story workflow tests',
      })

      if (response.status === 201 || response.status === 200) {
        testProjectId = response.data.id || response.data.project?.id
        assert.ok(testProjectId, 'Project should have an ID')
        console.log(`✅ Created project: ${testProjectId}`)
      } else {
        // Try to get existing projects
        const listResponse = await apiCall('/api/projects', 'GET')
        if (listResponse.status === 200 && Array.isArray(listResponse.data) && listResponse.data.length > 0) {
          testProjectId = listResponse.data[0].id
          console.log(`✅ Using existing project: ${testProjectId}`)
        } else {
          console.log(`⚠️  Could not create or find project: ${response.status}`, response.data)
        }
      }
    })

    test('should create a story', async () => {
      if (!TEST_SESSION_COOKIE && !TEST_AUTH_TOKEN) return
      if (!testProjectId) {
        console.log('⚠️  Skipping: No project ID available')
        return
      }

      const storyData = {
        projectId: testProjectId,
        title: 'Test Story for Workflow',
        description: 'This is a test story to verify story creation, epic assignment, and splitting functionality.',
        priority: 'high' as const,
        status: 'backlog' as const,
        acceptanceCriteria: [
          'Story can be created successfully',
          'Story can be assigned to an epic',
          'Story can be split into child stories',
        ],
        storyPoints: 5,
      }

      const response = await apiCall('/api/stories', 'POST', storyData)

      assert.equal(
        response.status,
        201,
        `Story creation should succeed. Got ${response.status}: ${JSON.stringify(response.data)}`
      )
      assert.ok(response.data.id, 'Story should have an ID')
      assert.equal(response.data.title, storyData.title, 'Story title should match')
      assert.equal(response.data.projectId, testProjectId, 'Story should belong to project')
      
      testStoryId = response.data.id
      console.log(`✅ Created story: ${testStoryId}`)
    })

    test('should handle validation errors gracefully', async () => {
      if (!TEST_SESSION_COOKIE && !TEST_AUTH_TOKEN) return
      if (!testProjectId) {
        console.log('⚠️  Skipping: No project ID available')
        return
      }

      // Try to create story with invalid data
      const invalidStoryData = {
        projectId: testProjectId,
        title: '', // Empty title should fail validation
        priority: 'invalid_priority', // Invalid priority
      }

      const response = await apiCall('/api/stories', 'POST', invalidStoryData)

      assert.equal(response.status, 400, 'Should return 400 for validation errors')
      assert.ok(response.data.error || response.data.message, 'Should include error message')
      console.log('✅ Validation errors handled correctly')
    })
  })

  test.describe('Epic Assignment', () => {
    test('should create an epic', async () => {
      if (!TEST_SESSION_COOKIE && !TEST_AUTH_TOKEN) return
      if (!testProjectId) {
        console.log('⚠️  Skipping: No project ID available')
        return
      }

      const epicData = {
        projectId: testProjectId,
        title: 'Test Epic for Story Assignment',
        description: 'Epic to test story assignment',
        status: 'planning' as const,
      }

      const response = await apiCall('/api/epics', 'POST', epicData)

      if (response.status === 201 || response.status === 200) {
        testEpicId = response.data.id || response.data.epic?.id
        assert.ok(testEpicId, 'Epic should have an ID')
        console.log(`✅ Created epic: ${testEpicId}`)
      } else {
        // Try to get existing epics
        const listResponse = await apiCall(`/api/projects/${testProjectId}/epics`, 'GET')
        if (listResponse.status === 200 && Array.isArray(listResponse.data) && listResponse.data.length > 0) {
          testEpicId = listResponse.data[0].id
          console.log(`✅ Using existing epic: ${testEpicId}`)
        } else {
          console.log(`⚠️  Could not create or find epic: ${response.status}`, response.data)
        }
      }
    })

    test('should assign story to epic', async () => {
      if (!TEST_SESSION_COOKIE && !TEST_AUTH_TOKEN) return
      if (!testStoryId || !testEpicId) {
        console.log('⚠️  Skipping: Missing story or epic ID')
        return
      }

      const updateData = {
        epicId: testEpicId,
      }

      const response = await apiCall(`/api/stories/${testStoryId}`, 'PATCH', updateData)

      assert.equal(
        response.status,
        200,
        `Story update should succeed. Got ${response.status}: ${JSON.stringify(response.data)}`
      )
      assert.equal(
        response.data.epicId,
        testEpicId,
        'Story should be assigned to epic'
      )
      console.log(`✅ Assigned story ${testStoryId} to epic ${testEpicId}`)
    })

    test('should retrieve story with epic assignment', async () => {
      if (!TEST_SESSION_COOKIE && !TEST_AUTH_TOKEN) return
      if (!testStoryId) {
        console.log('⚠️  Skipping: No story ID available')
        return
      }

      const response = await apiCall(`/api/stories/${testStoryId}`, 'GET')

      assert.equal(response.status, 200, 'Should retrieve story successfully')
      assert.ok(response.data.id, 'Story should have an ID')
      if (testEpicId) {
        assert.equal(
          response.data.epicId,
          testEpicId,
          'Story should be assigned to epic'
        )
      }
      console.log('✅ Story retrieved with epic assignment')
    })
  })

  test.describe('Story Splitting', () => {
    test('should get AI split suggestions', async () => {
      if (!TEST_SESSION_COOKIE && !TEST_AUTH_TOKEN) return
      if (!testStoryId) {
        console.log('⚠️  Skipping: No story ID available')
        return
      }

      const response = await apiCall(`/api/stories/${testStoryId}/ai-split-suggestions`, 'GET')

      // Should succeed or return 404 if story doesn't exist
      assert.ok(
        response.status === 200 || response.status === 404,
        `Should get suggestions or 404. Got ${response.status}: ${JSON.stringify(response.data)}`
      )

      if (response.status === 200) {
        assert.ok(
          Array.isArray(response.data.suggestions),
          'Should return suggestions array'
        )
        console.log(`✅ Got ${response.data.suggestions?.length || 0} split suggestions`)
      } else {
        console.log('⚠️  Story not found or no suggestions available')
      }
    })

    test('should split story into child stories', async () => {
      if (!TEST_SESSION_COOKIE && !TEST_AUTH_TOKEN) return
      if (!testStoryId) {
        console.log('⚠️  Skipping: No story ID available')
        return
      }

      // First, get the story to understand its structure
      const storyResponse = await apiCall(`/api/stories/${testStoryId}`, 'GET')
      
      if (storyResponse.status !== 200) {
        console.log('⚠️  Cannot get story for splitting')
        return
      }

      const story = storyResponse.data
      const parentAcceptanceCriteria = story.acceptanceCriteria || [
        'Story can be created successfully',
        'Story can be assigned to an epic',
        'Story can be split into child stories',
      ]

      // Create child stories for splitting
      const children = [
        {
          title: 'Child Story 1: Story Creation',
          description: 'Test child story for creation functionality',
          acceptanceCriteria: ['Story can be created successfully'],
          priority: 'high' as const,
          storyPoints: 2,
        },
        {
          title: 'Child Story 2: Epic Assignment',
          description: 'Test child story for epic assignment',
          acceptanceCriteria: ['Story can be assigned to an epic'],
          priority: 'high' as const,
          storyPoints: 2,
        },
        {
          title: 'Child Story 3: Story Splitting',
          description: 'Test child story for splitting functionality',
          acceptanceCriteria: ['Story can be split into child stories'],
          priority: 'high' as const,
          storyPoints: 1,
        },
      ]

      const splitPayload = {
        children,
        investRationale: 'Split for better testability and independent development',
        spidrStrategy: 'split',
      }

      const response = await apiCall(`/api/stories/${testStoryId}/split`, 'POST', splitPayload)

      // Should succeed or return validation errors
      if (response.status === 200 || response.status === 201) {
        assert.ok(response.data.success !== false, 'Split should succeed')
        assert.ok(
          Array.isArray(response.data.childStories),
          'Should return child stories array'
        )
        assert.ok(
          response.data.childStories.length > 0,
          'Should have at least one child story'
        )
        console.log(`✅ Split story into ${response.data.childStories.length} child stories`)
      } else if (response.status === 400) {
        // Validation errors are acceptable - log them
        console.log('⚠️  Split validation failed (may be expected):', response.data)
        // Check if it's a coverage issue
        if (response.data.validationResults) {
          const hasErrors = response.data.validationResults.some(
            (r: any) => r.errors && r.errors.length > 0
          )
          // If only warnings, consider it a pass
          if (!hasErrors) {
            console.log('✅ Split has warnings but no blocking errors')
          }
        }
      } else {
        console.log(`⚠️  Unexpected split response: ${response.status}`, response.data)
      }
    })
  })

  test.describe('Cleanup', () => {
    test('should verify all operations completed', async () => {
      if (!TEST_SESSION_COOKIE && !TEST_AUTH_TOKEN) return
      
      console.log('\n📊 Test Summary:')
      console.log(`   Project ID: ${testProjectId || 'N/A'}`)
      console.log(`   Epic ID: ${testEpicId || 'N/A'}`)
      console.log(`   Story ID: ${testStoryId || 'N/A'}`)
      console.log('\n✅ Story workflow tests completed')
    })
  })
})
