#!/bin/bash
# Run production migrations for SynqForge

set -e

echo "🚀 SynqForge Production Migrations"
echo "===================================="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "📥 Pulling production environment variables..."
  vercel env pull .env.production --yes
  source .env.production
fi

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not found. Please set it manually or run 'vercel env pull .env.production'"
  exit 1
fi

echo "✅ DATABASE_URL found"
echo ""

echo "📋 Running migrations..."
echo ""

echo "1️⃣ Template Versioning..."
psql "$DATABASE_URL" -f db/migrations/0011_add_template_versioning.sql
echo "✅ Template versioning migration complete"
echo ""

echo "2️⃣ Session Versioning..."
psql "$DATABASE_URL" -f db/migrations/0012_add_session_versioning.sql
echo "✅ Session versioning migration complete"
echo ""

echo "3️⃣ Project Permissions..."
psql "$DATABASE_URL" -f db/migrations/0013_add_project_permissions.sql
echo "✅ Project permissions migration complete"
echo ""

echo "🎉 All migrations complete!"
echo ""
echo "Next steps:"
echo "1. Verify deployment: https://synqforge-guyjxijb8-synq-forge.vercel.app"
echo "2. Test critical workflows"
echo "3. Monitor error logs"
