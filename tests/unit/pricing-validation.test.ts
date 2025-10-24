import { describe, it } from 'node:test'
import assert from 'node:assert'
import plansData from '../../config/plans.json'
import { SUBSCRIPTION_LIMITS, AI_ACTION_OVERAGE, AI_BOOSTER_ADDON, PRIORITY_SUPPORT_ADDON, SEAT_PRICING } from '../../lib/constants'

describe('Pricing Validation Tests', () => {
  describe('plans.json structure', () => {
    it('should have correct version and currency', () => {
      assert.strictEqual(plansData.version, '3.0', 'Version should be 3.0')
      assert.strictEqual(plansData.currency, 'GBP', 'Currency should be GBP')
    })

    it('should have all 5 tiers defined', () => {
      const tiers = Object.keys(plansData.tiers)
      assert.strictEqual(tiers.length, 5, 'Should have exactly 5 tiers')
      assert.ok(plansData.tiers.starter, 'Starter tier should exist')
      assert.ok(plansData.tiers.core, 'Core tier should exist')
      assert.ok(plansData.tiers.pro, 'Pro tier should exist')
      assert.ok(plansData.tiers.team, 'Team tier should exist')
      assert.ok(plansData.tiers.enterprise, 'Enterprise tier should exist')
    })

    it('should have correct pricing for each tier', () => {
      assert.strictEqual(plansData.tiers.starter.price, 0, 'Starter should be £0')
      assert.strictEqual(plansData.tiers.core.price, 10.99, 'Core should be £10.99')
      assert.strictEqual(plansData.tiers.pro.price, 19.99, 'Pro should be £19.99')
      assert.strictEqual(plansData.tiers.team.price, 16.99, 'Team should be £16.99')
      assert.strictEqual(plansData.tiers.enterprise.price, null, 'Enterprise should be custom (null)')
    })

    it('should have correct AI actions for each tier', () => {
      assert.strictEqual(plansData.tiers.starter.actions, 25, 'Starter should have 25 actions')
      assert.strictEqual(plansData.tiers.core.actions, 400, 'Core should have 400 actions')
      assert.strictEqual(plansData.tiers.pro.actions, 800, 'Pro should have 800 actions')
      assert.strictEqual(plansData.tiers.team.actionsBase, 10000, 'Team should have 10k base actions')
      assert.strictEqual(plansData.tiers.team.actionsPerSeat, 1000, 'Team should have 1k per seat')
    })

    it('should have correct seat limits', () => {
      assert.strictEqual(plansData.tiers.starter.minSeats, 1, 'Starter min seats should be 1')
      assert.strictEqual(plansData.tiers.starter.maxSeats, 1, 'Starter max seats should be 1')
      
      assert.strictEqual(plansData.tiers.core.minSeats, 1, 'Core min seats should be 1')
      assert.strictEqual(plansData.tiers.core.maxSeats, 2, 'Core max seats should be 2')
      
      assert.strictEqual(plansData.tiers.pro.minSeats, 3, 'Pro min seats should be 3')
      assert.strictEqual(plansData.tiers.pro.maxSeats, 4, 'Pro max seats should be 4')
      
      assert.strictEqual(plansData.tiers.team.minSeats, 5, 'Team min seats should be 5')
      assert.strictEqual(plansData.tiers.team.maxSeats, null, 'Team max seats should be unlimited')
      
      assert.strictEqual(plansData.tiers.enterprise.minSeats, 10, 'Enterprise min seats should be 10')
    })

    it('should mark Pro as popular', () => {
      assert.strictEqual(plansData.tiers.pro.popular, true, 'Pro should be marked as popular')
    })

    it('should have correct rollover percentages', () => {
      assert.strictEqual(plansData.tiers.starter.rollover, 0, 'Starter should have 0% rollover')
      assert.strictEqual(plansData.tiers.core.rollover, 20, 'Core should have 20% rollover')
      assert.strictEqual(plansData.tiers.pro.rollover, 20, 'Pro should have 20% rollover')
      assert.strictEqual(plansData.tiers.team.rollover, 20, 'Team should have 20% rollover')
    })
  })

  describe('Add-ons validation', () => {
    it('should have all 3 add-ons defined', () => {
      assert.strictEqual(plansData.addons.length, 3, 'Should have exactly 3 add-ons')
      
      const addonIds = plansData.addons.map(a => a.id)
      assert.ok(addonIds.includes('ai_actions_pack'), 'AI Actions Pack should exist')
      assert.ok(addonIds.includes('ai_booster_starter'), 'AI Booster should exist')
      assert.ok(addonIds.includes('priority_support'), 'Priority Support should exist')
    })

    it('should have correct pricing for add-ons', () => {
      const aiPack = plansData.addons.find(a => a.id === 'ai_actions_pack')
      const booster = plansData.addons.find(a => a.id === 'ai_booster_starter')
      const support = plansData.addons.find(a => a.id === 'priority_support')

      assert.strictEqual(aiPack?.price, 20, 'AI Actions Pack should be £20')
      assert.strictEqual(booster?.price, 5, 'AI Booster should be £5')
      assert.strictEqual(support?.price, 15, 'Priority Support should be £15')
    })

    it('should have correct eligibility for add-ons', () => {
      const aiPack = plansData.addons.find(a => a.id === 'ai_actions_pack')
      const booster = plansData.addons.find(a => a.id === 'ai_booster_starter')
      const support = plansData.addons.find(a => a.id === 'priority_support')

      assert.deepStrictEqual(
        aiPack?.eligiblePlans,
        ['core', 'pro', 'team', 'enterprise'],
        'AI Pack should be for Pro, Team, Enterprise'
      )
      assert.deepStrictEqual(
        booster?.eligiblePlans,
        ['starter'],
        'Booster should be for Starter only'
      )
      assert.deepStrictEqual(
        support?.eligiblePlans,
        ['core', 'pro'],
        'Support should be for Pro tiers only'
      )
    })

    it('should have correct expiry for AI Actions Pack', () => {
      const aiPack = plansData.addons.find(a => a.id === 'ai_actions_pack')
      assert.strictEqual(aiPack?.expiry, 90, 'AI Actions Pack should have 90-day expiry')
    })
  })

  describe('FAQ validation', () => {
    it('should have exactly 5 FAQ items', () => {
      assert.strictEqual(plansData.faq.length, 5, 'Should have exactly 5 FAQ items')
    })

    it('should have required FAQ topics', () => {
      const questions = plansData.faq.map(f => f.question.toLowerCase())
      
      assert.ok(
        questions.some(q => q.includes('pooled')),
        'Should have FAQ about pooled actions'
      )
      assert.ok(
        questions.some(q => q.includes('buy more')),
        'Should have FAQ about buying more actions'
      )
      assert.ok(
        questions.some(q => q.includes('limit')),
        'Should have FAQ about reaching limits'
      )
      assert.ok(
        questions.some(q => q.includes('discount')),
        'Should have FAQ about Team discount'
      )
    })
  })

  describe('Constants.ts validation', () => {
    it('should have correct currency in SUBSCRIPTION_LIMITS', () => {
      assert.strictEqual(SUBSCRIPTION_LIMITS.starter.currency, 'GBP', 'Starter currency should be GBP')
      assert.strictEqual(SUBSCRIPTION_LIMITS.core.currency, 'GBP', 'Core currency should be GBP')
      assert.strictEqual(SUBSCRIPTION_LIMITS.pro.currency, 'GBP', 'Pro currency should be GBP')
      assert.strictEqual(SUBSCRIPTION_LIMITS.team.currency, 'GBP', 'Team currency should be GBP')
    })

    it('should have correct pricing in SUBSCRIPTION_LIMITS', () => {
      assert.strictEqual(SUBSCRIPTION_LIMITS.starter.price, 0, 'Starter price should be 0')
      assert.strictEqual(SUBSCRIPTION_LIMITS.core.price, 10.99, 'Core price should be 10.99')
      assert.strictEqual(SUBSCRIPTION_LIMITS.pro.price, 19.99, 'Pro price should be 19.99')
      assert.strictEqual(SUBSCRIPTION_LIMITS.team.price, 16.99, 'Team price should be 16.99')
    })

    it('should have correct AI actions in SUBSCRIPTION_LIMITS', () => {
      assert.strictEqual(SUBSCRIPTION_LIMITS.starter.monthlyAIActions, 25, 'Starter should have 25 actions')
      assert.strictEqual(SUBSCRIPTION_LIMITS.core.monthlyAIActions, 400, 'Core should have 400 actions')
      assert.strictEqual(SUBSCRIPTION_LIMITS.pro.monthlyAIActions, 800, 'Pro should have 800 actions')
      assert.strictEqual(SUBSCRIPTION_LIMITS.team.monthlyAIActions, 10000, 'Team should have 10k base actions')
      assert.strictEqual(SUBSCRIPTION_LIMITS.team.aiActionsPerSeat, 1000, 'Team should have 1k per seat')
    })

    it('should have correct add-on pricing constants', () => {
      assert.strictEqual(AI_ACTION_OVERAGE.pricePerPack, 20, 'AI Actions Pack should be £20')
      assert.strictEqual(AI_ACTION_OVERAGE.actionsPerPack, 1000, 'Should provide 1000 actions')
      assert.strictEqual(AI_ACTION_OVERAGE.expiryDays, 90, 'Should expire in 90 days')
      
      assert.strictEqual(AI_BOOSTER_ADDON.price, 5, 'AI Booster should be £5')
      assert.strictEqual(AI_BOOSTER_ADDON.aiActions, 200, 'Should provide 200 actions')
      
      assert.strictEqual(PRIORITY_SUPPORT_ADDON.price, 15, 'Priority Support should be £15')
    })

    it('should have correct seat pricing', () => {
      assert.strictEqual(SEAT_PRICING.core, 10.99, 'Core seat price should be £10.99')
      assert.strictEqual(SEAT_PRICING.pro, 19.99, 'Pro seat price should be £19.99')
      assert.strictEqual(SEAT_PRICING.team, 16.99, 'Team seat price should be £16.99')
    })

    it('should have Team discount correctly applied', () => {
      const proPriceFor5 = SUBSCRIPTION_LIMITS.pro.price * 5
      const teamPriceFor5 = SUBSCRIPTION_LIMITS.team.price * 5
      const discount = ((proPriceFor5 - teamPriceFor5) / proPriceFor5) * 100
      
      assert.ok(discount >= 14 && discount <= 16, `Team discount should be ~15%, got ${discount.toFixed(1)}%`)
    })
  })

  describe('Data consistency between plans.json and constants.ts', () => {
    it('should have matching prices between plans.json and constants', () => {
      assert.strictEqual(
        plansData.tiers.starter.price,
        SUBSCRIPTION_LIMITS.starter.price,
        'Starter prices should match'
      )
      assert.strictEqual(
        plansData.tiers.core.price,
        SUBSCRIPTION_LIMITS.core.price,
        'Core prices should match'
      )
      assert.strictEqual(
        plansData.tiers.pro.price,
        SUBSCRIPTION_LIMITS.pro.price,
        'Pro prices should match'
      )
      assert.strictEqual(
        plansData.tiers.team.price,
        SUBSCRIPTION_LIMITS.team.price,
        'Team prices should match'
      )
    })

    it('should have matching AI actions between plans.json and constants', () => {
      assert.strictEqual(
        plansData.tiers.starter.actions,
        SUBSCRIPTION_LIMITS.starter.monthlyAIActions,
        'Starter AI actions should match'
      )
      assert.strictEqual(
        plansData.tiers.core.actions,
        SUBSCRIPTION_LIMITS.core.monthlyAIActions,
        'Core AI actions should match'
      )
      assert.strictEqual(
        plansData.tiers.pro.actions,
        SUBSCRIPTION_LIMITS.pro.monthlyAIActions,
        'Pro AI actions should match'
      )
    })
  })

  describe('Value proposition validation', () => {
    it('should show clear value progression', () => {
      // Each tier should offer more value than the previous
      assert.ok(
        plansData.tiers.core.actions > plansData.tiers.starter.actions,
        'Core should have more actions than Starter'
      )
      assert.ok(
        plansData.tiers.pro.actions > plansData.tiers.core.actions,
        'Pro should have more actions than Core'
      )
    })

    it('should validate Team tier provides pooling advantage', () => {
      const team5Seats = plansData.tiers.team.actionsBase + (plansData.tiers.team.actionsPerSeat * 5)
      const pro5Seats = plansData.tiers.pro.actions * 5
      
      assert.ok(
        team5Seats > pro5Seats,
        'Team with 5 seats should have more total actions than 5× Pro'
      )
    })

    it('should validate Enterprise starting price makes sense', () => {
      assert.ok(
        plansData.tiers.enterprise.priceStarting! >= plansData.tiers.team.price,
        'Enterprise starting price should be higher than Team'
      )
    })
  })
})

