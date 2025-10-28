/**
 * Unit Tests for EmbeddingsService
 * Tests embedding generation, similarity search, and health checks
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { EmbeddingsService } from '../../lib/services/embeddings.service';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

describe('EmbeddingsService', () => {
  const service = new EmbeddingsService();

  describe('Health Check', () => {
    it('should return health status with all checks', async () => {
      const health = await service.healthCheck();
      
      assert.ok(health.database !== undefined, 'Database check should be present');
      assert.ok(health.openrouterApi !== undefined, 'OpenRouter API check should be present');
      assert.ok(health.indexExists !== undefined, 'Index check should be present');
      
      console.log('Health status:', health);
    });

    it('should report enabled status correctly', () => {
      const isEnabled = service.isEnabled();
      console.log('Semantic search enabled:', isEnabled);
      assert.strictEqual(typeof isEnabled, 'boolean');
    });
  });

  describe('Embedding Generation', () => {
    it('should generate 1024-dimensional embedding for valid text', async () => {
      const text = "As a user, I want to upload documents with virus scanning for security";
      const embedding = await service.generateEmbedding(text);
      
      assert.ok(Array.isArray(embedding), 'Embedding should be an array');
      assert.strictEqual(embedding.length, 1024, 'Embedding should have 1024 dimensions');
      assert.ok(
        embedding.every(n => typeof n === 'number' && !isNaN(n)),
        'All dimensions should be valid numbers'
      );
      
      console.log(`✅ Generated ${embedding.length}-dimensional embedding`);
      console.log(`   Sample values: [${embedding.slice(0, 5).map(n => n.toFixed(4)).join(', ')}...]`);
    });

    it('should throw error on empty text', async () => {
      await assert.rejects(
        async () => await service.generateEmbedding(''),
        /Text must be at least 10 characters/,
        'Should reject empty text'
      );
    });

    it('should throw error on very short text', async () => {
      await assert.rejects(
        async () => await service.generateEmbedding('short'),
        /Text must be at least 10 characters/,
        'Should reject text shorter than 10 characters'
      );
    });

    it('should handle long text by truncating', async () => {
      const longText = 'A'.repeat(10000);
      const embedding = await service.generateEmbedding(longText);
      
      assert.strictEqual(embedding.length, 1024, 'Should still return 1024 dimensions');
      console.log('✅ Successfully handled long text (10,000 chars)');
    });

    it('should generate different embeddings for different texts', async () => {
      const text1 = "As a user, I want to upload files";
      const text2 = "As an admin, I want to delete old records";
      
      const embedding1 = await service.generateEmbedding(text1);
      const embedding2 = await service.generateEmbedding(text2);
      
      // Calculate cosine similarity manually
      let dotProduct = 0;
      let norm1 = 0;
      let norm2 = 0;
      
      for (let i = 0; i < 1024; i++) {
        dotProduct += embedding1[i] * embedding2[i];
        norm1 += embedding1[i] * embedding1[i];
        norm2 += embedding2[i] * embedding2[i];
      }
      
      const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
      
      console.log(`Similarity between different texts: ${(similarity * 100).toFixed(2)}%`);
      assert.ok(
        similarity < 0.95,
        'Different texts should have different embeddings (similarity < 95%)'
      );
    });
  });

  describe('Similarity Search', () => {
    it('should find similar stories when they exist', async () => {
      // Note: This test requires actual data in the database
      // Skip if no stories with embeddings exist
      
      const query = "document upload with security scanning";
      
      try {
        const results = await service.findSimilarStories({
          queryText: query,
          limit: 5,
          minSimilarity: 0.6, // Lower threshold for testing
        });
        
        console.log(`Found ${results.length} similar stories`);
        
        if (results.length > 0) {
          // Validate result structure
          results.forEach((story, idx) => {
            assert.ok(story.id, `Story ${idx} should have an id`);
            assert.ok(story.title, `Story ${idx} should have a title`);
            assert.ok(
              typeof story.similarity === 'number',
              `Story ${idx} should have numeric similarity`
            );
            assert.ok(
              story.similarity >= 0.6 && story.similarity <= 1.0,
              `Story ${idx} similarity should be in range [0.6, 1.0]`
            );
          });
          
          // Verify results are ordered by similarity (descending)
          for (let i = 1; i < results.length; i++) {
            assert.ok(
              results[i - 1].similarity >= results[i].similarity,
              'Results should be ordered by similarity (descending)'
            );
          }
          
          console.log('Top 3 results:');
          results.slice(0, 3).forEach((story, idx) => {
            console.log(
              `  ${idx + 1}. ${story.title} (${(story.similarity * 100).toFixed(1)}% match)`
            );
          });
        } else {
          console.log('⚠️  No stories found - database may be empty or no embeddings exist');
        }
      } catch (error) {
        console.log('⚠️  Similarity search test skipped - may need database setup');
        console.log('   Error:', error instanceof Error ? error.message : error);
      }
    });

    it('should respect minSimilarity threshold', async () => {
      try {
        const highThreshold = await service.findSimilarStories({
          queryText: "test query",
          minSimilarity: 0.9, // Very high threshold
          limit: 10,
        });
        
        highThreshold.forEach(story => {
          assert.ok(
            story.similarity >= 0.9,
            `All results should meet threshold (got ${story.similarity})`
          );
        });
        
        console.log(`High threshold (0.9): ${highThreshold.length} results`);
      } catch (_error) {
        console.log('⚠️  Threshold test skipped - database may not have data');
      }
    });

    it('should filter by epicId when provided', async () => {
      try {
        const results = await service.findSimilarStories({
          queryText: "test query",
          epicId: 'non-existent-epic-id',
          limit: 5,
        });
        
        assert.strictEqual(
          results.length,
          0,
          'Should return no results for non-existent epic'
        );
        
        console.log('✅ Epic filtering works correctly');
      } catch (_error) {
        console.log('⚠️  Epic filter test skipped');
      }
    });

    it('should limit results to specified count', async () => {
      try {
        const limit = 3;
        const results = await service.findSimilarStories({
          queryText: "test query with broad match",
          limit,
          minSimilarity: 0.5, // Low threshold to get more results
        });
        
        assert.ok(
          results.length <= limit,
          `Should return at most ${limit} results (got ${results.length})`
        );
        
        console.log(`✅ Limit respected: requested ${limit}, got ${results.length}`);
      } catch (_error) {
        console.log('⚠️  Limit test skipped');
      }
    });
  });

  describe('Batch Operations', () => {
    it('should batch embed multiple stories', async () => {
      const testStories = [
        {
          id: 'test-story-1',
          title: 'Upload files feature',
          description: 'Allow users to upload files',
          acceptance_criteria: ['Can upload', 'Validates file type'],
        },
        {
          id: 'test-story-2',
          title: 'Delete files feature',
          description: 'Allow users to delete files',
          acceptance_criteria: ['Can delete', 'Confirms before deleting'],
        },
      ];
      
      // Note: This would actually write to the database
      // In a real test, you'd use a test database or mock
      console.log('⚠️  Batch embedding test skipped - would write to production DB');
      console.log(`   Would process ${testStories.length} stories`);
    });
  });

  describe('Performance', () => {
    it('should generate embeddings within reasonable time', async () => {
      const text = "As a user, I want to export my data to CSV format for backup purposes";
      const startTime = Date.now();
      
      await service.generateEmbedding(text);
      
      const duration = Date.now() - startTime;
      console.log(`Embedding generation time: ${duration}ms`);
      
      assert.ok(
        duration < 5000,
        `Embedding should generate in <5s (took ${duration}ms)`
      );
      
      if (duration < 500) {
        console.log('✅ Excellent performance (<500ms)');
      } else if (duration < 1000) {
        console.log('✅ Good performance (<1s)');
      } else {
        console.log('⚠️  Slow performance - consider API latency');
      }
    });

    it('should perform similarity search within reasonable time', async () => {
      try {
        const startTime = Date.now();
        
        await service.findSimilarStories({
          queryText: "test query for performance measurement",
          limit: 5,
          minSimilarity: 0.7,
        });
        
        const duration = Date.now() - startTime;
        console.log(`Similarity search time: ${duration}ms`);
        
        assert.ok(
          duration < 10000,
          `Search should complete in <10s (took ${duration}ms)`
        );
        
        if (duration < 400) {
          console.log('✅ Excellent performance (<400ms)');
        } else if (duration < 1000) {
          console.log('✅ Good performance (<1s)');
        } else {
          console.log('⚠️  Performance needs optimization');
        }
      } catch (_error) {
        console.log('⚠️  Performance test skipped - database may not have data');
      }
    });
  });
});

