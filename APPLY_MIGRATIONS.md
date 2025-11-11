# Apply Story Refinements Migration

This guide will help you apply the story_refinements table migration to your Neon database.

## Prerequisites

1. **Neon Database URL**: Make sure you have your `DATABASE_URL` environment variable set
2. **Neon CLI** (optional): Install if you want to use CLI: `npm install -g neonctl`
3. **Vercel CLI** (optional): If deploying via Vercel

## Method 1: Using Neon CLI (Recommended)

### Step 1: Install Neon CLI (if not already installed)
```bash
npm install -g neonctl
```

### Step 2: Login to Neon
```bash
neonctl auth
```

### Step 3: Apply Migration
```bash
# Get your project ID and branch name from Neon dashboard
neonctl sql --project-id YOUR_PROJECT_ID --branch main < db/migrations/0015_add_story_refinements.sql
```

Or using the Drizzle migration:
```bash
neonctl sql --project-id YOUR_PROJECT_ID --branch main < drizzle/migrations/0020_add_story_refinements.sql
```

## Method 2: Using Vercel CLI

### Step 1: Install Vercel CLI (if not already installed)
```bash
npm install -g vercel
```

### Step 2: Login to Vercel
```bash
vercel login
```

### Step 3: Link your project
```bash
vercel link
```

### Step 4: Apply Migration via Vercel
Vercel will automatically run migrations during deployment. Make sure your migration files are committed and pushed.

## Method 3: Using Node.js Script

### Step 1: Install dependencies
```bash
npm install
```

### Step 2: Set DATABASE_URL
```bash
# Windows PowerShell
$env:DATABASE_URL="your-neon-database-url"

# Linux/Mac
export DATABASE_URL="your-neon-database-url"
```

### Step 3: Run the migration script
```bash
npx tsx scripts/apply-refinements-migration.ts
```

## Method 4: Direct SQL Execution

### Step 1: Connect to Neon Database
Use any PostgreSQL client (pgAdmin, DBeaver, psql, etc.) and connect using your Neon connection string.

### Step 2: Execute Migration SQL
Copy and paste the contents of `db/migrations/0015_add_story_refinements.sql` into your SQL client and execute it.

## Method 5: Using Drizzle Kit (If installed)

### Step 1: Install dependencies
```bash
npm install
```

### Step 2: Generate migration (already done)
```bash
npm run db:generate
```

### Step 3: Apply migration
```bash
npm run db:push
```

## Verification

After applying the migration, verify the table was created:

```sql
-- Check if table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'story_refinements';

-- Check table structure
\d story_refinements

-- Or using SQL
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'story_refinements'
ORDER BY ordinal_position;
```

## Troubleshooting

### Error: Table already exists
If you see "relation already exists" error, the migration may have already been applied. This is safe to ignore.

### Error: Foreign key constraint fails
Make sure the `stories`, `organizations`, and `users` tables exist before applying this migration.

### Error: Permission denied
Make sure your database user has CREATE TABLE and CREATE INDEX permissions.

## Next Steps

After applying the migration:

1. ✅ Test the refine endpoint: `POST /api/stories/[storyId]/refine`
2. ✅ Test listing refinements: `GET /api/stories/[storyId]/refinements`
3. ✅ Test accepting a refinement: `POST /api/stories/[storyId]/refinements/[refinementId]/accept`
4. ✅ Test rejecting a refinement: `POST /api/stories/[storyId]/refinements/[refinementId]/reject`

## Files Changed

- ✅ `lib/db/schema.ts` - Added `storyRefinements` table schema
- ✅ `db/migrations/0015_add_story_refinements.sql` - SQL migration file
- ✅ `drizzle/migrations/0020_add_story_refinements.sql` - Drizzle migration file
- ✅ `app/api/stories/[storyId]/refine/route.ts` - Updated to save refinements
- ✅ `app/api/stories/[storyId]/refinements/route.ts` - Updated to use database
- ✅ `app/api/stories/[storyId]/refinements/[refinementId]/accept/route.ts` - Updated to use database
- ✅ `app/api/stories/[storyId]/refinements/[refinementId]/reject/route.ts` - Updated to use database

