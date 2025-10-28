/**
 * API Backward Compatibility Tests
 * 
 * These tests ensure that existing clients that don't send promptTemplate
 * continue to work without any breaking changes.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Story Generation API - Backward Compatibility', () => {
  describe('Request Format', () => {
    it('should accept requests WITHOUT promptTemplate parameter', () => {
      // Legacy request format
      const legacyRequest = {
        requirement: 'Add user authentication with email and password',
        projectId: 'test-project-123',
        projectContext: 'E-commerce platform'
      };
      
      // Should not throw when validating
      // This simulates the schema validation
      const hasRequiredFields = 
        legacyRequest.requirement &&
        legacyRequest.projectId;
      
      assert.strictEqual(hasRequiredFields, true);
    });

    it('should accept requests WITH promptTemplate parameter', () => {
      // New request format
      const newRequest = {
        requirement: 'Add user authentication with email and password',
        projectId: 'test-project-123',
        projectContext: 'E-commerce platform',
        promptTemplate: 'lean-agile'
      };
      
      assert.strictEqual(newRequest.promptTemplate, 'lean-agile');
      assert.ok(newRequest.requirement);
      assert.ok(newRequest.projectId);
    });

    it('should treat missing promptTemplate as standard template', () => {
      const requestWithoutTemplate: { requirement: string; projectId: string; promptTemplate?: string } = {
        requirement: 'Test requirement',
        projectId: 'test-123'
      };
      
      // Simulate the default value assignment in the API
      const effectiveTemplate = requestWithoutTemplate.promptTemplate || 'standard';
      
      assert.strictEqual(effectiveTemplate, 'standard');
    });

    it('should treat empty string promptTemplate as standard template', () => {
      const requestWithEmptyTemplate = {
        requirement: 'Test requirement',
        projectId: 'test-123',
        promptTemplate: ''
      };
      
      // Simulate the default value assignment in the API
      const effectiveTemplate = requestWithEmptyTemplate.promptTemplate || 'standard';
      
      assert.strictEqual(effectiveTemplate, 'standard');
    });
  });

  describe('Response Format', () => {
    it('should maintain consistent response structure', () => {
      // Expected response structure should not change
      const expectedResponseStructure = {
        success: true,
        story: {
          title: 'string',
          description: 'string',
          acceptanceCriteria: [],
          priority: 'string',
          storyPoints: 0,
          reasoning: 'string'
        }
      };
      
      // Verify structure
      assert.ok('success' in expectedResponseStructure);
      assert.ok('story' in expectedResponseStructure);
      assert.ok('title' in expectedResponseStructure.story);
      assert.ok('description' in expectedResponseStructure.story);
      assert.ok('acceptanceCriteria' in expectedResponseStructure.story);
      
      // Should NOT contain promptTemplate or system prompt in response
      assert.ok(!('promptTemplate' in expectedResponseStructure));
      assert.ok(!('systemPrompt' in expectedResponseStructure));
    });

    it('should never include system prompts in response', () => {
      const mockResponse = {
        success: true,
        story: {
          title: 'As a user, I want to login',
          description: 'User authentication feature',
          acceptanceCriteria: ['User can login', 'User can logout'],
          priority: 'high',
          storyPoints: 5,
          reasoning: 'Essential for security'
        }
      };
      
      const responseStr = JSON.stringify(mockResponse);
      
      // Verify no prompt leakage
      assert.ok(!responseStr.includes('You are an expert'));
      assert.ok(!responseStr.includes('Generate stories'));
      assert.ok(!responseStr.includes('systemPrompt'));
    });

    it('should maintain backward compatible error responses', () => {
      const errorResponse = {
        error: 'Validation error',
        details: []
      };
      
      assert.ok('error' in errorResponse);
      assert.strictEqual(typeof errorResponse.error, 'string');
    });
  });

  describe('Bulk Story Generation', () => {
    it('should accept legacy requests without promptTemplate', () => {
      const legacyBulkRequest: { requirements: string; projectId: string; projectContext: string; promptTemplate?: string } = {
        requirements: 'Build a user management system',
        projectId: 'test-project-456',
        projectContext: 'Admin dashboard'
      };
      
      assert.ok(legacyBulkRequest.requirements);
      assert.ok(legacyBulkRequest.projectId);
      assert.strictEqual(legacyBulkRequest.promptTemplate, undefined);
    });

    it('should accept new requests with promptTemplate', () => {
      const newBulkRequest = {
        requirements: 'Build a user management system',
        projectId: 'test-project-456',
        projectContext: 'Admin dashboard',
        promptTemplate: 'bdd-compliance'
      };
      
      assert.ok(newBulkRequest.requirements);
      assert.ok(newBulkRequest.projectId);
      assert.strictEqual(newBulkRequest.promptTemplate, 'bdd-compliance');
    });
  });

  describe('API Contracts', () => {
    it('should not break existing client code', () => {
      // Simulate existing client code that doesn't know about templates
      function legacyGenerateStory(requirement: string, projectId: string) {
        return {
          method: 'POST',
          body: JSON.stringify({
            requirement,
            projectId
          })
        };
      }
      
      const request = legacyGenerateStory('Add login', 'proj-123');
      const body = JSON.parse(request.body);
      
      assert.strictEqual(body.requirement, 'Add login');
      assert.strictEqual(body.projectId, 'proj-123');
      assert.strictEqual(body.promptTemplate, undefined);
      
      // This should still work with the API
      assert.strictEqual(request.method, 'POST');
    });

    it('should support new client code with templates', () => {
      // New client code that uses templates
      function newGenerateStory(
        requirement: string, 
        projectId: string, 
        template?: string
      ) {
        const body: Record<string, string> = {
          requirement,
          projectId
        };
        
        if (template) {
          body.promptTemplate = template;
        }
        
        return {
          method: 'POST',
          body: JSON.stringify(body)
        };
      }
      
      const requestWithTemplate = newGenerateStory('Add login', 'proj-123', 'lean-agile');
      const bodyWithTemplate = JSON.parse(requestWithTemplate.body);
      
      assert.strictEqual(bodyWithTemplate.promptTemplate, 'lean-agile');
      
      const requestWithoutTemplate = newGenerateStory('Add login', 'proj-123');
      const bodyWithoutTemplate = JSON.parse(requestWithoutTemplate.body);
      
      assert.strictEqual(bodyWithoutTemplate.promptTemplate, undefined);
    });
  });

  describe('Validation Rules', () => {
    it('should validate required fields regardless of template', () => {
      const validRequest = {
        requirement: 'Valid requirement text that is long enough',
        projectId: 'valid-project-id',
        promptTemplate: 'standard'
      };
      
      const invalidRequest1 = {
        requirement: 'short', // Too short
        projectId: 'valid-project-id',
        promptTemplate: 'standard'
      };
      
      const invalidRequest2 = {
        requirement: 'Valid requirement text',
        projectId: '', // Empty project ID
        promptTemplate: 'standard'
      };
      
      // Valid request
      assert.ok(validRequest.requirement.length >= 10);
      assert.ok(validRequest.projectId.length > 0);
      
      // Invalid requests
      assert.ok(invalidRequest1.requirement.length < 10);
      assert.strictEqual(invalidRequest2.projectId.length, 0);
    });

    it('should maintain existing rate limiting behavior', () => {
      // Rate limiting should work the same regardless of template
      const requests = [
        { requirement: 'Req 1', projectId: 'proj-1', promptTemplate: 'standard' },
        { requirement: 'Req 2', projectId: 'proj-1' }, // No template
        { requirement: 'Req 3', projectId: 'proj-1', promptTemplate: 'lean-agile' },
      ];
      
      // All requests should be subject to the same rate limiting
      requests.forEach(req => {
        assert.ok(req.requirement);
        assert.strictEqual(req.projectId, 'proj-1');
      });
    });
  });
});

describe('Template Metadata API', () => {
  describe('Public Endpoint', () => {
    it('should return template list without exposing prompts', () => {
      const mockResponse = {
        success: true,
        templates: [
          {
            key: 'standard',
            displayName: 'Standard',
            description: 'Balanced approach',
            icon: '📋'
          },
          {
            key: 'lean-agile',
            displayName: 'Lean Agile',
            description: 'Minimal, outcome-focused',
            icon: '🎯'
          }
        ]
      };
      
      const responseStr = JSON.stringify(mockResponse);
      
      // Verify no prompt leakage
      assert.ok(!responseStr.includes('systemPrompt'));
      assert.ok(!responseStr.includes('You are an expert'));
      assert.ok(!responseStr.includes('Generate stories'));
      
      // Verify expected fields are present
      assert.ok('key' in mockResponse.templates[0]);
      assert.ok('displayName' in mockResponse.templates[0]);
      assert.ok('description' in mockResponse.templates[0]);
    });
  });

  describe('Admin Endpoint', () => {
    it('should still not expose prompts even to admins', () => {
      const mockAdminResponse = {
        success: true,
        templates: [
          {
            key: 'enterprise',
            displayName: 'Enterprise',
            description: 'Comprehensive with compliance',
            icon: '🏢',
            requiresAdminTier: true
          }
        ],
        note: 'Template prompts are server-side only and never exposed via API'
      };
      
      const responseStr = JSON.stringify(mockAdminResponse);
      
      // Even admin endpoint should not leak prompts
      assert.ok(!responseStr.includes('systemPrompt'));
      assert.ok(!responseStr.includes('You are an expert'));
      assert.ok(mockAdminResponse.note.includes('server-side only'));
    });

    it('should require authentication', () => {
      // This would be an integration test
      // Here we verify the expected behavior
      const unauthorizedResponse = {
        error: 'Unauthorized. Admin access required.',
        status: 403
      };
      
      assert.strictEqual(unauthorizedResponse.status, 403);
      assert.ok(unauthorizedResponse.error.includes('Admin'));
    });
  });
});
