/**
 * Deployment Verification Script
 * Checks:
 * 1. Git status shows "up to date with origin/main"
 * 2. Both new tables exist in database
 * 3. At least one organization has tier = 'pro'
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';
import { db } from '@/lib/db';
import { storyRefinements, storyRevisions, organizations } from '@/lib/db/schema';
import { sql, eq } from 'drizzle-orm';

// Load .env.production if DATABASE_URL is not set
if (!process.env.DATABASE_URL) {
  try {
    const envFile = readFileSync(join(process.cwd(), '.env.production'), 'utf-8');
    const lines = envFile.split('\n');
    for (const line of lines) {
      const match = line.match(/^DATABASE_URL=(.+)$/);
      if (match) {
        // Remove quotes if present
        const value = match[1].trim().replace(/^["']|["']$/g, '');
        process.env.DATABASE_URL = value;
        break;
      }
    }
  } catch (error) {
    // Ignore if file doesn't exist
  }
}

async function checkGitStatus() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('1. Checking Git Status');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    const status = execSync('git status', { encoding: 'utf-8', stdio: 'pipe' });
    console.log(status);
    
    // Check if we're up to date
    const isUpToDate = status.includes('up to date with \'origin/main\'') || 
                       status.includes('up to date with "origin/main"');
    
    if (isUpToDate) {
      console.log('✅ Git status: Up to date with origin/main\n');
      return true;
    } else {
      console.log('⚠️  Git status: Not up to date with origin/main');
      console.log('   → Run: git push origin main\n');
      return false;
    }
  } catch (error: any) {
    // Git might not be in PATH, try alternative
    try {
      execSync('where git', { encoding: 'utf-8', stdio: 'pipe' });
      // If git is found, try again with full path or show manual check needed
      console.log('⚠️  Git command not accessible in PATH');
      console.log('   Please check git status manually: git status\n');
    } catch {
      console.log('⚠️  Git not found in PATH');
      console.log('   Please check git status manually: git status\n');
    }
    return false;
  }
}

async function checkDatabaseTables() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('2. Checking Database Tables');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    // Check story_refinements table
    try {
      await db.execute(
        sql`SELECT COUNT(*) FROM ${storyRefinements} LIMIT 1`
      );
      console.log('✅ story_refinements table exists');
    } catch (error: any) {
      console.log('❌ story_refinements table NOT found:', error.message);
      return false;
    }
    
    // Check story_revisions table
    try {
      await db.execute(
        sql`SELECT COUNT(*) FROM ${storyRevisions} LIMIT 1`
      );
      console.log('✅ story_revisions table exists');
    } catch (error: any) {
      console.log('❌ story_revisions table NOT found:', error.message);
      return false;
    }
    
    // Get table details
    const refinementsInfo = await db.execute(
      sql`SELECT COUNT(*) as column_count 
          FROM information_schema.columns 
          WHERE table_name = 'story_refinements'`
    );
    
    const revisionsInfo = await db.execute(
      sql`SELECT COUNT(*) as column_count 
          FROM information_schema.columns 
          WHERE table_name = 'story_revisions'`
    );
    
    console.log(`   → story_refinements has ${(refinementsInfo[0] as any).column_count} columns`);
    console.log(`   → story_revisions has ${(revisionsInfo[0] as any).column_count} columns\n`);
    
    return true;
  } catch (error: any) {
    console.error('❌ Error checking database tables:', error.message);
    return false;
  }
}

async function checkProOrganizations() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('3. Checking Organizations with Pro Tier');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    const proOrgs = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        subscriptionTier: organizations.subscriptionTier,
      })
      .from(organizations)
      .where(eq(organizations.subscriptionTier, 'pro'));
    
    if (proOrgs.length > 0) {
      console.log(`✅ Found ${proOrgs.length} organization(s) with tier = 'pro':`);
      proOrgs.forEach((org, idx) => {
        console.log(`   ${idx + 1}. ${org.name} (${org.slug}) - ID: ${org.id}`);
      });
      console.log('');
      return true;
    } else {
      console.log('❌ No organizations found with tier = \'pro\'');
      console.log('   → Update an organization:');
      console.log('     UPDATE organizations SET subscription_tier = \'pro\' WHERE id = \'your-org-id\';');
      console.log('');
      return false;
    }
  } catch (error: any) {
    console.error('❌ Error checking organizations:', error.message);
    return false;
  }
}

async function verifyDeployment() {
  console.log('\n🔍 DEPLOYMENT VERIFICATION');
  console.log('═══════════════════════════════════════════\n');
  
  const results = {
    gitStatus: false,
    databaseTables: false,
    proOrganizations: false,
  };
  
  // Check 1: Git Status
  results.gitStatus = await checkGitStatus();
  
  // Check 2: Database Tables
  results.databaseTables = await checkDatabaseTables();
  
  // Check 3: Pro Organizations
  results.proOrganizations = await checkProOrganizations();
  
  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('VERIFICATION SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`Git Status:              ${results.gitStatus ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Database Tables:         ${results.databaseTables ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Pro Organizations:      ${results.proOrganizations ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');
  
  const allPassed = results.gitStatus && results.databaseTables && results.proOrganizations;
  
  if (allPassed) {
    console.log('🎉 ALL CHECKS PASSED - DEPLOYMENT COMPLETE!');
    console.log('✅ Ready for production deployment\n');
    return 0;
  } else {
    console.log('⚠️  SOME CHECKS FAILED - Please review above');
    console.log('   Fix the issues before deploying\n');
    return 1;
  }
}

verifyDeployment()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

