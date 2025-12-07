import test from 'node:test'
import assert from 'node:assert/strict'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'
const TEST_AUTH_TOKEN = process.env.TEST_AUTH_TOKEN
const TEST_PROJECT_ID = process.env.TEST_PROJECT_ID
const TEST_STORY_ID = process.env.TEST_STORY_ID

async function apiCall(endpoint: string, method: string, body?: any) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (TEST_AUTH_TOKEN) {
    headers['Authorization'] = `Bearer ${TEST_AUTH_TOKEN}`
  }
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await response.json().catch(() => ({}))
  return { status: response.status, data }
}

test.describe('Prioritization API', () => {
  test.skip('requires TEST_BASE_URL, TEST_AUTH_TOKEN, TEST_PROJECT_ID, TEST_STORY_ID', () => {
    if (!TEST_AUTH_TOKEN || !TEST_PROJECT_ID || !TEST_STORY_ID) {
      console.log('Skipping prioritization API tests: env vars missing')
    }
  })

  test('run analysis returns 202', async () => {
    if (!TEST_AUTH_TOKEN || !TEST_PROJECT_ID) return
    const res = await apiCall(`/api/v1/prioritization/projects/${TEST_PROJECT_ID}/analyze`, 'POST', {
      framework: 'WSJF',
      strategicFocus: 'Test focus',
      teamVelocity: 20,
    })
    assert.equal(res.status, 202)
    assert.ok(res.data.jobId, 'jobId should be returned')
  })

  test('story scores endpoint responds', async () => {
    if (!TEST_AUTH_TOKEN || !TEST_STORY_ID) return
    const res = await apiCall(`/api/v1/prioritization/stories/${TEST_STORY_ID}/scores`, 'GET')
    assert.ok([200, 400, 404].includes(res.status), 'Endpoint should respond without crashing')
  })

  test('analyze validation fails for invalid payload', async () => {
    if (!TEST_AUTH_TOKEN || !TEST_PROJECT_ID) return
    const res = await apiCall(`/api/v1/prioritization/projects/${TEST_PROJECT_ID}/analyze`, 'POST', {
      framework: 'WSJF',
      teamVelocity: -5, // invalid
    })
    assert.equal(res.status, 400)
  })
})

