# ⚠️ Important: OpenRouter Integration

## Using OpenRouter for All AI Features

This project uses **OpenRouter** as the AI API gateway for all AI features, including:
- Story generation (using `qwen/qwen3-max`)
- **Semantic embeddings** (using `openai/text-embedding-3-small`)

## Why OpenRouter?

OpenRouter provides:
- ✅ Single API key for multiple AI models
- ✅ Unified billing and usage tracking
- ✅ OpenAI-compatible API (easy to integrate)
- ✅ Access to both Qwen and OpenAI models
- ✅ Already configured in this project

## Configuration

### Environment Variables (Already Set in Vercel)

```bash
# Single API key for all AI features
OPENROUTER_API_KEY="sk-or-v1-xxxxx"

# Embedding model (via OpenRouter)
OPENROUTER_EMBEDDING_MODEL="openai/text-embedding-3-small"

# Feature flags
ENABLE_SEMANTIC_SEARCH="true"
```

**No additional API keys needed!** The existing `OPENROUTER_API_KEY` in Vercel works for both:
- Story generation (qwen/qwen3-max)
- Embeddings (openai/text-embedding-3-small)

## Embedding Models Available on OpenRouter

| Model | Dimensions | Cost | Best For |
|-------|-----------|------|----------|
| `openai/text-embedding-3-small` | 1536 | $0.02/1M tokens | **Recommended** - Best balance |
| `openai/text-embedding-3-large` | 3072 | $0.13/1M tokens | Higher quality, more expensive |
| `openai/text-embedding-ada-002` | 1536 | $0.10/1M tokens | Legacy model |

**Current Implementation**: Uses `text-embedding-3-small` (1536 dimensions)

## Database Configuration

The vector column is configured for **1536 dimensions** to match `text-embedding-3-small`:

```sql
ALTER TABLE stories 
ADD COLUMN embedding vector(1536);
```

### To Use Larger Model (Optional)

If you want to use `text-embedding-3-large` (3072 dims):

1. Update environment variable:
```bash
OPENROUTER_EMBEDDING_MODEL="openai/text-embedding-3-large"
```

2. Update database migration:
```sql
-- Change vector(1536) to vector(3072)
ALTER TABLE stories 
ALTER COLUMN embedding TYPE vector(3072);

-- Rebuild index
DROP INDEX stories_embedding_idx;
CREATE INDEX stories_embedding_idx 
ON stories 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

3. Re-run backfill to regenerate all embeddings

## Cost Comparison

### Embedding Costs (per 1,000 stories)

Assuming average story = 200 tokens:

```
text-embedding-3-small: 1,000 stories × 200 tokens = 200K tokens
Cost: $0.004 (less than half a cent!)

text-embedding-3-large: Same calculation
Cost: $0.026 (2.6 cents)
```

**Recommendation**: Stick with `text-embedding-3-small` unless you need the highest quality embeddings.

## Integration with Existing Code

The embeddings service reuses the existing OpenRouter client (`lib/ai/client.ts`):

```typescript
import { openai } from '@/lib/ai/client';

// Generate embedding using OpenRouter
const response = await openai.embeddings.create({
  model: 'openai/text-embedding-3-small',
  input: text,
});
```

**Benefits**:
- ✅ No separate API configuration needed
- ✅ Consistent error handling
- ✅ Same headers (HTTP-Referer, X-Title) applied
- ✅ Unified usage tracking

## Billing

All costs (story generation + embeddings) appear in your single OpenRouter dashboard:
- View at: https://openrouter.ai/activity
- Track usage by model
- Set spending limits

**Typical Monthly Costs**:
- Story generation: ~$5-20 (depending on usage)
- Embeddings: <$0.10 (very cheap!)
- **Total**: ~$5-20/month for Pro tier usage

## No Action Required

✅ Your existing `OPENROUTER_API_KEY` already works for embeddings!

Just:
1. Run the database migration
2. Run the backfill script
3. Semantic search will work immediately

## Troubleshooting

### "Model not found" Error

If you see model errors, verify your OpenRouter account supports embeddings:

```bash
# Test embeddings endpoint
curl https://openrouter.ai/api/v1/embeddings \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openai/text-embedding-3-small",
    "input": "test"
  }'
```

### Rate Limiting

OpenRouter has generous rate limits:
- Free tier: 10 requests/minute
- Paid: 200 requests/minute

The backfill script respects these with 1-second delays between batches.

## Summary

✅ **Already configured**: OpenRouter API key works for everything  
✅ **No extra setup**: Reuses existing AI client  
✅ **Cost effective**: <$0.10/month for embeddings  
✅ **Simple billing**: Single dashboard for all AI costs  

Just run the migration and you're good to go! 🚀

