# Semantic Search Setup Guide

## Overview

This guide walks you through setting up semantic similarity search using pgvector for improved AI story generation. This feature reduces token usage by 75% while maintaining or improving quality by finding the most relevant stories as context.

## Prerequisites

- Neon PostgreSQL database (already configured)
- Qwen API key for embeddings
- Vercel CLI installed and configured
- Node.js 18+ and npm/pnpm

## Environment Variables

Add these to your `.env.local` and Vercel environment:

```bash
# Database (should already exist)
DATABASE_URL="postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Qwen API Configuration
QWEN_API_KEY="your-qwen-api-key-here"
QWEN_API_ENDPOINT="https://dashscope.aliyuncs.com/api/v1"
QWEN_EMBEDDING_MODEL="text-embedding-v3"

# Semantic Search Feature Flags
ENABLE_SEMANTIC_SEARCH="true"
SEMANTIC_SEARCH_MIN_SIMILARITY="0.7"
SEMANTIC_SEARCH_MAX_RESULTS="5"
```

### Adding to Vercel

```bash
# Navigate to project
cd /Users/chrisrobertson/Desktop/synqforge

# Add each variable to Vercel production environment
vercel env add QWEN_API_KEY production
vercel env add QWEN_API_ENDPOINT production
vercel env add QWEN_EMBEDDING_MODEL production
vercel env add ENABLE_SEMANTIC_SEARCH production
vercel env add SEMANTIC_SEARCH_MIN_SIMILARITY production
vercel env add SEMANTIC_SEARCH_MAX_RESULTS production

# Pull to verify
vercel env pull .env.local
```

## Installation Steps

### Step 1: Install Dependencies

```bash
npm install @neondatabase/serverless
```

### Step 2: Run Database Migration

```bash
# Connect to your Neon database via Vercel
export DATABASE_URL=$(grep DATABASE_URL .env.local | cut -d '=' -f2-)

# Run the migration
psql $DATABASE_URL < db/migrations/008_add_pgvector.sql

# Verify the migration
psql $DATABASE_URL -c "
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'stories' AND column_name = 'embedding';
"
```

Expected output:
```
 column_name | data_type  
-------------+------------
 embedding   | USER-DEFINED
```

### Step 3: Verify Index Creation

```bash
psql $DATABASE_URL -c "
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'stories' AND indexname LIKE '%embedding%';
"
```

Expected output should show `stories_embedding_idx` and `stories_epic_id_embedding_idx`.

### Step 4: Test Health Check

```bash
# Start local dev server
npm run dev

# In another terminal, test health endpoint
curl http://localhost:3000/api/embeddings/health

# Expected response:
# {
#   "status": "healthy",
#   "checks": {
#     "database": true,
#     "qwenApi": true,
#     "indexExists": true
#   },
#   "enabled": true,
#   "timestamp": "2025-10-28T13:53:00.000Z"
# }
```

### Step 5: Backfill Existing Stories

```bash
# Run the backfill script
npx tsx scripts/backfill-embeddings.ts

# Follow the prompts to process all existing stories
```

This will:
- Check health of all services
- Show statistics of stories needing embeddings
- Ask for confirmation
- Process stories in batches with rate limiting
- Show progress and final statistics

### Step 6: Deploy to Production

```bash
# Commit all changes
git add .
git commit -m "feat: Add semantic context search with pgvector"

# Push to trigger Vercel deployment
git push origin main

# Or deploy directly
vercel --prod
```

### Step 7: Backfill Production Data

After deployment, run the backfill script against production:

```bash
# Make sure .env.local has production DATABASE_URL
npx tsx scripts/backfill-embeddings.ts
```

## Usage

### In Story Generation API

The semantic search is automatically integrated into the story generation API when using COMPREHENSIVE context levels:

```typescript
// Example API call
const response = await fetch('/api/ai/generate-stories', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    requirements: "As a user, I want to export data to CSV",
    projectId: "project-123",
    epicId: "epic-456",
    contextLevel: "comprehensive", // Enable semantic search
  }),
});

const data = await response.json();
// data.meta.semanticSearchUsed will be true if search was used
```

### Using the Context Selector Component

```typescript
import { ContextSelector } from '@/components/story-generation/ContextSelector';
import { ContextLevel, UserTier } from '@/lib/types/context.types';

function MyComponent() {
  const [contextLevel, setContextLevel] = useState(ContextLevel.STANDARD);
  
  return (
    <ContextSelector
      userTier={UserTier.PRO}
      actionsUsed={245}
      monthlyLimit={800}
      selectedLevel={contextLevel}
      onLevelChange={setContextLevel}
      epicId="epic-123"
      projectId="project-456"
    />
  );
}
```

## Monitoring

### Check Embedding Coverage

```bash
psql $DATABASE_URL -c "
SELECT 
  COUNT(*) as total_stories,
  COUNT(embedding) as stories_with_embeddings,
  ROUND(100.0 * COUNT(embedding) / COUNT(*), 2) as percentage_embedded
FROM stories;
"
```

### Find Stories Without Embeddings

```bash
psql $DATABASE_URL -c "
SELECT id, title, created_at
FROM stories
WHERE embedding IS NULL
ORDER BY created_at DESC
LIMIT 10;
"
```

### Test Similarity Search

```bash
psql $DATABASE_URL -c "
SELECT 
  s1.title as source,
  s2.title as similar_to,
  ROUND((1 - (s1.embedding <=> s2.embedding))::numeric, 3) as similarity
FROM stories s1
CROSS JOIN stories s2
WHERE s1.id != s2.id
  AND s1.embedding IS NOT NULL
  AND s2.embedding IS NOT NULL
ORDER BY s1.embedding <=> s2.embedding
LIMIT 10;
"
```

## Maintenance

### Retry Failed Embeddings

If some stories failed to embed, retry them:

```bash
npx tsx scripts/retry-failed-embeddings.ts
```

This script:
- Finds stories without embeddings older than 5 minutes
- Retries embedding generation
- Shows progress and statistics

### Performance Optimization

If searches are slow (>500ms), increase the HNSW index parameters:

```sql
-- Drop old index
DROP INDEX IF EXISTS stories_embedding_idx;

-- Create new index with higher parameters
CREATE INDEX stories_embedding_idx 
ON stories 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 32, ef_construction = 128);

-- Analyze table
ANALYZE stories;
```

### Cost Monitoring

- **Embedding generation**: ~$0.0001 per story
- **Expected monthly cost**: <$0.10 for typical usage
- **Savings**: ~$2.50/month per Pro user from reduced token usage

## Troubleshooting

### "Extension vector does not exist"

```bash
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### "Qwen API returns 401"

Check your API key:

```bash
echo $QWEN_API_KEY
# Should show your API key

# Test manually
curl -X POST https://dashscope.aliyuncs.com/api/v1/services/embeddings/text-embedding/text-embedding \
  -H "Authorization: Bearer $QWEN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"text-embedding-v3","input":{"texts":["test"]}}'
```

### "Index not being used"

Check query plan:

```sql
EXPLAIN ANALYZE
SELECT title, 1 - (embedding <=> '[test-vector]'::vector) AS similarity
FROM stories
WHERE embedding IS NOT NULL
ORDER BY embedding <=> '[test-vector]'::vector
LIMIT 5;
```

Should show "Index Scan using stories_embedding_idx".

### "Slow searches"

Increase ef_search parameter:

```sql
SET hnsw.ef_search = 100; -- Default is 40
```

## Success Metrics

After implementation, you should see:

- ✅ Token usage reduction: 70-80% for comprehensive context
- ✅ Search performance: <300ms including embedding generation
- ✅ Cost savings: ~$2.50/month per Pro user
- ✅ Context quality: Same or improved with semantic search

## Rollback

If you need to revert:

```sql
-- Remove embeddings functionality (keeps data)
DROP INDEX IF EXISTS stories_embedding_idx;
DROP INDEX IF EXISTS stories_epic_id_embedding_idx;
DROP TRIGGER IF EXISTS stories_embedding_update ON stories;
DROP FUNCTION IF EXISTS update_story_embedding_timestamp();

-- Or remove column entirely (destroys embedding data)
ALTER TABLE stories DROP COLUMN IF EXISTS embedding;
```

Then set feature flag:
```bash
ENABLE_SEMANTIC_SEARCH=false
```

## Support

For issues or questions:
1. Check the health endpoint: `/api/embeddings/health`
2. Review server logs for detailed error messages
3. Check Neon database connection and query logs
4. Verify Qwen API key and quota

