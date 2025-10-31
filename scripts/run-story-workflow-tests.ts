#!/usr/bin/env node
/**
 * Story Workflow Test Runner
 * 
 * This script helps you run the story workflow tests by:
 * 1. Checking if server is running
 * 2. Attempting to authenticate (or using provided token)
 * 3. Running the tests
 */

import { execSync } from 'child_process';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const TEST_SESSION_COOKIE = process.env.TEST_SESSION_COOKIE || '';
const TEST_AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || '';

console.log('🧪 Story Workflow Test Runner\n');
console.log('Checking prerequisites...\n');

// Check if server is running
try {
  await fetch(`${BASE_URL}/api/health`);
  console.log('✅ Server is running');
} catch (error) {
  console.log('❌ Server is not running');
  console.log('   Please start the dev server: npm run dev');
  process.exit(1);
}

// Check authentication
if (!TEST_SESSION_COOKIE && !TEST_AUTH_TOKEN) {
  console.log('\n⚠️  No authentication token provided');
  console.log('\nTo get a session cookie:');
  console.log('  1. Sign in at http://localhost:3000');
  console.log('  2. Open DevTools → Application → Cookies');
  console.log('  3. Copy the "next-auth.session-token" value');
  console.log('  4. Run: export TEST_SESSION_COOKIE="your-token"');
  console.log('  5. Then run this script again\n');
  
  console.log('Alternatively, run tests without auth (they will skip API calls):');
  console.log('  npm run test:integration\n');
  
  process.exit(0);
}

console.log('✅ Authentication token provided');
console.log('\nRunning tests...\n');

// Run the tests
try {
  execSync(
    `node --import tsx --test --test-reporter spec tests/integration/story-workflow.test.ts`,
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        TEST_BASE_URL: BASE_URL,
        TEST_SESSION_COOKIE: TEST_SESSION_COOKIE,
        TEST_AUTH_TOKEN: TEST_AUTH_TOKEN,
      },
    }
  );
} catch (error: any) {
  console.error('\n❌ Tests failed');
  process.exit(error.status || 1);
}
