#!/bin/bash

# Production Monitoring Script
# Monitors the AI Context Level feature in production

echo "🔍 SynqForge Production Monitoring"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check API health
echo "1. Checking API Health..."
HEALTH_RESPONSE=$(curl -s https://synqforge.com/api/health)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ API is responding${NC}"
else
    echo -e "${RED}❌ API is not responding${NC}"
fi
echo ""

# Check deployment status
echo "2. Checking Deployment Status..."
vercel ls synqforge --limit 1
echo ""

# Check recent logs for errors
echo "3. Checking Recent Errors..."
echo "Last 10 error logs:"
vercel logs --filter "error" --limit 10
echo ""

# Monitor specific endpoints
echo "4. Testing AI Context Endpoints..."

echo "Testing /api/health..."
curl -s https://synqforge.com/api/health | head -n 5
echo ""

echo "Testing /api/ai/context-level/user-data (requires auth)..."
echo "(Skipping - requires authentication token)"
echo ""

# Database check (if DATABASE_URL is set)
if [ -n "$DATABASE_URL" ]; then
    echo "5. Checking Database..."
    psql $DATABASE_URL -c "SELECT COUNT(*) as usage_records FROM ai_action_usage;" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Database is accessible${NC}"
    else
        echo -e "${YELLOW}⚠️  Database connection failed or table doesn't exist${NC}"
        echo "Run migration: npm run db:migrate"
    fi
else
    echo "5. Database Check Skipped (DATABASE_URL not set)"
fi
echo ""

# Summary
echo "======================================"
echo "📊 Monitoring Summary"
echo "======================================"
echo ""
echo "Metrics to Watch:"
echo "  • Error rates (403, 429, 500)"
echo "  • API response times"
echo "  • User adoption of context levels"
echo "  • Team plan purchases (verify 5+ users)"
echo ""
echo "Commands:"
echo "  • Real-time logs: vercel logs --follow"
echo "  • Error logs: vercel logs --filter 'error'"
echo "  • API health: curl https://synqforge.com/api/health"
echo ""
echo "Documentation:"
echo "  • PRODUCTION_COMPLETION_REPORT.md"
echo "  • DEPLOYMENT_SUCCESS.md"
echo "  • FEATURE_STATUS.md"
echo ""
echo -e "${GREEN}✅ Monitoring check complete${NC}"

