import type {
  PrioritizationFramework,
  RankedStory,
  StrategicAlignmentResult,
  PriorityConflict,
  CapacityAnalysisResult,
  ConfidenceLevelsResult,
  BacklogAnalysisConfig,
  BacklogStoryInput,
  BacklogAnalysisResult,
} from './types'

/**
 * Lightweight prioritization engine implementing WSJF, RICE, and MoSCoW.
 * Calculations are defensive to handle partial data without crashing.
 */
export class PrioritizationEngine {
  runFullAnalysis(stories: BacklogStoryInput[], config: BacklogAnalysisConfig): BacklogAnalysisResult {
    const framework = config.framework

    // 1) Calculate scores / categories
    const scoredStories: RankedStory[] = stories.map((story) => {
      if (framework === 'WSJF') return { ...story, ...this.calculateWsjtScore(story) }
      if (framework === 'RICE') return { ...story, ...this.calculateRiceScore(story) }
      return { ...story, ...this.applyMoscow(story) }
    })

    // 2) Rank stories
    const rankedStories = this.rankStories(scoredStories, framework)

    // 3) Sub analyses
    const strategicAlignment = this.analyzeStrategicAlignment(rankedStories, config)
    const priorityConflicts = this.identifyPriorityConflicts(rankedStories)
    const capacityAnalysis = this.analyzeTeamCapacity(rankedStories, config.teamVelocity ?? 0)
    const confidenceLevels = this.analyzeConfidenceLevels(rankedStories)
    const executiveSummary = this.generateExecutiveSummary(rankedStories, strategicAlignment, capacityAnalysis)

    return {
      rankedStories,
      strategicAlignment,
      priorityConflicts,
      capacityAnalysis,
      confidenceLevels,
      executiveSummary,
    }
  }

  private rankStories(stories: RankedStory[], framework: PrioritizationFramework): RankedStory[] {
    const cloned = [...stories]
    if (framework === 'WSJF') {
      cloned.sort((a, b) => (b.wsjfScore ?? 0) - (a.wsjfScore ?? 0))
    } else if (framework === 'RICE') {
      cloned.sort((a, b) => (b.riceScore ?? 0) - (a.riceScore ?? 0))
    } else {
      const order = ['Must', 'Should', 'Could', 'Wont']
      cloned.sort((a, b) => order.indexOf(a.moscowCategory ?? 'Wont') - order.indexOf(b.moscowCategory ?? 'Wont'))
    }

    return cloned.map((story, index) => ({ ...story, rank: index + 1 }))
  }

  private calculateWsjtScore(story: BacklogStoryInput): Pick<RankedStory, 'wsjfScore'> {
    const businessValue = story.businessValue ?? 1
    const timeCriticality = story.timeCriticality ?? 1
    const riskReduction = story.riskReduction ?? 1
    const jobSize = story.jobSize ?? story.storyPoints ?? 1

    const denominator = jobSize === 0 ? 1 : jobSize
    const score = (businessValue + timeCriticality + riskReduction) / denominator
    return { wsjfScore: Number(score.toFixed(2)) }
  }

  private calculateRiceScore(story: BacklogStoryInput): Pick<RankedStory, 'riceScore'> {
    const reach = story.reach ?? 0
    const impactLookup: Record<string, number> = {
      massive: 3,
      high: 2,
      medium: 1,
      low: 0.5,
      minimal: 0.25,
    }
    const impact =
      typeof story.impact === 'number'
        ? story.impact
        : impactLookup[String(story.impact ?? 'minimal').toLowerCase()] ?? 0.25
    const confidence = story.confidence ?? 0.1
    const effort = story.effort ?? story.jobSize ?? story.storyPoints ?? 0.5

    const denominator = effort === 0 ? 0.5 : effort
    const score = (reach * impact * confidence) / denominator
    return { riceScore: Number(score.toFixed(2)) }
  }

  private applyMoscow(story: BacklogStoryInput): Pick<RankedStory, 'moscowCategory'> {
    if ((story.tags ?? []).some((tag) => ['blocker', 'legal', 'critical'].includes(tag))) {
      return { moscowCategory: 'Must' }
    }
    if ((story.businessValue ?? 0) >= 7) {
      return { moscowCategory: 'Should' }
    }
    if ((story.effort ?? story.jobSize ?? story.storyPoints ?? 0) <= 3 && (story.businessValue ?? 0) >= 4) {
      return { moscowCategory: 'Could' }
    }
    return { moscowCategory: 'Wont' }
  }

  private analyzeStrategicAlignment(rankedStories: RankedStory[], config: BacklogAnalysisConfig): StrategicAlignmentResult {
    const topThree = rankedStories.slice(0, 3)
    const revenueImpact = topThree.reduce((sum, story) => sum + (story.quarterlyRevenue ?? 0), 0)

    return {
      top3AlignmentGoal: config.strategicFocus ?? 'Unspecified',
      revenueImpactNextQuarter: Number(revenueImpact.toFixed(2)),
      riskReduction: topThree.some((story) => (story.riskReduction ?? 0) > 7)
        ? 'High - top items reduce key risks'
        : 'Moderate',
      marketDifferentiation: config.marketSegment
        ? `Focused on ${config.marketSegment} differentiation`
        : 'Focus not provided',
    }
  }

  private identifyPriorityConflicts(rankedStories: RankedStory[]): PriorityConflict[] {
    const topTen = rankedStories.slice(0, 10)
    const conflicts: PriorityConflict[] = []

    for (let i = 0; i < topTen.length; i++) {
      for (let j = i + 1; j < topTen.length; j++) {
        const a = topTen[i]
        const b = topTen[j]
        const sameTeam = a.teamDependency && a.teamDependency === b.teamDependency
        const sameComponent = a.component && a.component === b.component
        const similarScore =
          Math.abs((a.wsjfScore ?? a.riceScore ?? 0) - (b.wsjfScore ?? b.riceScore ?? 0)) <= 0.2

        if ((sameTeam || sameComponent) && similarScore) {
          conflicts.push({
            conflict: `${a.title} vs ${b.title}`,
            reason: sameTeam
              ? `Both depend on team ${a.teamDependency}; prefer ${a.title} due to higher time criticality.`
              : `Both touch component ${a.component}; prefer ${a.title} due to higher score.`,
          })
        }
      }
    }

    return conflicts
  }

  private analyzeTeamCapacity(rankedStories: RankedStory[], velocity: number): CapacityAnalysisResult {
    const sprintStories: string[] = []
    const quarterStories: string[] = []
    const atRiskStories: string[] = []
    const teamCapacity: Array<{ team: string; used: number; capacity: number; stories: string[] }> = []
    const teamUsage = new Map<string, { used: number; stories: string[] }>()

    let usedPoints = 0
    rankedStories.forEach((story) => {
      const size = story.jobSize ?? story.storyPoints ?? 0
      if (size === 0) return

      if (usedPoints + size <= velocity) {
        sprintStories.push(story.id)
        usedPoints += size
      }

      if (quarterStories.length < 20) {
        quarterStories.push(story.id)
      }

      if ((story.confidence ?? 0) < 0.4) {
        atRiskStories.push(story.id)
      }

      if (story.teamDependency) {
        const current = teamUsage.get(story.teamDependency) ?? { used: 0, stories: [] }
        if (current.used + size <= velocity) {
          current.used += size
          current.stories.push(story.id)
        }
        teamUsage.set(story.teamDependency, current)
      }
    })

    for (const [team, info] of teamUsage.entries()) {
      teamCapacity.push({ team, used: info.used, capacity: velocity, stories: info.stories })
    }

    return {
      sprintStories,
      quarterStories,
      atRiskStories,
      teamCapacity,
    }
  }

  private analyzeConfidenceLevels(rankedStories: RankedStory[]): ConfidenceLevelsResult {
    const high: string[] = []
    const medium: string[] = []
    const low: string[] = []
    const unestimated: string[] = []

    rankedStories.forEach((story) => {
      const confidence = story.confidence
      const hasEstimate = story.jobSize !== undefined && story.jobSize !== null
        ? true
        : story.storyPoints !== undefined && story.storyPoints !== null

      if (!hasEstimate) {
        unestimated.push(story.id)
        return
      }

      if (confidence === undefined || confidence === null) {
        medium.push(story.id)
        return
      }

      if (confidence >= 0.7) {
        high.push(story.id)
      } else if (confidence >= 0.4) {
        medium.push(story.id)
      } else {
        low.push(story.id)
      }
    })

    return {
      highConfidenceStories: high,
      mediumConfidenceStories: medium,
      lowConfidenceStories: low,
      unestimatedStories: unestimated,
    }
  }

  private generateExecutiveSummary(
    rankedStories: RankedStory[],
    alignment: StrategicAlignmentResult,
    capacity: CapacityAnalysisResult
  ): string {
    const topStory = rankedStories[0]
    const sprintCount = capacity.sprintStories.length

    if (!topStory) {
      return 'No backlog items available to generate a summary.'
    }

    return `Top priority is "${topStory.title}" aligned with "${alignment.top3AlignmentGoal}". With current velocity, the team can deliver ${sprintCount} stories next sprint. Focus on these to maximize impact and address key risks.`
  }
}

export const prioritizationEngine = new PrioritizationEngine()
