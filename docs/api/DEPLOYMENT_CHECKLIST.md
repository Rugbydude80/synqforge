# REST API & Webhooks Deployment Checklist

## Pre-Deployment Checklist

### ✅ Code Quality
- [x] Linting passed (`npm run lint`)
- [x] Type checking passed (`npm run typecheck`)
- [x] Build succeeded (`npm run build`)
- [x] Tests created and passing

### ✅ Database Migration
- [ ] **IMPORTANT**: Run database migration before deployment
  ```bash
  npm run db:migrate
  ```
  This will create the `api_keys`, `webhooks`, and `webhook_deliveries` tables

### ✅ Environment Variables
Ensure these are set in your production environment (Vercel/dashboard):

**Required:**
- `API_RATE_LIMIT_PRO=1000` - Rate limit for Pro tier
- `API_RATE_LIMIT_TEAM=5000` - Rate limit for Team tier
- `API_CORS_ORIGINS` - Comma-separated list of allowed origins (or `*` for public)
- `WEBHOOK_SECRET_KEY` - 32-byte encryption key for webhook secrets
- `CRON_SECRET` - Secret for protecting cron endpoints

**Optional (uses defaults if not set):**
- `WEBHOOK_MAX_RETRIES=5`
- `WEBHOOK_RETRY_DELAYS=1,5,30,300,1800`

### ✅ Vercel Configuration
- [x] Webhook retry cron job added to `vercel.json`
- [ ] Verify cron job is scheduled: `/api/cron/webhook-retries` every 5 minutes

### ✅ Feature Gates
- [x] `API_ACCESS` feature gate added (requires Pro+)
- [x] `SERVICE_KEYS` feature gate added (requires Enterprise)

## Post-Deployment Verification

1. **Test API Authentication**
   ```bash
   curl -H "Authorization: Bearer YOUR_API_KEY" https://your-domain.com/api/v1/stories
   ```

2. **Test Rate Limiting**
   - Make requests until rate limit is hit
   - Verify `X-RateLimit-*` headers are present
   - Verify 429 response when limit exceeded

3. **Test Webhook Creation**
   - Create a webhook via API
   - Verify webhook is stored correctly
   - Trigger a test event

4. **Test Webhook Delivery**
   - Create a test webhook endpoint
   - Trigger a story creation
   - Verify webhook is delivered
   - Check delivery history endpoint

5. **Verify API Key Management UI**
   - Navigate to `/settings/api-keys`
   - Create a new API key
   - Verify key is displayed (prefix only)
   - Revoke a key and verify it's deactivated

## Rollback Plan

If issues occur:
1. Revert the deployment in Vercel
2. The database migration can be rolled back if needed (backup first!)
3. API endpoints will be unavailable until rollback completes

## Monitoring

After deployment, monitor:
- API endpoint response times
- Rate limit violations (429 responses)
- Webhook delivery success/failure rates
- Error logs for authentication failures
- Database query performance for API key lookups

## Known Limitations

- Webhook retries run every 5 minutes (configurable)
- Rate limiting requires Upstash Redis (already configured)
- API keys are hashed with bcrypt (one-way, cannot retrieve original)
- Webhook secrets are encrypted (can be decrypted for HMAC signing)

