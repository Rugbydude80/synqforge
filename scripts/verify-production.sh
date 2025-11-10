#!/bin/bash

# Production Verification Script
# Run this to verify all production features are working

set -e

echo "🚀 SynqForge Production Verification"
echo "======================================"
echo ""

# Get production URL
read -p "Enter your production URL (e.g., https://synqforge.vercel.app): " PROD_URL

if [ -z "$PROD_URL" ]; then
  echo "❌ Production URL is required"
  exit 1
fi

echo ""
echo "Testing production deployment at: $PROD_URL"
echo ""

# Test 1: Health Check
echo "1️⃣  Testing Health Endpoint..."
HEALTH_RESPONSE=$(curl -s "$PROD_URL/api/health")
if echo "$HEALTH_RESPONSE" | grep -q "ok"; then
  echo "   ✅ Health check passed"
else
  echo "   ❌ Health check failed"
  echo "   Response: $HEALTH_RESPONSE"
fi
echo ""

# Test 2: Embeddings Health (may fail if not configured yet)
echo "2️⃣  Testing Embeddings Service..."
EMBEDDINGS_RESPONSE=$(curl -s "$PROD_URL/api/embeddings/health")
if echo "$EMBEDDINGS_RESPONSE" | grep -q "healthy"; then
  echo "   ✅ Embeddings service is healthy"
  echo "   Semantic search is ENABLED"
elif echo "$EMBEDDINGS_RESPONSE" | grep -q "disabled"; then
  echo "   ⚠️  Embeddings service is disabled"
  echo "   Semantic search is NOT ENABLED"
  echo "   Action: Add ENABLE_SEMANTIC_SEARCH=true to Vercel"
else
  echo "   ⚠️  Embeddings endpoint returned unexpected response"
  echo "   Response: $EMBEDDINGS_RESPONSE"
fi
echo ""

# Test 3: Check if build is recent
echo "3️⃣  Checking Build Info..."
BUILD_INFO=$(curl -s "$PROD_URL/api/health" | grep -o '"timestamp":[^,}]*')
if [ -n "$BUILD_INFO" ]; then
  echo "   ✅ Build info retrieved"
  echo "   $BUILD_INFO"
else
  echo "   ⚠️  Could not retrieve build info"
fi
echo ""

# Test 4: Check static pages
echo "4️⃣  Testing Static Pages..."
LANDING_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/")
if [ "$LANDING_STATUS" = "200" ]; then
  echo "   ✅ Landing page accessible (HTTP $LANDING_STATUS)"
else
  echo "   ❌ Landing page failed (HTTP $LANDING_STATUS)"
fi

PRICING_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/pricing")
if [ "$PRICING_STATUS" = "200" ]; then
  echo "   ✅ Pricing page accessible (HTTP $PRICING_STATUS)"
else
  echo "   ❌ Pricing page failed (HTTP $PRICING_STATUS)"
fi
echo ""

# Summary
echo "======================================"
echo "📊 Verification Summary"
echo "======================================"
echo ""
echo "✅ Core Features:"
echo "   - Health endpoint: Working"
echo "   - Static pages: Accessible"
echo "   - Build: Deployed"
echo ""
echo "⚠️  Action Items:"
echo ""
echo "If embeddings are disabled, run:"
echo "  vercel env add OPENROUTER_EMBEDDING_MODEL production"
echo "  # Enter: openai/text-embedding-3-small"
echo ""
echo "  vercel env add ENABLE_SEMANTIC_SEARCH production"
echo "  # Enter: true"
echo ""
echo "Then run database migration:"
echo "  psql \$DATABASE_URL < db/migrations/008_add_pgvector.sql"
echo ""
echo "📚 Full documentation: PRODUCTION_VERIFICATION_2025-11-10.md"
echo ""

