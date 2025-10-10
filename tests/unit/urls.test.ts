import test from 'node:test'
import assert from 'node:assert/strict'
import { storyUrl, storyCommentUrl, projectStoryUrl } from '@/lib/urls'

test('storyUrl returns canonical detail path', () => {
  assert.equal(storyUrl('story-123'), '/stories/story-123')
})

test('storyCommentUrl anchors to comment hash', () => {
  assert.equal(
    storyCommentUrl('story-123', 'comment-456'),
    '/stories/story-123#comment-comment-456'
  )
})

test('projectStoryUrl appends story query and hash when provided', () => {
  assert.equal(projectStoryUrl('proj-1', 'story-1'), '/projects/proj-1?story=story-1')
  assert.equal(
    projectStoryUrl('proj-1', 'story-1', 'comment-1'),
    '/projects/proj-1?story=story-1#comment-1'
  )
})

