# Database Migration Guide - Vercel + Neon

This guide explains how to run the Epic Linkage and Idempotency migration with Vercel + Neon integration.

## Prerequisites

1. **Vercel CLI installed**
   ```bash
   npm i -g vercel
   ```

2. **PostgreSQL client installed** (for psql command)
   ```bash
   # macOS
   brew install postgresql
   
   # Ubuntu/Debian
   sudo apt-get install postgresql-client
   ```

3. **Vercel authentication**
   ```bash
   vercel login
   ```

4. **Linked to your Vercel project**
   ```bash
   vercel link
   ```

## Option 1: Automated Script (Recommended) ✅

Run the migration script which handles everything automatically:

```bash
# For production
./scripts/run-migration.sh production

# For preview/development
./scripts/run-migration.sh preview
```

The script will:
1. Pull environment variables from Vercel
2. Extract the database connection string
3. Run the migration
4. Clean up temporary files
5. Report success/failure

## Option 2: Manual Steps

If you prefer to run the migration manually:

### Step 1: Pull Environment Variables

```bash
vercel env pull .env.local
```

This creates a `.env.local` file with your environment variables including `POSTGRES_URL`.

### Step 2: Load Environment Variables

```bash
source .env.local
```

Or manually copy the `POSTGRES_URL` value.

### Step 3: Run Migration

```bash
psql "$POSTGRES_URL" -f db/migrations/add-epic-linkage-and-idempotency.sql
```

### Step 4: Verify Migration

```bash
psql "$POSTGRES_URL" -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'epics' AND column_name IN ('parent_epic_id', 'correlation_key');"
```

Expected output:
```
   column_name    
------------------
 parent_epic_id
 correlation_key
(2 rows)
```

## Option 3: Using Vercel Postgres Direct Connection

If you have direct access to Neon dashboard:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project → Storage → Neon database
3. Click "Query" or get connection string
4. Run migration in the web SQL editor, or:

```bash
# Get connection string from dashboard
psql "postgresql://user:password@host/database" -f db/migrations/add-epic-linkage-and-idempotency.sql
```

## Option 4: Using Drizzle Kit (Alternative)

If you prefer using Drizzle for migrations:

### Step 1: Generate Migration

The migration SQL is already created, but you can integrate it with Drizzle:

```bash
# Push schema changes
npx drizzle-kit push:pg
```

### Step 2: Or Run Custom SQL

```bash
npx drizzle-kit studio
```

Then paste the SQL from `db/migrations/add-epic-linkage-and-idempotency.sql` in the SQL editor.

## Verifying the Migration

After running the migration, verify the changes:

```bash
# Check epics table
vercel env pull .env.local
psql "$POSTGRES_URL" -c "\d epics"

# Check stories table
psql "$POSTGRES_URL" -c "\d stories"

# Check indexes
psql "$POSTGRES_URL" -c "SELECT indexname FROM pg_indexes WHERE tablename IN ('epics', 'stories') AND indexname LIKE '%correlation%';"
```

Expected new indexes:
- `idx_epics_parent`
- `idx_epics_correlation_key`
- `idx_epics_request_id`
- `idx_stories_correlation_key`
- `idx_stories_request_id`
- `idx_stories_capability_key`

## Rollback (If Needed)

If you need to rollback the migration:

```bash
psql "$POSTGRES_URL" -f db/migrations/rollback-epic-linkage.sql
```

Create the rollback script:

```sql
-- Rollback: Remove Epic Linkage and Idempotency

-- Remove foreign key constraint
ALTER TABLE epics DROP CONSTRAINT IF EXISTS fk_epics_parent;

-- Drop indexes
DROP INDEX IF EXISTS idx_epics_parent;
DROP INDEX IF EXISTS idx_epics_correlation_key;
DROP INDEX IF EXISTS idx_epics_request_id;
DROP INDEX IF EXISTS idx_stories_correlation_key;
DROP INDEX IF EXISTS idx_stories_request_id;
DROP INDEX IF EXISTS idx_stories_capability_key;

-- Remove columns from stories
ALTER TABLE stories DROP COLUMN IF EXISTS ready_for_sprint;
ALTER TABLE stories DROP COLUMN IF EXISTS manual_review_required;
ALTER TABLE stories DROP COLUMN IF EXISTS technical_hints;
ALTER TABLE stories DROP COLUMN IF EXISTS capability_key;
ALTER TABLE stories DROP COLUMN IF EXISTS request_id;
ALTER TABLE stories DROP COLUMN IF EXISTS correlation_key;

-- Remove columns from epics
ALTER TABLE epics DROP COLUMN IF EXISTS request_id;
ALTER TABLE epics DROP COLUMN IF EXISTS correlation_key;
ALTER TABLE epics DROP COLUMN IF EXISTS sibling_epic_ids;
ALTER TABLE epics DROP COLUMN IF EXISTS parent_epic_id;
```

## Troubleshooting

### Error: "psql: command not found"

Install PostgreSQL client:
```bash
# macOS
brew install postgresql

# Ubuntu/Debian
sudo apt-get install postgresql-client
```

### Error: "Could not retrieve DATABASE_URL"

Make sure you're authenticated:
```bash
vercel login
vercel link
```

Then try pulling env vars again:
```bash
vercel env pull .env.local
```

### Error: "permission denied"

Make the script executable:
```bash
chmod +x scripts/run-migration.sh
```

### Error: "relation already exists"

The migration was already run. Check your database:
```bash
psql "$POSTGRES_URL" -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'epics' AND column_name = 'correlation_key';"
```

If the column exists, you're already migrated!

### Connection Timeout

If connecting to Neon times out, check:
1. Your IP is allowed (Neon may have IP restrictions)
2. The connection string is correct
3. Try from Vercel's network (deploy a serverless function)

## Best Practices

1. **Always backup before migrations** (Neon has point-in-time recovery)
2. **Test on preview environment first**
   ```bash
   ./scripts/run-migration.sh preview
   ```
3. **Run during low-traffic periods**
4. **Monitor after migration** - Check application logs for errors
5. **Have rollback ready** - Keep the rollback script handy

## Environment-Specific Migrations

### Preview Environment
```bash
./scripts/run-migration.sh preview
```

### Production Environment
```bash
./scripts/run-migration.sh production
```

### Development (Local Supabase)

If using local Supabase instead of Neon:
```bash
psql postgresql://postgres:postgres@localhost:54322/postgres -f db/migrations/add-epic-linkage-and-idempotency.sql
```

## Post-Migration Checklist

- [ ] Migration ran successfully without errors
- [ ] New columns exist in database
- [ ] Indexes created successfully
- [ ] Application starts without errors
- [ ] Test creating an epic via API
- [ ] Test creating stories with idempotency
- [ ] Verify correlation keys are unique
- [ ] Check application logs for any issues
- [ ] Monitor database performance

## Support

If you encounter issues:
1. Check Vercel logs: `vercel logs`
2. Check Neon dashboard for active queries
3. Review migration SQL for syntax errors
4. Contact support with error messages

## Next Steps After Migration

1. Test the new API endpoints:
   - POST /api/ai/decompose
   - POST /api/ai/generate-from-capability
   - POST /api/ai/build-epic

2. Verify idempotency works by sending duplicate requests

3. Monitor metrics in your observability dashboard

4. Update your API documentation with new fields

