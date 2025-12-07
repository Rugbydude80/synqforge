export type PrioritizationFramework = 'WSJF' | 'RICE' | 'MoSCoW'

export interface BacklogStoryInput {
  id: string
  projectId: string
  title: string
  priority?: string | null
  status?: string | null
  storyPoints?: number | null
  jobSize?: number | null
  businessValue?: number | null
  timeCriticality?: number | null
  riskReduction?: number | null
  reach?: number | null
  impact?: number | string | null
  confidence?: number | null
  effort?: number | null
  tags?: string[] | null
  teamDependency?: string | null
  component?: string | null
  goalTags?: string[] | null
  revenueImpact?: number | null
  teamDependency?: string | null
  quarterlyRevenue?: number | null
}

export interface RankedStory extends BacklogStoryInput {
  wsjfScore?: number
  riceScore?: number
  moscowCategory?: 'Must' | 'Should' | 'Could' | 'Wont'
  rank?: number
  provenance?: 'auto' | 'ai' | 'manual'
}

export interface StrategicAlignmentResult {
  top3AlignmentGoal: string
  revenueImpactNextQuarter: number
  riskReduction: string
  marketDifferentiation: string
}

export interface PriorityConflict {
  conflict: string
  reason: string
}

export interface CapacityAnalysisResult {
  sprintStories: string[]
  quarterStories: string[]
  atRiskStories: string[]
  teamCapacity?: Array<{
    team: string
    used: number
    capacity: number
    stories: string[]
  }>
}

export interface ConfidenceLevelsResult {
  highConfidenceStories: string[]
  mediumConfidenceStories: string[]
  lowConfidenceStories: string[]
  unestimatedStories: string[]
}

export interface BacklogAnalysisResult {
  rankedStories: RankedStory[]
  strategicAlignment: StrategicAlignmentResult
  priorityConflicts: PriorityConflict[]
  capacityAnalysis: CapacityAnalysisResult
  confidenceLevels: ConfidenceLevelsResult
  executiveSummary: string
}

export interface BacklogAnalysisConfig {
  framework: PrioritizationFramework
  strategicFocus?: string
  marketSegment?: string
  competitivePressure?: string
  budgetPerQuarter?: number
  teamVelocity?: number
}
