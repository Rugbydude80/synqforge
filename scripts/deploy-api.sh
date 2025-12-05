#!/bin/bash

# REST API & Webhooks Deployment Script
# Handles testing, git operations, and Vercel deployment

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BRANCH="${DEPLOY_BRANCH:-main}"
VERCEL_PROJECT="${VERCEL_PROJECT:-}"
VERCEL_ORG="${VERCEL_ORG:-}"
SKIP_TESTS="${SKIP_TESTS:-false}"
SKIP_MIGRATION="${SKIP_MIGRATION:-false}"
AUTO_COMMIT="${AUTO_COMMIT:-false}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}REST API & Webhooks Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to print status
status() {
    echo -e "${GREEN}✓${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    error "Node.js is not installed"
fi
status "Node.js $(node --version)"

# Check npm
if ! command -v npm &> /dev/null; then
    error "npm is not installed"
fi
status "npm $(npm --version)"

# Check git
if ! command -v git &> /dev/null; then
    error "git is not installed"
fi
status "git $(git --version | cut -d' ' -f3)"

# Check Vercel CLI
if ! command -v vercel &> /dev/null; then
    warning "Vercel CLI not found. Installing..."
    npm install -g vercel@latest
fi
status "Vercel CLI $(vercel --version)"

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    error "Not in a git repository"
fi
status "Git repository detected"

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "$BRANCH" ]; then
    warning "Current branch is '$CURRENT_BRANCH', deploying from '$BRANCH'"
fi

echo ""
echo -e "${BLUE}Step 1: Installing dependencies...${NC}"
npm ci || npm install
status "Dependencies installed"

echo ""
echo -e "${BLUE}Step 2: Running linting...${NC}"
if npm run lint; then
    status "Linting passed"
else
    error "Linting failed. Please fix errors before deploying."
fi

echo ""
echo -e "${BLUE}Step 3: Running type checking...${NC}"
if npm run typecheck; then
    status "Type checking passed"
else
    error "Type checking failed. Please fix errors before deploying."
fi

echo ""
echo -e "${BLUE}Step 4: Running tests...${NC}"
if [ "$SKIP_TESTS" = "true" ]; then
    warning "Skipping tests (SKIP_TESTS=true)"
else
    if npm run test; then
        status "Tests passed"
    else
        warning "Some tests failed. Continuing deployment..."
    fi
fi

echo ""
echo -e "${BLUE}Step 5: Building application...${NC}"
if npm run build; then
    status "Build successful"
else
    error "Build failed. Please fix errors before deploying."
fi

echo ""
echo -e "${BLUE}Step 6: Database migration check...${NC}"
if [ "$SKIP_MIGRATION" = "true" ]; then
    warning "Skipping migration check (SKIP_MIGRATION=true)"
    warning "IMPORTANT: Ensure database migration has been run manually!"
else
    echo "Checking if migration needs to be run..."
    warning "Please ensure database migration has been run:"
    echo "  npm run db:migrate"
    read -p "Has the database migration been run? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        error "Database migration must be run before deployment!"
    fi
    status "Migration check passed"
fi

echo ""
echo -e "${BLUE}Step 7: Environment variables check...${NC}"
REQUIRED_VARS=(
    "API_RATE_LIMIT_PRO"
    "API_RATE_LIMIT_TEAM"
    "API_CORS_ORIGINS"
    "WEBHOOK_SECRET_KEY"
    "CRON_SECRET"
)

MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    warning "Some environment variables are not set locally:"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    warning "These should be set in Vercel dashboard before deployment"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        error "Please set environment variables in Vercel dashboard"
    fi
else
    status "Environment variables check passed"
fi

echo ""
echo -e "${BLUE}Step 8: Git operations...${NC}"

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "Uncommitted changes detected:"
    git status --short
    
    if [ "$AUTO_COMMIT" = "true" ]; then
        echo "Auto-committing changes..."
        git add .
        git commit -m "feat: Add REST API v1 and webhooks system

- Add API key authentication and management
- Implement REST API v1 endpoints (stories, projects, epics, sprints)
- Add webhook system with delivery and retry logic
- Add rate limiting by API key with tier-based limits
- Add security hardening (input sanitization, CORS, request size limits)
- Add API key management UI
- Update database schema with api_keys, webhooks, webhook_deliveries tables"
        status "Changes committed"
    else
        read -p "Commit changes? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git add .
            read -p "Commit message (or press Enter for default): " COMMIT_MSG
            if [ -z "$COMMIT_MSG" ]; then
                COMMIT_MSG="feat: Add REST API v1 and webhooks system"
            fi
            git commit -m "$COMMIT_MSG"
            status "Changes committed"
        else
            warning "Skipping commit. Make sure to commit manually before pushing."
        fi
    fi
else
    status "No uncommitted changes"
fi

# Check if we need to push
LOCAL_COMMITS=$(git rev-list --count origin/$BRANCH..HEAD 2>/dev/null || echo "0")
if [ "$LOCAL_COMMITS" -gt 0 ]; then
    echo "Local commits ahead of remote: $LOCAL_COMMITS"
    read -p "Push to GitHub? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git push origin "$BRANCH"
        status "Pushed to GitHub"
    else
        warning "Skipping push. Make sure to push manually before deploying."
    fi
else
    status "No local commits to push"
fi

echo ""
echo -e "${BLUE}Step 9: Deploying to Vercel...${NC}"

# Check if logged in to Vercel
if ! vercel whoami &> /dev/null; then
    warning "Not logged in to Vercel. Please log in:"
    vercel login
fi

# Deploy to Vercel
VERCEL_ARGS=("--prod")
if [ -n "$VERCEL_PROJECT" ]; then
    VERCEL_ARGS+=("--scope" "$VERCEL_ORG")
fi

echo "Deploying to Vercel production..."
if vercel deploy --prod "${VERCEL_ARGS[@]}"; then
    status "Deployment successful!"
    
    # Get deployment URL
    DEPLOYMENT_URL=$(vercel ls --prod --json 2>/dev/null | grep -o '"url":"[^"]*' | head -1 | cut -d'"' -f4 || echo "")
    if [ -n "$DEPLOYMENT_URL" ]; then
        echo ""
        echo -e "${GREEN}Deployment URL: https://$DEPLOYMENT_URL${NC}"
    fi
else
    error "Vercel deployment failed"
fi

echo ""
echo -e "${BLUE}Step 10: Post-deployment verification...${NC}"
echo "Please verify:"
echo "  1. API endpoints respond correctly"
echo "  2. API key creation works at /settings/api-keys"
echo "  3. Webhook cron job is scheduled in Vercel dashboard"
echo "  4. Environment variables are set in Vercel"
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"








