#!/bin/bash

# AI Backlog Builder Integration Test Runner
# This script sets up the environment and runs the integration tests

set -e

echo "🧪 AI Backlog Builder Integration Test Runner"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if dev server is running
check_server() {
  echo "📡 Checking if dev server is running..."
  if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Dev server is running"
    return 0
  else
    echo -e "${YELLOW}⚠${NC} Dev server is not running"
    return 1
  fi
}

# Check for auth token
check_auth() {
  if [ -z "$TEST_AUTH_TOKEN" ]; then
    echo -e "${YELLOW}⚠${NC} TEST_AUTH_TOKEN not set"
    echo ""
    echo "To run integration tests, you need to set TEST_AUTH_TOKEN:"
    echo ""
    echo "  1. Start the dev server: npm run dev"
    echo "  2. Sign in to http://localhost:3000"
    echo "  3. Open DevTools → Application → Cookies"
    echo "  4. Copy the 'next-auth.session-token' value"
    echo "  5. Export it: export TEST_AUTH_TOKEN='your-token'"
    echo ""
    echo "Or run unit tests only: npm run test:unit"
    echo ""
    return 1
  else
    echo -e "${GREEN}✓${NC} TEST_AUTH_TOKEN is set"
    return 0
  fi
}

# Main execution
echo "Step 1: Pre-flight checks"
echo "-------------------------"

SERVER_RUNNING=false
AUTH_CONFIGURED=false

if check_server; then
  SERVER_RUNNING=true
fi

if check_auth; then
  AUTH_CONFIGURED=true
fi

echo ""

# Decide what to run
if [ "$SERVER_RUNNING" = true ] && [ "$AUTH_CONFIGURED" = true ]; then
  echo "Step 2: Running Integration Tests"
  echo "----------------------------------"
  echo ""
  
  export TEST_BASE_URL="${TEST_BASE_URL:-http://localhost:3000}"
  
  echo "Test Configuration:"
  echo "  BASE_URL: $TEST_BASE_URL"
  echo "  AUTH: Configured ✓"
  echo ""
  
  # Run the tests
  npm run test:ai-backlog-builder
  
  TEST_EXIT_CODE=$?
  
  echo ""
  if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
  else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit $TEST_EXIT_CODE
  fi
  
elif [ "$SERVER_RUNNING" = false ]; then
  echo -e "${RED}❌ Cannot run integration tests: Dev server not running${NC}"
  echo ""
  echo "Please start the dev server in another terminal:"
  echo "  npm run dev"
  echo ""
  echo "Then run this script again."
  exit 1
  
elif [ "$AUTH_CONFIGURED" = false ]; then
  echo -e "${YELLOW}⚠️  Running tests in limited mode (skipping auth-required tests)${NC}"
  echo ""
  echo "Some tests will be skipped without TEST_AUTH_TOKEN."
  echo ""
  
  # Run tests anyway (they'll skip auth-required tests)
  export TEST_BASE_URL="${TEST_BASE_URL:-http://localhost:3000}"
  npm run test:ai-backlog-builder
  
  echo ""
  echo -e "${YELLOW}💡 To run all tests, set TEST_AUTH_TOKEN (see instructions above)${NC}"
fi

