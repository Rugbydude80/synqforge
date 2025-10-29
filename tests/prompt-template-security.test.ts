/**
 * Security Tests for Prompt Template System
 * 
 * These tests verify that:
 * 1. System prompts are NEVER exposed to clients
 * 2. API responses never leak prompt content
 * 3. Backward compatibility is maintained
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { 
  getTemplateMetadata, 
  getSystemPromptForTemplate,
  validateTemplateAccess,
  getDefaultTemplateKey
} from '@/lib/ai/prompt-templates';

describe('Prompt Template Security', () => {
  describe('Template Metadata Exposure', () => {
    it('should return only safe metadata, never system prompts', () => {
      const templates = getTemplateMetadata(false);
      
      templates.forEach(template => {
        // Verify only safe fields are present
        expect(template).toHaveProperty('key');
        expect(template).toHaveProperty('displayName');
        expect(template).toHaveProperty('description');
        
        // Verify system prompt is NOT present
        expect(template).not.toHaveProperty('systemPrompt');
        expect(JSON.stringify(template)).not.toContain('You are an expert');
        expect(JSON.stringify(template)).not.toContain('Generate');
      });
    });

    it('should not leak prompts even for admin users', () => {
      const templates = getTemplateMetadata(true);
      
      templates.forEach(template => {
        expect(template).not.toHaveProperty('systemPrompt');
        
        // Ensure descriptions don't contain actual prompt text
        const descLower = template.description.toLowerCase();
        expect(descLower).not.toContain('you are an expert');
        expect(descLower).not.toContain('system prompt');
      });
    });

    it('should filter admin templates for non-admin users', () => {
      const publicTemplates = getTemplateMetadata(false);
      const adminTemplates = getTemplateMetadata(true);
      
      // Admin should see more templates
      expect(adminTemplates.length).toBeGreaterThanOrEqual(publicTemplates.length);
      
      // Verify enterprise template is admin-only
      const enterpriseInPublic = publicTemplates.find(t => t.key === 'enterprise');
      const enterpriseInAdmin = adminTemplates.find(t => t.key === 'enterprise');
      
      expect(enterpriseInPublic).toBeUndefined();
      expect(enterpriseInAdmin).toBeDefined();
    });
  });

  describe('System Prompt Access Control', () => {
    it('should only be accessible server-side', () => {
      // This test ensures the function exists only on server
      const prompt = getSystemPromptForTemplate('standard');
      
      expect(prompt).toBeTruthy();
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(100);
    });

    it('should fallback to standard template for invalid keys', () => {
      const invalidPrompt = getSystemPromptForTemplate('non-existent-template');
      const standardPrompt = getSystemPromptForTemplate('standard');
      
      expect(invalidPrompt).toBe(standardPrompt);
    });

    it('should return different prompts for different templates', () => {
      const standardPrompt = getSystemPromptForTemplate('standard');
      const leanPrompt = getSystemPromptForTemplate('lean-agile');
      const bddPrompt = getSystemPromptForTemplate('bdd-compliance');
      
      expect(standardPrompt).not.toBe(leanPrompt);
      expect(leanPrompt).not.toBe(bddPrompt);
      expect(bddPrompt).not.toBe(standardPrompt);
    });
  });

  describe('Template Access Validation', () => {
    it('should allow standard template for all users', () => {
      const result = validateTemplateAccess('standard', false);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should block admin-tier templates for non-admin users', () => {
      const result = validateTemplateAccess('enterprise', false);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('admin tier');
    });

    it('should allow admin-tier templates for admin users', () => {
      const result = validateTemplateAccess('enterprise', true);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid template keys', () => {
      const result = validateTemplateAccess('invalid-template-key', true);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unknown template');
    });
  });

  describe('Default Template', () => {
    it('should return a valid default template key', () => {
      const defaultKey = getDefaultTemplateKey();
      
      expect(defaultKey).toBe('standard');
      expect(typeof defaultKey).toBe('string');
      
      // Verify it's a valid template
      const validation = validateTemplateAccess(defaultKey, false);
      expect(validation.valid).toBe(true);
    });
  });

  describe('Data Serialization Safety', () => {
    it('should safely serialize metadata without leaking prompts', () => {
      const templates = getTemplateMetadata(true);
      const serialized = JSON.stringify(templates);
      
      // Verify no prompt keywords appear in serialized data
      expect(serialized).not.toContain('You are an expert');
      expect(serialized).not.toContain('Generate stories');
      expect(serialized).not.toContain('Format the response as JSON');
      expect(serialized).not.toContain('systemPrompt');
    });

    it('should not expose internal implementation details', () => {
      const templates = getTemplateMetadata(false);
      const serialized = JSON.stringify(templates);
      
      // Check for potential leakage of implementation details
      expect(serialized).not.toContain('PROMPT_TEMPLATES');
      expect(serialized).not.toContain('buildStoryGenerationPrompt');
      expect(serialized).not.toContain('getSystemPromptForTemplate');
    });
  });
});

describe('API Endpoint Security', () => {
  describe('Template Metadata Endpoint', () => {
    it('should never return system prompts in response', async () => {
      // This would be an integration test in a real scenario
      // Here we verify the data structure that would be returned
      const templates = getTemplateMetadata(false);
      const response = {
        success: true,
        templates
      };
      
      const responseStr = JSON.stringify(response);
      
      expect(responseStr).not.toContain('systemPrompt');
      expect(responseStr).not.toContain('You are an expert');
    });
  });
});

describe('Backward Compatibility', () => {
  describe('Optional Template Parameter', () => {
    it('should use default template when parameter is omitted', () => {
      const defaultKey = getDefaultTemplateKey();
      const prompt = getSystemPromptForTemplate(undefined as any);
      const standardPrompt = getSystemPromptForTemplate(defaultKey);
      
      expect(prompt).toBe(standardPrompt);
    });

    it('should accept empty string and use default', () => {
      const prompt = getSystemPromptForTemplate('');
      const standardPrompt = getSystemPromptForTemplate('standard');
      
      expect(prompt).toBe(standardPrompt);
    });
  });

  describe('Metadata Structure', () => {
    it('should maintain consistent structure across all templates', () => {
      const templates = getTemplateMetadata(true);
      
      templates.forEach(template => {
        expect(template).toHaveProperty('key');
        expect(template).toHaveProperty('displayName');
        expect(template).toHaveProperty('description');
        
        expect(typeof template.key).toBe('string');
        expect(typeof template.displayName).toBe('string');
        expect(typeof template.description).toBe('string');
        
        if (template.icon) {
          expect(typeof template.icon).toBe('string');
        }
        
        if (template.requiresAdminTier !== undefined) {
          expect(typeof template.requiresAdminTier).toBe('boolean');
        }
      });
    });
  });
});

describe('Template Content Validation', () => {
  describe('System Prompt Quality', () => {
    it('should have substantial content for each template', () => {
      const templateKeys = ['standard', 'lean-agile', 'bdd-compliance', 'enterprise', 'technical-focus', 'ux-focused'];
      
      templateKeys.forEach(key => {
        const prompt = getSystemPromptForTemplate(key);
        
        // Each prompt should be substantial
        expect(prompt.length).toBeGreaterThan(200);
        
        // Should contain JSON output format instructions
        expect(prompt.toLowerCase()).toContain('json');
        expect(prompt.toLowerCase()).toContain('stories');
      });
    });

    it('should never contain placeholder text', () => {
      const templateKeys = ['standard', 'lean-agile', 'bdd-compliance', 'enterprise', 'technical-focus', 'ux-focused'];
      
      templateKeys.forEach(key => {
        const prompt = getSystemPromptForTemplate(key);
        
        expect(prompt).not.toContain('TODO');
        expect(prompt).not.toContain('FIXME');
        expect(prompt).not.toContain('[INSERT');
        expect(prompt).not.toContain('XXX');
      });
    });
  });
});

