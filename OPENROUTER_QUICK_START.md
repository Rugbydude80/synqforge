# 🚀 Semantic Search Quick Start (OpenRouter Edition)

**Great news!** Since you're already using OpenRouter, semantic search setup is even simpler. Your existing `OPENROUTER_API_KEY` works for embeddings too!

**Time to deploy**: ~15 minutes  
**Extra cost**: <$0.10/month (embeddings are very cheap)

---

## ⚡ Super Fast Track (3 Commands)

```bash
# 1. Add one environment variable to Vercel
vercel env add OPENROUTER_EMBEDDING_MODEL production
# Enter: openai/text-embedding-3-small

vercel env add ENABLE_SEMANTIC_SEARCH production
# Enter: true

# 2. Run database migration
export DATABASE_URL=$(grep DATABASE_URL .env.local | cut -d '=' -f2-)
psql $DATABASE_URL < db/migrations/008_add_pgvector.sql

# 3. Backfill existing stories
npm run embeddings:backfill
```

**That's it!** Your existing `OPENROUTER_API_KEY` already works for embeddings.

---

## 📋 Detailed Steps

### Step 1: Add Environment Variables (2 minutes)

You already have `OPENROUTER_API_KEY` configured in Vercel. Just add these two:

```bash
cd /Users/chrisrobertson/Desktop/synqforge

# Add embedding model setting
vercel env add OPENROUTER_EMBEDDING_MODEL production
# When prompted, enter: openai/text-embedding-3-small

# Enable semantic search
vercel env add ENABLE_SEMANTIC_SEARCH production
# When prompted, enter: true

# Pull to local for testing
vercel env pull .env.local
```

### Step 2: Run Database Migration (2 minutes)

```bash
# Get database URL
export DATABASE_URL=$(grep DATABASE_URL .env.local | cut -d '=' -f2-)

# Run migration (adds vector column and index)
psql $DATABASE_URL < db/migrations/008_add_pgvector.sql

# Verify (should show "embedding | USER-DEFINED")
psql $DATABASE_URL -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'stories' AND column_name = 'embedding';"
```

### Step 3: Test Locally (3 minutes)

```bash
# Start dev server
npm run dev

# In another terminal, test health check
curl http://localhost:3000/api/embeddings/health
```

Expected response:
```json
{
  "status": "healthy",
  "checks": {
    "database": true,
    "openrouterApi": true,
    "indexExists": true
  },
  "enabled": true
}
```

### Step 4: Deploy (3 minutes)

```bash
# Commit and push
git add .
git commit -m "feat: Add semantic search via OpenRouter embeddings"
git push origin main

# Monitor deployment
vercel logs --follow
```

### Step 5: Backfill Stories (5-30 minutes depending on story count)

```bash
# Run backfill script
npm run embeddings:backfill

# Follow the prompts:
# - Shows health checks ✅
# - Shows statistics (e.g., "342 stories without embeddings")
# - Asks for confirmation
# - Processes in batches of 5 with 1-second delays
# - Shows final statistics
```

---

## ✅ Verification

```bash
# Check health
curl https://your-app.vercel.app/api/embeddings/health

# Check embedding coverage
psql $DATABASE_URL -c "SELECT COUNT(*) as total, COUNT(embedding) as embedded FROM stories;"

# Test story generation with semantic search
curl -X POST https://your-app.vercel.app/api/ai/generate-stories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "requirements":"Export data feature",
    "projectId":"ID",
    "epicId":"ID",
    "contextLevel":"comprehensive"
  }'
# Should return: meta.semanticSearchUsed: true
```

---

## 💰 Cost Breakdown

### What You're Already Paying (OpenRouter)
- Story generation (qwen/qwen3-max): ~$5-20/month
- **Total current**: ~$5-20/month

### What Semantic Search Adds
- Embeddings (text-embedding-3-small): <$0.10/month
- **New total**: ~$5-20/month (basically the same!)

### Why So Cheap?

Embeddings are incredibly cost-effective:
```
1,000 stories embedded:
- 1,000 stories × 200 tokens/story = 200,000 tokens
- Cost: $0.004 (less than half a cent!)

Monthly cost even with 10,000 stories: ~$0.04
```

**Token Savings** more than pay for it:
- Before: 6,000 tokens/story (comprehensive context)
- After: 1,500 tokens/story (semantic search)
- **Savings**: ~$2.50/month per Pro user

**Net savings**: $2.40+/month 💰

---

## 🔧 Configuration Options

### Default Settings (Recommended)
```bash
OPENROUTER_EMBEDDING_MODEL="openai/text-embedding-3-small"  # 1536 dims, $0.02/1M tokens
SEMANTIC_SEARCH_MIN_SIMILARITY="0.7"  # 70% similarity threshold
SEMANTIC_SEARCH_MAX_RESULTS="5"  # Top 5 similar stories
```

### If You Want Higher Quality (Optional)
```bash
# Use larger model (3072 dimensions)
OPENROUTER_EMBEDDING_MODEL="openai/text-embedding-3-large"

# Also update database:
psql $DATABASE_URL -c "ALTER TABLE stories ALTER COLUMN embedding TYPE vector(3072);"
psql $DATABASE_URL -c "DROP INDEX stories_embedding_idx; CREATE INDEX stories_embedding_idx ON stories USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);"

# Re-run backfill
npm run embeddings:backfill
```

Cost: $0.13/1M tokens (6.5x more expensive, but still cheap)

---

## 🎯 What This Does

### Before (Current)
When generating a story with "Comprehensive" context:
- Fetches **ALL stories in the epic** (could be 50+)
- Dumps everything into the prompt
- Uses ~6,000 tokens
- AI sees lots of irrelevant examples

### After (With Semantic Search)
When generating a story with "Comprehensive" context:
- **Finds the 5 most similar stories** using vector search
- Only includes relevant examples in the prompt
- Uses ~1,500 tokens (75% reduction!)
- AI sees only relevant examples

**Result**: Better quality, lower cost, faster generation.

---

## 📊 Expected Results

After deployment:

### Immediate
- ✅ Health check returns "healthy"
- ✅ Stories start getting embeddings automatically
- ✅ Comprehensive context uses semantic search

### Within 24 Hours
- ✅ >95% of stories have embeddings
- ✅ Token usage reduced by 70-80%
- ✅ Story generation quality maintains or improves

### Within 1 Week
- ✅ Cost savings visible in OpenRouter dashboard
- ✅ Users report better story consistency
- ✅ No performance issues

---

## 🐛 Troubleshooting

### "openrouterApi: false" in Health Check

Your OpenRouter key should work automatically. If not:

```bash
# Test embeddings directly
curl https://openrouter.ai/api/v1/embeddings \
  -H "Authorization: Bearer $(grep OPENROUTER_API_KEY .env.local | cut -d '=' -f2-)" \
  -H "Content-Type: application/json" \
  -d '{"model":"openai/text-embedding-3-small","input":"test"}'

# Should return embedding array
```

If that fails, your OpenRouter account might not have embeddings enabled. Contact OpenRouter support.

### "No Similar Stories Found"

```bash
# Check if stories in epic have embeddings
psql $DATABASE_URL -c "SELECT COUNT(*) FROM stories WHERE epic_id = 'YOUR_EPIC_ID' AND embedding IS NOT NULL;"

# If zero, run backfill
npm run embeddings:backfill
```

### Backfill Takes Too Long

That's normal! Processing time:
- 100 stories ≈ 2 minutes
- 500 stories ≈ 10 minutes
- 1,000 stories ≈ 20 minutes

Rate limited to avoid hitting OpenRouter limits (5 stories/second).

---

## 🎉 Success!

Once deployed, your Pro+ users will automatically get:
- ✅ Semantic context search in "Comprehensive" mode
- ✅ 75% token reduction
- ✅ Better story quality
- ✅ Faster generation times

**No changes to your existing OpenRouter setup needed!** 

The same API key that powers your story generation now powers semantic search too.

---

## 📚 Additional Resources

- **OpenRouter Setup**: See `docs/OPENROUTER_SETUP_NOTE.md`
- **Full Documentation**: See `docs/SEMANTIC_SEARCH_SETUP.md`
- **Environment Variables**: See `docs/ENV_VARIABLES.md`
- **Validation**: Run `npm run embeddings:validate`

---

**Ready to deploy?** Just run the 3 commands at the top of this guide! 🚀

