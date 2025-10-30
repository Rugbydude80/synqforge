#!/bin/bash

# Run all database migrations to Neon database via Vercel
# Usage: ./scripts/run-all-migrations.sh [environment]
# Example: ./scripts/run-all-migrations.sh production

set -e

ENVIRONMENT=${1:-production}

echo "🚀 Running all database migrations for $ENVIRONMENT environment..."
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Error: Vercel CLI is not installed"
    echo "Install it with: npm i -g vercel"
    exit 1
fi

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo "❌ Error: psql is not installed"
    echo "Install PostgreSQL client: brew install postgresql (macOS) or sudo apt-get install postgresql-client (Linux)"
    exit 1
fi

# Get database URL from Vercel
echo "🔍 Getting database connection string from Vercel..."
vercel env pull --environment=$ENVIRONMENT .env.migration 2>&1 || {
    echo "⚠️  Could not pull environment variables. Trying interactive pull..."
    vercel env pull .env.migration
}

# Source the env file to load variables
set -a
source .env.migration 2>/dev/null || true
set +a

# Try different environment variable names (Neon uses different formats)
if [ ! -z "$DATABASE_URL" ]; then
    DB_URL="$DATABASE_URL"
elif [ ! -z "$POSTGRES_URL" ]; then
    DB_URL="$POSTGRES_URL"
elif [ ! -z "$POSTGRES_PRISMA_URL" ]; then
    DB_URL="$POSTGRES_PRISMA_URL"
elif [ ! -z "$NEON_DATABASE_URL" ]; then
    DB_URL="$NEON_DATABASE_URL"
else
    echo "❌ Error: Could not retrieve DATABASE_URL from Vercel"
    echo ""
    echo "Available database env vars:"
    grep -E '^(POSTGRES|DATABASE|NEON)' .env.migration 2>/dev/null || echo "No database vars found"
    echo ""
    echo "Please ensure you're logged in: vercel login"
    echo "And linked to your project: vercel link"
    rm -f .env.migration
    exit 1
fi

echo "✅ Database connection retrieved"
echo ""

# Define migrations in order (must run in this sequence)
MIGRATIONS=(
    "db/migrations/0005_add_ai_actions_tracking.sql"
    "db/migrations/0006_add_on_support.sql"
    "db/migrations/0007_update_subscription_tiers.sql"
    "db/migrations/0009_subscription_metering_enhancements.sql"
    "db/migrations/0010_subscription_tier_enhancements.sql"
    "db/migrations/0011_add_template_versioning.sql"
    "db/migrations/0012_add_session_versioning.sql"
    "db/migrations/0013_add_project_permissions.sql"
    "db/migrations/add-story-splitting.sql"
    "db/migrations/add-epic-linkage-and-idempotency.sql"
    "db/migrations/008_add_pgvector.sql"
)

# Optional migrations (fixes for triggers)
OPTIONAL_MIGRATIONS=(
    "db/migrations/fix-epic-aggregates-trigger.sql"
    "db/migrations/fix-sprint-velocity-trigger.sql"
)

# Function to check if migration needs to run
check_migration_needed() {
    local migration_file=$1
    local migration_name=$(basename "$migration_file" .sql)
    
    # Check if it's a column addition migration (macOS compatible grep)
    if grep -q "ADD COLUMN IF NOT EXISTS" "$migration_file" 2>/dev/null; then
        # Extract column name from migration (macOS compatible)
        local column_name=$(grep -E "ADD COLUMN IF NOT EXISTS +([a-z_]+)" "$migration_file" | sed -E 's/.*ADD COLUMN IF NOT EXISTS +([a-z_]+).*/\1/' | head -1)
        local table_name=$(grep -E "ALTER TABLE +([a-z_]+)" "$migration_file" | sed -E 's/.*ALTER TABLE +([a-z_]+).*/\1/' | head -1)
        
        if [ ! -z "$column_name" ] && [ ! -z "$table_name" ]; then
            # Check if column exists
            if psql "$DB_URL" -tAc "SELECT 1 FROM information_schema.columns WHERE table_name='$table_name' AND column_name='$column_name'" 2>/dev/null | grep -q 1; then
                return 1 # Already exists, skip
            fi
        fi
    fi
    
    # Check if it's a table creation migration
    if grep -q "CREATE TABLE IF NOT EXISTS" "$migration_file" 2>/dev/null; then
        local table_name=$(grep -E "CREATE TABLE IF NOT EXISTS +([a-z_]+)" "$migration_file" | sed -E 's/.*CREATE TABLE IF NOT EXISTS +([a-z_]+).*/\1/' | head -1)
        
        if [ ! -z "$table_name" ]; then
            # Check if table exists
            if psql "$DB_URL" -tAc "SELECT 1 FROM information_schema.tables WHERE table_name='$table_name'" 2>/dev/null | grep -q 1; then
                return 1 # Table exists, likely migrated
            fi
        fi
    fi
    
    return 0 # Migration needed
}

# Function to run a migration
run_migration() {
    local migration_file=$1
    local migration_name=$(basename "$migration_file" .sql)
    
    if [ ! -f "$migration_file" ]; then
        echo "⚠️  Skipping $migration_name: File not found"
        return 1
    fi
    
    echo "🔄 Running: $migration_name"
    
    # Run migration
    if psql -v ON_ERROR_STOP=1 -X "$DB_URL" -f "$migration_file" 2>&1; then
        echo "✅ Completed: $migration_name"
        return 0
    else
        echo "❌ Failed: $migration_name"
        return 1
    fi
}

# Run required migrations
echo "📋 Running required migrations..."
echo ""

SUCCESS_COUNT=0
SKIP_COUNT=0
FAIL_COUNT=0

for migration in "${MIGRATIONS[@]}"; do
    migration_name=$(basename "$migration" .sql)
    
    # Check if migration is needed
    if check_migration_needed "$migration"; then
        if run_migration "$migration"; then
            ((SUCCESS_COUNT++))
        else
            ((FAIL_COUNT++))
            echo "⚠️  Continuing with next migration..."
        fi
    else
        echo "⏭️  Skipping $migration_name: Already applied"
        ((SKIP_COUNT++))
    fi
    echo ""
done

# Run optional migrations (fixes)
if [ ${#OPTIONAL_MIGRATIONS[@]} -gt 0 ]; then
    echo "📋 Running optional migrations (fixes)..."
    echo ""
    
    for migration in "${OPTIONAL_MIGRATIONS[@]}"; do
        migration_name=$(basename "$migration" .sql)
        if [ -f "$migration" ]; then
            echo "🔄 Running: $migration_name"
            if psql -v ON_ERROR_STOP=1 -X "$DB_URL" -f "$migration" 2>&1; then
                echo "✅ Completed: $migration_name"
                ((SUCCESS_COUNT++))
            else
                echo "⚠️  Failed (non-critical): $migration_name"
            fi
            echo ""
        fi
    done
fi

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Migration Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Successfully applied: $SUCCESS_COUNT"
echo "⏭️  Skipped (already applied): $SKIP_COUNT"
echo "❌ Failed: $FAIL_COUNT"
echo ""

# Verify critical migrations
echo "🔍 Verifying critical migrations..."
echo ""

# Check session_version
if psql "$DB_URL" -tAc "SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='session_version'" 2>/dev/null | grep -q 1; then
    echo "✅ session_version column exists"
else
    echo "❌ session_version column missing - this is critical!"
fi

# Check password_reset_tokens table
if psql "$DB_URL" -tAc "SELECT 1 FROM information_schema.tables WHERE table_name='password_reset_tokens'" 2>/dev/null | grep -q 1; then
    echo "✅ password_reset_tokens table exists"
else
    echo "⚠️  password_reset_tokens table missing"
fi

# Check pgvector extension
if psql "$DB_URL" -tAc "SELECT 1 FROM pg_extension WHERE extname='vector'" 2>/dev/null | grep -q 1; then
    echo "✅ pgvector extension installed"
else
    echo "⚠️  pgvector extension not installed (optional)"
fi

echo ""

# Cleanup
rm -f .env.migration

if [ $FAIL_COUNT -eq 0 ]; then
    echo "🎉 All migrations completed successfully!"
    echo ""
    echo "Next steps:"
    echo "  - Test password reset functionality"
    echo "  - Verify authentication endpoints work"
    echo "  - Check application logs for any errors"
    exit 0
else
    echo "⚠️  Some migrations failed. Check the output above for details."
    echo "You can run individual migrations manually if needed."
    exit 1
fi

