# Environment Variables Reference

This document describes all environment variables used in SynqForge.

## Database

### `DATABASE_URL` (Required)
PostgreSQL connection string for Neon database.

**Format**: `postgresql://user:password@host:port/database?sslmode=require`

**Example**: `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require`

**Used by**: All database operations, migrations, embeddings service

---

## AI Services

### `QWEN_API_KEY` (Required for AI features)
API key for Qwen AI service (Alibaba Cloud Dashscope).

**Where to get**: https://dashscope.aliyuncs.com/

**Used by**: Story generation, embeddings generation

### `QWEN_API_ENDPOINT` (Optional)
Base URL for Qwen API.

**Default**: `https://dashscope.aliyuncs.com/api/v1`

**Used by**: AI service, embeddings service

### `QWEN_EMBEDDING_MODEL` (Optional)
Model to use for generating vector embeddings.

**Default**: `text-embedding-v3`

**Options**: 
- `text-embedding-v3` (1024 dimensions, recommended)
- `text-embedding-v2` (1536 dimensions)

**Used by**: Embeddings service

---

## Semantic Search

### `ENABLE_SEMANTIC_SEARCH` (Optional)
Enable/disable semantic similarity search feature.

**Default**: `false`

**Values**: `true` | `false`

**Used by**: Story generation API, embeddings service

### `SEMANTIC_SEARCH_MIN_SIMILARITY` (Optional)
Minimum similarity score (0-1) for stories to be considered relevant.

**Default**: `0.7`

**Range**: `0.0` to `1.0`

**Recommended**: 
- `0.6` - More results, less precise
- `0.7` - Balanced (recommended)
- `0.8` - Fewer results, more precise

**Used by**: Embeddings service

### `SEMANTIC_SEARCH_MAX_RESULTS` (Optional)
Maximum number of similar stories to return.

**Default**: `5`

**Recommended**: `3-7` (more = more tokens)

**Used by**: Embeddings service

---

## Authentication

### `NEXTAUTH_URL` (Required)
Base URL of your application.

**Development**: `http://localhost:3000`

**Production**: `https://your-domain.vercel.app`

**Used by**: NextAuth authentication

### `NEXTAUTH_SECRET` (Required)
Secret key for encrypting tokens and sessions.

**Generate with**: `openssl rand -base64 32`

**Used by**: NextAuth authentication

---

## Stripe Payment Processing

### `STRIPE_SECRET_KEY` (Required for billing)
Stripe secret key for server-side operations.

**Format**: `sk_test_...` (test) or `sk_live_...` (production)

**Where to get**: https://dashboard.stripe.com/apikeys

**Used by**: Billing service, webhooks

### `STRIPE_PUBLISHABLE_KEY` (Required for billing)
Stripe publishable key for client-side operations.

**Format**: `pk_test_...` (test) or `pk_live_...` (production)

**Used by**: Server-side billing service

### `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (Required for billing)
Client-accessible Stripe publishable key.

**Format**: Same as `STRIPE_PUBLISHABLE_KEY`

**Used by**: Client-side payment forms

### `STRIPE_WEBHOOK_SECRET` (Required for webhooks)
Secret for validating Stripe webhook signatures.

**Format**: `whsec_...`

**Where to get**: Stripe Dashboard → Webhooks → Add endpoint

**Used by**: Webhook handler

---

## Email

### `RESEND_API_KEY` (Required for emails)
API key for Resend email service.

**Where to get**: https://resend.com/api-keys

**Used by**: Email service, notifications

---

## Redis (Rate Limiting)

### `UPSTASH_REDIS_REST_URL` (Required)
REST URL for Upstash Redis instance.

**Format**: `https://xxx.upstash.io`

**Where to get**: https://console.upstash.com/

**Used by**: Rate limiting, caching

### `UPSTASH_REDIS_REST_TOKEN` (Required)
Authentication token for Upstash Redis.

**Used by**: Rate limiting, caching

---

## Error Tracking

### `SENTRY_DSN` (Optional)
Server-side Sentry DSN for error tracking.

**Format**: `https://xxx@xxx.ingest.sentry.io/xxx`

**Where to get**: https://sentry.io/

**Used by**: Server-side error tracking

### `NEXT_PUBLIC_SENTRY_DSN` (Optional)
Client-side Sentry DSN.

**Format**: Same as `SENTRY_DSN`

**Used by**: Client-side error tracking

---

## File Uploads

### `UPLOADTHING_SECRET` (Optional)
Secret key for UploadThing service.

**Format**: `sk_live_...`

**Where to get**: https://uploadthing.com/

**Used by**: File upload service

### `UPLOADTHING_APP_ID` (Optional)
Application ID for UploadThing.

**Used by**: File upload service

---

## Feature Flags

### `NODE_ENV` (Automatic)
Node.js environment mode.

**Values**: `development` | `production` | `test`

**Set by**: Node.js/Next.js automatically

**Used by**: All services for environment-specific behavior

---

## Setting Environment Variables

### Local Development

1. Create `.env.local` file in project root:
```bash
cp .env.example .env.local
```

2. Fill in your values:
```bash
DATABASE_URL="your-database-url"
QWEN_API_KEY="your-api-key"
# ... etc
```

### Vercel Production

Add variables via CLI:

```bash
# Add a single variable
vercel env add QWEN_API_KEY production

# Add multiple variables from .env.local
vercel env pull .env.production
```

Or via Vercel Dashboard:
1. Go to your project settings
2. Navigate to Environment Variables
3. Add each variable with appropriate scope (Production, Preview, Development)

### Vercel Preview

Preview deployments inherit production variables by default. To override:

```bash
vercel env add VARIABLE_NAME preview
```

---

## Security Best Practices

1. **Never commit `.env.local`** - It's in `.gitignore` by default
2. **Use different keys** for development/production
3. **Rotate secrets** regularly (at least quarterly)
4. **Limit access** to environment variables in your team
5. **Use strong secrets** - Generate with `openssl rand -base64 32`

---

## Troubleshooting

### "QWEN_API_KEY is not configured"

**Solution**: Add `QWEN_API_KEY` to your `.env.local` and restart dev server.

### "DATABASE_URL environment variable is required"

**Solution**: 
1. Run `vercel env pull .env.local` to get database URL
2. Or manually add `DATABASE_URL` from Neon dashboard

### "Stripe webhook signature verification failed"

**Solution**: 
1. Check `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard
2. Ensure webhook endpoint is `https://your-domain.com/api/webhooks/stripe`

### Environment variables not updating

**Solution**:
1. Restart dev server: `npm run dev`
2. For Vercel: Redeploy after adding variables
3. Check variable scope (Production vs Preview vs Development)

---

## Validation Script

Run this script to check if all required variables are set:

```bash
# Coming soon: npm run validate:env
```

For now, check manually:

```bash
# Check local environment
grep -E "^(DATABASE_URL|QWEN_API_KEY|NEXTAUTH_SECRET)" .env.local

# Check Vercel environment
vercel env ls
```

