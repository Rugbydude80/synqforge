/**
 * Embeddings Service
 * Handles vector embeddings generation using OpenRouter and semantic similarity search
 */

import { neon } from '@neondatabase/serverless';
import { openai } from '@/lib/ai/client';

// Type definitions
interface Story {
  id: string;
  title: string;
  description: string | null;
  acceptance_criteria: string[] | null;
  priority: string;
  status: string;
}

interface SimilarStory extends Story {
  similarity: number;
}

// OpenRouter returns OpenAI-compatible embedding format via the OpenAI SDK
// We use the official OpenAI SDK which handles the response format internally

export class EmbeddingsService {
  private sql;
  private embeddingModel: string;
  private minSimilarity: number;
  private maxResults: number;

  constructor() {
    // Initialize database connection
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    this.sql = neon(process.env.DATABASE_URL);
    
    // Load configuration from environment (using OpenRouter via existing client)
    // OpenRouter supports OpenAI embedding models
    this.embeddingModel = process.env.OPENROUTER_EMBEDDING_MODEL || 'openai/text-embedding-3-small';
    this.minSimilarity = parseFloat(process.env.SEMANTIC_SEARCH_MIN_SIMILARITY || '0.7');
    this.maxResults = parseInt(process.env.SEMANTIC_SEARCH_MAX_RESULTS || '5');

    // Validate required configuration (OpenRouter API key checked in client)
    if (!process.env.OPENROUTER_API_KEY) {
      console.warn('OPENROUTER_API_KEY environment variable is not set - embeddings will be disabled');
    }
  }

  /**
   * Generate embedding vector for text using OpenRouter
   * @param text - The text to embed (typically story title + description + AC)
   * @returns Array of floating point numbers (dimensions depend on model)
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // Validate input
    if (!text || text.trim().length < 10) {
      throw new Error('Text must be at least 10 characters long for meaningful embedding');
    }

    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }

    // Truncate text if too long (token limits)
    const maxLength = 8000; // ~2000 tokens
    const truncatedText = text.length > maxLength 
      ? text.substring(0, maxLength) + '...' 
      : text;

    try {
      // Use existing OpenRouter client (OpenAI-compatible API)
      const response = await openai.embeddings.create({
        model: this.embeddingModel,
        input: truncatedText,
      });
      
      // Extract embedding from OpenAI-compatible response
      if (!response.data?.[0]?.embedding) {
        throw new Error('Invalid response from OpenRouter API: missing embedding data');
      }

      const embedding = response.data[0].embedding;

      // Verify embedding dimensions (varies by model)
      // text-embedding-3-small: 1536 dims
      // text-embedding-3-large: 3072 dims
      if (embedding.length < 512) {
        throw new Error(`Unexpected embedding dimensions: ${embedding.length}`);
      }

      console.log(`✅ Generated ${embedding.length}-dimensional embedding using ${this.embeddingModel}`);

      return embedding;

    } catch (error) {
      console.error('Failed to generate embedding:', error);
      throw error;
    }
  }

  /**
   * Combine story components into text suitable for embedding
   * @param story - The story object
   * @returns Combined text string
   */
  private prepareStoryText(story: {
    title: string;
    description?: string | null;
    acceptance_criteria?: string[] | null;
  }): string {
    const parts: string[] = [];

    // Add title (most important)
    if (story.title) {
      parts.push(story.title);
    }

    // Add description
    if (story.description) {
      parts.push(story.description);
    }

    // Add acceptance criteria (limit to first 5 to avoid token limits)
    if (Array.isArray(story.acceptance_criteria)) {
      const criteria = story.acceptance_criteria
        .slice(0, 5)
        .join(' ');
      if (criteria) {
        parts.push(criteria);
      }
    }

    return parts.join('\n').trim();
  }

  /**
   * Generate and store embedding for a story
   * @param storyId - The story's unique identifier
   * @param story - Story data (title, description, AC)
   */
  async embedStory(
    storyId: string,
    story: {
      title: string;
      description?: string | null;
      acceptance_criteria?: string[] | null;
    }
  ): Promise<void> {
    try {
      // Prepare text for embedding
      const text = this.prepareStoryText(story);

      if (text.length < 10) {
        console.warn(`Skipping story ${storyId}: insufficient content for embedding`);
        return;
      }

      // Generate embedding
      const embedding = await this.generateEmbedding(text);

      // Store in database
      await this.sql`
        UPDATE stories 
        SET embedding = ${JSON.stringify(embedding)}::vector,
            updated_at = NOW()
        WHERE id = ${storyId}
      `;

      console.log(`✅ Successfully embedded story ${storyId}`);

    } catch (error) {
      console.error(`❌ Failed to embed story ${storyId}:`, error);
      // Don't throw - allow story creation to continue even if embedding fails
    }
  }

  /**
   * Find semantically similar stories using vector search
   * @param params - Search parameters
   * @returns Array of similar stories with similarity scores
   */
  async findSimilarStories(params: {
    queryText: string;
    epicId?: string;
    projectId?: string;
    limit?: number;
    minSimilarity?: number;
  }): Promise<SimilarStory[]> {
    const limit = params.limit || this.maxResults;
    const minSimilarity = params.minSimilarity || this.minSimilarity;

    try {
      // Generate embedding for the query using 'query' text type
      const queryEmbedding = await this.generateEmbedding(params.queryText);

      // Build base query
      let whereClause = 'WHERE embedding IS NOT NULL';
      const queryParams: any[] = [JSON.stringify(queryEmbedding), limit];
      
      // Add epic filter if provided
      if (params.epicId) {
        whereClause += ' AND epic_id = $3';
        queryParams.push(params.epicId);
      }
      // Add project filter if provided (and no epic filter)
      else if (params.projectId) {
        whereClause += ' AND project_id = $3';
        queryParams.push(params.projectId);
      }

      // Execute query
      const results: any[] = await this.sql`
        SELECT 
          id,
          title,
          description,
          acceptance_criteria,
          priority,
          status,
          1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) AS similarity
        FROM stories
        ${this.sql.unsafe(whereClause)}
        ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
        LIMIT ${limit}
      `;

      // Filter by minimum similarity threshold
      const filtered = results.filter(
        (row) => row.similarity >= minSimilarity
      ) as SimilarStory[];

      console.log(
        `🔍 Found ${filtered.length}/${results.length} stories above ${minSimilarity} similarity threshold`
      );

      return filtered;

    } catch (error) {
      console.error('Failed to find similar stories:', error);
      // Return empty array rather than throwing - allow generation to continue
      return [];
    }
  }

  /**
   * Batch embed multiple stories (for migrations)
   * @param stories - Array of stories to embed
   * @param batchSize - Number of stories to process in parallel
   * @param delayMs - Delay between batches (rate limiting)
   */
  async batchEmbedStories(
    stories: Array<{
      id: string;
      title: string;
      description?: string | null;
      acceptance_criteria?: string[] | null;
    }>,
    batchSize: number = 5,
    delayMs: number = 1000
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    // Process in batches
    for (let i = 0; i < stories.length; i += batchSize) {
      const batch = stories.slice(i, i + batchSize);

      await Promise.allSettled(
        batch.map(async (story) => {
          try {
            await this.embedStory(story.id, story);
            success++;
          } catch (error) {
            failed++;
            console.error(`Failed to embed story ${story.id}:`, error);
          }
        })
      );

      // Rate limiting delay between batches
      if (i + batchSize < stories.length) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      console.log(`Progress: ${Math.min(i + batchSize, stories.length)}/${stories.length} stories processed`);
    }

    return { success, failed };
  }

  /**
   * Check if semantic search is enabled
   */
  isEnabled(): boolean {
    return process.env.ENABLE_SEMANTIC_SEARCH === 'true' && !!process.env.OPENROUTER_API_KEY;
  }

  /**
   * Get health status of the service
   */
  async healthCheck(): Promise<{
    database: boolean;
    openrouterApi: boolean;
    indexExists: boolean;
  }> {
    const status = {
      database: false,
      openrouterApi: false,
      indexExists: false,
    };

    try {
      // Check database connection
      await this.sql`SELECT 1`;
      status.database = true;

      // Check if index exists
      const indexCheck = await this.sql`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'stories' 
          AND indexname = 'stories_embedding_idx'
      `;
      status.indexExists = indexCheck.length > 0;

      // Check OpenRouter API (try to generate embedding for test text)
      if (process.env.OPENROUTER_API_KEY) {
        await this.generateEmbedding('test health check');
        status.openrouterApi = true;
      }

    } catch (error) {
      console.error('Health check failed:', error);
    }

    return status;
  }
}

