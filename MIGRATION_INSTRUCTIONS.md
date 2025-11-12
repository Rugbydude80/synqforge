# Database Migration Instructions

## ✅ Migration File Generated Successfully!

The migration file has been created at:
**`drizzle/migrations/0020_common_shiva.sql`**

This file includes:
- ✅ `story_refinements` table (22 columns, 5 indexes)
- ✅ `story_revisions` table (8 columns, 4 indexes)
- ✅ All required indexes and constraints


---

## How to Apply the Migration

### Option 1: Using Drizzle Kit (Recommended)

```bash
# Set your DATABASE_URL environment variable first
# Windows PowerShell:
$env:DATABASE_URL="postgresql://user:password@host:port/database"

# Then run:
node_modules\.bin\drizzle-kit push

# Or if you have .env file:
# Load it first, then run the command
```

### Option 2: Run SQL Manually

If you have direct database access:

```bash
# Using psql:
psql $DATABASE_URL -f drizzle/migrations/0020_common_shiva.sql

# Or copy the SQL and run in your database client
```

### Option 3: Using Neon Console (if using Neon)

1. Go to your Neon dashboard
2. Navigate to SQL Editor
3. Copy contents of `drizzle/migrations/0020_common_shiva.sql`
4. Paste and execute

---

## Verify Migration Applied

After running the migration, verify tables exist:

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('story_refinements', 'story_revisions');

-- Check columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'story_refinements'
ORDER BY ordinal_position;

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'story_revisions'
ORDER BY ordinal_position;

-- Check indexes
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename IN ('story_refinements', 'story_revisions');
```

**Expected Results:**
- ✅ Both tables exist
- ✅ `story_refinements` has 22 columns
- ✅ `story_revisions` has 8 columns
- ✅ All indexes are created

---

## What's in the Migration

### story_refinements Table
- All refinement data fields
- Status tracking (pending, processing, completed, accepted, rejected, failed)
- Change tracking (changes_summary JSON)
- AI metadata (tokens, model, processing time)
- Timestamps and audit fields

### story_revisions Table
- Story content history
- Revision type tracking
- User tracking (created_by)
- Timestamps

---

## Next Steps After Migration

1. ✅ Verify tables created (use SQL queries above)
2. ✅ Update test organization to Pro tier:
   ```sql
   UPDATE organizations 
   SET subscription_tier = 'pro' 
   WHERE id = 'your-org-id';
   ```
3. ✅ Test the feature:
   - Start dev server: `npm run dev`
   - Navigate to a story
   - Click "Refine Story"
   - Complete the refinement flow

---

## Troubleshooting

### If migration fails:

1. **Check DATABASE_URL is correct:**
   ```bash
   echo $DATABASE_URL  # Linux/Mac
   echo $env:DATABASE_URL  # Windows PowerShell
   ```

2. **Check database connection:**
   ```bash
   psql $DATABASE_URL -c "SELECT version();"
   ```

3. **Check if tables already exist:**
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_name IN ('story_refinements', 'story_revisions');
   ```
   If they exist, you may need to drop them first (development only!)

4. **Check permissions:**
   Ensure your database user has CREATE TABLE permissions

---

## Migration File Location

The complete migration SQL is at:
**`drizzle/migrations/0020_common_shiva.sql`**

You can review it before applying to ensure it matches your expectations.

