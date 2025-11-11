# Story Refinements Migration - Complete

## ✅ What Was Done

### 1. Database Schema
- ✅ Added `storyRefinements` table to `lib/db/schema.ts`
- ✅ Table includes all necessary fields for tracking AI-generated refinements

### 2. Migration Files Created
- ✅ `db/migrations/0015_add_story_refinements.sql` - SQL migration
- ✅ `drizzle/migrations/0020_add_story_refinements.sql` - Drizzle migration

### 3. API Endpoints Updated
- ✅ `POST /api/stories/[storyId]/refine` - Now saves refinements to database
- ✅ `GET /api/stories/[storyId]/refinements` - Lists all refinements from database
- ✅ `POST /api/stories/[storyId]/refinements` - Creates new refinement
- ✅ `POST /api/stories/[storyId]/refinements/[refinementId]/accept` - Accepts refinement
- ✅ `POST /api/stories/[storyId]/refinements/[refinementId]/reject` - Rejects refinement

## 🚀 How to Apply Migration

### Option 1: Using Neon Dashboard (Easiest)

1. Go to your Neon dashboard: https://console.neon.tech
2. Select your project
3. Go to "SQL Editor"
4. Copy the contents of `db/migrations/0015_add_story_refinements.sql`
5. Paste and execute in the SQL Editor

### Option 2: Using Neon CLI

```bash
# Install Neon CLI
npm install -g neonctl

# Login
neonctl auth

# Apply migration (replace YOUR_PROJECT_ID with your actual project ID)
neonctl sql --project-id YOUR_PROJECT_ID --branch main < db/migrations/0015_add_story_refinements.sql
```

### Option 3: Using Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Link project
vercel link

# Deploy (migrations will run automatically)
vercel --prod
```

### Option 4: Using psql (PostgreSQL client)

```bash
# Connect to Neon database
psql "your-neon-connection-string"

# Run migration
\i db/migrations/0015_add_story_refinements.sql
```

### Option 5: Direct SQL Execution

Connect to your Neon database using any PostgreSQL client and execute:

```sql
-- Create story_refinements table
CREATE TABLE IF NOT EXISTS story_refinements (
  id VARCHAR(36) PRIMARY KEY,
  story_id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  refinement TEXT NOT NULL,
  user_request TEXT,
  status VARCHAR(50) DEFAULT 'pending' NOT NULL,
  accepted_at TIMESTAMP,
  rejected_at TIMESTAMP,
  rejected_reason TEXT,
  ai_model_used VARCHAR(100),
  ai_tokens_used INTEGER,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  applied_changes JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  CONSTRAINT fk_story_refinements_story FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
  CONSTRAINT fk_story_refinements_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_story_refinements_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_story_refinements_story ON story_refinements(story_id);
CREATE INDEX IF NOT EXISTS idx_story_refinements_org ON story_refinements(organization_id);
CREATE INDEX IF NOT EXISTS idx_story_refinements_user ON story_refinements(user_id);
CREATE INDEX IF NOT EXISTS idx_story_refinements_status ON story_refinements(status);
CREATE INDEX IF NOT EXISTS idx_story_refinements_created ON story_refinements(created_at);
```

## ✅ Verification

After applying the migration, verify it worked:

```sql
-- Check table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'story_refinements';

-- Check table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'story_refinements'
ORDER BY ordinal_position;
```

## 🧪 Testing

After migration is applied, test the endpoints:

1. **Create a refinement:**
   ```bash
   POST /api/stories/[storyId]/refine
   Body: { "userRequest": "Improve clarity" }
   ```

2. **List refinements:**
   ```bash
   GET /api/stories/[storyId]/refinements
   ```

3. **Accept a refinement:**
   ```bash
   POST /api/stories/[storyId]/refinements/[refinementId]/accept
   ```

4. **Reject a refinement:**
   ```bash
   POST /api/stories/[storyId]/refinements/[refinementId]/reject
   Body: { "reason": "Not applicable" }
   ```

## 📋 Migration Checklist

- [x] Schema added to `lib/db/schema.ts`
- [x] SQL migration file created
- [x] Drizzle migration file created
- [x] Refine endpoint updated to save to database
- [x] Refinements endpoints updated to use database
- [ ] Migration applied to Neon database
- [ ] Endpoints tested in production

## 🔧 Troubleshooting

### Table Already Exists
If you see "relation already exists", the migration was already applied. This is safe.

### Foreign Key Errors
Make sure `stories`, `organizations`, and `users` tables exist first.

### Permission Errors
Ensure your database user has CREATE TABLE and CREATE INDEX permissions.

## 📝 Next Steps

1. Apply the migration using one of the methods above
2. Deploy your code changes to production
3. Test the refinement endpoints
4. Monitor for any errors

## Files Modified

- `lib/db/schema.ts` - Added storyRefinements table
- `db/migrations/0015_add_story_refinements.sql` - SQL migration
- `drizzle/migrations/0020_add_story_refinements.sql` - Drizzle migration
- `app/api/stories/[storyId]/refine/route.ts` - Save refinements
- `app/api/stories/[storyId]/refinements/route.ts` - List/create refinements
- `app/api/stories/[storyId]/refinements/[refinementId]/accept/route.ts` - Accept refinement
- `app/api/stories/[storyId]/refinements/[refinementId]/reject/route.ts` - Reject refinement

