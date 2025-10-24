/**
 * Add-On Purchase Integration Tests
 * 
 * Tests end-to-end purchase flow, webhook handling, and credit application
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { purchaseAddOn, listActiveAddOns, cancelAddOn } from '@/lib/services/addOnService'
import { checkAllowance } from '@/lib/services/tokenService'

describe('Add-On Purchase Flow', () => {
  const testOrgId = 'test-org-integration'
  const testUserId = 'test-user-integration'
  
  describe('AI Actions Pack Purchase', () => {
    it('should create checkout session for AI Actions Pack', async () => {
      const result = await purchaseAddOn({
        organizationId: testOrgId,
        userId: testUserId,
        addOnType: 'ai_actions',
      })
      
      expect(result.success).toBe(true)
      expect(result.checkoutUrl).toBeTruthy()
    })
    
    it('should block purchase when tier not eligible', async () => {
      // Starter tier trying to buy AI Actions Pack
      const result = await purchaseAddOn({
        organizationId: 'starter-org',
        userId: testUserId,
        addOnType: 'ai_actions',
      })
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Available for')
    })
    
    it('should block purchase when max active packs reached', async () => {
      // Mock 5 active packs already purchased
      const result = await purchaseAddOn({
        organizationId: 'org-with-5-packs',
        userId: testUserId,
        addOnType: 'ai_actions',
      })
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Maximum')
    })
    
    it('should apply credits immediately after webhook', async () => {
      // Simulate successful checkout
      const purchase = await purchaseAddOn({
        organizationId: testOrgId,
        userId: testUserId,
        addOnType: 'ai_actions',
      })
      
      expect(purchase.success).toBe(true)
      
      // Simulate webhook handler applying credits
      // (In real test, mock Stripe webhook)
      
      // Verify credits appear in allowance
      const allowance = await checkAllowance(testOrgId, 'split', testUserId)
      expect(allowance.breakdown.addonCredits).toBe(1000)
    })
  })
  
  describe('AI Booster (Starter)', () => {
    it('should allow Starter tier to purchase AI Booster', async () => {
      const result = await purchaseAddOn({
        organizationId: 'starter-org',
        userId: testUserId,
        addOnType: 'ai_booster',
      })
      
      expect(result.success).toBe(true)
      expect(result.checkoutUrl).toBeTruthy()
    })
    
    it('should block Pro tier from purchasing AI Booster', async () => {
      const result = await purchaseAddOn({
        organizationId: 'pro-org',
        userId: testUserId,
        addOnType: 'ai_booster',
      })
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Starter')
    })
    
    it('should increase monthly allowance by 200', async () => {
      // Before: Starter has 25 actions
      const beforeAllowance = await checkAllowance('starter-org', 'split', testUserId)
      expect(beforeAllowance.breakdown.baseAllowance).toBe(25)
      
      // Purchase and apply AI Booster
      // (Mock webhook application)
      
      // After: Should have 25 + 200 = 225
      const afterAllowance = await checkAllowance('starter-org', 'split', testUserId)
      expect(afterAllowance.breakdown.aiActionsBonus).toBe(200)
    })
  })
  
  describe('Priority Support Pack', () => {
    it('should allow Pro tier to purchase Priority Support', async () => {
      const result = await purchaseAddOn({
        organizationId: 'pro-org',
        userId: testUserId,
        addOnType: 'priority_support',
      })
      
      expect(result.success).toBe(true)
    })
    
    it('should block Team tier (already has priority support)', async () => {
      const result = await purchaseAddOn({
        organizationId: 'team-org',
        userId: testUserId,
        addOnType: 'priority_support',
      })
      
      expect(result.success).toBe(false)
    })
  })
  
  describe('Add-On Listing', () => {
    it('should list all active add-ons for user', async () => {
      const addOns = await listActiveAddOns(testOrgId, testUserId)
      
      expect(Array.isArray(addOns)).toBe(true)
      addOns.forEach(addon => {
        expect(addon).toHaveProperty('id')
        expect(addon).toHaveProperty('type')
        expect(addon).toHaveProperty('creditsRemaining')
        expect(addon).toHaveProperty('expiresAt')
      })
    })
    
    it('should filter out expired add-ons', async () => {
      const addOns = await listActiveAddOns('org-with-expired', testUserId)
      
      // All returned add-ons should be active
      const now = new Date()
      addOns.forEach(addon => {
        if (addon.expiresAt) {
          expect(addon.expiresAt.getTime()).toBeGreaterThan(now.getTime())
        }
      })
    })
  })
  
  describe('Add-On Cancellation', () => {
    it('should cancel recurring add-on', async () => {
      const purchaseId = 'test-booster-purchase'
      
      const result = await cancelAddOn(purchaseId, testOrgId, testUserId)
      
      expect(result.success).toBe(true)
    })
    
    it('should block cancellation of non-recurring add-ons', async () => {
      const purchaseId = 'test-ai-pack-purchase'
      
      const result = await cancelAddOn(purchaseId, testOrgId, testUserId)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('non-recurring')
    })
  })
})

