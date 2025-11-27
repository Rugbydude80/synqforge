# API Environment Variables

This document lists all environment variables required for the REST API and Webhook system.

## Required Variables

### API Rate Limiting

```bash
# Rate limits per hour by tier
API_RATE_LIMIT_PRO=1000          # Pro tier: 1,000 requests/hour
API_RATE_LIMIT_TEAM=5000         # Team tier: 5,000 requests/hour
```

### CORS Configuration

```bash
# Allowed origins for API access (comma-separated)
# Use '*' for public API access (not recommended for production)
API_CORS_ORIGINS=https://example.com,https://app.example.com
```

### Webhook Configuration

```bash
# Encryption key for webhook secrets (32 bytes)
# If not set, falls back to NEXTAUTH_SECRET
WEBHOOK_SECRET_KEY=your-32-byte-webhook-encryption-key

# Retry configuration
WEBHOOK_MAX_RETRIES=5
WEBHOOK_RETRY_DELAYS=1,5,30,300,1800  # seconds: 1s, 5s, 30s, 5min, 30min
```

### Cron Jobs

```bash
# Secret for protecting cron endpoints
CRON_SECRET=your-random-cron-secret
```

## Optional Variables

### Database

```bash
# Already required for the application
DATABASE_URL=postgresql://user:password@host:5432/database
```

### Redis (for Rate Limiting)

```bash
# Already required for rate limiting
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

### NextAuth

```bash
# Already required for authentication
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=https://your-domain.com
```

## Production Setup

1. Set all required variables in your deployment platform (Vercel, etc.)
2. Generate secure random values for secrets:
   ```bash
   # Generate WEBHOOK_SECRET_KEY (32 bytes)
   openssl rand -hex 32
   
   # Generate CRON_SECRET
   openssl rand -base64 32
   ```
3. Configure CORS origins to your production domain(s)
4. Set appropriate rate limits based on your tier structure

## Development Setup

For local development, you can use `.env.local`:

```bash
API_RATE_LIMIT_PRO=1000
API_RATE_LIMIT_TEAM=5000
API_CORS_ORIGINS=http://localhost:3000
WEBHOOK_SECRET_KEY=dev-webhook-secret-key-change-in-production
CRON_SECRET=dev-cron-secret
```

