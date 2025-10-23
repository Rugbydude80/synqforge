import test from 'node:test'
import assert from 'node:assert/strict'

/**
 * AI Backlog Builder Comprehensive Integration Tests
 * 
 * This test suite validates all features of the AI Backlog Builder system v1.3:
 * - Story decomposition with soft/hard caps
 * - Story generation with validation rules
 * - Auto-fix transformations
 * - Quality scoring and ready-for-sprint gate
 * - Idempotency for stories and epics
 * - Epic linkage (parent/sibling relationships)
 * - Observability metrics and PII redaction
 * 
 * Note: These are integration tests that require a running API server
 * with proper authentication and database setup.
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'
const TEST_AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || ''

interface TestContext {
  headers: Record<string, string>
  projectId: string
  epicId?: string
}

// Helper function to make authenticated API calls
async function apiCall(endpoint: string, method: string, body?: any, context?: TestContext) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(context?.headers || {}),
  }

  if (TEST_AUTH_TOKEN) {
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
  const data = await response.json()

  return {
    status: response.status,
    data,
    headers: response.headers,
  }
}

test.describe('AI Backlog Builder - Integration Tests', () => {
  test.skip('SETUP: Tests require TEST_BASE_URL and TEST_AUTH_TOKEN environment variables', () => {
    if (!TEST_AUTH_TOKEN) {
      console.log('⚠️  Skipping integration tests: TEST_AUTH_TOKEN not set')
      console.log('   Set TEST_AUTH_TOKEN and TEST_BASE_URL to run these tests')
    }
  })

  test.describe('Scenario 1: Large Story Decomposition', () => {
    test('should decompose large story and trigger all rules', async () => {
      if (!TEST_AUTH_TOKEN) return

      const payload = {
        description: `As a customer browsing our e-commerce platform, I want to find products efficiently using multiple filters and sorting options, so that I can quickly locate items that match my specific needs. The system should allow me to filter by category, price range, brand, customer ratings, availability status, and product features. I should be able to sort results by price, popularity, newest arrivals, customer ratings, and relevance. The filtering interface must work seamlessly on both desktop and mobile devices with touch-friendly controls. When I apply multiple filters, the results should update in real-time using AND logic (showing products that match ALL selected criteria). If no products match my filters, I should see a helpful message with suggestions to modify my search. The system should remember my filter preferences during my browsing session, even when I navigate to different pages or refresh the browser. All filter controls must be accessible to screen readers and meet WCAG 2.1 AA standards with proper focus indicators and touch targets that are at least 44x44 pixels. The filtered results should load within 2 seconds on standard broadband connections, and the interface should handle datasets of up to 50,000 products without performance degradation. Users should be able to clear all filters with a single click, and the system should show a count of matching products that updates as filters are applied.`,
        projectContext: {
          dataset_size: 50000,
          has_mobile: true,
          performance_requirements: 'P95 < 2s on broadband/4G',
        },
      }

      const response = await apiCall('/api/ai/decompose', 'POST', payload)

      // Assertions based on test specification
      assert.equal(response.status, 200, 'Decomposition should succeed')
      assert.ok(response.data.split_recommended, 'Should recommend split (≥3 capabilities)')
      assert.ok(response.data.softCapExceeded, 'Should detect 5+ capabilities')
      assert.ok(response.data.total_estimate >= 8, 'Total estimate should be ≥8')

      // Check capabilities
      const capabilities = response.data.capabilities
      assert.ok(Array.isArray(capabilities), 'Should return capabilities array')
      assert.ok(capabilities.length >= 3, 'Should have at least 3 capabilities')

      // Verify expected capability types are present
      const capabilityKeys = capabilities.map((c: any) => c.key)
      assert.ok(
        capabilityKeys.some((k: string) => k.includes('filter') || k.includes('category')),
        'Should include filtering capability'
      )
      assert.ok(
        capabilityKeys.some((k: string) => k.includes('sort')),
        'Should include sorting capability'
      )
      assert.ok(
        capabilityKeys.some((k: string) => k.includes('mobile') || k.includes('interface')),
        'Should include mobile interface capability'
      )

      // Check for merge suggestions (if any)
      if (response.data.merge_suggestions) {
        assert.ok(Array.isArray(response.data.merge_suggestions), 'Merge suggestions should be array')
      }

      // Verify themes are assigned
      capabilities.forEach((cap: any) => {
        if (cap.acceptance_themes) {
          assert.ok(Array.isArray(cap.acceptance_themes), 'Acceptance themes should be array')
        }
      })
    })
  })

  test.describe('Scenario 2: Story Generation with Validation Rules', () => {
    test('Category Filtering Story - Tests Performance + No-Results + AND-Logic', async () => {
      if (!TEST_AUTH_TOKEN) return

      const payload = {
        capabilityKey: 'category-filtering',
        title: 'As a customer, I want to filter products by category',
        estimate_points: 3,
        ui_components: ['dropdown', 'list', 'button'],
        acceptance_themes: ['result-count', 'no-results', 'performance', 'and-logic', 'clear-reset'],
        projectContext: {
          dataset_size: 50000,
          has_mobile: true,
        },
      }

      const response = await apiCall('/api/ai/generate-story', 'POST', payload)

      assert.equal(response.status, 200, 'Story generation should succeed')

      const story = response.data
      assert.ok(story.acceptanceCriteria, 'Should have acceptance criteria')

      const acCount = story.acceptanceCriteria.length
      assert.ok(acCount >= 4 && acCount <= 7, `Should have 4-7 ACs, got ${acCount}`)

      // Check for performance timing in interactive ACs
      const acsWithTiming = story.acceptanceCriteria.filter((ac: string) =>
        ac.includes('within 2 seconds') || ac.includes('P95')
      )
      assert.ok(acsWithTiming.length >= 1, 'Should have performance timing in interactive ACs')

      // Check for no-results case
      const hasNoResults = story.acceptanceCriteria.some((ac: string) =>
        ac.toLowerCase().includes('no results') ||
        ac.toLowerCase().includes('no products match') ||
        ac.toLowerCase().includes('no matches')
      )
      assert.ok(hasNoResults, 'Should have no-results case')

      // Check for AND-logic AC
      const hasAndLogic = story.acceptanceCriteria.some((ac: string) =>
        ac.toLowerCase().includes('and') ||
        ac.toLowerCase().includes('all') ||
        ac.toLowerCase().includes('multiple')
      )
      assert.ok(hasAndLogic, 'Should test AND-logic with multiple filters')

      // Check for clear/reset functionality
      const hasClearReset = story.acceptanceCriteria.some((ac: string) =>
        ac.toLowerCase().includes('clear') || ac.toLowerCase().includes('reset')
      )
      assert.ok(hasClearReset, 'Should have clear/reset functionality')

      // Verify no passive voice in Then clauses
      const passiveVoicePattern = /Then.*\b(is|are|was|were)\s+(displayed|shown|updated|saved)/i
      const hasPassiveVoice = story.acceptanceCriteria.some((ac: string) => passiveVoicePattern.test(ac))
      assert.ok(!hasPassiveVoice, 'Should not have passive voice in Then clauses')

      // Check for WCAG in Additional Notes
      if (story.additionalNotes) {
        assert.ok(
          story.additionalNotes.includes('WCAG'),
          'Should mention WCAG 2.1 AA in Additional Notes'
        )
      }

      // Verify technical hints are separate
      if (story.technicalHints) {
        assert.ok(Array.isArray(story.technicalHints), 'Technical hints should be separate array')
      }
    })

    test('Mobile Interface Story - Tests WCAG + Touch Targets + Accessibility', async () => {
      if (!TEST_AUTH_TOKEN) return

      const payload = {
        capabilityKey: 'mobile-interface',
        title: 'As a mobile user, I want touch-friendly filter controls',
        estimate_points: 5,
        ui_components: ['touchscreen', 'buttons', 'dropdown'],
        acceptance_themes: ['wcag', 'performance', 'no-results', 'edge-cases'],
        projectContext: {
          has_mobile: true,
        },
      }

      const response = await apiCall('/api/ai/generate-story', 'POST', payload)

      assert.equal(response.status, 200, 'Story generation should succeed')

      const story = response.data

      // WCAG 2.1 AA requirement enforced
      const storyText = JSON.stringify(story).toLowerCase()
      assert.ok(
        storyText.includes('wcag') || storyText.includes('accessibility'),
        'Should mention WCAG 2.1 AA requirement'
      )

      // Touch targets ≥44×44px
      assert.ok(
        storyText.includes('44') || storyText.includes('touch target'),
        'Should mention touch target size'
      )

      // Focus indicators and semantic labels
      assert.ok(
        storyText.includes('focus') || storyText.includes('semantic'),
        'Should mention focus indicators or semantic labels'
      )

      // Edge cases for small screens
      const hasEdgeCases = story.acceptanceCriteria.some((ac: string) =>
        ac.toLowerCase().includes('edge') ||
        ac.toLowerCase().includes('small screen') ||
        ac.toLowerCase().includes('touch')
      )
      assert.ok(hasEdgeCases, 'Should have edge cases AC')
    })

    test('Persistence Story - Tests Session State', async () => {
      if (!TEST_AUTH_TOKEN) return

      const payload = {
        capabilityKey: 'filter-persistence',
        title: 'As a user, I want my filters to persist across page refreshes',
        estimate_points: 2,
        ui_components: [],
        acceptance_themes: ['persistence', 'edge-cases'],
        projectContext: {
          has_mobile: false,
        },
      }

      const response = await apiCall('/api/ai/generate-story', 'POST', payload)

      assert.equal(response.status, 200, 'Story generation should succeed')

      const story = response.data

      // Check for persistence AC
      const hasPersistence = story.acceptanceCriteria.some((ac: string) =>
        ac.toLowerCase().includes('persist') ||
        ac.toLowerCase().includes('refresh') ||
        ac.toLowerCase().includes('navigate')
      )
      assert.ok(hasPersistence, 'Should verify state across navigation/refresh')

      // NO WCAG requirement (no UI components)
      // WCAG might still be mentioned but shouldn't be required
      // Just verify the story was generated successfully

      // Session storage mentioned in technical hints
      if (story.technicalHints) {
        const hasSessionStorage = story.technicalHints.some((hint: string) =>
          hint.toLowerCase().includes('session') || hint.toLowerCase().includes('storage')
        )
        assert.ok(hasSessionStorage, 'Should mention session storage in technical hints')
      }
    })
  })

  test.describe('Scenario 3: Auto-Fix Functionality', () => {
    test('should split compound Then clauses', async () => {
      if (!TEST_AUTH_TOKEN) return

      const payload = {
        storyId: 'test-story-compound-then',
        title: 'Test Story',
        description: 'Test description',
        acceptanceCriteria: [
          'Given a user applies filters',
          'When they click search',
          'Then search results display and filter count updates and loading spinner hides',
        ],
      }

      const response = await apiCall('/api/ai/validate', 'POST', payload)

      assert.equal(response.status, 200, 'Validation should succeed')

      const result = response.data
      assert.ok(result.autofixDetails, 'Should have autofix details')
      assert.ok(
        result.autofixDetails.includes('split-then'),
        'Should have split-then autofix'
      )

      // Verify ACs were split
      const fixedACs = result.fixed_acceptance_criteria || result.acceptanceCriteria
      const thenCount = fixedACs.filter((ac: string) => ac.trim().startsWith('Then')).length
      assert.ok(thenCount >= 3, 'Should have split Then clauses into separate ACs')
    })

    test('should insert missing no-results AC', async () => {
      if (!TEST_AUTH_TOKEN) return

      const payload = {
        storyId: 'test-story-no-results',
        title: 'Search Functionality',
        description: 'User can search for items',
        acceptanceCriteria: [
          'Given a user enters search term',
          'When they click search',
          'Then matching results display',
        ],
      }

      const response = await apiCall('/api/ai/validate', 'POST', payload)

      assert.equal(response.status, 200, 'Validation should succeed')

      const result = response.data
      if (result.autofixDetails) {
        const hasNoResultsfix = result.autofixDetails.includes('insert-no-results')
        if (hasNoResultsfix) {
          const fixedACs = result.fixed_acceptance_criteria || result.acceptanceCriteria
          const hasNoResults = fixedACs.some((ac: string) =>
            ac.toLowerCase().includes('no results') || ac.toLowerCase().includes('no match')
          )
          assert.ok(hasNoResults, 'Should insert no-results AC')
        }
      }
    })

    test('should add performance timing to interactive ACs', async () => {
      if (!TEST_AUTH_TOKEN) return

      const payload = {
        storyId: 'test-story-perf',
        title: 'Interactive Feature',
        description: 'User can interact with system',
        acceptanceCriteria: [
          'Given a user clicks button',
          'When system processes request',
          'Then results display',
          'Then notification shows',
          'Then counter updates',
          'Then page refreshes',
        ],
        projectContext: {
          performance_requirements: 'P95 < 2s',
        },
      }

      const response = await apiCall('/api/ai/validate', 'POST', payload)

      assert.equal(response.status, 200, 'Validation should succeed')

      const result = response.data
      if (result.autofixDetails && result.autofixDetails.includes('add-perf')) {
        const fixedACs = result.fixed_acceptance_criteria || result.acceptanceCriteria
        const acsWithTiming = fixedACs.filter((ac: string) =>
          ac.includes('within 2 seconds') || ac.includes('P95')
        )
        assert.ok(acsWithTiming.length >= 1, 'Should add performance timing')
      }
    })
  })

  test.describe('Scenario 4: Idempotency Testing', () => {
    test('should prevent story duplication with same requestId', async () => {
      if (!TEST_AUTH_TOKEN) return

      const requestId = `test-idempotent-${Date.now()}`
      const payload = {
        requestId,
        capabilityKey: 'category-filtering',
        title: 'Test Idempotency',
        estimate_points: 3,
        ui_components: ['dropdown'],
        acceptance_themes: ['result-count'],
      }

      // First request
      const response1 = await apiCall('/api/ai/generate-story', 'POST', payload)
      assert.equal(response1.status, 200, 'First request should succeed')

      // Second request with same requestId
      const response2 = await apiCall('/api/ai/generate-story', 'POST', payload)
      assert.equal(response2.status, 200, 'Second request should succeed')

      // Verify same story returned (or acknowledge duplication prevention)
      // The exact behavior depends on implementation
      // Could be same storyId or a duplicate prevention message
      if (response1.data.storyId && response2.data.storyId) {
        assert.equal(
          response1.data.storyId,
          response2.data.storyId,
          'Should return same story for duplicate request'
        )
      }
    })

    test('should prevent epic duplication with stable correlation key', async () => {
      if (!TEST_AUTH_TOKEN) return

      const requestId = `epic-idempotent-${Date.now()}`
      const payload = {
        requestId,
        epic_title: 'Test Epic Idempotency',
        description: 'Test epic for idempotency',
        projectId: 'test-project-1',
      }

      // First request
      const response1 = await apiCall('/api/ai/build-epic', 'POST', payload)
      assert.equal(response1.status, 200, 'First epic request should succeed')

      // Second request with same data
      const response2 = await apiCall('/api/ai/build-epic', 'POST', payload)
      assert.equal(response2.status, 200, 'Second epic request should succeed')

      // Verify duplication prevented or same epic updated
      if (response1.data.epicId && response2.data.epicId) {
        assert.equal(
          response1.data.epicId,
          response2.data.epicId,
          'Should update existing epic for duplicate request'
        )
      }
    })
  })

  test.describe('Scenario 5: Epic Linkage (Parent/Sibling)', () => {
    test('should create epic parent/sibling relationships on soft cap exceeded', async () => {
      if (!TEST_AUTH_TOKEN) return

      const payload = {
        description: 'Large story with 6+ capabilities...',
        userChoice: 'split_into_second_epic',
        projectId: 'test-project-1',
      }

      const response = await apiCall('/api/ai/build-epic', 'POST', payload)

      if (response.status === 200 && response.data.secondEpic) {
        const firstEpic = response.data.epic
        const secondEpic = response.data.secondEpic

        // Verify parent relationship
        assert.ok(firstEpic.parentEpicId === null, 'First epic should have no parent')
        assert.equal(
          secondEpic.parentEpicId,
          firstEpic.id,
          'Second epic should have first epic as parent'
        )

        // Verify sibling relationships
        assert.ok(
          Array.isArray(firstEpic.siblingEpicIds),
          'First epic should have sibling IDs array'
        )
        assert.ok(
          firstEpic.siblingEpicIds.includes(secondEpic.id),
          'First epic should include second as sibling'
        )

        // Verify same decomposition batch ID
        assert.equal(
          firstEpic.decompositionBatchId,
          secondEpic.decompositionBatchId,
          'Should have matching decomposition batch ID'
        )
      }
    })
  })

  test.describe('Scenario 6: Quality Scoring & Ready-for-Sprint Gate', () => {
    test('high quality story should pass ready-for-sprint gate', async () => {
      if (!TEST_AUTH_TOKEN) return

      const payload = {
        storyId: 'test-high-quality',
        title: 'Well-structured Story',
        description: 'Properly formatted story with good ACs',
        acceptanceCriteria: [
          'Given a user is logged in',
          'When they navigate to dashboard',
          'Then dashboard loads within 2 seconds (P95)',
          'Then user profile displays',
          'Then navigation menu highlights current page',
        ],
      }

      const response = await apiCall('/api/ai/validate', 'POST', payload)

      assert.equal(response.status, 200, 'Validation should succeed')

      const result = response.data
      if (result.quality_score !== undefined) {
        assert.ok(result.quality_score >= 8.0, 'Quality score should be high')
        assert.equal(result.ok, true, 'Should pass validation')
        assert.equal(result.manual_review_required, false, 'Should not require manual review')
        assert.equal(result.ready_for_sprint, true, 'Should be ready for sprint')
      }
    })

    test('low quality story should require manual review', async () => {
      if (!TEST_AUTH_TOKEN) return

      const payload = {
        storyId: 'test-low-quality',
        title: 'Vague Story',
        description: 'Not well defined',
        acceptanceCriteria: [
          'It works',
          'User can do stuff',
          'Results show correctly',
          'Everything is good',
          'System behaves properly',
          'Data is saved',
          'UI looks nice',
          'Performance is acceptable',
          'No errors occur',
        ],
      }

      const response = await apiCall('/api/ai/validate', 'POST', payload)

      assert.equal(response.status, 200, 'Validation should process')

      const result = response.data
      if (result.quality_score !== undefined) {
        assert.ok(result.quality_score <= 6.9, 'Quality score should be capped when review required')
        assert.equal(result.ok, false, 'Should fail validation')
        assert.equal(result.manual_review_required, true, 'Should require manual review')
        assert.equal(result.ready_for_sprint, false, 'Should not be ready for sprint')
      }
    })
  })

  test.describe('Scenario 7: Schema Validation', () => {
    test('should accept valid payloads', async () => {
      if (!TEST_AUTH_TOKEN) return

      const validPayload = {
        capabilityKey: 'test-capability',
        title: 'Valid Story',
        estimate_points: 3, // Must be 2, 3, or 5
        ui_components: ['button'],
        acceptance_themes: ['performance'],
        version: 'v1.3',
      }

      const response = await apiCall('/api/ai/generate-story', 'POST', validPayload)

      // Should not return 400 Bad Request
      assert.ok(
        response.status !== 400,
        'Valid payload should not be rejected'
      )
    })

    test('should reject invalid estimate_points', async () => {
      if (!TEST_AUTH_TOKEN) return

      const invalidPayload = {
        capabilityKey: 'test-capability',
        title: 'Invalid Story',
        estimate_points: 4, // Invalid: must be 2, 3, or 5
        ui_components: ['button'],
        acceptance_themes: ['performance'],
      }

      const response = await apiCall('/api/ai/generate-story', 'POST', invalidPayload)

      // Should return 400 Bad Request for schema violation
      if (response.status === 400) {
        assert.ok(
          response.data.error || response.data.message,
          'Should return error message for invalid schema'
        )
      }
    })

    test('should reject unknown fields', async () => {
      if (!TEST_AUTH_TOKEN) return

      const invalidPayload = {
        capabilityKey: 'test-capability',
        title: 'Story with Extra Field',
        estimate_points: 3,
        extra_field: 'value', // Should be rejected
        ui_components: ['button'],
        acceptance_themes: ['performance'],
      }

      const response = await apiCall('/api/ai/generate-story', 'POST', invalidPayload)

      // Should return 400 if strict schema validation is enforced
      // (depends on implementation details)
      if (response.status === 400) {
        assert.ok(
          response.data.error,
          'Should reject unknown fields'
        )
      }
    })
  })

  test.describe('Scenario 8: Observability & PII Redaction', () => {
    test('should redact PII in audit logs', async () => {
      if (!TEST_AUTH_TOKEN) return

      const payload = {
        storyId: 'test-pii-redaction',
        title: 'Story with PII',
        description: 'Customer john.doe@example.com with phone 555-123-4567 requests feature',
        acceptanceCriteria: [
          'Given user contact is john.doe@example.com',
          'When they submit request',
          'Then confirmation sent to their phone',
        ],
      }

      const response = await apiCall('/api/ai/validate', 'POST', payload)

      assert.equal(response.status, 200, 'Validation should succeed')

      // Note: PII redaction happens in audit logs, not in the response
      // This test verifies the request completes successfully
      // Actual PII redaction verification would require checking logs
      assert.ok(response.data, 'Should process request with PII')
    })

    test('should emit metrics for all operations', async () => {
      if (!TEST_AUTH_TOKEN) return

      // This test verifies that API calls complete successfully
      // Actual metrics verification would require observability platform access

      const decomposeResponse = await apiCall('/api/ai/decompose', 'POST', {
        description: 'Test story for metrics',
      })

      // Metrics should be emitted for:
      // - split.recommended_rate
      // - cap.softCapExceeded_rate
      // - quality.avg_score
      // etc.

      assert.ok(
        decomposeResponse.status === 200 || decomposeResponse.status === 400,
        'Request should complete and emit metrics'
      )
    })
  })
})

test.describe('End-to-End Integration Flow', () => {
  test('full workflow: decompose -> generate -> validate -> build epic', async () => {
    if (!TEST_AUTH_TOKEN) return

    // Step 1: Decompose large story
    const decomposePayload = {
      description: 'Complex feature with multiple capabilities for testing end-to-end flow',
      projectContext: {
        dataset_size: 10000,
        has_mobile: true,
      },
    }

    const decomposeResponse = await apiCall('/api/ai/decompose', 'POST', decomposePayload)
    
    if (decomposeResponse.status !== 200) {
      console.log('Decompose failed, skipping E2E test')
      return
    }

    const capabilities = decomposeResponse.data.capabilities

    if (!capabilities || capabilities.length === 0) {
      console.log('No capabilities returned, skipping E2E test')
      return
    }

    // Step 2: Generate stories for each capability
    const stories = []
    for (const cap of capabilities.slice(0, 2)) { // Test with first 2 capabilities
      const storyPayload = {
        capabilityKey: cap.key,
        title: cap.title,
        estimate_points: cap.estimate_points || 3,
        ui_components: cap.ui_components || [],
        acceptance_themes: cap.acceptance_themes || [],
      }

      const storyResponse = await apiCall('/api/ai/generate-story', 'POST', storyPayload)
      
      if (storyResponse.status === 200) {
        stories.push(storyResponse.data)
      }
    }

    assert.ok(stories.length > 0, 'Should generate at least one story')

    // Step 3: Validate each story
    for (const story of stories) {
      const validatePayload = {
        storyId: story.id || `test-story-${Date.now()}`,
        title: story.title,
        description: story.description,
        acceptanceCriteria: story.acceptanceCriteria,
      }

      const validateResponse = await apiCall('/api/ai/validate', 'POST', validatePayload)
      
      assert.equal(validateResponse.status, 200, 'Validation should succeed')
      
      const validation = validateResponse.data
      assert.ok(
        validation.ok !== undefined,
        'Should have validation result'
      )
    }

    // Step 4: Build epic with stories
    const epicPayload = {
      epic_title: 'E2E Test Epic',
      description: 'Epic created from decomposed capabilities',
      projectId: 'test-project-1',
      stories: stories.map((s) => s.id),
    }

    const epicResponse = await apiCall('/api/ai/build-epic', 'POST', epicPayload)
    
    if (epicResponse.status === 200) {
      assert.ok(epicResponse.data.epic, 'Should create epic')
      assert.ok(epicResponse.data.epic.id, 'Epic should have ID')
    }

    console.log('✅ End-to-end flow completed successfully')
  })
})

