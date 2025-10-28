# 🚀 Quick Start: Semantic Search Deployment

**Time to deploy**: ~30 minutes  
**Difficulty**: Intermediate

---

## ⚡ Fast Track (5 Commands)

```bash
# 1. Add environment variables to Vercel
vercel env add QWEN_API_KEY production
# Enter your Qwen API key when prompted

vercel env add ENABLE_SEMANTIC_SEARCH production
# Enter: true

# 2. Pull variables locally
vercel env pull .env.local

# 3. Run database migration
export DATABASE_URL=$(grep DATABASE_URL .env.local | cut -d '=' -f2-)
psql $DATABASE_URL < db/migrations/008_add_pgvector.sql

# 4. Deploy to production
git add . && git commit -m "feat: Add semantic search" && git push

# 5. Backfill existing stories
npm run embeddings:backfill
```

Done! ✅

---

## 📋 Detailed Steps

### 1️⃣ Get Qwen API Key (5 min)

1. Go to https://dashscope.aliyuncs.com/
2. Sign up/login
3. Navigate to API Keys
4. Create new API key
5. Copy the key (starts with `sk-`)

### 2️⃣ Configure Environment (5 min)

```bash
cd /Users/chrisrobertson/Desktop/synqforge

# Add to Vercel
vercel env add QWEN_API_KEY production
# Paste your API key

vercel env add QWEN_API_ENDPOINT production
# Enter: https://dashscope.aliyuncs.com/api/v1

vercel env add QWEN_EMBEDDING_MODEL production
# Enter: text-embedding-v3

vercel env add ENABLE_SEMANTIC_SEARCH production
# Enter: true

vercel env add SEMANTIC_SEARCH_MIN_SIMILARITY production
# Enter: 0.7

vercel env add SEMANTIC_SEARCH_MAX_RESULTS production
# Enter: 5

# Pull to local
vercel env pull .env.local
```

### 3️⃣ Run Database Migration (5 min)

```bash
# Get database URL
export DATABASE_URL=$(grep DATABASE_URL .env.local | cut -d '=' -f2-)

# Install psql if needed (macOS)
brew install postgresql

# Run migration
psql $DATABASE_URL < db/migrations/008_add_pgvector.sql

# Verify (should show "embedding | USER-DEFINED")
psql $DATABASE_URL -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'stories' AND column_name = 'embedding';"
```

✅ **Success**: See "embedding | USER-DEFINED"  
❌ **Error**: Check DATABASE_URL is correct

### 4️⃣ Test Locally (5 min)

```bash
# Start dev server
npm run dev

# In new terminal, test health check
curl http://localhost:3000/api/embeddings/health

# Should return:
# {
#   "status": "healthy",
#   "checks": { "database": true, "qwenApi": true, "indexExists": true },
#   "enabled": true
# }
```

✅ **Success**: All checks are `true`  
❌ **Error**: See troubleshooting below

### 5️⃣ Deploy to Production (5 min)

```bash
# Commit changes
git add .
git commit -m "feat: Add semantic context search with pgvector"
git push origin main

# Wait for Vercel deployment (~2 min)
# Check at: https://vercel.com/your-project/deployments

# Verify production health
curl https://your-app.vercel.app/api/embeddings/health
```

### 6️⃣ Backfill Stories (5-30 min)

Depends on number of stories:
- 100 stories ≈ 2 minutes
- 500 stories ≈ 10 minutes
- 1000 stories ≈ 20 minutes

```bash
npm run embeddings:backfill

# Output:
# 🚀 Starting embeddings backfill migration...
# 🏥 Running health check...
# ✅ All health checks passed
# 📊 Current statistics:
#    Total stories: 342
#    Without embeddings: 342
# Process 342 stories? (yes/no): yes
# 
# [Progress bar]
# ✨ Migration complete!
#    ✅ Successfully embedded: 342
#    ❌ Failed: 0
```

---

## ✅ Verification Checklist

Run these to confirm everything works:

```bash
# 1. Check health endpoint
curl https://your-app.vercel.app/api/embeddings/health
# Expected: status: "healthy"

# 2. Check embedding coverage
psql $DATABASE_URL -c "SELECT COUNT(*) as total, COUNT(embedding) as embedded FROM stories;"
# Expected: embedded = total (or close)

# 3. Test story generation (replace IDs)
curl -X POST https://your-app.vercel.app/api/ai/generate-stories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"requirements":"Export data","projectId":"ID","epicId":"ID","contextLevel":"comprehensive"}'
# Expected: meta.semanticSearchUsed: true
```

All passed? **You're done!** 🎉

---

## ⚠️ Troubleshooting

### Health Check Fails

**Problem**: `qwenApi: false`

**Fix**:
```bash
# Check API key is set
vercel env ls | grep QWEN_API_KEY

# If missing, add it
vercel env add QWEN_API_KEY production

# Redeploy
vercel --prod
```

---

**Problem**: `indexExists: false`

**Fix**:
```bash
# Re-run migration
psql $DATABASE_URL < db/migrations/008_add_pgvector.sql
```

---

### Backfill Fails

**Problem**: "Failed to embed story: 401 Unauthorized"

**Fix**:
```bash
# Test API key directly
curl -X POST https://dashscope.aliyuncs.com/api/v1/services/embeddings/text-embedding/text-embedding \
  -H "Authorization: Bearer $(grep QWEN_API_KEY .env.local | cut -d '=' -f2-)" \
  -H "Content-Type: application/json" \
  -d '{"model":"text-embedding-v3","input":{"texts":["test"]}}'

# If 401, API key is invalid - get new one
```

---

**Problem**: "Some stories failed to embed"

**Fix**:
```bash
# Wait 1 minute, then retry
npm run embeddings:retry
```

---

### No Similar Stories Found

**Problem**: `semanticSearchUsed: false` in API response

**Fix**:
```bash
# 1. Check stories have embeddings
psql $DATABASE_URL -c "SELECT COUNT(embedding) FROM stories WHERE epic_id = 'YOUR_EPIC_ID';"

# 2. If 0, run backfill
npm run embeddings:backfill

# 3. Lower threshold temporarily
vercel env add SEMANTIC_SEARCH_MIN_SIMILARITY production
# Enter: 0.6

# 4. Redeploy
vercel --prod
```

---

## 📊 Expected Results

After deployment, you should see:

**Token Reduction**:
```
Before: ~6,000 tokens (all epic stories)
After:  ~1,500 tokens (top 5 similar stories)
Savings: 75% 🎉
```

**Performance**:
```
Embedding generation: ~200ms
Similarity search:    ~300ms
Total overhead:       ~500ms (acceptable)
```

**Cost**:
```
Embedding cost:  $0.0001/story
Monthly infra:   <$0.10
Token savings:   ~$2.50/Pro user/month
Net savings:     $2.40+/user/month 💰
```

**Quality**:
- ✅ More relevant context
- ✅ Better story consistency
- ✅ Fewer irrelevant examples

---

## 🎯 Using the Feature

### For Developers

Update your story generation calls:

```typescript
// Old way (dumps all epic stories)
const response = await fetch('/api/ai/generate-stories', {
  body: JSON.stringify({
    requirements: "...",
    projectId: "...",
    epicId: "...",
    // No contextLevel specified = old behavior
  })
});

// New way (semantic search)
const response = await fetch('/api/ai/generate-stories', {
  body: JSON.stringify({
    requirements: "...",
    projectId: "...",
    epicId: "...",
    contextLevel: "comprehensive", // 🆕 Triggers semantic search
  })
});

// Check response
const data = await response.json();
console.log('Semantic search used:', data.meta.semanticSearchUsed);
console.log('Context size:', data.meta.contextLength, 'characters');
```

### For Users

Add the `ContextSelector` component to your story creation UI:

```typescript
import { ContextSelector } from '@/components/story-generation/ContextSelector';

<ContextSelector
  userTier={session.user.tier}
  actionsUsed={245}
  monthlyLimit={800}
  selectedLevel={contextLevel}
  onLevelChange={setContextLevel}
  epicId={currentEpic.id}
  projectId={currentProject.id}
/>
```

Users will see:
- 📊 Visual tier restrictions
- 🔒 Locked features with upgrade prompts
- 📈 Usage tracking
- 💡 Feature explanations

---

## 🎊 Success!

You've deployed semantic search with pgvector!

**What you've gained**:
- ✅ 75% token reduction for comprehensive context
- ✅ Better story quality with relevant examples
- ✅ Tier differentiation (Pro+ feature)
- ✅ Scalable architecture for large epics
- ✅ Production-ready with health checks

**Next steps**:
1. Monitor for 24 hours
2. Check embedding coverage daily
3. Gather user feedback
4. Celebrate! 🎉

---

## 📚 More Information

- **Full setup guide**: `docs/SEMANTIC_SEARCH_SETUP.md`
- **Environment vars**: `docs/ENV_VARIABLES.md`
- **Implementation details**: `docs/SEMANTIC_SEARCH_IMPLEMENTATION_COMPLETE.md`

Questions? Check the troubleshooting section or review the logs:
```bash
vercel logs --follow
```

Happy coding! 🚀

