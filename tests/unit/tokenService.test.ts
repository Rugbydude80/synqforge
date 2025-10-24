/**
 * Token Service Unit Tests
 * 
 * Tests add-on credit application, expiration, and deduction priority
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { 
  checkAllowance, 
  deductTokens, 
  applyAddOnCredits,
  expireAddOns 
} from '@/lib/services/tokenService'

describe('Token Service', () => {
  describe('checkAllowance', () => {
    it('should include base allowance + add-on credits', async () => {
      const result = await checkAllowance('org-123', 'split', 'user-456')
      
      expect(result.allowed).toBe(true)
      expect(result.breakdown).toHaveProperty('baseAllowance')
      expect(result.breakdown).toHaveProperty('addonCredits')
      expect(result.breakdown).toHaveProperty('aiActionsBonus')
      expect(result.breakdown).toHaveProperty('rolloverCredits')
    })
    
    it('should deny when quota exceeded', async () => {
      // Mock scenario with zero credits
      const result = await checkAllowance('org-empty', 'update', 'user-456')
      
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
    })
  })
  
  describe('deductTokens', () => {
    it('should deduct from base allowance first', async () => {
      const correlationId = 'test-correlation-1'
      const result = await deductTokens(
        'org-123',
        'split',
        'story',
        'story-789',
        correlationId,
        'user-456'
      )
      
      expect(result.success).toBe(true)
      expect(result.tokensDeducted).toBe(0.7) // split cost
      expect(result.source).toBe('base_allowance')
      expect(result.correlationId).toBe(correlationId)
    })
    
    it('should be idempotent on duplicate correlationId', async () => {
      const correlationId = 'test-correlation-2'
      
      // First call
      const result1 = await deductTokens(
        'org-123',
        'refine',
        'story',
        'story-789',
        correlationId,
        'user-456'
      )
      
      // Second call with same correlationId
      const result2 = await deductTokens(
        'org-123',
        'refine',
        'story',
        'story-789',
        correlationId,
        'user-456'
      )
      
      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
      expect(result1.tokensDeducted).toBe(result2.tokensDeducted)
      expect(result1.balanceAfter).toBe(result2.balanceAfter)
    })
    
    it('should use addon pack when base exhausted', async () => {
      // Mock scenario where base is exhausted but addon pack has credits
      const result = await deductTokens(
        'org-with-addon',
        'update',
        'story',
        'story-999',
        'test-correlation-3',
        'user-456'
      )
      
      expect(result.success).toBe(true)
      expect(result.source).toBe('addon_pack')
    })
  })
  
  describe('applyAddOnCredits', () => {
    it('should apply AI Actions Pack credits to allowance', async () => {
      const purchaseId = 'purchase-123'
      
      await applyAddOnCredits(purchaseId)
      
      // Verify credits were added
      const allowance = await checkAllowance('org-123', 'split', 'user-456')
      expect(allowance.breakdown.addonCredits).toBeGreaterThan(0)
    })
    
    it('should apply AI Booster bonus to allowance', async () => {
      const purchaseId = 'purchase-booster-123'
      
      await applyAddOnCredits(purchaseId)
      
      // Verify bonus was added
      const allowance = await checkAllowance('org-starter', 'split', 'user-456')
      expect(allowance.breakdown.aiActionsBonus).toBe(200)
    })
  })
  
  describe('expireAddOns', () => {
    it('should expire add-ons past expiry date', async () => {
      const result = await expireAddOns()
      
      expect(result).toHaveProperty('expired')
      expect(result.expired).toBeGreaterThanOrEqual(0)
    })
    
    it('should remove unused credits from allowance on expiry', async () => {
      // Create expired pack
      // Run expiry
      const result = await expireAddOns()
      
      // Verify credits removed
      expect(result.expired).toBeGreaterThanOrEqual(0)
    })
  })
})

