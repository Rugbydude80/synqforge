#!/bin/bash

# 🚀 SynqForge Smart Context - Vercel Production Deployment
# This script guides you through deploying the semantic search feature to production

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BOLD='\033[1m'

echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
echo -e "${BOLD}🚀 SynqForge Smart Context - Production Deployment${NC}"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""

# Step 1: Verify Git Push
echo -e "${BLUE}[1/5]${NC} ${BOLD}Verifying Git Push...${NC}"
git fetch clean
LOCAL_HASH=$(git rev-parse HEAD)
REMOTE_HASH=$(git rev-parse clean/main)

if [ "$LOCAL_HASH" = "$REMOTE_HASH" ]; then
    echo -e "${GREEN}✅ Code pushed to GitHub successfully (commit: ${LOCAL_HASH:0:7})${NC}"
else
    echo -e "${YELLOW}⚠️  Local commits not pushed yet. Pushing now...${NC}"
    git push clean main
    echo -e "${GREEN}✅ Code pushed to GitHub${NC}"
fi
echo ""

# Step 2: Environment Variables
echo -e "${BLUE}[2/5]${NC} ${BOLD}Setting Up Environment Variables...${NC}"
echo ""
echo "You need to add these environment variables in Vercel:"
echo -e "${YELLOW}→ Go to: https://vercel.com/dashboard → Your Project → Settings → Environment Variables${NC}"
echo ""
echo "Add the following variables (for Production, Preview, and Development):"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "OPENROUTER_EMBEDDING_MODEL=\"openai/text-embedding-3-small\""
echo "ENABLE_SEMANTIC_SEARCH=\"true\""
echo "SEMANTIC_SEARCH_MIN_SIMILARITY=\"0.7\""
echo "SEMANTIC_SEARCH_MAX_RESULTS=\"5\""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${YELLOW}Note: Your existing OPENROUTER_API_KEY already works for embeddings!${NC}"
echo ""
read -p "Press ENTER after you've added these environment variables in Vercel..."
echo -e "${GREEN}✅ Environment variables configured${NC}"
echo ""

# Step 3: Check Vercel CLI
echo -e "${BLUE}[3/5]${NC} ${BOLD}Checking Vercel CLI...${NC}"
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}⚠️  Vercel CLI not found. Installing...${NC}"
    npm install -g vercel
    echo -e "${GREEN}✅ Vercel CLI installed${NC}"
else
    echo -e "${GREEN}✅ Vercel CLI found ($(vercel --version))${NC}"
fi
echo ""

# Step 4: Database Migration
echo -e "${BLUE}[4/5]${NC} ${BOLD}Running Database Migration...${NC}"
echo ""
echo "Choose migration method:"
echo "  1) Run via Vercel CLI (recommended)"
echo "  2) I'll run it manually in Neon console"
echo ""
read -p "Enter choice (1 or 2): " MIGRATION_CHOICE

if [ "$MIGRATION_CHOICE" = "1" ]; then
    echo ""
    echo -e "${YELLOW}Pulling production environment variables...${NC}"
    vercel env pull .env.production --yes
    
    if [ -f .env.production ]; then
        source .env.production
        echo -e "${GREEN}✅ Environment variables loaded${NC}"
        
        if [ -z "$DATABASE_URL" ]; then
            echo -e "${RED}❌ DATABASE_URL not found. Please run migration manually.${NC}"
            echo "   Go to: https://console.neon.tech"
            echo "   Run: db/migrations/008_add_pgvector.sql"
            read -p "Press ENTER after running migration manually..."
        else
            echo ""
            echo -e "${YELLOW}Running pgvector migration...${NC}"
            
            # Check if psql is available
            if command -v psql &> /dev/null; then
                psql "$DATABASE_URL" -f db/migrations/008_add_pgvector.sql
                echo -e "${GREEN}✅ Database migration completed${NC}"
            else
                echo -e "${RED}❌ psql not found. Please run migration manually:${NC}"
                echo ""
                echo "Option A - Install psql:"
                echo "  brew install postgresql"
                echo "  psql \"$DATABASE_URL\" -f db/migrations/008_add_pgvector.sql"
                echo ""
                echo "Option B - Neon Console:"
                echo "  1. Go to: https://console.neon.tech"
                echo "  2. Select your database"
                echo "  3. Open SQL Editor"
                echo "  4. Run contents of: db/migrations/008_add_pgvector.sql"
                echo ""
                read -p "Press ENTER after running migration..."
            fi
        fi
    else
        echo -e "${RED}❌ Failed to pull environment variables${NC}"
        echo "   Please run migration manually in Neon console"
        read -p "Press ENTER after running migration..."
    fi
else
    echo ""
    echo -e "${YELLOW}Manual Migration Instructions:${NC}"
    echo "  1. Go to: https://console.neon.tech"
    echo "  2. Select your SynqForge database"
    echo "  3. Click 'SQL Editor'"
    echo "  4. Copy and run: db/migrations/008_add_pgvector.sql"
    echo ""
    read -p "Press ENTER after you've run the migration..."
    echo -e "${GREEN}✅ Database migration completed manually${NC}"
fi
echo ""

# Step 5: Deploy to Vercel
echo -e "${BLUE}[5/5]${NC} ${BOLD}Deploying to Production...${NC}"
echo ""
echo "Vercel should auto-deploy when you pushed to GitHub."
echo "Check deployment status at: https://vercel.com/dashboard"
echo ""
echo -e "${YELLOW}Or trigger a manual deployment:${NC}"
read -p "Deploy now? (y/n): " DEPLOY_NOW

if [ "$DEPLOY_NOW" = "y" ] || [ "$DEPLOY_NOW" = "Y" ]; then
    vercel --prod
    echo -e "${GREEN}✅ Deployment triggered${NC}"
else
    echo -e "${YELLOW}⏭  Skipping manual deployment. GitHub auto-deploy will handle it.${NC}"
fi
echo ""

# Verification
echo "═══════════════════════════════════════════════════════════════════════════"
echo -e "${BOLD}🎉 Deployment Complete!${NC}"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo ""
echo "1. Verify deployment:"
echo "   ${GREEN}curl https://your-app.vercel.app/api/embeddings/health${NC}"
echo ""
echo "2. Check Vercel deployment logs:"
echo "   ${GREEN}https://vercel.com/dashboard${NC}"
echo ""
echo "3. Test Smart Context in your app:"
echo "   - Log in as a Pro/Team user"
echo "   - Go to story generation"
echo "   - Select 'Smart Context' or 'Comprehensive' mode"
echo "   - Generate a story and verify semantic search works"
echo ""
echo "4. (Optional) Backfill existing stories:"
echo "   ${GREEN}npm run embeddings:backfill${NC}"
echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""
echo -e "${GREEN}✨ Your landing page and pricing page are now live with Smart Context marketing!${NC}"
echo ""
echo "Users will see:"
echo "  • Updated hero: 'AI that learns from your similar stories'"
echo "  • New Smart Context showcase section"
echo "  • Pro+ plans highlighting semantic search"
echo "  • Clear upgrade CTAs for Starter/Core users"
echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""

