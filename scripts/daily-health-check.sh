#!/bin/bash
# Daily Production Health Check Script
# Run via cron: 0 9 * * * /path/to/scripts/daily-health-check.sh

set -e

echo "🔍 SynqForge Production Health Check - $(date)"
echo "========================================"

# Load environment variables
if [ -f .env.production.local ]; then
    export $(cat .env.production.local | grep -v '^#' | xargs)
fi

# 1. Error rate from Sentry (last 24 hours)
echo ""
echo "📊 Error Rate (Last 24 hours):"
if [ -n "$SENTRY_AUTH_TOKEN" ]; then
    curl -s "https://sentry.io/api/0/projects/$SENTRY_ORG/$SENTRY_PROJECT/stats/?stat=received&since=$(date -u -d '24 hours ago' +%s)" \
      -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" | \
      jq '.[] | {time: .time, errors: .received}' 2>/dev/null || echo "⚠️  Sentry API call failed"
else
    echo "⚠️  SENTRY_AUTH_TOKEN not configured"
fi

# 2. Token limit breaches
echo ""
echo "💰 Token Limit Breaches:"
if [ -n "$DATABASE_URL" ]; then
    psql "$DATABASE_URL" -t -c "
        SELECT 
            organization_id,
            tokens_used,
            tokens_limit,
            tokens_used - tokens_limit AS overage
        FROM workspace_usage 
        WHERE tokens_used > tokens_limit * 1.05
        ORDER BY overage DESC
        LIMIT 10
    " 2>/dev/null || echo "⚠️  Database query failed"
else
    echo "⚠️  DATABASE_URL not configured"
fi

# 3. Webhook failures (last 24 hours)
echo ""
echo "📨 Failed Webhooks (Last 24h):"
psql "$DATABASE_URL" -t -c "
    SELECT 
        event_type, 
        COUNT(*) as failures,
        MAX(error_message) as last_error
    FROM stripe_webhook_logs 
    WHERE status = 'failed' 
      AND created_at > NOW() - INTERVAL '24 hours'
    GROUP BY event_type
    ORDER BY failures DESC
" 2>/dev/null || echo "⚠️  Database query failed"

# 4. Active subscriptions
echo ""
echo "💳 Subscription Status:"
psql "$DATABASE_URL" -t -c "
    SELECT 
        COALESCE(subscription_status, 'inactive') as status,
        COUNT(*) as count
    FROM organizations 
    GROUP BY subscription_status
    ORDER BY count DESC
" 2>/dev/null || echo "⚠️  Database query failed"

# 5. AI generation success rate (last 24 hours)
echo ""
echo "🤖 AI Generation Success Rate (Last 24h):"
psql "$DATABASE_URL" -t -c "
    SELECT 
        COUNT(*) FILTER (WHERE status = 'completed') AS successful,
        COUNT(*) FILTER (WHERE status = 'failed') AS failed,
        CASE 
            WHEN COUNT(*) = 0 THEN 0
            ELSE ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'completed') / COUNT(*), 2)
        END AS success_rate_pct,
        COUNT(*) as total
    FROM ai_generations 
    WHERE created_at > NOW() - INTERVAL '24 hours'
" 2>/dev/null || echo "⚠️  Database query failed"

# 6. System resource usage
echo ""
echo "🖥️  System Status:"
if command -v vercel &> /dev/null; then
    echo "Checking Vercel deployment status..."
    vercel ls --prod 2>/dev/null | head -5 || echo "⚠️  Vercel CLI not authenticated"
else
    echo "⚠️  Vercel CLI not installed"
fi

# 7. Token usage by tier
echo ""
echo "📈 Token Usage by Tier (Current Billing Period):"
psql "$DATABASE_URL" -t -c "
    SELECT 
        o.subscription_tier,
        COUNT(DISTINCT wu.organization_id) as orgs,
        SUM(wu.tokens_used) as total_tokens,
        AVG(wu.tokens_used) as avg_tokens,
        SUM(CASE WHEN wu.tokens_used > wu.tokens_limit * 0.9 THEN 1 ELSE 0 END) as near_limit
    FROM workspace_usage wu
    JOIN organizations o ON o.id = wu.organization_id
    WHERE wu.billing_period_start >= DATE_TRUNC('month', NOW())
    GROUP BY o.subscription_tier
    ORDER BY total_tokens DESC
" 2>/dev/null || echo "⚠️  Database query failed"

# 8. Recent GDPR requests (if table exists)
echo ""
echo "🔒 GDPR Requests (Last 7 days):"
psql "$DATABASE_URL" -t -c "
    SELECT 
        action,
        COUNT(*) as count
    FROM audit_logs
    WHERE action IN ('GDPR_DATA_EXPORT', 'GDPR_ACCOUNT_DELETION')
      AND created_at > NOW() - INTERVAL '7 days'
    GROUP BY action
" 2>/dev/null || echo "No GDPR tracking table yet"

echo ""
echo "✅ Health check complete - $(date)"
echo ""
echo "========================================"
echo "Action Items:"
echo "- Review any failed webhooks immediately"
echo "- Check Sentry for error details"
echo "- Monitor organizations near token limits"
echo "========================================"

