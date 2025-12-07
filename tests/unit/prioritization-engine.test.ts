import test from 'node:test'
import assert from 'node:assert/strict'
import { PrioritizationEngine } from '../../lib/prioritization/engine'
import type { BacklogStoryInput } from '../../lib/prioritization/types'

const engine = new PrioritizationEngine()

test('calculate WSJF ranks highest score first', () => {
  const stories: BacklogStoryInput[] = [
    { id: 'a', projectId: 'p1', title: 'A', businessValue: 10, timeCriticality: 10, riskReduction: 10, jobSize: 5 },
    { id: 'b', projectId: 'p1', title: 'B', businessValue: 5, timeCriticality: 5, riskReduction: 5, jobSize: 1 },
  ]

  const result = engine.runFullAnalysis(stories, { framework: 'WSJF' })
  assert.equal(result.rankedStories[0].id, 'b')
  assert.equal(result.rankedStories[0].wsjfScore, 15)
})

test('calculate RICE maps impact strings and protects zero effort', () => {
  const stories: BacklogStoryInput[] = [
    { id: 'a', projectId: 'p1', title: 'A', reach: 100, impact: 'massive', confidence: 0.8, effort: 0 },
  ]

  const result = engine.runFullAnalysis(stories, { framework: 'RICE' })
  assert.equal(result.rankedStories[0].riceScore, 480)
})

test('MoSCoW categorizes blockers as Must', () => {
  const stories: BacklogStoryInput[] = [
    { id: 'a', projectId: 'p1', title: 'A', tags: ['blocker'] },
  ]

  const result = engine.runFullAnalysis(stories, { framework: 'MoSCoW' })
  assert.equal(result.rankedStories[0].moscowCategory, 'Must')
})

test('confidence analysis buckets missing estimates as unestimated', () => {
  const stories: BacklogStoryInput[] = [
    { id: 'a', projectId: 'p1', title: 'A', jobSize: 3, confidence: 0.8 },
    { id: 'b', projectId: 'p1', title: 'B', jobSize: 3, confidence: 0.5 },
    { id: 'c', projectId: 'p1', title: 'C', jobSize: 3, confidence: 0.2 },
    { id: 'd', projectId: 'p1', title: 'D' },
  ]

  const result = engine.runFullAnalysis(stories, { framework: 'WSJF' })
  assert.deepEqual(result.confidenceLevels.highConfidenceStories, ['a'])
  assert.deepEqual(result.confidenceLevels.mediumConfidenceStories, ['b'])
  assert.deepEqual(result.confidenceLevels.lowConfidenceStories, ['c'])
  assert.deepEqual(result.confidenceLevels.unestimatedStories, ['d'])
})

test('MoSCoW ordering respects category priority', () => {
  const stories: BacklogStoryInput[] = [
    { id: 'a', projectId: 'p1', title: 'A', businessValue: 1, tags: ['blocker'] }, // Must
    { id: 'b', projectId: 'p1', title: 'B', businessValue: 9 }, // Should
    { id: 'c', projectId: 'p1', title: 'C', businessValue: 5, effort: 2 }, // Could
    { id: 'd', projectId: 'p1', title: 'D', businessValue: 1, effort: 10 }, // Wont
  ]

  const result = engine.runFullAnalysis(stories, { framework: 'MoSCoW' })
  const ordered = result.rankedStories.map((s) => s.id)
  assert.deepEqual(ordered, ['a', 'b', 'c', 'd'])
})

test('manual override provenance wins over auto', () => {
  const stories: BacklogStoryInput[] = [
    { id: 'a', projectId: 'p1', title: 'A', businessValue: 1, jobSize: 2, provenance: 'auto' },
    { id: 'b', projectId: 'p1', title: 'B', businessValue: 10, jobSize: 5, provenance: 'manual' },
  ]

  const result = engine.runFullAnalysis(stories, { framework: 'WSJF' })
  const ranked = result.rankedStories
  assert.equal(ranked[0].provenance, 'manual')
})

test('conflict detection flags shared team/component with similar scores', () => {
  const stories: BacklogStoryInput[] = [
    { id: 'a', projectId: 'p1', title: 'A', businessValue: 8, timeCriticality: 8, riskReduction: 8, jobSize: 4, teamDependency: 'teamA', component: 'auth' },
    { id: 'b', projectId: 'p1', title: 'B', businessValue: 8, timeCriticality: 7, riskReduction: 7, jobSize: 4, teamDependency: 'teamA', component: 'auth' },
    { id: 'c', projectId: 'p1', title: 'C', businessValue: 2, timeCriticality: 2, riskReduction: 2, jobSize: 5 },
  ]

  const result = engine.runFullAnalysis(stories, { framework: 'WSJF' })
  assert.ok(result.priorityConflicts.length >= 1)
})

test('capacity allocates per team', () => {
  const stories: BacklogStoryInput[] = [
    { id: 'a', projectId: 'p1', title: 'A', jobSize: 3, teamDependency: 'teamA' },
    { id: 'b', projectId: 'p1', title: 'B', jobSize: 3, teamDependency: 'teamA' },
    { id: 'c', projectId: 'p1', title: 'C', jobSize: 3, teamDependency: 'teamB' },
  ]

  const result = engine.runFullAnalysis(stories, { framework: 'WSJF', teamVelocity: 5 })
  const teamA = result.capacityAnalysis.teamCapacity?.find((t) => t.team === 'teamA')
  assert.ok(teamA)
  assert.ok((teamA?.used || 0) <= 5)
})

