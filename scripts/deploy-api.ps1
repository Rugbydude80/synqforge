# REST API & Webhooks Deployment Script (PowerShell)
# Handles testing, git operations, and Vercel deployment

$ErrorActionPreference = "Stop"

# Configuration
$BRANCH = if ($env:DEPLOY_BRANCH) { $env:DEPLOY_BRANCH } else { "main" }
$VERCEL_PROJECT = $env:VERCEL_PROJECT
$VERCEL_ORG = $env:VERCEL_ORG
$SKIP_TESTS = if ($env:SKIP_TESTS -eq "true") { $true } else { $false }
$SKIP_MIGRATION = if ($env:SKIP_MIGRATION -eq "true") { $true } else { $false }
$AUTO_COMMIT = if ($env:AUTO_COMMIT -eq "true") { $true } else { $false }

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "REST API & Webhooks Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

function Write-Status {
    param([string]$Message)
    Write-Host "✓ " -ForegroundColor Green -NoNewline
    Write-Host $Message
}

function Write-Error-Message {
    param([string]$Message)
    Write-Host "✗ " -ForegroundColor Red -NoNewline
    Write-Host $Message
    exit 1
}

function Write-Warning-Message {
    param([string]$Message)
    Write-Host "⚠ " -ForegroundColor Yellow -NoNewline
    Write-Host $Message
}

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Cyan

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Status "Node.js $nodeVersion"
} catch {
    Write-Error-Message "Node.js is not installed"
}

# Check npm
try {
    $npmVersion = npm --version
    Write-Status "npm $npmVersion"
} catch {
    Write-Error-Message "npm is not installed"
}

# Check git
try {
    $gitVersion = git --version
    Write-Status "git $gitVersion"
} catch {
    Write-Error-Message "git is not installed"
}

# Check Vercel CLI
try {
    $vercelVersion = vercel --version
    Write-Status "Vercel CLI $vercelVersion"
} catch {
    Write-Warning-Message "Vercel CLI not found. Installing..."
    npm install -g vercel@latest
    Write-Status "Vercel CLI installed"
}

# Check if we're in a git repository
try {
    git rev-parse --git-dir | Out-Null
    Write-Status "Git repository detected"
} catch {
    Write-Error-Message "Not in a git repository"
}

# Check current branch
$currentBranch = git branch --show-current
if ($currentBranch -ne $BRANCH) {
    Write-Warning-Message "Current branch is '$currentBranch', deploying from '$BRANCH'"
}

Write-Host ""
Write-Host "Step 1: Installing dependencies..." -ForegroundColor Cyan
npm ci
if ($LASTEXITCODE -ne 0) {
    npm install
}
Write-Status "Dependencies installed"

Write-Host ""
Write-Host "Step 2: Running linting..." -ForegroundColor Cyan
npm run lint
if ($LASTEXITCODE -ne 0) {
    Write-Error-Message "Linting failed. Please fix errors before deploying."
}
Write-Status "Linting passed"

Write-Host ""
Write-Host "Step 3: Running type checking..." -ForegroundColor Cyan
npm run typecheck
if ($LASTEXITCODE -ne 0) {
    Write-Error-Message "Type checking failed. Please fix errors before deploying."
}
Write-Status "Type checking passed"

Write-Host ""
Write-Host "Step 4: Running tests..." -ForegroundColor Cyan
if ($SKIP_TESTS) {
    Write-Warning-Message "Skipping tests (SKIP_TESTS=true)"
} else {
    npm run test
    if ($LASTEXITCODE -ne 0) {
        Write-Warning-Message "Some tests failed. Continuing deployment..."
    } else {
        Write-Status "Tests passed"
    }
}

Write-Host ""
Write-Host "Step 5: Building application..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error-Message "Build failed. Please fix errors before deploying."
}
Write-Status "Build successful"

Write-Host ""
Write-Host "Step 6: Database migration check..." -ForegroundColor Cyan
if ($SKIP_MIGRATION) {
    Write-Warning-Message "Skipping migration check (SKIP_MIGRATION=true)"
    Write-Warning-Message "IMPORTANT: Ensure database migration has been run manually!"
} else {
    Write-Host "Please ensure database migration has been run:"
    Write-Host "  npm run db:migrate" -ForegroundColor Yellow
    $response = Read-Host "Has the database migration been run? (y/N)"
    if ($response -ne "y" -and $response -ne "Y") {
        Write-Error-Message "Database migration must be run before deployment!"
    }
    Write-Status "Migration check passed"
}

Write-Host ""
Write-Host "Step 7: Environment variables check..." -ForegroundColor Cyan
$requiredVars = @(
    "API_RATE_LIMIT_PRO",
    "API_RATE_LIMIT_TEAM",
    "API_CORS_ORIGINS",
    "WEBHOOK_SECRET_KEY",
    "CRON_SECRET"
)

$missingVars = @()
foreach ($var in $requiredVars) {
    if (-not (Test-Path "env:$var")) {
        $missingVars += $var
    }
}

if ($missingVars.Count -gt 0) {
    Write-Warning-Message "Some environment variables are not set locally:"
    foreach ($var in $missingVars) {
        Write-Host "  - $var"
    }
    Write-Warning-Message "These should be set in Vercel dashboard before deployment"
    $response = Read-Host "Continue anyway? (y/N)"
    if ($response -ne "y" -and $response -ne "Y") {
        Write-Error-Message "Please set environment variables in Vercel dashboard"
    }
} else {
    Write-Status "Environment variables check passed"
}

Write-Host ""
Write-Host "Step 8: Git operations..." -ForegroundColor Cyan

# Check for uncommitted changes
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "Uncommitted changes detected:"
    git status --short
    
    if ($AUTO_COMMIT) {
        Write-Host "Auto-committing changes..."
        git add .
        git commit -m "feat: Add REST API v1 and webhooks system

- Add API key authentication and management
- Implement REST API v1 endpoints (stories, projects, epics, sprints)
- Add webhook system with delivery and retry logic
- Add rate limiting by API key with tier-based limits
- Add security hardening (input sanitization, CORS, request size limits)
- Add API key management UI
- Update database schema with api_keys, webhooks, webhook_deliveries tables"
        Write-Status "Changes committed"
    } else {
        $response = Read-Host "Commit changes? (y/N)"
        if ($response -eq "y" -or $response -eq "Y") {
            git add .
            $commitMsg = Read-Host "Commit message (or press Enter for default)"
            if ([string]::IsNullOrWhiteSpace($commitMsg)) {
                $commitMsg = "feat: Add REST API v1 and webhooks system"
            }
            git commit -m $commitMsg
            Write-Status "Changes committed"
        } else {
            Write-Warning-Message "Skipping commit. Make sure to commit manually before pushing."
        }
    }
} else {
    Write-Status "No uncommitted changes"
}

# Check if we need to push
try {
    $localCommits = git rev-list --count "origin/$BRANCH..HEAD" 2>$null
    if ($localCommits -gt 0) {
        Write-Host "Local commits ahead of remote: $localCommits"
        $response = Read-Host "Push to GitHub? (y/N)"
        if ($response -eq "y" -or $response -eq "Y") {
            git push origin $BRANCH
            Write-Status "Pushed to GitHub"
        } else {
            Write-Warning-Message "Skipping push. Make sure to push manually before deploying."
        }
    } else {
        Write-Status "No local commits to push"
    }
} catch {
    Write-Warning-Message "Could not check remote status. Make sure remote is configured."
}

Write-Host ""
Write-Host "Step 9: Deploying to Vercel..." -ForegroundColor Cyan

# Check if logged in to Vercel
try {
    vercel whoami | Out-Null
} catch {
    Write-Warning-Message "Not logged in to Vercel. Please log in:"
    vercel login
}

# Deploy to Vercel
Write-Host "Deploying to Vercel production..."
$vercelArgs = @("--prod")
if ($VERCEL_PROJECT) {
    $vercelArgs += "--scope"
    $vercelArgs += $VERCEL_ORG
}

vercel deploy --prod $vercelArgs
if ($LASTEXITCODE -ne 0) {
    Write-Error-Message "Vercel deployment failed"
}
Write-Status "Deployment successful!"

Write-Host ""
Write-Host "Step 10: Post-deployment verification..." -ForegroundColor Cyan
Write-Host "Please verify:"
Write-Host "  1. API endpoints respond correctly"
Write-Host "  2. API key creation works at /settings/api-keys"
Write-Host "  3. Webhook cron job is scheduled in Vercel dashboard"
Write-Host "  4. Environment variables are set in Vercel"
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green






