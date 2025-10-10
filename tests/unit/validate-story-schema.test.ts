import test from 'node:test'
import assert from 'node:assert/strict'
import { validateStorySchema } from '@/lib/validations/ai'

test('validateStorySchema accepts either storyId or projectId', () => {
  assert.doesNotThrow(() =>
    validateStorySchema.parse({
      storyId: 'story-1',
      title: 'Allow users to reset passwords',
      description: 'Given a registered user, when they request a reset then they receive an email.',
      acceptanceCriteria: ['Given the user is on the reset page'],
    })
  )

  assert.doesNotThrow(() =>
    validateStorySchema.parse({
      projectId: 'project-1',
      title: 'Show sprint burndown chart',
      description: 'Given a sprint with active stories, when I open the sprint dashboard then I see a burndown chart.',
      acceptanceCriteria: ['- Chart refreshes every hour'],
    })
  )
})

test('validateStorySchema rejects payloads without projectId or storyId', () => {
  assert.throws(
    () =>
      validateStorySchema.parse({
        title: 'Missing mapping makes schema unhappy',
        description: 'Given nothing then nothing',
        acceptanceCriteria: ['Given any input then something happens'],
      }),
    /Provide a storyId or projectId/
  )
})

test('validateStorySchema enforces acceptance criteria guard rails', () => {
  assert.throws(
    () =>
      validateStorySchema.parse({
        projectId: 'project-1',
        title: 'Bad acceptance criterion',
        description: 'Given a context then a result',
        acceptanceCriteria: ['This criterion has no structure'],
      }),
    /Acceptance criteria should start/
  )
})

