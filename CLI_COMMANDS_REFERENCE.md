# 🛠️ CLI Commands Reference - Subscription Gating

Complete reference for all CLI commands used in subscription gating setup, testing, and deployment.

---

## 📦 Installation & Setup

### **1. Install Required Packages**

```bash
# Install @neondatabase/serverless for Edge runtime
npm install @neondatabase/serverless

# Install Neon CLI globally (optional)
npm install -g neonctl

# Install Stripe CLI (macOS)
brew install stripe/stripe-cli/stripe

# Install Vercel CLI globally
npm install -g vercel
```

---

## 🗄️ Database Setup (Neon)

### **Create New Project**

```bash
# Create new Neon project
neon project create synqforge-prod --region aws-us-east-1

# List all projects
neon projects list

# Get connection string
neon connection string synqforge-prod

# Example output:
# postgresql://user:pass@ep-xxx-pooler.us-east-1.aws.neon.tech/db?sslmode=require
```

### **Run Migrations**

```bash
# Using Drizzle (recommended)
npm run db:migrate

# Or using Neon CLI
neon migration apply --project synqforge-prod --database main

# Check migration status
neon migrations list --project synqforge-prod
```

### **Database Operations**

```bash
# Connect to database
neon psql synqforge-prod

# Query subscription data
psql -c "SELECT id, name, subscription_tier, subscription_status FROM organizations;"

# Check pooler status
neon pooler status synqforge-prod
```

---

## 💳 Stripe Setup & Testing

### **Login & Configure**

```bash
# Login to Stripe CLI
stripe login

# Verify login
stripe config --list

# Set default API key
export STRIPE_SECRET_KEY=sk_test_xxx
```

### **Webhook Testing (Local)**

```bash
# Terminal 1: Start Next.js dev server
npm run dev

# Terminal 2: Forward webhooks to local
stripe listen --forward-to http://localhost:3000/api/webhooks/stripe

# Copy webhook signing secret from output:
# Ready! Your webhook signing secret is whsec_xxx
```

### **Trigger Test Events**

```bash
# Create subscription
stripe trigger customer.subscription.created

# Update subscription
stripe trigger customer.subscription.updated

# Payment succeeded
stripe trigger invoice.payment_succeeded

# Payment failed
stripe trigger invoice.payment_failed

# Cancel subscription
stripe trigger customer.subscription.deleted

# Checkout completed
stripe trigger checkout.session.completed
```

### **List Stripe Objects**

```bash
# List customers
stripe customers list --limit 10

# List subscriptions
stripe subscriptions list --limit 10

# List recent events
stripe events list --limit 20

# Get specific subscription
stripe subscriptions retrieve sub_xxx

# List prices
stripe prices list --active
```

### **Create Test Subscription**

```bash
# Create customer
stripe customers create \
  --email test@example.com \
  --name "Test User"

# Create subscription
stripe subscriptions create \
  --customer cus_xxx \
  --items '[{"price":"price_xxx"}]' \
  --metadata '{"organizationId":"org_123"}'
```

---

## ☁️ Vercel Deployment

### **Setup & Link**

```bash
# Link to Vercel project
vercel link

# List current environment variables
vercel env ls

# Pull environment variables locally
vercel env pull .env.local
```

### **Environment Variables**

```bash
# Add new environment variable
vercel env add DATABASE_URL

# Add to all environments
vercel env add STRIPE_SECRET_KEY production preview development

# Remove environment variable
vercel env rm OLD_VAR_NAME

# View specific variable
vercel env ls | grep DATABASE_URL
```

### **Deployment**

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Canary deploy (10% traffic)
vercel --prod --percent=10

# Deploy specific branch
vercel --prod --branch=main

# Force redeploy
vercel --prod --force
```

### **Logs & Monitoring**

```bash
# View production logs (last 1 hour)
vercel logs --prod --since 1h

# Follow logs in real-time
vercel logs --prod --follow

# Filter logs by function
vercel logs --prod --output=api/webhooks/stripe

# View deployment status
vercel inspect
```

### **Domains & URLs**

```bash
# List domains
vercel domains ls

# Add domain
vercel domains add example.com

# Get deployment URL
vercel --prod --confirm
```

---

## 🧪 Testing Scripts

### **1. Subscription Gating Test**

```bash
# Set session token
export SESSION_TOKEN="your-next-auth-session-token"

# Run test script
./scripts/test-subscription-gating.sh

# Or with custom URL
BASE_URL=https://your-app.vercel.app ./scripts/test-subscription-gating.sh
```

### **2. Stripe Webhook Test**

```bash
# Set Stripe secret key
export STRIPE_SECRET_KEY=sk_test_xxx

# Run webhook tests
./scripts/test-stripe-webhooks.sh
```

### **3. Deployment Verification**

```bash
# Run all pre-deployment checks
./scripts/verify-deployment.sh

# Fix any issues, then deploy
vercel --prod
```

### **4. Node.js Test Suite**

```bash
# Run all tests
npm run test

# Run subscription gating tests only
npm run test tests/subscription-gating.test.ts

# With session tokens
FREE_USER_SESSION=xxx CORE_USER_SESSION=xxx npm run test
```

---

## 🔧 Build & Development

### **Local Development**

```bash
# Start dev server with Turbo
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type check
npm run typecheck

# Lint code
npm run lint
```

### **Database Operations**

```bash
# Generate new migration
npm run db:generate

# Apply migrations
npm run db:migrate

# Push schema changes
npm run db:push

# Open Drizzle Studio
npm run db:studio
```

---

## 🐛 Debugging Commands

### **Check Subscription Status**

```bash
# Connect to Neon database
neon psql synqforge-prod

# Query organization subscription
SELECT 
  id, 
  name, 
  subscription_tier, 
  subscription_status,
  stripe_customer_id,
  stripe_subscription_id,
  trial_ends_at
FROM organizations
WHERE email = 'user@example.com';

# Check Stripe subscription
stripe subscriptions retrieve $(echo "SELECT stripe_subscription_id FROM organizations WHERE id='org_xxx'" | psql -t)
```

### **Verify Webhook Delivery**

```bash
# List recent webhook events
stripe events list --type customer.subscription.*

# Get specific event
stripe events retrieve evt_xxx

# Check webhook endpoints
stripe webhook_endpoints list

# Test webhook endpoint
stripe webhook_endpoints update we_xxx --enabled-events customer.subscription.updated
```

### **Test API Endpoints**

```bash
# Test export endpoint (should return 402 for free users)
curl -X GET http://localhost:3000/api/stories/export \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -w "\nStatus: %{http_code}\n"

# Test bulk operations (should return 402 for free/core users)
curl -X POST http://localhost:3000/api/stories/bulk \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"projectId":"test","stories":[]}' \
  -w "\nStatus: %{http_code}\n"

# Test with verbose output
curl -v http://localhost:3000/api/stories/export \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"
```

---

## 🚨 Emergency Commands

### **Rollback Deployment**

```bash
# List recent deployments
vercel ls

# Rollback to previous deployment
vercel rollback DEPLOYMENT_URL

# Promote specific deployment to production
vercel promote DEPLOYMENT_URL
```

### **Disable Subscription Checks**

```bash
# Temporarily disable (emergency only)
vercel env add DISABLE_SUBSCRIPTION_CHECKS true production

# Re-enable
vercel env rm DISABLE_SUBSCRIPTION_CHECKS production
```

### **Check System Health**

```bash
# Check Neon connection
curl https://console.neon.tech/api/v2/projects/PROJECT_ID/branches/main/databases/main

# Check Stripe API
stripe balance retrieve

# Check Vercel deployment status
vercel --version && vercel whoami
```

---

## 📊 Monitoring & Analytics

### **Vercel Analytics**

```bash
# View analytics dashboard
open https://vercel.com/YOUR_TEAM/YOUR_PROJECT/analytics

# Download analytics data
vercel analytics export --since 7d
```

### **Stripe Dashboard**

```bash
# Open Stripe dashboard
open https://dashboard.stripe.com

# View webhook logs
open https://dashboard.stripe.com/webhooks

# View subscriptions
open https://dashboard.stripe.com/subscriptions
```

### **Logs Analysis**

```bash
# Count 402 responses
vercel logs --prod --since 1d | grep "402" | wc -l

# Find subscription gate blocks
vercel logs --prod --since 1h | grep "Subscription gate blocked"

# Export logs to file
vercel logs --prod --since 1d > logs.txt
```

---

## 🔐 Security Commands

### **Rotate Secrets**

```bash
# Generate new webhook secret
stripe webhook_endpoints create \
  --url https://your-app.com/api/webhooks/stripe \
  --enabled-events customer.subscription.created,customer.subscription.updated

# Update in Vercel
vercel env add STRIPE_WEBHOOK_SECRET production

# Generate new NextAuth secret
openssl rand -base64 32 | vercel env add NEXTAUTH_SECRET production
```

### **Audit Access**

```bash
# Check who can access Vercel project
vercel teams ls
vercel members ls

# Check Stripe team access
stripe users list
```

---

## 📝 Common Workflows

### **Workflow 1: New Feature Deployment**

```bash
# 1. Build and test locally
npm run build
npm run test

# 2. Deploy to preview
vercel

# 3. Test preview deployment
TEST_BASE_URL=https://your-preview.vercel.app ./scripts/test-subscription-gating.sh

# 4. Deploy to production
vercel --prod

# 5. Monitor for issues
vercel logs --prod --follow
```

### **Workflow 2: Subscription Tier Change**

```bash
# 1. Update subscription in Stripe
stripe subscriptions update sub_xxx --metadata tier=pro

# 2. Trigger webhook
stripe events resend evt_xxx

# 3. Verify in database
psql -c "SELECT subscription_tier FROM organizations WHERE stripe_subscription_id='sub_xxx';"

# 4. Test access
curl http://localhost:3000/api/stories/export -H "Cookie: ..."
```

### **Workflow 3: Debugging 402 Errors**

```bash
# 1. Check user's subscription
psql -c "SELECT * FROM organizations WHERE id='org_xxx';"

# 2. Check Stripe subscription
stripe subscriptions retrieve sub_xxx

# 3. Verify webhook processed
stripe events list --type customer.subscription.* | grep sub_xxx

# 4. Check logs
vercel logs --prod --since 1h | grep org_xxx

# 5. Manually trigger webhook if needed
stripe events resend evt_xxx
```

---

## 🎯 Quick Reference

### **Most Used Commands**

```bash
# Start development
npm run dev

# Test locally
./scripts/test-subscription-gating.sh

# Deploy to production
vercel --prod

# View logs
vercel logs --prod --follow

# Test webhook
stripe trigger customer.subscription.created

# Check database
neon psql synqforge-prod
```

---

## 📚 Additional Resources

- [Vercel CLI Docs](https://vercel.com/docs/cli)
- [Stripe CLI Reference](https://stripe.com/docs/stripe-cli)
- [Neon CLI Guide](https://neon.tech/docs/reference/neon-cli)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

---

**Last Updated**: October 26, 2025  
**Maintained by**: Development Team

