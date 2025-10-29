/**
 * Subscription Tier Validation - SynqForge Pricing Plans
 * 
 * Comprehensive TDD test suite for subscription tiers:
 * - Starter (£0/month - 25 AI actions)
 * - Core (£10.99/month - 400 actions + 20% rollover)
 * - Pro (£19.99/month - 800 actions + Smart Context)
 * - Team (£16.99/seat - pooled actions)
 * - Enterprise (Custom - department budgets)
 */

import { describe, test, before, after, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert'
import { db, generateId } from '@/lib/db'
import { organizations, users, workspaceUsage, aiGenerations } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import {
  checkActionLimit,
  incrementActionUsage,
  calculateRollover,
  handleBillingPeriodReset,
  checkFeatureAccess,
  getUserBreakdown,
  reallocateBudget,
  getDepartmentAllocations,
} from '@/lib/services/subscription-tier.service'
import {
  createTestSubscription,
  useAIActions,
  attemptAIGeneration,
  getUsage,
  advanceBillingPeriod,
  resetBillingPeriod,
  downgradePlan,
  upgradePlan,
  updateSeatCount,
  checkTrialStatus,
  processTrialExpirations,
  mockTimeTravel,
  mockDate,
  createChildStory,
  generateStoryWithContext,
  semanticSearch,
  createTestStories,
  enableDeepReasoning,
  generateStoryWithDeepReasoning,
  setCustomSimilarityThreshold,
  getSemanticSearchConfig,
  configureCustomModel,
  generateStory,
  reserveTokens,
  completeGeneration,
  getHistoricalUsage,
  calculateNextRenewal,
  getSubscription,
  getAuditLog,
} from '@/tests/helpers/subscription-test-helpers'

describe('Subscription Tier Validation - SynqForge Pricing Plans', () => {
  
  let testOrgId: string
  let testUserId: string

  beforeEach(async () => {
    // Setup test organization and user
    testOrgId = generateId()
    testUserId = generateId()
    
    await db.insert(organizations).values({
      id: testOrgId,
      name: 'Test Organization',
      slug: `test-org-${Date.now()}`,
      subscriptionTier: 'starter',
      plan: 'starter',
      subscriptionStatus: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    await db.insert(users).values({
      id: testUserId,
      email: `test-${Date.now()}@example.com`,
      name: 'Test User',
      organizationId: testOrgId,
      role: 'owner',
      createdAt: new Date(),
    })

    await db.insert(workspaceUsage).values({
      id: generateId(),
      organizationId: testOrgId,
      tokensUsed: 0,
      tokensLimit: 25,
      billingPeriodStart: new Date(),
      billingPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })
  })

  afterEach(async () => {
    // Cleanup test data
    await db.delete(aiGenerations).where(eq(aiGenerations.organizationId, testOrgId))
    await db.delete(workspaceUsage).where(eq(workspaceUsage.organizationId, testOrgId))
    await db.delete(users).where(eq(users.organizationId, testOrgId))
    await db.delete(organizations).where(eq(organizations.id, testOrgId))
  })

  // ============================================================================
  // STARTER PLAN TESTS (£0/month - 25 AI actions)
  // ============================================================================
  
  describe('Starter Plan (Free Tier)', () => {
    
    beforeEach(async () => {
      await createTestSubscription(testOrgId, {
        plan: 'starter',
        actionsLimit: 25,
        rolloverEnabled: false,
        trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      })
    })

    test('should enforce 25 AI action limit', async () => {
      // Use 25 actions
      await useAIActions(testOrgId, testUserId, 25)
      
      const usage = await getUsage(testOrgId)
      assert.strictEqual(usage.tokensUsed, 25)
      
      // Try to use 26th action
      const result = await attemptAIGeneration(testOrgId, testUserId)
      assert.strictEqual(result.allowed, false)
      assert.ok(result.reason?.includes('Upgrade to Core'))
    })

    test('should block premium features during trial', async () => {
      const features = await checkFeatureAccess(testOrgId)
      
      assert.strictEqual(features.hasSmartContext, false)
      assert.strictEqual(features.hasDeepReasoning, false)
      assert.strictEqual(features.hasSemanticSearch, false)
      assert.strictEqual(features.canSplitToChildren, false)
    })

    test('should allow trial features for 7 days then downgrade', async () => {
      // Day 1-7: Trial active
      let trialStatus = await checkTrialStatus(testOrgId)
      assert.strictEqual(trialStatus.isActive, true)
      assert.strictEqual(trialStatus.daysRemaining, 7)
      
      // Mock time travel to Day 8
      await mockTimeTravel(8)
      
      // Day 8: Trial expired
      await processTrialExpirations()
      
      trialStatus = await checkTrialStatus(testOrgId)
      assert.strictEqual(trialStatus.isActive, false)
      assert.strictEqual(trialStatus.expired, true)
      
      // Verify premium features disabled
      const features = await checkFeatureAccess(testOrgId)
      assert.strictEqual(features.canAccessPremium, false)
    })

    test('should NOT rollover unused actions (Starter plan)', async () => {
      // Use only 10 of 25 actions
      await useAIActions(testOrgId, testUserId, 10)
      
      // Advance to next billing period
      await advanceBillingPeriod(testOrgId)
      
      const usage = await getUsage(testOrgId)
      assert.strictEqual(usage.tokensLimit, 25) // No rollover
      assert.strictEqual(usage.rolloverBalance || 0, 0)
    })
  })

  // ============================================================================
  // CORE PLAN TESTS (£10.99/month - 400 actions + 20% rollover)
  // ============================================================================
  
  describe('Core Plan (Solo Freelancers)', () => {
    
    beforeEach(async () => {
      await createTestSubscription(testOrgId, {
        plan: 'core',
        actionsLimit: 400,
        rolloverEnabled: true,
        rolloverPercentage: 0.20,
      })
    })

    test('should enforce 400 AI action limit', async () => {
      await useAIActions(testOrgId, testUserId, 400)
      
      const result = await attemptAIGeneration(testOrgId, testUserId)
      assert.strictEqual(result.allowed, false)
      assert.strictEqual(result.actionsRemaining, 0)
    })

    test('should calculate 20% rollover correctly', async () => {
      // Scenario 1: Use 300, expect 20 rollover (20% of 100 unused)
      await useAIActions(testOrgId, testUserId, 300)
      await advanceBillingPeriod(testOrgId)
      
      let usage = await getUsage(testOrgId)
      assert.strictEqual(usage.rolloverBalance, 20)
      assert.strictEqual(usage.tokensLimit, 420) // 400 + 20
      
      // Scenario 2: Use 0, expect 80 rollover (20% of 400 unused)
      await resetBillingPeriod(testOrgId)
      await advanceBillingPeriod(testOrgId)
      
      usage = await getUsage(testOrgId)
      assert.strictEqual(usage.rolloverBalance, 80)
      assert.strictEqual(usage.tokensLimit, 480) // 400 + 80 (max cap)
      
      // Scenario 3: Use 400, expect 0 rollover (20% of 0 unused)
      await resetBillingPeriod(testOrgId)
      await useAIActions(testOrgId, testUserId, 400)
      await advanceBillingPeriod(testOrgId)
      
      usage = await getUsage(testOrgId)
      assert.strictEqual(usage.rolloverBalance, 0)
      assert.strictEqual(usage.tokensLimit, 400)
    })

    test('should enforce rollover cap at 480 actions (400 + 80 max)', async () => {
      // Use 0 actions for 5 months (try to accumulate massive rollover)
      for (let i = 0; i < 5; i++) {
        await advanceBillingPeriod(testOrgId)
      }
      
      const usage = await getUsage(testOrgId)
      assert.ok(usage.tokensLimit <= 480)
    })

    test('should enable Advanced Gherkin feature', async () => {
      const features = await checkFeatureAccess(testOrgId)
      assert.strictEqual(features.hasAdvancedGherkin, true)
    })

    test('should limit story splitting to 3 children', async () => {
      const storyId = 'test-story-123'
      
      // Create 3 child stories (should succeed)
      for (let i = 0; i < 3; i++) {
        const result = await createChildStory(testOrgId, storyId)
        assert.strictEqual(result.success, true)
      }
      
      // Try to create 4th child (should fail)
      const result = await createChildStory(testOrgId, storyId)
      assert.strictEqual(result.success, false)
      assert.ok(result.error?.includes('Upgrade to Pro for unlimited children'))
    })

    test('should lose rollover benefit when downgrading to Starter', async () => {
      // Use 200 actions, expect 40 rollover
      await useAIActions(testOrgId, testUserId, 200)
      await advanceBillingPeriod(testOrgId)
      
      let usage = await getUsage(testOrgId)
      assert.strictEqual(usage.rolloverBalance, 40)
      
      // Downgrade to Starter mid-month
      await downgradePlan(testOrgId, 'starter')
      await advanceBillingPeriod(testOrgId)
      
      // Next month: Reset to 25 Starter actions (no rollover)
      usage = await getUsage(testOrgId)
      assert.strictEqual(usage.tokensLimit, 25)
      assert.strictEqual(usage.rolloverBalance || 0, 0)
    })
  })

  // ============================================================================
  // PRO PLAN TESTS (£19.99/month - 800 actions + Smart Context)
  // ============================================================================
  
  describe('Pro Plan (Small Delivery Teams)', () => {
    
    beforeEach(async () => {
      await createTestSubscription(testOrgId, {
        plan: 'pro',
        actionsLimit: 800,
        rolloverEnabled: true,
        rolloverPercentage: 0.20,
        hasSmartContext: true,
        hasSemanticSearch: true,
      })
    })

    test('should enforce 800 AI action limit with rollover', async () => {
      // Use 600 actions
      await useAIActions(testOrgId, testUserId, 600)
      await advanceBillingPeriod(testOrgId)
      
      // Expect 40 rollover (20% of 200 unused)
      const usage = await getUsage(testOrgId)
      assert.strictEqual(usage.rolloverBalance, 40)
      assert.strictEqual(usage.tokensLimit, 840) // 800 + 40
    })

    test('should enable Smart Context feature', async () => {
      const features = await checkFeatureAccess(testOrgId)
      assert.strictEqual(features.hasSmartContext, true)
      
      // Verify Smart Context learns from similar stories
      const storyContext = await generateStoryWithContext(testOrgId, {
        title: 'User login authentication',
      })
      
      assert.ok(storyContext.similarStoriesFound > 0)
      assert.strictEqual(storyContext.contextApplied, true)
    })

    test('should enable Semantic Search feature', async () => {
      // Create test stories
      await createTestStories(testOrgId, [
        { title: 'User authentication with OAuth', tags: ['security', 'login'] },
        { title: 'Password reset flow', tags: ['security', 'account'] },
        { title: 'Shopping cart checkout', tags: ['payment', 'ecommerce'] },
      ])
      
      // Search for "authentication"
      const results = await semanticSearch(testOrgId, 'authentication')
      
      assert.ok(results.length > 0)
      assert.ok(results[0].title.includes('authentication'))
      assert.ok(results[0].relevanceScore > 0.75)
    })

    test('should NOT have Deep Reasoning mode (Team+ only)', async () => {
      const features = await checkFeatureAccess(testOrgId)
      assert.strictEqual(features.hasDeepReasoning, false)
      
      // Try to enable Deep Reasoning
      const result = await enableDeepReasoning(testOrgId)
      assert.strictEqual(result.success, false)
      assert.ok(result.error?.includes('Available in Team plan'))
    })

    test('should handle rollover cap at 960 actions (800 + 160 max)', async () => {
      // Use 0 actions, advance billing period
      await advanceBillingPeriod(testOrgId)
      
      const usage = await getUsage(testOrgId)
      assert.strictEqual(usage.rolloverBalance, 160) // 20% of 800
      assert.strictEqual(usage.tokensLimit, 960) // 800 + 160 (cap reached)
    })
  })

  // ============================================================================
  // TEAM PLAN TESTS (£16.99/seat - 10k base + 1k per seat, pooled)
  // ============================================================================
  
  describe('Team Plan (Larger Agile Teams)', () => {
    
    test('should calculate pooled actions for 5-seat team', async () => {
      await createTestSubscription(testOrgId, {
        plan: 'team',
        baseActions: 10000,
        actionsPerSeat: 1000,
        seatCount: 5,
        rolloverEnabled: false, // Team has no rollover
        hasSmartContext: true,
        hasDeepReasoning: true,
      })
      
      const usage = await getUsage(testOrgId)
      assert.strictEqual(usage.tokensLimit, 15000) // 10,000 + (5 × 1,000)
    })

    test('should share token pool across all team members', async () => {
      await createTestSubscription(testOrgId, {
        plan: 'team',
        baseActions: 10000,
        actionsPerSeat: 1000,
        seatCount: 5,
      })
      
      const user1 = generateId()
      const user2 = generateId()
      const user3 = generateId()
      
      // User 1 uses 10k actions
      await useAIActions(testOrgId, user1, 10000)
      
      // Remaining 5k should be available for other users
      let usage = await getUsage(testOrgId)
      assert.strictEqual(usage.tokensLimit - usage.tokensUsed, 5000)
      
      // User 2 uses 3k actions
      await useAIActions(testOrgId, user2, 3000)
      usage = await getUsage(testOrgId)
      assert.strictEqual(usage.tokensLimit - usage.tokensUsed, 2000)
      
      // User 3 tries to use 3k actions (only 2k available)
      const result = await attemptAIGeneration(testOrgId, user3, 3000)
      assert.strictEqual(result.allowed, false)
      assert.strictEqual(result.actionsRemaining, 2000)
    })

    test('should display per-user breakdown for admins', async () => {
      await createTestSubscription(testOrgId, {
        plan: 'team',
        baseActions: 10000,
        actionsPerSeat: 1000,
        seatCount: 5,
      })
      
      const userA = generateId()
      const userB = generateId()
      const userC = generateId()
      
      await useAIActions(testOrgId, userA, 4200)
      await useAIActions(testOrgId, userB, 3100)
      await useAIActions(testOrgId, userC, 1500)
      
      const breakdown = await getUserBreakdown(testOrgId)
      
      const userABreakdown = breakdown.find(b => b.userId === userA)
      const userBBreakdown = breakdown.find(b => b.userId === userB)
      const userCBreakdown = breakdown.find(b => b.userId === userC)
      
      assert.strictEqual(userABreakdown?.actionsUsed, 4200)
      assert.strictEqual(userBBreakdown?.actionsUsed, 3100)
      assert.strictEqual(userCBreakdown?.actionsUsed, 1500)
    })

    test('should adjust limit when team member removed', async () => {
      await createTestSubscription(testOrgId, {
        plan: 'team',
        baseActions: 10000,
        actionsPerSeat: 1000,
        seatCount: 10,
      })
      
      // Initial: 10k + (10 × 1k) = 20k actions
      let usage = await getUsage(testOrgId)
      assert.strictEqual(usage.tokensLimit, 20000)
      
      // Team uses 18,500 actions
      await useAIActions(testOrgId, testUserId, 18500)
      
      // Remove 3 team members
      await updateSeatCount(testOrgId, 7)
      
      // New limit: 10k + (7 × 1k) = 17k actions
      // Used: 18,500 → Over-limit by 1,500
      usage = await getUsage(testOrgId)
      assert.strictEqual(usage.tokensLimit, 17000)
      assert.strictEqual(usage.tokensUsed, 18500)
      assert.strictEqual(usage.isOverLimit, true)
      
      // Try to generate (should be blocked)
      const result = await attemptAIGeneration(testOrgId, testUserId)
      assert.strictEqual(result.allowed, false)
      assert.ok(result.reason?.includes('Add 2 seats or wait'))
    })

    test('should enable Smart Context + Deep Reasoning', async () => {
      await createTestSubscription(testOrgId, {
        plan: 'team',
        baseActions: 10000,
        actionsPerSeat: 1000,
        seatCount: 5,
        hasSmartContext: true,
        hasDeepReasoning: true,
      })
      
      const features = await checkFeatureAccess(testOrgId)
      assert.strictEqual(features.hasSmartContext, true)
      assert.strictEqual(features.hasDeepReasoning, true)
      
      // Test Deep Reasoning on compliance story
      const story = await generateStoryWithDeepReasoning(testOrgId, {
        title: 'GDPR-compliant data deletion flow',
        type: 'compliance',
      })
      
      assert.strictEqual(story.deepReasoningApplied, true)
      assert.ok(story.acceptanceCriteria.includes('GDPR Article 17'))
    })

    test('should NOT have rollover (Team plan restriction)', async () => {
      await createTestSubscription(testOrgId, {
        plan: 'team',
        baseActions: 10000,
        actionsPerSeat: 1000,
        seatCount: 5,
        rolloverEnabled: false,
      })
      
      // Use 10k of 15k actions
      await useAIActions(testOrgId, testUserId, 10000)
      
      // Advance billing period
      await advanceBillingPeriod(testOrgId)
      
      // Verify no rollover (reset to 15k)
      const usage = await getUsage(testOrgId)
      assert.strictEqual(usage.tokensLimit, 15000)
      assert.strictEqual(usage.rolloverBalance || 0, 0)
    })

    test('should prevent 1-seat Team plan (minimum 5 seats)', async () => {
      try {
        await createTestSubscription(testOrgId, {
          plan: 'team',
          baseActions: 10000,
          actionsPerSeat: 1000,
          seatCount: 1, // Invalid
        })
        assert.fail('Should have thrown error for invalid seat count')
      } catch (error: any) {
        assert.ok(error.message.includes('Team plan requires minimum 5 seats'))
      }
    })
  })

  // ============================================================================
  // ENTERPRISE PLAN TESTS (Custom pricing - Department budgets)
  // ============================================================================
  
  describe('Enterprise Plan (Scaled Organizations)', () => {
    
    test('should support custom AI action pools per department', async () => {
      await createTestSubscription(testOrgId, {
        plan: 'enterprise',
        departmentAllocations: {
          engineering: 50000,
          sales: 10000,
          marketing: 5000,
        },
        hasCustomModels: true,
        hasCustomSimilarityThreshold: true,
      })
      
      const allocations = await getDepartmentAllocations(testOrgId)
      assert.strictEqual(allocations.engineering.limit, 50000)
      assert.strictEqual(allocations.sales.limit, 10000)
      assert.strictEqual(allocations.marketing.limit, 5000)
    })

    test('should allow mid-month budget reallocation', async () => {
      await createTestSubscription(testOrgId, {
        plan: 'enterprise',
        departmentAllocations: {
          engineering: 50000,
          sales: 10000,
        },
      })
      
      // Engineering uses 45k, Sales uses 2k
      await useAIActions(testOrgId, 'eng-user', 45000, 'engineering')
      await useAIActions(testOrgId, 'sales-user', 2000, 'sales')
      
      // Reallocate 5k from Sales to Engineering
      const result = await reallocateBudget(testOrgId, {
        from: 'sales',
        to: 'engineering',
        amount: 5000,
        reason: 'Peak sprint workload',
        approvedBy: 'admin-user',
      })
      
      assert.strictEqual(result.success, true)
      
      const allocations = await getDepartmentAllocations(testOrgId)
      assert.strictEqual(allocations.engineering.limit, 55000)
      assert.strictEqual(allocations.sales.limit, 5000)
      
      // Verify audit trail
      const auditLog = await getAuditLog(testOrgId)
      const reallocationEntry = auditLog.find(entry => 
        entry.action === 'BUDGET_REALLOCATION' &&
        entry.metadata?.from === 'sales' &&
        entry.metadata?.to === 'engineering'
      )
      assert.ok(reallocationEntry)
      assert.strictEqual(reallocationEntry.metadata.amount, 5000)
    })

    test('should support custom similarity threshold configuration', async () => {
      await createTestSubscription(testOrgId, {
        plan: 'enterprise',
        hasCustomSimilarityThreshold: true,
      })
      
      // Set strict threshold (0.90)
      await setCustomSimilarityThreshold(testOrgId, 0.90)
      
      const config = await getSemanticSearchConfig(testOrgId)
      assert.strictEqual(config.similarityThreshold, 0.90)
      
      // Search should return fewer, higher-quality results
      await createTestStories(testOrgId, [
        { title: 'User authentication' },
        { title: 'User authorization' }, // Very similar
        { title: 'Shopping cart' }, // Not similar
      ])
      
      const results = await semanticSearch(testOrgId, 'authentication')
      assert.ok(results.length < 3) // Only exact matches
      assert.ok(results.every(r => r.relevanceScore >= 0.90))
    })

    test('should enable custom model integration (BYOM)', async () => {
      await createTestSubscription(testOrgId, {
        plan: 'enterprise',
        hasCustomModels: true,
      })
      
      // Configure Azure OpenAI endpoint
      const result = await configureCustomModel(testOrgId, {
        provider: 'azure-openai',
        endpoint: 'https://company.openai.azure.com',
        apiKey: 'test-key',
        model: 'gpt-4-turbo',
      })
      
      assert.strictEqual(result.success, true)
      
      // Verify AI generation uses custom model
      const generation = await generateStory(testOrgId, {
        title: 'Test story',
        useCustomModel: true,
      })
      
      assert.strictEqual(generation.modelUsed, 'azure-openai/gpt-4-turbo')
    })
  })

  // ============================================================================
  // CROSS-PLAN EDGE CASE TESTS
  // ============================================================================
  
  describe('Plan Upgrade/Downgrade Edge Cases', () => {
    
    test('should handle Pro → Core downgrade mid-month after heavy usage', async () => {
      // Start with Pro plan (800 actions)
      await createTestSubscription(testOrgId, {
        plan: 'pro',
        actionsLimit: 800,
      })
      
      // Day 15: Use 600 actions
      await useAIActions(testOrgId, testUserId, 600)
      
      // Day 15: Downgrade to Core (400 actions)
      await downgradePlan(testOrgId, 'core')
      
      // User is now over-limit (600 used, 400 limit)
      let usage = await getUsage(testOrgId)
      assert.strictEqual(usage.tokensUsed, 600)
      assert.strictEqual(usage.tokensLimit, 400)
      assert.strictEqual(usage.isOverLimit, true)
      
      // Try to generate (should be blocked)
      const result = await attemptAIGeneration(testOrgId, testUserId)
      assert.strictEqual(result.allowed, false)
      assert.ok(result.reason?.includes('Upgrade or wait'))
      
      // Advance to next month
      await advanceBillingPeriod(testOrgId)
      
      // New month: Reset to 400 Core actions
      usage = await getUsage(testOrgId)
      assert.strictEqual(usage.tokensLimit, 400)
      assert.strictEqual(usage.tokensUsed, 0)
    })

    test('should handle Starter upgrade during trial', async () => {
      // Create Starter with active trial
      await createTestSubscription(testOrgId, {
        plan: 'starter',
        actionsLimit: 25,
        trialEndsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days
      })
      
      // Day 3 of trial: Upgrade to Pro
      await upgradePlan(testOrgId, 'pro')
      
      // Verify trial canceled and Pro benefits start immediately
      const subscription = await getSubscription(testOrgId)
      assert.strictEqual(subscription.plan, 'pro')
      assert.strictEqual(subscription.trialEndsAt, null)
      assert.strictEqual(subscription.actionsLimit, 800)
    })

    test('should prorate token limits for mid-month Team seat addition', async () => {
      // Start of month: 5 seats (15k actions)
      await createTestSubscription(testOrgId, {
        plan: 'team',
        baseActions: 10000,
        actionsPerSeat: 1000,
        seatCount: 5,
      })
      
      // Day 15 (halfway through month): Add 2 seats
      await mockDate(15)
      await updateSeatCount(testOrgId, 7)
      
      // Prorate: (2 seats × 1k) × (15/30 days) = 1,000 additional
      const usage = await getUsage(testOrgId)
      assert.strictEqual(usage.tokensLimit, 16000) // 15k + 1k prorated
      
      // Next full month: Full 17k
      await advanceBillingPeriod(testOrgId)
      const newUsage = await getUsage(testOrgId)
      assert.strictEqual(newUsage.tokensLimit, 17000)
    })
  })

  // ============================================================================
  // BILLING PERIOD BOUNDARY TESTS
  // ============================================================================
  
  describe('Billing Period Edge Cases', () => {
    
    test('should handle generation spanning month boundary', async () => {
      await createTestSubscription(testOrgId, {
        plan: 'core',
        actionsLimit: 400,
        billingPeriodStart: new Date('2025-10-01'),
        billingPeriodEnd: new Date('2025-10-31T23:59:59Z'),
      })
      
      // Use 395 actions in October
      await useAIActions(testOrgId, testUserId, 395)
      
      // Start generation Oct 31, 11:59 PM (5 actions remaining)
      const generationStart = new Date('2025-10-31T23:59:00Z')
      const reservationId = await reserveTokens(testOrgId, 8, generationStart)
      
      // Generation completes Nov 1, 12:01 AM (uses 8 actions total)
      await mockDate(new Date('2025-11-01T00:01:00Z'))
      await completeGeneration(reservationId, 8)
      
      // Verify: 5 charged to October, 3 to November
      const octUsage = await getHistoricalUsage(testOrgId, '2025-10')
      const novUsage = await getUsage(testOrgId)
      
      assert.strictEqual(octUsage.tokensUsed, 400) // 395 + 5
      assert.strictEqual(novUsage.tokensUsed, 3)
    })

    test('should handle leap year billing correctly', async () => {
      // User signs up Feb 29, 2024 (leap year)
      await createTestSubscription(testOrgId, {
        plan: 'pro',
        actionsLimit: 800,
        billingAnniversary: new Date('2024-02-29'),
      })
      
      // Calculate next renewal: Feb 28, 2025 (no Feb 29)
      const nextRenewal = await calculateNextRenewal(testOrgId)
      assert.ok(nextRenewal.toISOString().includes('2025-02-28'))
      
      // Advance to 2028 (next leap year)
      await mockDate(new Date('2028-02-29'))
      const renewal2028 = await calculateNextRenewal(testOrgId)
      assert.ok(renewal2028.toISOString().includes('2028-02-29'))
    })
  })
})

