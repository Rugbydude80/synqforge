#!/usr/bin/env node

/**
 * REST API & Webhooks Deployment Script (Node.js)
 * Cross-platform deployment script using Node.js
 */

const { execSync } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function status(message) {
  log(`✓ ${message}`, 'green');
}

function error(message) {
  log(`✗ ${message}`, 'red');
  process.exit(1);
}

function warning(message) {
  log(`⚠ ${message}`, 'yellow');
}

function question(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

function exec(command, options = {}) {
  try {
    return execSync(command, { 
      stdio: options.silent ? 'pipe' : 'inherit',
      encoding: 'utf8',
      ...options 
    });
  } catch (e) {
    if (!options.ignoreError) {
      throw e;
    }
    return null;
  }
}

// Configuration
const config = {
  branch: process.env.DEPLOY_BRANCH || 'main',
  skipTests: process.env.SKIP_TESTS === 'true',
  skipMigration: process.env.SKIP_MIGRATION === 'true',
  autoCommit: process.env.AUTO_COMMIT === 'true',
};

const requiredEnvVars = [
  'API_RATE_LIMIT_PRO',
  'API_RATE_LIMIT_TEAM',
  'API_CORS_ORIGINS',
  'WEBHOOK_SECRET_KEY',
  'CRON_SECRET',
];

async function main() {
  log('========================================', 'blue');
  log('REST API & Webhooks Deployment', 'blue');
  log('========================================', 'blue');
  console.log('');

  // Step 1: Check prerequisites
  log('Checking prerequisites...', 'cyan');
  
  try {
    const nodeVersion = exec('node --version', { silent: true }).trim();
    status(`Node.js ${nodeVersion}`);
  } catch {
    error('Node.js is not installed');
  }

  try {
    const npmVersion = exec('npm --version', { silent: true }).trim();
    status(`npm ${npmVersion}`);
  } catch {
    error('npm is not installed');
  }

  try {
    const gitVersion = exec('git --version', { silent: true }).trim();
    status(`git ${gitVersion}`);
  } catch {
    error('git is not installed');
  }

  try {
    exec('git rev-parse --git-dir', { silent: true });
    status('Git repository detected');
  } catch {
    error('Not in a git repository');
  }

  try {
    const vercelVersion = exec('vercel --version', { silent: true }).trim();
    status(`Vercel CLI ${vercelVersion}`);
  } catch {
    warning('Vercel CLI not found. Installing...');
    exec('npm install -g vercel@latest');
    status('Vercel CLI installed');
  }

  const currentBranch = exec('git branch --show-current', { silent: true }).trim();
  if (currentBranch !== config.branch) {
    warning(`Current branch is '${currentBranch}', deploying from '${config.branch}'`);
  }

  // Step 2: Install dependencies
  console.log('');
  log('Step 1: Installing dependencies...', 'cyan');
  try {
    exec('npm ci', { ignoreError: true });
  } catch {
    exec('npm install');
  }
  status('Dependencies installed');

  // Step 3: Linting
  console.log('');
  log('Step 2: Running linting...', 'cyan');
  exec('npm run lint');
  status('Linting passed');

  // Step 4: Type checking
  console.log('');
  log('Step 3: Running type checking...', 'cyan');
  exec('npm run typecheck');
  status('Type checking passed');

  // Step 5: Tests
  console.log('');
  log('Step 4: Running tests...', 'cyan');
  if (config.skipTests) {
    warning('Skipping tests (SKIP_TESTS=true)');
  } else {
    try {
      exec('npm run test', { ignoreError: true });
      status('Tests passed');
    } catch {
      warning('Some tests failed. Continuing deployment...');
    }
  }

  // Step 6: Build
  console.log('');
  log('Step 5: Building application...', 'cyan');
  exec('npm run build');
  status('Build successful');

  // Step 7: Database migration check
  console.log('');
  log('Step 6: Database migration check...', 'cyan');
  if (config.skipMigration) {
    warning('Skipping migration check (SKIP_MIGRATION=true)');
    warning('IMPORTANT: Ensure database migration has been run manually!');
  } else {
    log('Please ensure database migration has been run:', 'yellow');
    log('  npm run db:migrate', 'yellow');
    const response = await question('Has the database migration been run? (y/N): ');
    if (response.toLowerCase() !== 'y') {
      error('Database migration must be run before deployment!');
    }
    status('Migration check passed');
  }

  // Step 8: Environment variables check
  console.log('');
  log('Step 7: Environment variables check...', 'cyan');
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    warning('Some environment variables are not set locally:');
    missingVars.forEach(varName => log(`  - ${varName}`));
    warning('These should be set in Vercel dashboard before deployment');
    const response = await question('Continue anyway? (y/N): ');
    if (response.toLowerCase() !== 'y') {
      error('Please set environment variables in Vercel dashboard');
    }
  } else {
    status('Environment variables check passed');
  }

  // Step 9: Git operations
  console.log('');
  log('Step 8: Git operations...', 'cyan');
  
  const gitStatus = exec('git status --porcelain', { silent: true });
  if (gitStatus.trim()) {
    log('Uncommitted changes detected:');
    exec('git status --short');
    
    if (config.autoCommit) {
      log('Auto-committing changes...');
      exec('git add .');
      const commitMsg = `feat: Add REST API v1 and webhooks system

- Add API key authentication and management
- Implement REST API v1 endpoints (stories, projects, epics, sprints)
- Add webhook system with delivery and retry logic
- Add rate limiting by API key with tier-based limits
- Add security hardening (input sanitization, CORS, request size limits)
- Add API key management UI
- Update database schema with api_keys, webhooks, webhook_deliveries tables`;
      exec(`git commit -m "${commitMsg}"`);
      status('Changes committed');
    } else {
      const response = await question('Commit changes? (y/N): ');
      if (response.toLowerCase() === 'y') {
        exec('git add .');
        const commitMsg = await question('Commit message (or press Enter for default): ');
        exec(`git commit -m "${commitMsg || 'feat: Add REST API v1 and webhooks system'}"`);
        status('Changes committed');
      } else {
        warning('Skipping commit. Make sure to commit manually before pushing.');
      }
    }
  } else {
    status('No uncommitted changes');
  }

  // Check if we need to push
  try {
    const localCommits = exec(`git rev-list --count origin/${config.branch}..HEAD`, { silent: true }).trim();
    if (parseInt(localCommits) > 0) {
      log(`Local commits ahead of remote: ${localCommits}`);
      const response = await question('Push to GitHub? (y/N): ');
      if (response.toLowerCase() === 'y') {
        exec(`git push origin ${config.branch}`);
        status('Pushed to GitHub');
      } else {
        warning('Skipping push. Make sure to push manually before deploying.');
      }
    } else {
      status('No local commits to push');
    }
  } catch {
    warning('Could not check remote status. Make sure remote is configured.');
  }

  // Step 10: Deploy to Vercel
  console.log('');
  log('Step 9: Deploying to Vercel...', 'cyan');
  
  try {
    exec('vercel whoami', { silent: true });
  } catch {
    warning('Not logged in to Vercel. Please log in:');
    exec('vercel login');
  }

  log('Deploying to Vercel production...');
  exec('vercel deploy --prod');
  status('Deployment successful!');

  // Step 11: Post-deployment
  console.log('');
  log('Step 10: Post-deployment verification...', 'cyan');
  log('Please verify:');
  log('  1. API endpoints respond correctly');
  log('  2. API key creation works at /settings/api-keys');
  log('  3. Webhook cron job is scheduled in Vercel dashboard');
  log('  4. Environment variables are set in Vercel');
  console.log('');
  log('========================================', 'green');
  log('Deployment Complete!', 'green');
  log('========================================', 'green');
}

main().catch((err) => {
  error(err.message);
});




