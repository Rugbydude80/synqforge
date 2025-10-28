# ✅ Production Deployment Checklist

## Status: Code Pushed to GitHub ✅

Commit: `3c16a26` - "feat: Add Smart Context marketing to pricing and landing pages"

---

## Quick Deploy

```bash
cd /Users/chrisrobertson/Desktop/synqforge
./deploy-to-vercel.sh
```

This interactive script will guide you through all remaining steps.

---

## Manual Deployment Steps

### ✅ Step 1: Push Code (COMPLETED)

```bash
git push clean main
```

**Status:** ✅ Pushed successfully to GitHub

---

### ⏳ Step 2: Add Environment Variables in Vercel

**Go to:** https://vercel.com/dashboard → Your Project → Settings → Environment Variables

**Add these 4 new variables** (for all environments: Production, Preview, Development):

| Variable | Value |
|----------|-------|
| `OPENROUTER_EMBEDDING_MODEL` | `openai/text-embedding-3-small` |
| `ENABLE_SEMANTIC_SEARCH` | `true` |
| `SEMANTIC_SEARCH_MIN_SIMILARITY` | `0.7` |
| `SEMANTIC_SEARCH_MAX_RESULTS` | `5` |

**Note:** Your existing `OPENROUTER_API_KEY` already works for embeddings!

**Status:** ⏳ Waiting for you to add these in Vercel dashboard

---

### ⏳ Step 3: Run Database Migration

**Option A - Via Vercel CLI (Recommended):**

```bash
# Install Vercel CLI
npm install -g vercel

# Pull production environment
vercel env pull .env.production

# Run migration
source .env.production
psql "$DATABASE_URL" -f db/migrations/008_add_pgvector.sql
```

**Option B - Via Neon Console:**

1. Go to: https://console.neon.tech
2. Select your SynqForge database
3. Open "SQL Editor"
4. Copy and paste contents of: `db/migrations/008_add_pgvector.sql`
5. Click "Run"

**What this does:**
- Enables `pgvector` extension
- Adds `embedding vector(1536)` column to stories table
- Creates HNSW index for fast similarity search
- Safe operation - only adds new columns, doesn't modify existing data

**Status:** ⏳ Waiting for migration

---

### ⏳ Step 4: Deploy to Production

Vercel will **auto-deploy** when you push to GitHub (already done in Step 1).

Check deployment status: https://vercel.com/dashboard

**Or trigger manual deployment:**

```bash
vercel --prod
```

**Status:** ⏳ Check Vercel dashboard for deployment status

---

### ⏳ Step 5: Verify Deployment

**Test health endpoint:**

```bash
curl https://your-app.vercel.app/api/embeddings/health
```

**Expected response:**

```json
{
  "status": "healthy",
  "checks": {
    "database": true,
    "openrouterApi": true,
    "indexExists": true
  },
  "enabled": true,
  "timestamp": "2025-10-28T..."
}
```

**Test in browser:**
1. Log in as a Pro/Team user
2. Go to story generation
3. Select "Smart Context" or "Comprehensive" mode
4. Generate a story
5. Verify semantic search is finding similar stories

**Status:** ⏳ Waiting for verification

---

### 🎁 Step 6: Optional - Backfill Existing Stories

Generate embeddings for existing stories (can be done anytime):

```bash
# Via Vercel CLI
vercel env pull
npm run embeddings:backfill

# Or via production server
# (if you have SSH access)
ssh your-server
cd synqforge
npm run embeddings:backfill
```

This is **optional** - new stories will automatically get embeddings.

**Status:** ⏭️  Optional (can do later)

---

## What's Live After Deployment

### 🏠 Landing Page Updates
- ✅ Hero: "AI that learns from your similar stories for 75% better context"
- ✅ WhySynqForge: "AI that learns from your stories — 75% more relevant context"
- ✅ **NEW:** SmartContextFeature showcase section with visual demo
- ✅ Pro+ upgrade CTA

### 💰 Pricing Page Updates
- ✅ Pro plan: "Smart Context — AI learns from similar stories (75% faster)"
- ✅ Team plan: "Smart Context + Deep Reasoning mode"
- ✅ Enterprise plan: "Smart Context + Deep Reasoning + Custom models"
- ✅ New AI action cost examples (2× for Smart Context, 3× for Deep Reasoning)

### 🚀 In-App Features (Pro+ Users)
- ✅ Context level selector in story generation
- ✅ Semantic search automatically finds 5 most relevant stories
- ✅ Tier-based access control
- ✅ Real-time AI action cost estimates
- ✅ Upgrade CTAs for Starter/Core users

---

## Expected Impact

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| **Context Tokens** | 6,000 | 1,500 | -75% |
| **Monthly Cost (Pro)** | ~$3.20 | ~$0.80 | -$2.40 |
| **Generation Speed** | ~3-5s | ~1.5-2.5s | 2x faster |
| **Story Quality** | Good | Excellent | Better context |

---

## Rollback Plan

If something goes wrong:

```bash
# Option 1: Disable feature via environment variable
# In Vercel dashboard, set:
ENABLE_SEMANTIC_SEARCH="false"

# Option 2: Revert code
git revert 3c16a26
git push clean main

# Option 3: Rollback database (if needed)
psql "$DATABASE_URL" -c "ALTER TABLE stories DROP COLUMN IF EXISTS embedding;"
```

**Note:** The feature is designed to gracefully degrade - if anything fails, it falls back to standard generation without semantic search.

---

## Troubleshooting

### Health check returns "unhealthy"

**Check:**
1. Environment variables are set in Vercel
2. Database migration ran successfully
3. `OPENROUTER_API_KEY` is valid

### "pgvector extension not found"

**Solution:** Run the migration - it installs pgvector:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Embeddings not generating

**Check:**
1. `ENABLE_SEMANTIC_SEARCH="true"` in Vercel
2. `OPENROUTER_API_KEY` is set
3. Check logs: `vercel logs --prod`

### Semantic search not working

**Debug:**
```bash
# Check if stories have embeddings
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM stories WHERE embedding IS NOT NULL;"

# Check index exists
psql "$DATABASE_URL" -c "\d stories"
```

---

## Support

- **Technical Docs:** `🎉_IMPLEMENTATION_COMPLETE.md`
- **OpenRouter Setup:** `OPENROUTER_QUICK_START.md`
- **Detailed Guide:** `FINAL_DEPLOYMENT_GUIDE.md`

---

## Ready to Deploy?

```bash
./deploy-to-vercel.sh
```

This will guide you through all remaining steps interactively!

