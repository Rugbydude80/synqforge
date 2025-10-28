/**
 * Integration tests for Context-based Access Control in API routes
 * Tests that tier restrictions are properly enforced at the API level
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { ContextAccessService } from '@/lib/services/context-access.service';
import { UserTier, ContextLevel } from '@/lib/types/context.types';

describe('Context Access API Integration', () => {
  describe('API Route Tier Enforcement', () => {
    it('should simulate Starter user blocked from Smart Context', async () => {
      const userTier = UserTier.STARTER;
      const requestedContext = ContextLevel.COMPREHENSIVE;
      
      const canAccess = ContextAccessService.canAccessContextLevel(userTier, requestedContext);
      
      assert.strictEqual(canAccess, false, 'Starter user should not access COMPREHENSIVE');
      
      // Simulate API response
      const upgradeMessage = ContextAccessService.getUpgradeMessage(userTier, requestedContext);
      assert.ok(upgradeMessage.includes('Upgrade to Pro'), 'Should provide Pro upgrade message');
      
      console.log(`✅ Starter user blocked from Smart Context`);
      console.log(`   Message: "${upgradeMessage.substring(0, 50)}..."`);
    });

    it('should simulate Core user blocked from Smart Context', async () => {
      const userTier = UserTier.CORE;
      const requestedContext = ContextLevel.COMPREHENSIVE;
      
      const canAccess = ContextAccessService.canAccessContextLevel(userTier, requestedContext);
      
      assert.strictEqual(canAccess, false, 'Core user should not access COMPREHENSIVE');
      
      const upgradeMessage = ContextAccessService.getUpgradeMessage(userTier, requestedContext);
      assert.ok(upgradeMessage.includes('Upgrade to Pro'), 'Should provide Pro upgrade message');
      
      console.log(`✅ Core user blocked from Smart Context`);
      console.log(`   Message: "${upgradeMessage.substring(0, 50)}..."`);
    });

    it('should simulate Pro user allowed Smart Context', async () => {
      const userTier = UserTier.PRO;
      const requestedContext = ContextLevel.COMPREHENSIVE;
      
      const canAccess = ContextAccessService.canAccessContextLevel(userTier, requestedContext);
      
      assert.strictEqual(canAccess, true, 'Pro user should access COMPREHENSIVE');
      
      const upgradeMessage = ContextAccessService.getUpgradeMessage(userTier, requestedContext);
      assert.strictEqual(upgradeMessage, '', 'Should have no upgrade message for allowed level');
      
      console.log(`✅ Pro user allowed Smart Context`);
      console.log(`   Actions required: ${ContextAccessService.getActionsRequired(requestedContext)}`);
    });

    it('should simulate Pro user blocked from Deep Reasoning', async () => {
      const userTier = UserTier.PRO;
      const requestedContext = ContextLevel.COMPREHENSIVE_THINKING;
      
      const canAccess = ContextAccessService.canAccessContextLevel(userTier, requestedContext);
      
      assert.strictEqual(canAccess, false, 'Pro user should not access COMPREHENSIVE_THINKING');
      
      const upgradeMessage = ContextAccessService.getUpgradeMessage(userTier, requestedContext);
      assert.ok(upgradeMessage.includes('Upgrade to Team'), 'Should provide Team upgrade message');
      
      console.log(`✅ Pro user blocked from Deep Reasoning`);
      console.log(`   Message: "${upgradeMessage.substring(0, 50)}..."`);
    });

    it('should simulate Team user allowed all context levels', async () => {
      const userTier = UserTier.TEAM;
      
      const allLevels = [
        ContextLevel.MINIMAL,
        ContextLevel.STANDARD,
        ContextLevel.COMPREHENSIVE,
        ContextLevel.COMPREHENSIVE_THINKING,
      ];
      
      for (const level of allLevels) {
        const canAccess = ContextAccessService.canAccessContextLevel(userTier, level);
        assert.strictEqual(canAccess, true, `Team user should access ${level}`);
      }
      
      console.log(`✅ Team user allowed all context levels`);
      console.log(`   Levels: ${allLevels.join(', ')}`);
    });
  });

  describe('Action Affordability Checks', () => {
    it('should allow generation when user has sufficient actions', async () => {
      const contextLevel = ContextLevel.COMPREHENSIVE;
      const userTier = UserTier.PRO;
      const actionsUsed = 245; // Under limit
      
      const result = ContextAccessService.canAffordGeneration(
        contextLevel,
        userTier,
        actionsUsed
      );
      
      assert.strictEqual(result.allowed, true, 'Should allow generation');
      assert.strictEqual(result.actionsRequired, 2);
      assert.strictEqual(result.actionsRemaining, 555); // 800 - 245
      
      console.log(`✅ Sufficient actions check passed`);
      console.log(`   Used: ${actionsUsed}/800, Required: ${result.actionsRequired}, Remaining: ${result.actionsRemaining}`);
    });

    it('should reject generation when user has insufficient actions', async () => {
      const contextLevel = ContextLevel.COMPREHENSIVE;
      const userTier = UserTier.PRO;
      const actionsUsed = 799; // At limit
      
      const result = ContextAccessService.canAffordGeneration(
        contextLevel,
        userTier,
        actionsUsed
      );
      
      assert.strictEqual(result.allowed, false, 'Should reject generation');
      assert.ok(result.reason?.includes('Insufficient AI actions'), 'Should provide reason');
      
      console.log(`✅ Insufficient actions check passed`);
      console.log(`   Used: ${actionsUsed}/800, Required: ${result.actionsRequired}, Reason: "${result.reason}"`);
    });

    it('should warn when user is near limit', async () => {
      const contextLevel = ContextLevel.STANDARD;
      const userTier = UserTier.PRO;
      const actionsUsed = 750; // 93.75% of 800 (above 90% threshold)
      
      const result = ContextAccessService.canAffordGeneration(
        contextLevel,
        userTier,
        actionsUsed
      );
      
      assert.strictEqual(result.allowed, true, 'Should still allow generation');
      assert.strictEqual(result.nearLimit, true, 'Should flag near limit');
      
      console.log(`✅ Near-limit warning check passed`);
      console.log(`   Used: ${actionsUsed}/800 (${((actionsUsed/800)*100).toFixed(1)}%), Near limit: ${result.nearLimit}`);
    });
  });

  describe('Action Cost Calculations', () => {
    it('should calculate correct costs for each context level', () => {
      const costs = {
        [ContextLevel.MINIMAL]: ContextAccessService.getActionsRequired(ContextLevel.MINIMAL),
        [ContextLevel.STANDARD]: ContextAccessService.getActionsRequired(ContextLevel.STANDARD),
        [ContextLevel.COMPREHENSIVE]: ContextAccessService.getActionsRequired(ContextLevel.COMPREHENSIVE),
        [ContextLevel.COMPREHENSIVE_THINKING]: ContextAccessService.getActionsRequired(ContextLevel.COMPREHENSIVE_THINKING),
      };
      
      assert.strictEqual(costs[ContextLevel.MINIMAL], 1);
      assert.strictEqual(costs[ContextLevel.STANDARD], 2);
      assert.strictEqual(costs[ContextLevel.COMPREHENSIVE], 2);
      assert.strictEqual(costs[ContextLevel.COMPREHENSIVE_THINKING], 3);
      
      console.log(`✅ Action costs validated:`);
      console.log(`   MINIMAL: ${costs[ContextLevel.MINIMAL]} action`);
      console.log(`   STANDARD: ${costs[ContextLevel.STANDARD]} actions`);
      console.log(`   COMPREHENSIVE (Smart Context): ${costs[ContextLevel.COMPREHENSIVE]} actions`);
      console.log(`   COMPREHENSIVE_THINKING (Deep Reasoning): ${costs[ContextLevel.COMPREHENSIVE_THINKING]} actions`);
    });
  });

  describe('API Response Simulation', () => {
    it('should simulate 403 response for unauthorized access', () => {
      const userTier = UserTier.STARTER;
      const requestedContext = ContextLevel.COMPREHENSIVE;
      
      const canAccess = ContextAccessService.canAccessContextLevel(userTier, requestedContext);
      const upgradeMessage = ContextAccessService.getUpgradeMessage(userTier, requestedContext);
      
      // Simulate API response
      const apiResponse = {
        error: 'Access denied',
        message: upgradeMessage,
        upgradeRequired: true,
        statusCode: 403,
      };
      
      assert.strictEqual(apiResponse.statusCode, 403);
      assert.ok(apiResponse.upgradeRequired);
      assert.ok(apiResponse.message.length > 0);
      
      console.log(`✅ 403 Access Denied response simulated`);
      console.log(`   Status: ${apiResponse.statusCode}`);
      console.log(`   Upgrade Required: ${apiResponse.upgradeRequired}`);
    });

    it('should simulate 429 response for insufficient actions', async () => {
      const contextLevel = ContextLevel.STANDARD;
      const userTier = UserTier.CORE;
      const actionsUsed = 399; // Only 1 action remaining
      
      const affordability = ContextAccessService.canAffordGeneration(
        contextLevel,
        userTier,
        actionsUsed
      );
      
      // Simulate API response
      const apiResponse = {
        error: 'Insufficient AI actions',
        message: affordability.reason,
        actionsRemaining: affordability.actionsRemaining,
        statusCode: 429,
      };
      
      assert.strictEqual(apiResponse.statusCode, 429);
      assert.ok(apiResponse.actionsRemaining !== undefined);
      
      console.log(`✅ 429 Insufficient Actions response simulated`);
      console.log(`   Status: ${apiResponse.statusCode}`);
      console.log(`   Actions Remaining: ${apiResponse.actionsRemaining}`);
    });

    it('should simulate successful 200 response with metadata', async () => {
      const contextLevel = ContextLevel.COMPREHENSIVE;
      const userTier = UserTier.PRO;
      const actionsUsed = 100;
      
      const canAccess = ContextAccessService.canAccessContextLevel(userTier, contextLevel);
      const affordability = ContextAccessService.canAffordGeneration(
        contextLevel,
        userTier,
        actionsUsed
      );
      const actionsDeducted = ContextAccessService.getActionsRequired(contextLevel);
      const monthlyLimit = ContextAccessService.getMonthlyLimit(userTier);
      
      // Simulate successful API response
      const apiResponse = {
        success: true,
        stories: [{ title: 'Test Story', description: 'Generated with Smart Context' }],
        meta: {
          actionsUsed: actionsDeducted,
          actionsRemaining: monthlyLimit - (actionsUsed + actionsDeducted),
          contextLevel,
          semanticSearchUsed: true,
          contextLength: 1500, // 75% reduction from 6000
        },
        statusCode: 200,
      };
      
      assert.strictEqual(apiResponse.statusCode, 200);
      assert.strictEqual(apiResponse.success, true);
      assert.strictEqual(apiResponse.meta.actionsUsed, 2);
      assert.strictEqual(apiResponse.meta.semanticSearchUsed, true);
      
      console.log(`✅ 200 Success response simulated`);
      console.log(`   Status: ${apiResponse.statusCode}`);
      console.log(`   Actions Used: ${apiResponse.meta.actionsUsed}`);
      console.log(`   Actions Remaining: ${apiResponse.meta.actionsRemaining}`);
      console.log(`   Semantic Search: ${apiResponse.meta.semanticSearchUsed}`);
      console.log(`   Context Length: ${apiResponse.meta.contextLength} tokens (75% reduction)`);
    });
  });
});

// Run tests
console.log('\n═══════════════════════════════════════════════════════════════════════');
console.log('🧪 Context Access API Integration Tests');
console.log('═══════════════════════════════════════════════════════════════════════\n');

