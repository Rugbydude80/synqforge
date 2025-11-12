# 🚀 Story Refinement Feature - Launch Checklist

## ✅ Implementation Status: **COMPLETE & READY**

All components have been implemented and are ready for testing.

---

## 🔧 Pre-Launch Steps

### Step 1: Database Migration (REQUIRED)

**Run these commands:**

```bash
# Option 1: Using npm scripts (if PATH is configured)
npm run db:generate
npm run db:push

# Option 2: Using npx directly
npx drizzle-kit generate
npx drizzle-kit push

# Option 3: Manual SQL (if drizzle-kit fails)
# See db/migrations/ folder for SQL files
```

**Verify tables were created:**

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('story_refinements', 'story_revisions');

-- Check columns
\d story_refinements
\d story_revisions
```

**Expected:** Both tables should exist with all columns from schema.

---

### Step 2: Environment Variables

**Verify `.env.local` has:**

```bash
# Required
OPENROUTER_API_KEY=sk-...              # Your OpenRouter API key
DATABASE_URL=postgresql://...          # Database connection

# Optional
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Test API Key:**

```bash
curl https://openrouter.ai/api/v1/models \
  -H "Authorization: Bearer $OPENROUTER_API_KEY"
```

---

### Step 3: Create Test User

**Update a test user to Pro tier:**

```sql
-- Update organization tier (not user tier)
UPDATE organizations 
SET subscription_tier = 'pro' 
WHERE id = 'your-org-id';

-- Verify
SELECT id, name, subscription_tier 
FROM organizations 
WHERE subscription_tier = 'pro';
```

**Note:** Subscription tier is stored on the `organizations` table, not `users` table.

---

### Step 4: Run Verification Script

```bash
npx tsx scripts/verify-refinement-setup.ts
```

This will check:
- ✅ Tables exist
- ✅ Feature gates work
- ✅ Services are available
- ✅ Environment variables set

---

## 🧪 Quick Test Flow

### Test 1: Basic Functionality (5 minutes)

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Navigate to a story:**
   - Go to any project
   - Click on a story
   - Ensure story has a description

3. **Test refinement:**
   - Click "Refine Story" button
   - Enter: "Make this more descriptive and engaging"
   - Click "Generate Refinement"
   - Wait 30-60 seconds
   - Review changes in split view
   - Click "Accept Refinement"
   - Verify story updated

### Test 2: Feature Gate (2 minutes)

1. **As Free tier user:**
   - Button should show lock icon 🔒
   - Tooltip: "Upgrade to Pro to refine stories with AI"
   - Click redirects to billing page

2. **As Pro tier user:**
   - Button is enabled
   - Modal opens normally

---

## 📋 Complete Testing Checklist

### Core Functionality
- [ ] Feature gate blocks free tier users
- [ ] Feature gate allows pro tier users
- [ ] Instruction input validates (10-500 chars)
- [ ] Processing state shows progress
- [ ] AI generates refinement successfully
- [ ] Diff highlighting works correctly
- [ ] Split view displays properly
- [ ] Unified view displays properly
- [ ] Accept updates story
- [ ] Reject preserves original
- [ ] Revision history saved (if checked)

### Edge Cases
- [ ] Empty instructions blocked
- [ ] Too long instructions blocked
- [ ] Story too long (>10k words) blocked
- [ ] Rate limiting works (10/hour for Pro)
- [ ] Network errors handled gracefully
- [ ] AI failures handled gracefully

### UI/UX
- [ ] Modal responsive on mobile
- [ ] Keyboard navigation works
- [ ] Loading states clear
- [ ] Error messages helpful
- [ ] Tooltips informative

---

## 🐛 Common Issues & Solutions

### Issue: "Cannot find module 'diff'"
```bash
npm install diff @types/diff
```

### Issue: Drizzle-kit not found
```bash
# Try with npx
npx drizzle-kit generate
npx drizzle-kit push

# Or install globally
npm install -g drizzle-kit
```

### Issue: Tables don't exist after migration
```bash
# Check migration files were created
ls drizzle/migrations/

# Run migration manually
psql $DATABASE_URL -f drizzle/migrations/[latest].sql
```

### Issue: Feature gate not working
```sql
-- Verify organization tier
SELECT id, name, subscription_tier 
FROM organizations 
WHERE id = 'your-org-id';

-- Update if needed
UPDATE organizations 
SET subscription_tier = 'pro' 
WHERE id = 'your-org-id';
```

### Issue: API returns 401/403
- Check user is logged in
- Verify session cookie exists
- Check organization tier is correct

### Issue: AI refinement fails
- Verify OPENROUTER_API_KEY is set
- Check API key is valid
- Check network tab for error details
- Verify story has description content

---

## 📊 Success Metrics

After testing, verify:

### Functionality
- ✅ All tests pass
- ✅ No console errors
- ✅ No server errors
- ✅ Database updates correctly

### Performance
- ✅ Refinement completes in <60 seconds
- ✅ Modal opens instantly
- ✅ Diff rendering smooth

### User Experience
- ✅ Clear loading states
- ✅ Helpful error messages
- ✅ Intuitive workflow

---

## 🚀 Deployment Steps

### Pre-Deployment
1. [ ] Run all tests
2. [ ] Code review completed
3. [ ] Environment variables set in production
4. [ ] Database migrations run on production DB
5. [ ] API keys verified

### Deployment
1. [ ] Deploy code to production
2. [ ] Run migrations: `npm run db:migrate`
3. [ ] Verify tables created
4. [ ] Test feature in production
5. [ ] Monitor error logs

### Post-Deployment
1. [ ] Monitor error rates
2. [ ] Track usage metrics
3. [ ] Collect user feedback
4. [ ] Monitor API costs

---

## 📝 Files Summary

### Created Files
- `lib/featureGates.ts` - Feature access control
- `lib/services/aiRefinementService.ts` - AI refinement logic
- `lib/services/diffService.ts` - Diff generation
- `lib/middleware/rateLimiter.ts` - Rate limiting
- `types/refinement.ts` - TypeScript types
- `components/story-refine/InstructionInput.tsx`
- `components/story-refine/ProcessingState.tsx`
- `components/story-refine/DiffViewer.tsx`
- `components/story-refine/ReviewInterface.tsx`
- `scripts/verify-refinement-setup.ts` - Verification script

### Modified Files
- `lib/db/schema.ts` - Added tables
- `app/api/stories/[storyId]/refine/route.ts` - Complete rewrite
- `app/api/stories/[storyId]/refinements/[refinementId]/accept/route.ts` - Enhanced
- `components/story-refine/RefineStoryButton.tsx` - Added feature gates
- `components/story-refine/RefineStoryModal.tsx` - Complete rewrite
- `lib/hooks/useStoryRefinement.ts` - Updated for new API
- `components/story-detail-client.tsx` - Updated button usage
- `app/globals.css` - Added diff styles

---

## ✅ Final Checklist

Before considering this feature "production-ready":

- [ ] Database migrations run successfully
- [ ] All tests pass
- [ ] Feature gates work correctly
- [ ] Rate limiting enforced
- [ ] Error handling comprehensive
- [ ] UI responsive and accessible
- [ ] Documentation complete
- [ ] Monitoring configured

---

## 🎯 Next Actions

**RIGHT NOW:**

1. **Run migrations:**
   ```bash
   npx drizzle-kit generate
   npx drizzle-kit push
   ```

2. **Verify setup:**
   ```bash
   npx tsx scripts/verify-refinement-setup.ts
   ```

3. **Update test org:**
   ```sql
   UPDATE organizations SET subscription_tier = 'pro' WHERE id = 'your-org-id';
   ```

4. **Start testing:**
   ```bash
   npm run dev
   ```

5. **Test basic flow:**
   - Navigate to story
   - Click "Refine Story"
   - Complete refinement

---

**Your implementation is complete and ready!** 🎉

Run the migrations and start testing. If you encounter any issues, refer to the troubleshooting section above or check the browser console/server logs.

