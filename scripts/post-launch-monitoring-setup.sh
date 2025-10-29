#!/bin/bash
# 📊 POST-LAUNCH MONITORING SETUP
# Sets up monitoring alerts and health checks after successful deployment
# Run: ./scripts/post-launch-monitoring-setup.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}📊 Post-Launch Monitoring Setup${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

#==============================================================================
# 1. Daily Health Check Cron Setup
#==============================================================================

echo -e "${BOLD}1. Setting Up Daily Health Check Cron${NC}"
echo "======================================"
echo ""

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
HEALTH_CHECK_SCRIPT="$SCRIPT_DIR/daily-health-check.sh"

if [ ! -f "$HEALTH_CHECK_SCRIPT" ]; then
  echo -e "${RED}❌ daily-health-check.sh not found at $HEALTH_CHECK_SCRIPT${NC}"
  exit 1
fi

echo "Daily health check script: $HEALTH_CHECK_SCRIPT"
echo ""

# Make sure script is executable
chmod +x "$HEALTH_CHECK_SCRIPT"

# Check if cron entry already exists
if crontab -l 2>/dev/null | grep -q "$HEALTH_CHECK_SCRIPT"; then
  echo -e "${YELLOW}⚠️  Cron job already exists${NC}"
  echo ""
  crontab -l | grep "$HEALTH_CHECK_SCRIPT"
  echo ""
  read -p "Update cron job? (y/n): " update_cron
  if [[ ! "$update_cron" =~ ^[Yy]$ ]]; then
    echo "Skipping cron setup"
  else
    # Remove old entry
    crontab -l | grep -v "$HEALTH_CHECK_SCRIPT" | crontab -
    echo "Removed old cron job"
  fi
fi

# Add new cron entry
if ! crontab -l 2>/dev/null | grep -q "$HEALTH_CHECK_SCRIPT"; then
  echo ""
  read -p "Enter email for health check reports (or press Enter to skip): " email
  
  if [ -n "$email" ]; then
    CRON_COMMAND="0 9 * * * $HEALTH_CHECK_SCRIPT | mail -s \"SynqForge Daily Health Check\" $email"
  else
    CRON_COMMAND="0 9 * * * $HEALTH_CHECK_SCRIPT >> /tmp/synqforge-health.log 2>&1"
  fi
  
  echo ""
  echo "Adding cron job:"
  echo "  $CRON_COMMAND"
  echo ""
  
  (crontab -l 2>/dev/null; echo "$CRON_COMMAND") | crontab -
  
  echo -e "${GREEN}✅ Cron job added successfully${NC}"
  echo ""
  echo "Schedule: Daily at 9:00 AM"
  if [ -n "$email" ]; then
    echo "Reports sent to: $email"
  else
    echo "Logs written to: /tmp/synqforge-health.log"
  fi
fi

echo ""
echo ""

#==============================================================================
# 2. Sentry Alert Configuration
#==============================================================================

echo -e "${BOLD}2. Sentry Alert Configuration${NC}"
echo "=============================="
echo ""

echo "Configure the following alerts in your Sentry dashboard:"
echo "Visit: https://sentry.io/settings/projects/synqforge/alerts/"
echo ""

echo "Recommended Alert Rules:"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Alert 1: High Error Rate"
echo "  Condition: Error rate > 5%"
echo "  Window: 15 minutes"
echo "  Action: Send notification to Slack/Email"
echo "  Priority: High"
echo ""
echo "Alert 2: Webhook Failures"
echo "  Condition: > 3 webhook failures"
echo "  Window: 1 hour"
echo "  Action: Send notification to PagerDuty/Slack"
echo "  Priority: High"
echo ""
echo "Alert 3: Database Timeouts"
echo "  Condition: Database query > 5s"
echo "  Window: 5 minutes"
echo "  Action: Send notification to Email"
echo "  Priority: Medium"
echo ""
echo "Alert 4: Subscription Errors"
echo "  Condition: Error tagged 'subscription'"
echo "  Window: 15 minutes"
echo "  Action: Send notification to Email"
echo "  Priority: High"
echo ""
echo "Alert 5: Rate Limit Exceeded"
echo "  Condition: Error message contains '429'"
echo "  Window: 5 minutes"
echo "  Action: Send notification to Slack"
echo "  Priority: Low"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
read -p "Have you configured Sentry alerts? (y/n): " sentry_done

if [[ ! "$sentry_done" =~ ^[Yy]$ ]]; then
  echo -e "${YELLOW}⚠️  Remember to configure Sentry alerts${NC}"
fi

echo ""
echo ""

#==============================================================================
# 3. Vercel Analytics Setup
#==============================================================================

echo -e "${BOLD}3. Vercel Analytics Setup${NC}"
echo "========================="
echo ""

echo "Vercel Analytics should already be enabled for your deployment."
echo ""
echo "Verify at: https://vercel.com/dashboard/analytics"
echo ""
echo "Key Metrics to Monitor:"
echo "  • Real User Monitoring (RUM)"
echo "  • Web Vitals (LCP, FID, CLS)"
echo "  • Top Pages"
echo "  • Geographic Distribution"
echo "  • Device/Browser Breakdown"
echo ""

read -p "Open Vercel Analytics in browser? (y/n): " open_vercel
if [[ "$open_vercel" =~ ^[Yy]$ ]]; then
  open "https://vercel.com/dashboard/analytics" 2>/dev/null || \
    xdg-open "https://vercel.com/dashboard/analytics" 2>/dev/null || \
    echo "Please visit: https://vercel.com/dashboard/analytics"
fi

echo ""
echo ""

#==============================================================================
# 4. Uptime Monitoring
#==============================================================================

echo -e "${BOLD}4. External Uptime Monitoring${NC}"
echo "=============================="
echo ""

echo "Consider setting up external uptime monitoring:"
echo ""
echo "Recommended Services (Free Tier Available):"
echo "  • UptimeRobot: https://uptimerobot.com"
echo "  • Better Uptime: https://betteruptime.com"
echo "  • Pingdom: https://pingdom.com"
echo ""
echo "Monitor These Endpoints:"
echo "  • https://synqforge.com/api/health (every 5 minutes)"
echo "  • https://synqforge.com/ (every 5 minutes)"
echo "  • https://synqforge.com/api/webhooks/stripe (every hour, expect 405)"
echo ""

read -p "Set up uptime monitoring? (y/n): " uptime_setup
if [[ "$uptime_setup" =~ ^[Yy]$ ]]; then
  echo ""
  echo "Choose a service:"
  echo "  1) UptimeRobot (Recommended, Free 50 monitors)"
  echo "  2) Better Uptime (Modern, Free 10 monitors)"
  echo "  3) Other / Manual setup"
  read -p "Enter choice (1-3): " uptime_choice
  
  case $uptime_choice in
    1)
      open "https://uptimerobot.com/signUp" 2>/dev/null || \
        xdg-open "https://uptimerobot.com/signUp" 2>/dev/null || \
        echo "Please visit: https://uptimerobot.com/signUp"
      ;;
    2)
      open "https://betteruptime.com/users/sign_up" 2>/dev/null || \
        xdg-open "https://betteruptime.com/users/sign_up" 2>/dev/null || \
        echo "Please visit: https://betteruptime.com/users/sign_up"
      ;;
    *)
      echo "Set up monitoring manually"
      ;;
  esac
fi

echo ""
echo ""

#==============================================================================
# 5. Stripe Webhook Monitoring
#==============================================================================

echo -e "${BOLD}5. Stripe Webhook Monitoring${NC}"
echo "============================"
echo ""

echo "Set up webhook monitoring in Stripe:"
echo ""
echo "1. Visit: https://dashboard.stripe.com/webhooks"
echo "2. Click your synqforge.com webhook"
echo "3. Enable 'Email on webhook failures'"
echo "4. Set up Slack notifications (optional)"
echo ""

read -p "Have you enabled Stripe webhook alerts? (y/n): " stripe_alerts
if [[ ! "$stripe_alerts" =~ ^[Yy]$ ]]; then
  echo -e "${YELLOW}⚠️  Remember to enable Stripe webhook alerts${NC}"
fi

echo ""
echo ""

#==============================================================================
# 6. Database Monitoring
#==============================================================================

echo -e "${BOLD}6. Database Monitoring (Neon)${NC}"
echo "=============================="
echo ""

echo "Check Neon Console for database monitoring:"
echo ""
echo "1. Visit: https://console.neon.tech"
echo "2. Select your project"
echo "3. Go to 'Monitoring' tab"
echo ""
echo "Set up alerts for:"
echo "  • Connection pool exhaustion"
echo "  • High query latency"
echo "  • Storage usage > 80%"
echo ""

read -p "Open Neon Console? (y/n): " open_neon
if [[ "$open_neon" =~ ^[Yy]$ ]]; then
  open "https://console.neon.tech" 2>/dev/null || \
    xdg-open "https://console.neon.tech" 2>/dev/null || \
    echo "Please visit: https://console.neon.tech"
fi

echo ""
echo ""

#==============================================================================
# 7. Create Monitoring Dashboard Bookmarks
#==============================================================================

echo -e "${BOLD}7. Monitoring Dashboard Links${NC}"
echo "=============================="
echo ""

echo "Save these monitoring dashboard links:"
echo ""
cat > /tmp/synqforge-monitoring-links.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
  <title>SynqForge Monitoring Dashboards</title>
  <style>
    body { font-family: system-ui; max-width: 800px; margin: 50px auto; padding: 20px; }
    h1 { color: #333; }
    .section { margin: 30px 0; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
    .section h2 { margin-top: 0; color: #0066cc; }
    a { color: #0066cc; text-decoration: none; display: block; margin: 10px 0; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>🚀 SynqForge Monitoring Dashboards</h1>
  
  <div class="section">
    <h2>🌐 Production URLs</h2>
    <a href="https://synqforge.com" target="_blank">Main Application</a>
    <a href="https://synqforge.com/api/health" target="_blank">Health Endpoint</a>
    <a href="https://synqforge.com/dashboard" target="_blank">Dashboard</a>
  </div>
  
  <div class="section">
    <h2>📊 Analytics & Monitoring</h2>
    <a href="https://vercel.com/dashboard/analytics" target="_blank">Vercel Analytics</a>
    <a href="https://vercel.com/dashboard/deployments" target="_blank">Vercel Deployments</a>
    <a href="https://sentry.io" target="_blank">Sentry Error Tracking</a>
  </div>
  
  <div class="section">
    <h2>💳 Stripe</h2>
    <a href="https://dashboard.stripe.com/dashboard" target="_blank">Stripe Dashboard</a>
    <a href="https://dashboard.stripe.com/webhooks" target="_blank">Webhook Monitoring</a>
    <a href="https://dashboard.stripe.com/subscriptions" target="_blank">Subscriptions</a>
  </div>
  
  <div class="section">
    <h2>🗄️ Database</h2>
    <a href="https://console.neon.tech" target="_blank">Neon Console</a>
  </div>
  
  <div class="section">
    <h2>📈 Optional Services</h2>
    <a href="https://uptimerobot.com" target="_blank">UptimeRobot</a>
    <a href="https://betteruptime.com" target="_blank">Better Uptime</a>
  </div>
</body>
</html>
EOF

echo "Monitoring dashboard HTML created: /tmp/synqforge-monitoring-links.html"
echo ""
read -p "Open monitoring dashboard? (y/n): " open_dashboard
if [[ "$open_dashboard" =~ ^[Yy]$ ]]; then
  open /tmp/synqforge-monitoring-links.html 2>/dev/null || \
    xdg-open /tmp/synqforge-monitoring-links.html 2>/dev/null || \
    echo "Open file: /tmp/synqforge-monitoring-links.html"
fi

echo ""
echo ""

#==============================================================================
# FINAL SUMMARY
#==============================================================================

echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}✅ Monitoring Setup Complete${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "What's Running:"
if crontab -l 2>/dev/null | grep -q "$HEALTH_CHECK_SCRIPT"; then
  echo -e "  ${GREEN}✅${NC} Daily health checks (cron)"
else
  echo -e "  ${YELLOW}⚠️${NC}  Daily health checks (not configured)"
fi

echo ""
echo "Next Steps:"
echo "  1. Configure remaining Sentry alerts"
echo "  2. Set up uptime monitoring service"
echo "  3. Monitor for first 24 hours"
echo "  4. Review daily health check emails"
echo ""
echo "Manual Health Check:"
echo "  $HEALTH_CHECK_SCRIPT"
echo ""
echo "All monitoring links saved to:"
echo "  /tmp/synqforge-monitoring-links.html"
echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

