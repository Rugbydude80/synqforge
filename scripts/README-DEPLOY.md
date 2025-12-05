# Deployment Scripts

Automated deployment scripts for REST API & Webhooks system.

## Available Scripts

### Node.js (Cross-platform) - Recommended
```bash
npm run deploy:api
```

### Bash (Linux/macOS)
```bash
./scripts/deploy-api.sh
# or
bash scripts/deploy-api.sh
```

### PowerShell (Windows)
```powershell
.\scripts\deploy-api.ps1
```

## What the Scripts Do

1. **Prerequisites Check**
   - Verifies Node.js, npm, git, and Vercel CLI are installed
   - Checks if you're in a git repository

2. **Code Quality Checks**
   - Installs dependencies (`npm ci` or `npm install`)
   - Runs linting (`npm run lint`)
   - Runs type checking (`npm run typecheck`)
   - Runs tests (`npm run test`)

3. **Build**
   - Builds the Next.js application (`npm run build`)

4. **Pre-deployment Checks**
   - Verifies database migration has been run
   - Checks for required environment variables

5. **Git Operations**
   - Shows uncommitted changes
   - Optionally commits changes
   - Optionally pushes to GitHub

6. **Vercel Deployment**
   - Logs in to Vercel (if needed)
   - Deploys to production (`vercel deploy --prod`)

7. **Post-deployment**
   - Provides verification checklist

## Environment Variables

The scripts check for these environment variables (should be set in Vercel dashboard):

- `API_RATE_LIMIT_PRO` - Rate limit for Pro tier (default: 1000)
- `API_RATE_LIMIT_TEAM` - Rate limit for Team tier (default: 5000)
- `API_CORS_ORIGINS` - Allowed CORS origins
- `WEBHOOK_SECRET_KEY` - Encryption key for webhook secrets
- `CRON_SECRET` - Secret for protecting cron endpoints

## Script Options

Set these environment variables to customize behavior:

```bash
# Skip tests
SKIP_TESTS=true npm run deploy:api

# Skip migration check
SKIP_MIGRATION=true npm run deploy:api

# Auto-commit changes
AUTO_COMMIT=true npm run deploy:api

# Deploy from different branch
DEPLOY_BRANCH=develop npm run deploy:api
```

## Quick Start

1. **Run database migration first:**
   ```bash
   npm run db:migrate
   ```

2. **Set environment variables in Vercel dashboard**

3. **Run deployment script:**
   ```bash
   npm run deploy:api
   ```

4. **Follow the prompts** - the script will guide you through each step

## Troubleshooting

### "Not logged in to Vercel"
```bash
vercel login
```

### "Database migration not run"
```bash
npm run db:migrate
```

### "Environment variables not set"
Set them in Vercel dashboard: Settings → Environment Variables

### "Git push fails"
Make sure your GitHub remote is configured:
```bash
git remote -v
git remote set-url origin https://github.com/your-org/your-repo.git
```

## Manual Deployment

If you prefer to deploy manually:

1. Run database migration: `npm run db:migrate`
2. Set environment variables in Vercel
3. Commit and push: `git add . && git commit -m "..." && git push`
4. Deploy: `vercel deploy --prod`

## CI/CD Integration

See `.github/workflows/deploy-api.yml` for GitHub Actions integration.









