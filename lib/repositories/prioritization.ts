import { db, generateId } from '@/lib/db'
import {
  stories,
  projects,
  storyPrioritizationScores,
  backlogAnalysisReports,
  impactScores,
  effortScores,
} from '@/lib/db/schema'
import { and, eq, inArray, desc } from 'drizzle-orm'
import { prioritizationEngine } from '@/lib/prioritization/engine'
import type {
  BacklogAnalysisConfig,
  BacklogAnalysisResult,
  PrioritizationFramework,
} from '@/lib/prioritization/types'
import type { UserContext } from '@/lib/middleware/auth'

export class PrioritizationRepository {
  constructor(private user: UserContext) {}

  async runAnalysis(projectId: string, config: BacklogAnalysisConfig): Promise<BacklogAnalysisResult & { reportId: string }> {
    await this.verifyProject(projectId)

    const backlogStories = await this.loadStories(projectId, config.framework)
    const result = prioritizationEngine.runFullAnalysis(backlogStories, config)

    const reportId = generateId()
    await db.insert(backlogAnalysisReports).values({
      id: reportId,
      projectId,
      frameworkUsed: config.framework,
      generatedBy: this.user.id,
      strategicFocus: config.strategicFocus,
      marketSegment: config.marketSegment,
      competitivePressure: config.competitivePressure,
      budgetConstraint: config.budgetPerQuarter ? String(config.budgetPerQuarter) : null,
      strategicAlignment: result.strategicAlignment,
      priorityConflicts: result.priorityConflicts,
      capacityAnalysis: result.capacityAnalysis,
      confidenceLevels: result.confidenceLevels,
      executiveSummary: result.executiveSummary,
      rankedStories: result.rankedStories,
    })

    // Upsert per-story scores for the chosen framework
    for (const story of result.rankedStories) {
      await db
        .insert(storyPrioritizationScores)
        .values({
          id: generateId(),
          storyId: story.id,
          projectId,
          framework: config.framework,
          businessValue: story.businessValue ?? null,
          timeCriticality: story.timeCriticality ?? null,
          riskReduction: story.riskReduction ?? null,
          jobSize: story.jobSize ?? story.storyPoints ?? null,
          wsjfScore: story.wsjfScore ? String(story.wsjfScore) : null,
          reach: story.reach ?? null,
          impact: story.impact ? Number(story.impact) : null,
          confidence: story.confidence ?? null,
          effort: story.effort ?? null,
          riceScore: story.riceScore ? String(story.riceScore) : null,
          moscowCategory: story.moscowCategory ?? null,
          calculatedBy: this.user.id,
          reasoning: 'Auto-calculated by PrioritizationEngine',
        })
        .onConflictDoUpdate({
          target: [storyPrioritizationScores.storyId, storyPrioritizationScores.framework],
          set: {
            businessValue: story.businessValue ?? null,
            timeCriticality: story.timeCriticality ?? null,
            riskReduction: story.riskReduction ?? null,
            jobSize: story.jobSize ?? story.storyPoints ?? null,
            wsjfScore: story.wsjfScore ? String(story.wsjfScore) : null,
            reach: story.reach ?? null,
            impact: story.impact ? Number(story.impact) : null,
            confidence: story.confidence ?? null,
            effort: story.effort ?? null,
            riceScore: story.riceScore ? String(story.riceScore) : null,
            moscowCategory: story.moscowCategory ?? null,
            calculatedAt: new Date(),
            calculatedBy: this.user.id,
            isManualOverride: false,
            reasoning: 'Auto-calculated by PrioritizationEngine',
          },
        })
    }

    return { ...result, reportId }
  }

  async listReports(projectId: string) {
    await this.verifyProject(projectId)
    return db
      .select()
      .from(backlogAnalysisReports)
      .where(eq(backlogAnalysisReports.projectId, projectId))
      .orderBy(backlogAnalysisReports.generatedAt)
  }

  async getReport(reportId: string) {
    const [report] = await db
      .select()
      .from(backlogAnalysisReports)
      .where(eq(backlogAnalysisReports.id, reportId))
      .limit(1)

    if (!report) {
      throw new Error('Report not found')
    }

    if (report.projectId) {
      await this.verifyProject(report.projectId)
    }

    return report
  }

  async getStoryScores(storyId: string) {
    const [story] = await db
      .select({ projectId: stories.projectId, organizationId: stories.organizationId })
      .from(stories)
      .where(eq(stories.id, storyId))
      .limit(1)

    if (!story) throw new Error('Story not found')
    if (story.organizationId !== this.user.organizationId) {
      throw new Error('Forbidden')
    }

    return db
      .select()
      .from(storyPrioritizationScores)
      .where(eq(storyPrioritizationScores.storyId, storyId))
  }

  async upsertStoryScore(
    storyId: string,
    framework: PrioritizationFramework,
    payload: Partial<{
      businessValue: number
      timeCriticality: number
      riskReduction: number
      jobSize: number
      wsjfScore: number
      reach: number
      impact: number
      confidence: number
      effort: number
      riceScore: number
      moscowCategory: 'Must' | 'Should' | 'Could' | 'Wont'
      reasoning?: string
    }>
  ) {
    const [story] = await db
      .select({ projectId: stories.projectId, organizationId: stories.organizationId })
      .from(stories)
      .where(eq(stories.id, storyId))
      .limit(1)

    if (!story) throw new Error('Story not found')
    if (story.organizationId !== this.user.organizationId) {
      throw new Error('Forbidden')
    }

    await db
      .insert(storyPrioritizationScores)
      .values({
        id: generateId(),
        storyId,
        projectId: story.projectId,
        framework,
        businessValue: payload.businessValue ?? null,
        timeCriticality: payload.timeCriticality ?? null,
        riskReduction: payload.riskReduction ?? null,
        jobSize: payload.jobSize ?? null,
        wsjfScore: payload.wsjfScore ? String(payload.wsjfScore) : null,
        reach: payload.reach ?? null,
        impact: payload.impact ?? null,
        confidence: payload.confidence ?? null,
        effort: payload.effort ?? null,
        riceScore: payload.riceScore ? String(payload.riceScore) : null,
        moscowCategory: payload.moscowCategory ?? null,
        calculatedBy: this.user.id,
        isManualOverride: true,
        reasoning: payload.reasoning ?? 'Manual override',
      })
      .onConflictDoUpdate({
        target: [storyPrioritizationScores.storyId, storyPrioritizationScores.framework],
        set: {
          businessValue: payload.businessValue ?? null,
          timeCriticality: payload.timeCriticality ?? null,
          riskReduction: payload.riskReduction ?? null,
          jobSize: payload.jobSize ?? null,
          wsjfScore: payload.wsjfScore ? String(payload.wsjfScore) : null,
          reach: payload.reach ?? null,
          impact: payload.impact ?? null,
          confidence: payload.confidence ?? null,
          effort: payload.effort ?? null,
          riceScore: payload.riceScore ? String(payload.riceScore) : null,
          moscowCategory: payload.moscowCategory ?? null,
          calculatedAt: new Date(),
          calculatedBy: this.user.id,
          isManualOverride: true,
          reasoning: payload.reasoning ?? 'Manual override',
        },
      })
  }

  private async verifyProject(projectId: string) {
    const [project] = await db
      .select({ organizationId: projects.organizationId })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1)

    if (!project) {
      throw new Error('Project not found')
    }
    if (project.organizationId !== this.user.organizationId) {
      throw new Error('Forbidden')
    }
  }

  private async loadStories(projectId: string, framework: PrioritizationFramework) {
    const rows = await db
      .select({
        id: stories.id,
        projectId: stories.projectId,
        title: stories.title,
        storyPoints: stories.storyPoints,
        tags: stories.tags,
        priority: stories.priority,
        aiConfidenceScore: stories.aiConfidenceScore,
      })
      .from(stories)
      .where(and(eq(stories.projectId, projectId)))

    const storyIds = rows.map((r) => r.id)
    if (storyIds.length === 0) return []

    const latestImpactRows = await db
      .select({
        storyId: impactScores.storyId,
        reach: impactScores.reach,
        impact: impactScores.impact,
        confidence: impactScores.confidence,
        effort: impactScores.effort,
        riceScore: impactScores.riceScore,
        wsjfScore: impactScores.wsjfScore,
        createdAt: impactScores.createdAt,
      })
      .from(impactScores)
      .where(inArray(impactScores.storyId, storyIds))
      .orderBy(desc(impactScores.createdAt))

    const latestEffortRows = await db
      .select({
        storyId: effortScores.storyId,
        suggestedPoints: effortScores.suggestedPoints,
        confidence: effortScores.confidence,
        createdAt: effortScores.createdAt,
      })
      .from(effortScores)
      .where(inArray(effortScores.storyId, storyIds))
      .orderBy(desc(effortScores.createdAt))

    const manualOverrides = await db
      .select({
        storyId: storyPrioritizationScores.storyId,
        framework: storyPrioritizationScores.framework,
        businessValue: storyPrioritizationScores.businessValue,
        timeCriticality: storyPrioritizationScores.timeCriticality,
        riskReduction: storyPrioritizationScores.riskReduction,
        jobSize: storyPrioritizationScores.jobSize,
        wsjfScore: storyPrioritizationScores.wsjfScore,
        reach: storyPrioritizationScores.reach,
        impact: storyPrioritizationScores.impact,
        confidence: storyPrioritizationScores.confidence,
        effort: storyPrioritizationScores.effort,
        riceScore: storyPrioritizationScores.riceScore,
        moscowCategory: storyPrioritizationScores.moscowCategory,
        calculatedAt: storyPrioritizationScores.calculatedAt,
        isManualOverride: storyPrioritizationScores.isManualOverride,
      })
      .from(storyPrioritizationScores)
      .where(and(inArray(storyPrioritizationScores.storyId, storyIds), eq(storyPrioritizationScores.framework, framework)))
      .orderBy(desc(storyPrioritizationScores.calculatedAt))

    const pickLatest = <T extends { storyId: string; createdAt?: Date | null }>(rows: T[]) => {
      const map = new Map<string, T>()
      for (const row of rows) {
        if (!map.has(row.storyId)) {
          map.set(row.storyId, row)
        }
      }
      return map
    }

    const impactMap = pickLatest(latestImpactRows)
    const effortMap = pickLatest(latestEffortRows)
    const overrideMap = new Map<string, (typeof manualOverrides)[number]>()
    for (const row of manualOverrides) {
      if (!overrideMap.has(row.storyId)) {
        overrideMap.set(row.storyId, row)
      }
    }

    const priorityToScore: Record<string, number> = {
      critical: 10,
      high: 8,
      medium: 5,
      low: 3,
    }

    return rows.map((row) => {
      const override = overrideMap.get(row.id)
      const impact = impactMap.get(row.id)
      const effort = effortMap.get(row.id)

      const jobSize =
        override?.jobSize ??
        effort?.suggestedPoints ??
        impact?.effort ??
        row.storyPoints ??
        undefined

      const confidence =
        override?.confidence ??
        (impact?.confidence != null ? impact.confidence / 100 : undefined) ??
        (effort?.confidence != null ? effort.confidence / 100 : undefined) ??
        (row.aiConfidenceScore != null ? row.aiConfidenceScore / 100 : undefined)

      return {
        id: row.id,
        projectId: row.projectId,
        title: row.title,
        tags: row.tags ?? [],
        storyPoints: row.storyPoints ?? undefined,
        jobSize,
        businessValue: override?.businessValue ?? impact?.impact ?? priorityToScore[row.priority] ?? 5,
        timeCriticality: override?.timeCriticality ?? priorityToScore[row.priority] ?? 5,
        riskReduction: override?.riskReduction ?? priorityToScore[row.priority] ?? 5,
        reach: override?.reach ?? impact?.reach ?? undefined,
        impact: override?.impact ?? impact?.impact ?? undefined,
        confidence,
        effort: override?.effort ?? impact?.effort ?? effort?.suggestedPoints ?? undefined,
        wsjfScore: override?.wsjfScore ? Number(override.wsjfScore) : impact?.wsjfScore ? Number(impact.wsjfScore) : undefined,
        riceScore: override?.riceScore ? Number(override.riceScore) : impact?.riceScore ? Number(impact.riceScore) : undefined,
        moscowCategory: override?.moscowCategory ?? undefined,
        teamDependency: undefined,
        quarterlyRevenue: undefined,
      }
    })
  }
}
