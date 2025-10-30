-- Migration: Add pgvector support for semantic story search
-- Created: 2025-10-28
-- Description: Enables semantic similarity search using vector embeddings

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to stories table
-- Using 1536 dimensions for OpenAI text-embedding-3-small via OpenRouter
-- Note: text-embedding-3-large uses 3072 dimensions
ALTER TABLE stories 
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create HNSW index for fast similarity search
-- HNSW (Hierarchical Navigable Small World) is faster than IVFFlat
-- m=16: number of connections per layer (higher = better recall, slower build)
-- ef_construction=64: size of dynamic candidate list (higher = better quality)
CREATE INDEX IF NOT EXISTS stories_embedding_idx 
ON stories 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Add index on epic_id for faster filtering
CREATE INDEX IF NOT EXISTS stories_epic_id_embedding_idx 
ON stories (epic_id) 
WHERE embedding IS NOT NULL;

-- Add updated_at trigger for embeddings
CREATE OR REPLACE FUNCTION update_story_embedding_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.embedding IS DISTINCT FROM OLD.embedding THEN
    NEW.updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS stories_embedding_update ON stories;
CREATE TRIGGER stories_embedding_update
BEFORE UPDATE ON stories
FOR EACH ROW
EXECUTE FUNCTION update_story_embedding_timestamp();

-- Add comment for documentation
COMMENT ON COLUMN stories.embedding IS 'Vector embedding (1536-dim) for semantic similarity search using OpenAI text-embedding-3-small via OpenRouter';
COMMENT ON INDEX stories_embedding_idx IS 'HNSW index for fast cosine similarity search on story embeddings';

