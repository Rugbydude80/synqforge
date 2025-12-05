# Quick Start Deployment Guide

## Prerequisites

1. **Database Migration** - Must run BEFORE deployment
2. **Vercel Account** - Connected to your GitHub repository
3. **Environment Variables** - Set in Vercel dashboard

## Step-by-Step Deployment

### 1. Run Database Migration

```bash
npm run db:migrate
```

This creates the required tables:
- `api_keys`
- `webhooks`
- `webhook_deliveries`

**⚠️ IMPORTANT:** Run this BEFORE deploying code!

### 2. Set Environment Variables in Vercel

Go to your Vercel project → Settings → Environment Variables

Add these variables:

```bash
API_RATE_LIMIT_PRO=1000
API_RATE_LIMIT_TEAM=5000
API_CORS_ORIGINS=https://your-domain.com
WEBHOOK_SECRET_KEY=<generate-with-openssl-rand-hex-32>
CRON_SECRET=<generate-with-openssl-rand-base64-32>
```

**Generate secrets:**
```bash
# Generate WEBHOOK_SECRET_KEY (32 bytes)
openssl rand -hex 32

# Generate CRON_SECRET
openssl rand -base64 32
```

### 3. Deploy Using Script

**Option A: Interactive (Recommended)**
```bash
npm run deploy:api
```

**Option B: Auto-commit and deploy**
```bash
AUTO_COMMIT=true npm run deploy:api
```

**Option C: Skip tests (if needed)**
```bash
SKIP_TESTS=true npm run deploy:api
```

### 4. Verify Deployment

1. **Check API endpoint:**
   ```bash
   curl https://your-domain.com/api/v1/stories
   # Should return 401 (unauthorized) - this is correct!
   ```

2. **Test API key creation:**
   - Log into your app
   - Navigate to `/settings/api-keys`
   - Create a test API key
   - Copy the key (shown only once!)

3. **Test API with key:**
   ```bash
   curl -H "Authorization: Bearer YOUR_API_KEY" \
        https://your-domain.com/api/v1/stories
   ```

4. **Verify webhook cron:**
   - Go to Vercel dashboard → Cron Jobs
   - Verify `/api/cron/webhook-retries` is scheduled every 5 minutes

## Automated Deployment (GitHub Actions)

If you've set up GitHub Actions (see `.github/workflows/deploy-api.yml`):

1. Push to `main` branch
2. GitHub Actions will automatically:
   - Run tests
   - Build the application
   - Deploy to Vercel production

**Required GitHub Secrets:**
- `VERCEL_TOKEN` - Get from Vercel dashboard → Settings → Tokens
- `VERCEL_ORG_ID` - Your Vercel organization ID
- `VERCEL_PROJECT_ID` - Your Vercel project ID

## Troubleshooting

### Database Migration Failed
```bash
# Check database connection
echo $DATABASE_URL

# Try migration again
npm run db:migrate

# Or push schema directly (development only)
npm run db:push
```

### Environment Variables Not Set
1. Go to Vercel dashboard
2. Project → Settings → Environment Variables
3. Add missing variables
4. Redeploy

### API Returns 401
- Check API key format: `sk_prefix_suffix`
- Verify API key is active in database
- Check subscription tier (requires Pro+)

### Webhooks Not Delivering
1. Check webhook is active: `GET /api/v1/webhooks`
2. Verify webhook URL is accessible
3. Check delivery history: `GET /api/v1/webhooks/{id}/deliveries`
4. Verify cron job is running in Vercel

## Rollback

If deployment fails:

1. **Revert in Vercel:**
   - Go to Vercel dashboard → Deployments
   - Find previous successful deployment
   - Click "..." → "Promote to Production"

2. **Revert Git:**
   ```bash
   git revert HEAD
   git push origin main
   ```

3. **Database:**
   - Tables can remain (won't break existing functionality)
   - API endpoints will return 404 until code is restored

## Support

For issues or questions:
1. Check deployment logs in Vercel dashboard
2. Review error logs in Vercel → Functions
3. Check GitHub Actions logs (if using CI/CD)









