import { db, generateId } from '@/lib/db'
import {
  sprintForecasts,
  sprints,
  stories,
  organizations,
  organizationMembers,
} from '@/lib/db/schema'
import { eq, and, sql, desc, gte, lte } from 'drizzle-orm'
import Anthropic from '@anthropic-ai/sdk'
import { recordTokenUsage, checkTokenAvailability } from './ai-metering.service'
import { checkAIRateLimit } from './ai-rate-limit.service'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

export interface VelocityData {
  sprintId: string
  sprintName: string
  planned: number
  completed: number
  velocity: number
  completionRate: number
}

export interface SprintCapacity {
  totalDays: number
  teamSize: number
  availableDays: number // accounting for holidays, PTO
  velocityPoints: number
  confidenceLevel: 'low' | 'medium' | 'high'
}

export interface SprintForecast {
  id: string
  sprintId: string
  sprintName: string
  capacity: SprintCapacity
  suggestedStories: Array<{
    storyId: string
    title: string
    estimatedEffort: number
    priority: string
    reasoning: string
  }>
  totalEstimated: number
  utilizationPercentage: number
  spilloverProbability: number
  riskFactors: string[]
  recommendations: string[]
  generatedAt: Date
  tokensUsed: number
}

export interface ReleaseForecast {
  releaseId: string
  releaseName: string
  targetDate: Date
  requiredStories: number
  completedStories: number
  remainingStories: number
  estimatedSprintsNeeded: number
  predictedCompletionDate: Date
  onTrack: boolean
  riskLevel: 'low' | 'medium' | 'high'
  recommendations: string[]
}

/**
 * Calculate historical velocity from past sprints
 */
export async function calculateHistoricalVelocity(
  organizationId: string,
  projectId: string,
  lookbackSprints: number = 3
): Promise<{
  averageVelocity: number
  velocityTrend: 'increasing' | 'decreasing' | 'stable'
  confidenceLevel: 'low' | 'medium' | 'high'
  historicalData: VelocityData[]
}> {
  try {
    // Get completed sprints
    const completedSprints = await db
      .select()
      .from(sprints)
      .where(
        and(
          eq(sprints.organizationId, organizationId),
          eq(sprints.projectId, projectId),
          eq(sprints.status, 'completed')
        )
      )
      .orderBy(desc(sprints.endDate))
      .limit(lookbackSprints)

    if (completedSprints.length === 0) {
      return {
        averageVelocity: 0,
        velocityTrend: 'stable',
        confidenceLevel: 'low',
        historicalData: [],
      }
    }

    const historicalData: VelocityData[] = []

    for (const sprint of completedSprints) {
      // Get stories in this sprint
      const sprintStories = await db
        .select()
        .from(stories)
        .where(
          and(
            eq(stories.organizationId, organizationId),
            eq(stories.sprintId, sprint.id)
          )
        )

      const planned = sprintStories.reduce(
        (sum, story) => sum + (story.estimatedEffort || 0),
        0
      )
      const completed = sprintStories
        .filter((story) => story.status === 'done')
        .reduce((sum, story) => sum + (story.estimatedEffort || 0), 0)

      historicalData.push({
        sprintId: sprint.id,
        sprintName: sprint.name,
        planned,
        completed,
        velocity: completed,
        completionRate: planned > 0 ? completed / planned : 0,
      })
    }

    // Calculate average velocity
    const averageVelocity =
      historicalData.reduce((sum, data) => sum + data.velocity, 0) /
      historicalData.length

    // Determine trend
    let velocityTrend: 'increasing' | 'decreasing' | 'stable' = 'stable'
    if (historicalData.length >= 2) {
      const recent = historicalData.slice(0, Math.ceil(historicalData.length / 2))
      const older = historicalData.slice(Math.ceil(historicalData.length / 2))

      const recentAvg = recent.reduce((sum, d) => sum + d.velocity, 0) / recent.length
      const olderAvg = older.reduce((sum, d) => sum + d.velocity, 0) / older.length

      const change = (recentAvg - olderAvg) / olderAvg
      if (change > 0.1) velocityTrend = 'increasing'
      else if (change < -0.1) velocityTrend = 'decreasing'
    }

    // Determine confidence level based on data availability and consistency
    let confidenceLevel: 'low' | 'medium' | 'high' = 'low'
    if (historicalData.length >= 3) {
      const stdDev = calculateStandardDeviation(
        historicalData.map((d) => d.velocity)
      )
      const cv = stdDev / averageVelocity // coefficient of variation

      if (cv < 0.2) confidenceLevel = 'high'
      else if (cv < 0.4) confidenceLevel = 'medium'
    } else if (historicalData.length >= 2) {
      confidenceLevel = 'medium'
    }

    return {
      averageVelocity,
      velocityTrend,
      confidenceLevel,
      historicalData,
    }
  } catch (error) {
    console.error('Error calculating historical velocity:', error)
    return {
      averageVelocity: 0,
      velocityTrend: 'stable',
      confidenceLevel: 'low',
      historicalData: [],
    }
  }
}

/**
 * Calculate standard deviation
 */
function calculateStandardDeviation(values: number[]): number {
  if (values.length === 0) return 0

  const mean = values.reduce((sum, val) => sum + val, 0) / values.length
  const squaredDiffs = values.map((val) => Math.pow(val - mean, 2))
  const avgSquaredDiff =
    squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length

  return Math.sqrt(avgSquaredDiff)
}

/**
 * Generate sprint forecast with AI recommendations
 */
export async function generateSprintForecast(
  organizationId: string,
  projectId: string,
  sprintId: string,
  capacityOverride?: Partial<SprintCapacity>
): Promise<SprintForecast> {
  try {
    // Get organization to check tier and rate limits
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1)

    if (!organization) {
      throw new Error('Organization not found')
    }

    // Check if organization has access to Planning & Forecasting
    const tier = organization.subscriptionTier
    if (tier === 'free') {
      throw new Error(
        'Planning & Forecasting requires Team plan or higher. Please upgrade to continue.'
      )
    }

    // Check rate limit
    const rateLimitCheck = await checkAIRateLimit(organizationId, tier)
    if (!rateLimitCheck.allowed) {
      throw new Error(
        `Rate limit exceeded. Please wait ${Math.ceil(rateLimitCheck.retryAfter || 60)} seconds before trying again.`
      )
    }

    // Get sprint
    const [sprint] = await db
      .select()
      .from(sprints)
      .where(
        and(
          eq(sprints.id, sprintId),
          eq(sprints.organizationId, organizationId)
        )
      )
      .limit(1)

    if (!sprint) {
      throw new Error('Sprint not found')
    }

    // Calculate historical velocity
    const velocityData = await calculateHistoricalVelocity(
      organizationId,
      projectId,
      3
    )

    // Get team size
    const teamMembers = await db
      .select()
      .from(organizationMembers)
      .where(eq(organizationMembers.organizationId, organizationId))

    // Calculate sprint capacity
    const sprintDurationDays = sprint.endDate && sprint.startDate
      ? Math.ceil(
          (new Date(sprint.endDate).getTime() -
            new Date(sprint.startDate).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 10 // default 2 weeks

    const capacity: SprintCapacity = {
      totalDays: capacityOverride?.totalDays || sprintDurationDays,
      teamSize: capacityOverride?.teamSize || teamMembers.length,
      availableDays:
        capacityOverride?.availableDays ||
        sprintDurationDays * teamMembers.length * 0.8, // 80% availability
      velocityPoints:
        capacityOverride?.velocityPoints || velocityData.averageVelocity,
      confidenceLevel:
        capacityOverride?.confidenceLevel || velocityData.confidenceLevel,
    }

    // Get backlog stories (not in a sprint, ordered by priority)
    const backlogStories = await db
      .select()
      .from(stories)
      .where(
        and(
          eq(stories.organizationId, organizationId),
          eq(stories.projectId, projectId),
          sql`${stories.sprintId} IS NULL`,
          eq(stories.status, 'backlog')
        )
      )
      .orderBy(stories.priority, desc(stories.createdAt))
      .limit(50)

    // Estimate token usage
    const estimatedTokens = 5000

    // Check token availability
    const tokenCheck = await checkTokenAvailability(organizationId, estimatedTokens)
    if (!tokenCheck.allowed) {
      throw new Error(
        `Insufficient AI tokens. You have ${tokenCheck.tokensRemaining} tokens remaining. ${tokenCheck.requiresUpgrade ? 'Please upgrade your plan or purchase additional tokens.' : 'Your tokens will reset at the start of the next billing period.'}`
      )
    }

    // Generate AI recommendations
    const aiResult = await generateSprintRecommendations(
      sprint,
      capacity,
      velocityData,
      backlogStories
    )

    // Save forecast
    const forecastId = generateId()
    await db.insert(sprintForecasts).values({
      id: forecastId,
      organizationId,
      sprintId,
      capacity: capacity as any,
      suggestedStories: aiResult.suggestedStories as any,
      totalEstimated: aiResult.totalEstimated,
      utilizationPercentage: aiResult.utilizationPercentage,
      spilloverProbability: aiResult.spilloverProbability,
      riskFactors: aiResult.riskFactors,
      recommendations: aiResult.recommendations,
      tokensUsed: aiResult.tokensUsed,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // Record token usage
    await recordTokenUsage(organizationId, aiResult.tokensUsed, 'sprint_planning', false)

    return {
      id: forecastId,
      sprintId: sprint.id,
      sprintName: sprint.name,
      capacity,
      ...aiResult,
      generatedAt: new Date(),
    }
  } catch (error: any) {
    console.error('Error generating sprint forecast:', error)
    throw error
  }
}

/**
 * Use AI to recommend sprint stories and assess risks
 */
async function generateSprintRecommendations(
  sprint: any,
  capacity: SprintCapacity,
  velocityData: any,
  backlogStories: any[]
): Promise<{
  suggestedStories: Array<{
    storyId: string
    title: string
    estimatedEffort: number
    priority: string
    reasoning: string
  }>
  totalEstimated: number
  utilizationPercentage: number
  spilloverProbability: number
  riskFactors: string[]
  recommendations: string[]
  tokensUsed: number
}> {
  const storiesContext = backlogStories
    .map(
      (story) =>
        `- ID: ${story.id}, Title: "${story.title}", Effort: ${story.estimatedEffort || 'unestimated'}, Priority: ${story.priority}, Description: ${story.description?.substring(0, 100) || 'N/A'}`
    )
    .join('\n')

  const prompt = `You are an Agile planning expert. Help plan the following sprint by recommending which stories to include.

Sprint: ${sprint.name}
Duration: ${capacity.totalDays} days
Team Size: ${capacity.teamSize} members
Available Capacity: ${capacity.availableDays} person-days
Historical Velocity: ${capacity.velocityPoints} story points (confidence: ${capacity.confidenceLevel})
Velocity Trend: ${velocityData.velocityTrend}

Historical Data:
${velocityData.historicalData
  .map(
    (d: VelocityData) =>
      `${d.sprintName}: Planned ${d.planned}, Completed ${d.velocity} (${Math.round(d.completionRate * 100)}%)`
  )
  .join('\n')}

Available Backlog Stories (in priority order):
${storiesContext}

Requirements:
1. Select stories that fit within the velocity capacity (${capacity.velocityPoints} points)
2. Prioritize higher priority stories (critical > high > medium > low)
3. Aim for 80-90% capacity utilization to leave buffer for unknowns
4. Consider the team's historical completion rate
5. Identify risk factors (e.g., unestimated stories, declining velocity, team size changes)
6. Calculate spillover probability based on historical data and capacity utilization
7. Provide actionable recommendations

Respond in JSON format:
{
  "suggestedStories": [
    {
      "storyId": "story-id",
      "title": "Story title",
      "estimatedEffort": 5,
      "priority": "high",
      "reasoning": "Why this story should be included"
    }
  ],
  "spilloverProbability": 0.25,
  "riskFactors": [
    "List of risk factors identified"
  ],
  "recommendations": [
    "Actionable recommendations for the team"
  ]
}

spilloverProbability should be 0-1 (0% to 100% chance of not completing everything).
Consider historical completion rates, capacity utilization, and velocity trends when calculating this.`

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4000,
    temperature: 0.3,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  const textContent = response.content.find((c) => c.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text content in Claude response')
  }

  let parsedData
  try {
    const jsonMatch = textContent.text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/)
    const jsonString = jsonMatch ? jsonMatch[1] : textContent.text
    parsedData = JSON.parse(jsonString.trim())
  } catch (error) {
    console.error('Failed to parse Claude response:', textContent.text)
    throw new Error('Failed to parse AI response. Please try again.')
  }

  const totalEstimated = parsedData.suggestedStories.reduce(
    (sum: number, story: any) => sum + (story.estimatedEffort || 0),
    0
  )

  const utilizationPercentage =
    capacity.velocityPoints > 0 ? (totalEstimated / capacity.velocityPoints) * 100 : 0

  return {
    suggestedStories: parsedData.suggestedStories,
    totalEstimated,
    utilizationPercentage,
    spilloverProbability: parsedData.spilloverProbability || 0,
    riskFactors: parsedData.riskFactors || [],
    recommendations: parsedData.recommendations || [],
    tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
  }
}

/**
 * Get sprint forecast by ID
 */
export async function getSprintForecast(
  forecastId: string,
  organizationId: string
): Promise<SprintForecast | null> {
  try {
    const [forecast] = await db
      .select({
        forecast: sprintForecasts,
        sprint: sprints,
      })
      .from(sprintForecasts)
      .leftJoin(sprints, eq(sprintForecasts.sprintId, sprints.id))
      .where(
        and(
          eq(sprintForecasts.id, forecastId),
          eq(sprintForecasts.organizationId, organizationId)
        )
      )
      .limit(1)

    if (!forecast) {
      return null
    }

    return {
      id: forecast.forecast.id,
      sprintId: forecast.forecast.sprintId,
      sprintName: forecast.sprint?.name || 'Unknown Sprint',
      capacity: forecast.forecast.capacity as any,
      suggestedStories: forecast.forecast.suggestedStories as any,
      totalEstimated: forecast.forecast.totalEstimated || 0,
      utilizationPercentage: forecast.forecast.utilizationPercentage || 0,
      spilloverProbability: forecast.forecast.spilloverProbability || 0,
      riskFactors: forecast.forecast.riskFactors as any,
      recommendations: forecast.forecast.recommendations as any,
      tokensUsed: forecast.forecast.tokensUsed || 0,
      generatedAt: forecast.forecast.createdAt,
    }
  } catch (error) {
    console.error('Error fetching sprint forecast:', error)
    return null
  }
}

/**
 * Generate release forecast
 */
export async function generateReleaseForecast(
  organizationId: string,
  projectId: string,
  releaseId: string
): Promise<ReleaseForecast> {
  try {
    // Get release details
    // Note: In a real implementation, you'd have a releases table
    // For now, we'll work with story data and estimate

    // Get velocity
    const velocityData = await calculateHistoricalVelocity(
      organizationId,
      projectId,
      3
    )

    // Get stories for this release
    // In a real implementation, stories would be tagged with releaseId
    const releaseStories = await db
      .select()
      .from(stories)
      .where(
        and(
          eq(stories.organizationId, organizationId),
          eq(stories.projectId, projectId)
          // Would filter by releaseId if that field existed
        )
      )

    const totalStories = releaseStories.length
    const completedStories = releaseStories.filter(
      (story) => story.status === 'done'
    ).length
    const remainingStories = totalStories - completedStories

    const remainingEffort = releaseStories
      .filter((story) => story.status !== 'done')
      .reduce((sum, story) => sum + (story.estimatedEffort || 0), 0)

    const estimatedSprintsNeeded =
      velocityData.averageVelocity > 0
        ? Math.ceil(remainingEffort / velocityData.averageVelocity)
        : 0

    // Estimate completion date (2 weeks per sprint)
    const predictedCompletionDate = new Date()
    predictedCompletionDate.setDate(
      predictedCompletionDate.getDate() + estimatedSprintsNeeded * 14
    )

    // Mock target date (would come from release data)
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + 60) // 60 days from now

    const onTrack = predictedCompletionDate <= targetDate

    let riskLevel: 'low' | 'medium' | 'high' = 'low'
    if (!onTrack) {
      const daysLate =
        (predictedCompletionDate.getTime() - targetDate.getTime()) /
        (1000 * 60 * 60 * 24)
      if (daysLate > 14) riskLevel = 'high'
      else riskLevel = 'medium'
    }

    const recommendations: string[] = []
    if (!onTrack) {
      recommendations.push(
        'Release is at risk of missing target date. Consider reducing scope or adding capacity.'
      )
    }
    if (velocityData.velocityTrend === 'decreasing') {
      recommendations.push(
        'Team velocity is declining. Investigate blockers and technical debt.'
      )
    }
    if (velocityData.confidenceLevel === 'low') {
      recommendations.push(
        'Low confidence in estimates. Need more historical data or better estimation practices.'
      )
    }

    return {
      releaseId,
      releaseName: 'Release 1.0', // Would come from release data
      targetDate,
      requiredStories: totalStories,
      completedStories,
      remainingStories,
      estimatedSprintsNeeded,
      predictedCompletionDate,
      onTrack,
      riskLevel,
      recommendations,
    }
  } catch (error) {
    console.error('Error generating release forecast:', error)
    throw error
  }
}

/**
 * Get forecast history for a sprint
 */
export async function getSprintForecastHistory(
  sprintId: string,
  organizationId: string
): Promise<SprintForecast[]> {
  try {
    const forecasts = await db
      .select({
        forecast: sprintForecasts,
        sprint: sprints,
      })
      .from(sprintForecasts)
      .leftJoin(sprints, eq(sprintForecasts.sprintId, sprints.id))
      .where(
        and(
          eq(sprintForecasts.sprintId, sprintId),
          eq(sprintForecasts.organizationId, organizationId)
        )
      )
      .orderBy(desc(sprintForecasts.createdAt))

    return forecasts.map((f) => ({
      id: f.forecast.id,
      sprintId: f.forecast.sprintId,
      sprintName: f.sprint?.name || 'Unknown Sprint',
      capacity: f.forecast.capacity as any,
      suggestedStories: f.forecast.suggestedStories as any,
      totalEstimated: f.forecast.totalEstimated || 0,
      utilizationPercentage: f.forecast.utilizationPercentage || 0,
      spilloverProbability: f.forecast.spilloverProbability || 0,
      riskFactors: f.forecast.riskFactors as any,
      recommendations: f.forecast.recommendations as any,
      tokensUsed: f.forecast.tokensUsed || 0,
      generatedAt: f.forecast.createdAt,
    }))
  } catch (error) {
    console.error('Error fetching forecast history:', error)
    return []
  }
}
