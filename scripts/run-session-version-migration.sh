#!/bin/bash

# Run session_version migration to Neon database via Vercel
# Usage: ./scripts/run-session-version-migration.sh [environment]
# Example: ./scripts/run-session-version-migration.sh production

set -e

ENVIRONMENT=${1:-production}
MIGRATION_FILE="db/migrations/0012_add_session_versioning.sql"

echo "🚀 Running session_version migration for $ENVIRONMENT environment..."
echo "📁 Migration file: $MIGRATION_FILE"
echo ""

# Check if migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Error: Migration file not found: $MIGRATION_FILE"
    exit 1
fi

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
    exit 1
fi

echo "✅ Database connection retrieved"
echo ""

# Check if session_version column already exists
echo "🔍 Checking if session_version column already exists..."
if psql "$DB_URL" -tAc "SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='session_version'" 2>/dev/null | grep -q 1; then
    echo "✅ session_version column already exists - skipping migration"
    rm -f .env.migration
    exit 0
fi

echo "⚠️  session_version column not found - running migration..."
echo ""

# Run migration with proper connection handling
echo "🔄 Executing migration..."

# Use -v ON_ERROR_STOP=1 to stop on errors
# Use -X to not read .psqlrc which might interfere
psql -v ON_ERROR_STOP=1 -X "$DB_URL" -f "$MIGRATION_FILE" 2>&1

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
    echo ""
    
    # Verify migration
    echo "🔍 Verifying migration..."
    if psql "$DB_URL" -tAc "SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='session_version'" 2>/dev/null | grep -q 1; then
        echo "✅ Verified: session_version column exists"
        
        # Check default value
        DEFAULT_VALUE=$(psql "$DB_URL" -tAc "SELECT column_default FROM information_schema.columns WHERE table_name='users' AND column_name='session_version'" 2>/dev/null)
        echo "✅ Default value: $DEFAULT_VALUE"
        
        # Count users with session_version
        USER_COUNT=$(psql "$DB_URL" -tAc "SELECT COUNT(*) FROM users" 2>/dev/null)
        echo "✅ Users table has $USER_COUNT user(s)"
    else
        echo "⚠️  Warning: Could not verify column (may need to wait a moment)"
    fi
    
    echo ""
    echo "🎉 Migration complete! The session_version column has been added."
    echo ""
    echo "Next steps:"
    echo "  - All existing users will have session_version = 1"
    echo "  - Password resets will now invalidate all existing sessions"
    echo "  - JWT callbacks will work without errors"
else
    echo ""
    echo "❌ Migration failed!"
    echo ""
    echo "Common issues:"
    echo "  - Database connection failed (check DATABASE_URL)"
    echo "  - Insufficient permissions (check database user permissions)"
    echo "  - Migration already partially applied (check database manually)"
    exit 1
fi

# Cleanup
rm -f .env.migration

echo ""
echo "✨ Done!"



