# Critical Fix: Missing `session_version` Column

## Problem
The production database is missing the `session_version` column in the `users` table, causing 500 errors on:
- `/api/auth/forgot-password` 
- `/api/auth/callback/credentials`
- All NextAuth JWT callbacks

## Root Cause
The code references `sessionVersion` in the schema (`lib/db/schema.ts:163`), but the migration hasn't been run in production.

## Solution

### Option 1: Run the Migration (Recommended)

Run the migration SQL file directly on your production database:

```bash
# Using Vercel CLI to access Neon database
vercel env pull .env.production
# Then connect to your Neon database and run:
```

```sql
-- Migration: Add Session Versioning for Session Invalidation
ALTER TABLE users
ADD COLUMN IF NOT EXISTS session_version INTEGER DEFAULT 1 NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_session_version ON users(id, session_version);

UPDATE users SET session_version = 1 WHERE session_version IS NULL;
```

Or run the migration file directly:
```bash
psql $DATABASE_URL -f db/migrations/0012_add_session_versioning.sql
```

### Option 2: Code Fix (Already Applied)

The code has been updated to handle the missing column gracefully:
- ✅ JWT callback now catches missing column errors and uses default value
- ✅ Forgot password route selects only needed columns
- ✅ All endpoints log warnings when column is missing

However, **you still need to run the migration** for full functionality.

## Files Changed

1. `lib/auth/options.ts` - Added graceful handling for missing `session_version` column
2. `app/api/auth/forgot-password/route.ts` - Selects only needed columns

## Next Steps

1. **Run the migration** on production database:
   ```bash
   # If using Neon via Vercel
   vercel env pull .env.production
   psql $DATABASE_URL -f db/migrations/0012_add_session_versioning.sql
   ```

2. **Verify the column exists**:
   ```sql
   SELECT column_name, data_type, column_default 
   FROM information_schema.columns 
   WHERE table_name = 'users' AND column_name = 'session_version';
   ```

3. **Redeploy** - The code changes are already deployed and will work with or without the column.

## Migration File Location
`db/migrations/0012_add_session_versioning.sql`

