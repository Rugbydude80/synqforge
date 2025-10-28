/**
 * Unit Tests for ContextAccessService
 * Tests tier-based access control and usage limits
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ContextAccessService } from '../../lib/services/context-access.service';
import { UserTier, ContextLevel, TIER_MONTHLY_LIMITS } from '../../lib/types/context.types';

describe('ContextAccessService', () => {
  describe('Tier Access Control', () => {
    it('Starter tier can only access MINIMAL', () => {
      assert.strictEqual(
        ContextAccessService.canAccessContextLevel(UserTier.STARTER, ContextLevel.MINIMAL),
        true,
        'Starter should access MINIMAL'
      );
      
      assert.strictEqual(
        ContextAccessService.canAccessContextLevel(UserTier.STARTER, ContextLevel.STANDARD),
        false,
        'Starter should NOT access STANDARD'
      );
      
      assert.strictEqual(
        ContextAccessService.canAccessContextLevel(UserTier.STARTER, ContextLevel.COMPREHENSIVE),
        false,
        'Starter should NOT access COMPREHENSIVE'
      );
      
      assert.strictEqual(
        ContextAccessService.canAccessContextLevel(UserTier.STARTER, ContextLevel.COMPREHENSIVE_THINKING),
        false,
        'Starter should NOT access COMPREHENSIVE_THINKING'
      );
      
      console.log('✅ Starter tier: MINIMAL only');
    });

    it('Core tier can access MINIMAL and STANDARD', () => {
      assert.strictEqual(
        ContextAccessService.canAccessContextLevel(UserTier.CORE, ContextLevel.MINIMAL),
        true,
        'Core should access MINIMAL'
      );
      
      assert.strictEqual(
        ContextAccessService.canAccessContextLevel(UserTier.CORE, ContextLevel.STANDARD),
        true,
        'Core should access STANDARD'
      );
      
      assert.strictEqual(
        ContextAccessService.canAccessContextLevel(UserTier.CORE, ContextLevel.COMPREHENSIVE),
        false,
        'Core should NOT access COMPREHENSIVE'
      );
      
      assert.strictEqual(
        ContextAccessService.canAccessContextLevel(UserTier.CORE, ContextLevel.COMPREHENSIVE_THINKING),
        false,
        'Core should NOT access COMPREHENSIVE_THINKING'
      );
      
      console.log('✅ Core tier: MINIMAL + STANDARD');
    });

    it('Pro tier can access up to COMPREHENSIVE', () => {
      assert.strictEqual(
        ContextAccessService.canAccessContextLevel(UserTier.PRO, ContextLevel.MINIMAL),
        true,
        'Pro should access MINIMAL'
      );
      
      assert.strictEqual(
        ContextAccessService.canAccessContextLevel(UserTier.PRO, ContextLevel.STANDARD),
        true,
        'Pro should access STANDARD'
      );
      
      assert.strictEqual(
        ContextAccessService.canAccessContextLevel(UserTier.PRO, ContextLevel.COMPREHENSIVE),
        true,
        'Pro should access COMPREHENSIVE'
      );
      
      assert.strictEqual(
        ContextAccessService.canAccessContextLevel(UserTier.PRO, ContextLevel.COMPREHENSIVE_THINKING),
        false,
        'Pro should NOT access COMPREHENSIVE_THINKING'
      );
      
      console.log('✅ Pro tier: MINIMAL + STANDARD + COMPREHENSIVE');
    });

    it('Team tier has access to all levels', () => {
      assert.strictEqual(
        ContextAccessService.canAccessContextLevel(UserTier.TEAM, ContextLevel.MINIMAL),
        true,
        'Team should access MINIMAL'
      );
      
      assert.strictEqual(
        ContextAccessService.canAccessContextLevel(UserTier.TEAM, ContextLevel.STANDARD),
        true,
        'Team should access STANDARD'
      );
      
      assert.strictEqual(
        ContextAccessService.canAccessContextLevel(UserTier.TEAM, ContextLevel.COMPREHENSIVE),
        true,
        'Team should access COMPREHENSIVE'
      );
      
      assert.strictEqual(
        ContextAccessService.canAccessContextLevel(UserTier.TEAM, ContextLevel.COMPREHENSIVE_THINKING),
        true,
        'Team should access COMPREHENSIVE_THINKING'
      );
      
      console.log('✅ Team tier: ALL LEVELS');
    });

    it('Enterprise tier has access to all levels', () => {
      const allLevels = [
        ContextLevel.MINIMAL,
        ContextLevel.STANDARD,
        ContextLevel.COMPREHENSIVE,
        ContextLevel.COMPREHENSIVE_THINKING,
      ];
      
      allLevels.forEach(level => {
        assert.strictEqual(
          ContextAccessService.canAccessContextLevel(UserTier.ENTERPRISE, level),
          true,
          `Enterprise should access ${level}`
        );
      });
      
      console.log('✅ Enterprise tier: ALL LEVELS');
    });
  });

  describe('Actions Required', () => {
    it('should return correct action costs', () => {
      const expectations = [
        { level: ContextLevel.MINIMAL, actions: 1 },
        { level: ContextLevel.STANDARD, actions: 2 },
        { level: ContextLevel.COMPREHENSIVE, actions: 2 },
        { level: ContextLevel.COMPREHENSIVE_THINKING, actions: 3 },
      ];
      
      expectations.forEach(({ level, actions }) => {
        const actual = ContextAccessService.getActionsRequired(level);
        assert.strictEqual(
          actual,
          actions,
          `${level} should require ${actions} actions (got ${actual})`
        );
      });
      
      console.log('✅ Action costs:');
      console.log('   MINIMAL: 1 action');
      console.log('   STANDARD: 2 actions');
      console.log('   COMPREHENSIVE: 2 actions');
      console.log('   COMPREHENSIVE_THINKING: 3 actions');
    });
  });

  describe('Usage Limits', () => {
    it('should return correct monthly limits', () => {
      const expectations = [
        { tier: UserTier.STARTER, limit: 25 },
        { tier: UserTier.CORE, limit: 400 },
        { tier: UserTier.PRO, limit: 800 },
        { tier: UserTier.TEAM, limit: 15000 },
        { tier: UserTier.ENTERPRISE, limit: 999999 },
      ];
      
      expectations.forEach(({ tier, limit }) => {
        const actual = ContextAccessService.getMonthlyLimit(tier);
        assert.strictEqual(
          actual,
          limit,
          `${tier} should have ${limit} actions/month (got ${actual})`
        );
      });
      
      console.log('✅ Monthly limits:');
      console.log('   STARTER: 25 actions');
      console.log('   CORE: 400 actions');
      console.log('   PRO: 800 actions');
      console.log('   TEAM: 15,000 actions');
      console.log('   ENTERPRISE: 999,999 actions');
    });

    it('should validate sufficient actions', () => {
      // User with 245 actions used out of 800 (Pro tier)
      const result = ContextAccessService.canAffordGeneration(
        ContextLevel.COMPREHENSIVE,
        UserTier.PRO,
        245
      );
      
      assert.strictEqual(result.allowed, true, 'Should allow generation with sufficient actions');
      console.log('✅ Allows generation with sufficient actions (245/800 used)');
    });

    it('should reject when insufficient actions', () => {
      // User with 799 actions used out of 800 (Pro tier)
      const result = ContextAccessService.canAffordGeneration(
        ContextLevel.COMPREHENSIVE,
        UserTier.PRO,
        799
      );
      
      assert.strictEqual(result.allowed, false, 'Should reject when insufficient actions');
      assert.ok(result.reason, 'Should provide reason for rejection');
      console.log('✅ Rejects generation with insufficient actions (799/800 used)');
      console.log(`   Reason: ${result.reason}`);
    });

    it('should calculate actions remaining correctly', () => {
      const testCases = [
        { tier: UserTier.STARTER, used: 10, expected: 15 },
        { tier: UserTier.CORE, used: 250, expected: 150 },
        { tier: UserTier.PRO, used: 700, expected: 100 },
        { tier: UserTier.TEAM, used: 10000, expected: 5000 },
      ];
      
      testCases.forEach(({ tier, used, expected }) => {
        const remaining = ContextAccessService.getActionsRemaining(tier, used);
        assert.strictEqual(
          remaining,
          expected,
          `${tier} with ${used} used should have ${expected} remaining (got ${remaining})`
        );
      });
      
      console.log('✅ Actions remaining calculated correctly');
    });

    it('should detect when near limit', () => {
      // Pro tier with 750/800 used (93.75% - near limit)
      const nearLimit = ContextAccessService.isNearLimit(UserTier.PRO, 750);
      assert.strictEqual(nearLimit, true, 'Should detect near limit (>90%)');
      
      // Pro tier with 400/800 used (50% - not near limit)
      const notNearLimit = ContextAccessService.isNearLimit(UserTier.PRO, 400);
      assert.strictEqual(notNearLimit, false, 'Should not flag as near limit (<90%)');
      
      console.log('✅ Near-limit detection works (threshold: 90%)');
    });
  });

  describe('Default Context Levels', () => {
    it('should return appropriate defaults for each tier', () => {
      const expectations = [
        { tier: UserTier.STARTER, expected: ContextLevel.MINIMAL },
        { tier: UserTier.CORE, expected: ContextLevel.STANDARD },
        { tier: UserTier.PRO, expected: ContextLevel.STANDARD },
        { tier: UserTier.TEAM, expected: ContextLevel.COMPREHENSIVE },
        { tier: UserTier.ENTERPRISE, expected: ContextLevel.COMPREHENSIVE },
      ];
      
      expectations.forEach(({ tier, expected }) => {
        const actual = ContextAccessService.getDefaultContextLevel(tier);
        assert.strictEqual(
          actual,
          expected,
          `${tier} default should be ${expected} (got ${actual})`
        );
      });
      
      console.log('✅ Default context levels:');
      console.log('   STARTER → MINIMAL');
      console.log('   CORE → STANDARD');
      console.log('   PRO → STANDARD (not comprehensive by default)');
      console.log('   TEAM → COMPREHENSIVE');
      console.log('   ENTERPRISE → COMPREHENSIVE');
    });

    it('should return max available level for each tier', () => {
      const expectations = [
        { tier: UserTier.STARTER, expected: ContextLevel.MINIMAL },
        { tier: UserTier.CORE, expected: ContextLevel.STANDARD },
        { tier: UserTier.PRO, expected: ContextLevel.COMPREHENSIVE },
        { tier: UserTier.TEAM, expected: ContextLevel.COMPREHENSIVE_THINKING },
        { tier: UserTier.ENTERPRISE, expected: ContextLevel.COMPREHENSIVE_THINKING },
      ];
      
      expectations.forEach(({ tier, expected }) => {
        const actual = ContextAccessService.getMaxContextLevel(tier);
        assert.strictEqual(
          actual,
          expected,
          `${tier} max should be ${expected} (got ${actual})`
        );
      });
      
      console.log('✅ Max context levels per tier validated');
    });
  });

  describe('Upgrade Messages', () => {
    it('should provide appropriate upgrade messages', () => {
      const testCases = [
        {
          tier: UserTier.STARTER,
          level: ContextLevel.STANDARD,
          shouldContain: 'Core',
        },
        {
          tier: UserTier.STARTER,
          level: ContextLevel.COMPREHENSIVE,
          shouldContain: 'Pro',
        },
        {
          tier: UserTier.CORE,
          level: ContextLevel.COMPREHENSIVE,
          shouldContain: 'Pro',
        },
        {
          tier: UserTier.PRO,
          level: ContextLevel.COMPREHENSIVE_THINKING,
          shouldContain: 'Team',
        },
      ];
      
      testCases.forEach(({ tier, level, shouldContain }) => {
        const message = ContextAccessService.getUpgradeMessage(tier, level);
        assert.ok(
          message.includes(shouldContain),
          `Upgrade message for ${tier} → ${level} should mention ${shouldContain}`
        );
        console.log(`✅ ${tier} → ${level}: "${message.substring(0, 50)}..."`);
      });
    });

    it('should return empty message for allowed levels', () => {
      // Pro tier accessing comprehensive (allowed)
      const message = ContextAccessService.getUpgradeMessage(
        UserTier.PRO,
        ContextLevel.COMPREHENSIVE
      );
      
      assert.strictEqual(
        message,
        '',
        'Should return empty message for allowed level'
      );
      
      console.log('✅ No upgrade message for allowed levels');
    });
  });

  describe('Cost Per Action Analysis', () => {
    it('should calculate cost per action for each tier', () => {
      const tiers = [
        { name: 'Core', price: 10.99, tier: UserTier.CORE },
        { name: 'Pro', price: 19.99, tier: UserTier.PRO },
        { name: 'Team', price: 16.99, tier: UserTier.TEAM },
      ];
      
      console.log('💰 Cost per action analysis:');
      
      tiers.forEach(({ name, price, tier }) => {
        const limit = ContextAccessService.getMonthlyLimit(tier);
        const costPerAction = price / limit;
        const costMinimal = costPerAction * 1;
        const costStandard = costPerAction * 2;
        const costComprehensive = costPerAction * 2;
        
        console.log(`\n   ${name} Tier (£${price}/mo, ${limit} actions):`);
        console.log(`      Cost per action: £${costPerAction.toFixed(4)}`);
        console.log(`      Minimal story: £${costMinimal.toFixed(4)}`);
        console.log(`      Standard story: £${costStandard.toFixed(4)}`);
        console.log(`      Comprehensive story: £${costComprehensive.toFixed(4)}`);
        
        // Verify calculations
        assert.ok(costPerAction > 0, 'Cost per action should be positive');
        assert.ok(costMinimal < costStandard, 'Minimal should cost less than Standard');
      });
      
      console.log('\n✅ Cost analysis complete');
    });
  });

  describe('Get Allowed Context Levels', () => {
    it('should return all allowed levels for each tier', () => {
      const tiers = [
        UserTier.STARTER,
        UserTier.CORE,
        UserTier.PRO,
        UserTier.TEAM,
        UserTier.ENTERPRISE,
      ];
      
      console.log('📊 Allowed context levels by tier:');
      
      tiers.forEach(tier => {
        const allowed = ContextAccessService.getAllowedContextLevels(tier);
        
        assert.ok(Array.isArray(allowed), 'Should return array');
        assert.ok(allowed.length > 0, 'Should have at least one level');
        assert.ok(
          allowed.includes(ContextLevel.MINIMAL),
          'All tiers should have MINIMAL'
        );
        
        console.log(`   ${tier}: ${allowed.join(', ')}`);
      });
      
      console.log('✅ Allowed levels validated for all tiers');
    });
  });
});

