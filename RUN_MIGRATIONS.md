# Migration Status & Run Guide

## ⚠️ CRITICAL: Migrations Need to be Run

**Status:** Migrations have NOT been automatically deployed. You need to run them manually.

The most critical migration right now is:
- **`0012_add_session_versioning.sql`** - Fixes the 500 errors you're seeing

---

## Quick Fix: Run Session Version Migration

### Option 1: Automated Script (Easiest)

```bash
# Run the session_version migration
./scripts/run-session-version-migration.sh production
```

This script will:
1. ✅ Pull production environment from Vercel
2. ✅ Check if column already exists
3. ✅ Run the migration safely
4. ✅ Verify it worked

### Option 2: Manual Steps

```bash
# 1. Pull production environment variables
vercel env pull .env.production

# 2. Load the variables
source .env.production

# 3. Run the migration
psql "$DATABASE_URL" -f db/migrations/0012_add_session_versioning.sql

# 4. Verify it worked
psql "$DATABASE_URL" -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'session_version';"
```

### Option 3: Via Neon Console (Web UI)

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project → **Storage** → **Neon database**
3. Click **"SQL Editor"** or **"Query"**
4. Paste and run:

```sql
ALTER TABLE users
ADD COLUMN IF NOT EXISTS session_version INTEGER DEFAULT 1 NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_session_version ON users(id, session_version);

UPDATE users SET session_version = 1 WHERE session_version IS NULL;
```

---

## Check Migration Status

To see which migrations have been run:

```bash
# Check if session_version exists
psql "$DATABASE_URL" -c "
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'session_version';
"

# If you get output, the column exists ✅
# If you get "0 rows", the migration hasn't run ⚠️
```

---

## All Available Migrations

Here are all the migration files in your project:

| File | Description | Priority |
|------|-------------|----------|
| `0012_add_session_versioning.sql` | **Session versioning (fixes 500 errors)** | **CRITICAL** |
| `0011_add_template_versioning.sql` | Template versioning | Medium |
| `0010_subscription_tier_enhancements.sql` | Subscription enhancements | Medium |
| `0009_subscription_metering_enhancements.sql` | Token metering | Medium |
| `0013_add_project_permissions.sql` | Project permissions | Medium |
| `add-story-splitting.sql` | Story splitting | Medium |
| `add-epic-linkage-and-idempotency.sql` | Epic linkage | Medium |
| `008_add_pgvector.sql` | pgvector extension | Low |

---

## Run All Migrations (Optional)

If you want to run all migrations in order:

```bash
# Set up environment
vercel env pull .env.production
source .env.production

# Run migrations (they're safe to run multiple times - use IF NOT EXISTS)
psql "$DATABASE_URL" -f db/migrations/0012_add_session_versioning.sql

# Optionally run others:
psql "$DATABASE_URL" -f db/migrations/0011_add_template_versioning.sql
psql "$DATABASE_URL" -f db/migrations/0010_subscription_tier_enhancements.sql
# ... etc
```

---

## Verify After Migration

After running the session_version migration:

1. **Check column exists:**
   ```bash
   psql "$DATABASE_URL" -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'session_version';"
   ```

2. **Test password reset:**
   - Try `/api/auth/forgot-password` - should work now ✅
   - Try `/api/auth/reset-password` - should work now ✅

3. **Check logs:**
   - No more "column session_version does not exist" errors ✅

---

## Troubleshooting

### "psql: command not found"
```bash
# macOS
brew install postgresql

# Linux
sudo apt-get install postgresql-client
```

### "Could not retrieve DATABASE_URL"
```bash
vercel login
vercel link
vercel env pull .env.production
```

### "Permission denied"
The migrations use `IF NOT EXISTS`, so they're safe. If you get permission errors:
- Check database user has ALTER TABLE permissions
- Try running via Neon Console web UI instead

---

## Next Steps After Migration

1. ✅ Run the migration (use the script above)
2. ✅ Verify column exists
3. ✅ Test password reset flow
4. ✅ Monitor for any remaining errors

The code changes are already deployed and will work with or without the column, but running the migration gives you full functionality.



