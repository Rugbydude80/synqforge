#!/bin/bash

# Run database migration via Vercel + Neon
# Usage: ./scripts/run-migration.sh [environment]
# Example: ./scripts/run-migration.sh production

set -e

ENVIRONMENT=${1:-production}
MIGRATION_FILE="db/migrations/add-epic-linkage-and-idempotency.sql"

echo "🚀 Running migration for $ENVIRONMENT environment..."
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

# Get database URL from Vercel
echo "🔍 Getting database connection string from Vercel..."
vercel env pull --environment=$ENVIRONMENT .env.local > /dev/null 2>&1 || vercel env pull --yes .env.local > /dev/null 2>&1

# Source the env file to load variables
set -a
source .env.local 2>/dev/null || true
set +a

# Try different environment variable names (Neon uses different formats)
if [ ! -z "$POSTGRES_URL" ]; then
    DATABASE_URL="$POSTGRES_URL"
elif [ ! -z "$DATABASE_URL" ]; then
    DATABASE_URL="$DATABASE_URL"
elif [ ! -z "$POSTGRES_PRISMA_URL" ]; then
    DATABASE_URL="$POSTGRES_PRISMA_URL"
else
    echo "❌ Error: Could not retrieve DATABASE_URL from Vercel"
    echo "Make sure you're logged in: vercel login"
    echo ""
    echo "Available database env vars:"
    grep -E '^(POSTGRES|DATABASE)' .env.local 2>/dev/null || echo "No database vars found"
    exit 1
fi

echo "✅ Database connection retrieved"
echo ""

# Run migration with proper connection handling
echo "🔄 Executing migration..."

# Use -v ON_ERROR_STOP=1 to stop on errors
# Use -X to not read .psqlrc which might interfere
psql -v ON_ERROR_STOP=1 -X "$DATABASE_URL" -f "$MIGRATION_FILE" 2>&1

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
    
    # Verify migration
    echo ""
    echo "🔍 Verifying migration..."
    psql "$DATABASE_URL" -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'epics' AND column_name IN ('parent_epic_id', 'correlation_key') ORDER BY column_name;" -t
    
    echo ""
    echo "✅ Verification complete!"
else
    echo ""
    echo "❌ Migration failed"
    exit 1
fi

# Clean up .env.local
rm -f .env.local

echo ""
echo "🎉 Done!"
echo ""
echo "Next steps:"
echo "  1. Test the API endpoints:"
echo "     - POST /api/ai/decompose"
echo "     - POST /api/ai/generate-from-capability"
echo "     - POST /api/ai/build-epic"
echo "  2. Monitor application logs for any issues"
echo "  3. Verify idempotency by sending duplicate requests"
