/**
 * Verification Script for Story Refinement Feature
 * Run with: npx tsx scripts/verify-refinement-setup.ts
 */

import { db } from '@/lib/db';
import { storyRefinements, storyRevisions } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';

async function verifySetup() {
  console.log('🔍 Verifying Story Refinement Feature Setup...\n');

  const checks = {
    tablesExist: false,
    columnsCorrect: false,
    indexesExist: false,
    featureGates: false,
    services: false,
  };

  try {
    // Check if tables exist
    console.log('1. Checking database tables...');
    try {
      await db.execute(
        sql`SELECT COUNT(*) FROM ${storyRefinements} LIMIT 1`
      );
      await db.execute(
        sql`SELECT COUNT(*) FROM ${storyRevisions} LIMIT 1`
      );
      checks.tablesExist = true;
      console.log('   ✅ story_refinements table exists');
      console.log('   ✅ story_revisions table exists');
    } catch (error: any) {
      console.log('   ❌ Tables not found:', error.message);
      console.log('   → Run: npm run db:generate && npm run db:push');
    }

    // Check feature gates
    console.log('\n2. Checking feature gates...');
    try {
      const { canAccessFeature, Feature } = await import('@/lib/featureGates');
      const proAccess = canAccessFeature('pro', Feature.REFINE_STORY);
      const freeAccess = canAccessFeature('free', Feature.REFINE_STORY);
      
      if (proAccess && !freeAccess) {
        checks.featureGates = true;
        console.log('   ✅ Feature gates working correctly');
        console.log('   ✅ Pro tier has access');
        console.log('   ✅ Free tier blocked');
      } else {
        console.log('   ⚠️  Feature gates may need review');
      }
    } catch (error: any) {
      console.log('   ❌ Feature gates error:', error.message);
    }

    // Check services
    console.log('\n3. Checking services...');
    try {
      const aiService = await import('@/lib/services/aiRefinementService');
      const diffService = await import('@/lib/services/diffService');
      
      if (aiService && diffService) {
        checks.services = true;
        console.log('   ✅ AI refinement service found');
        console.log('   ✅ Diff service found');
      }
    } catch (error: any) {
      console.log('   ❌ Services error:', error.message);
    }

    // Check environment variables
    console.log('\n4. Checking environment variables...');
    const openaiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
    const dbUrl = process.env.DATABASE_URL;
    
    if (openaiKey) {
      console.log('   ✅ OpenAI/OpenRouter API key found');
    } else {
      console.log('   ❌ OPENROUTER_API_KEY or OPENAI_API_KEY not set');
    }
    
    if (dbUrl) {
      console.log('   ✅ DATABASE_URL found');
    } else {
      console.log('   ❌ DATABASE_URL not set');
    }

    // Summary
    console.log('\n📊 Verification Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Tables Exist:        ${checks.tablesExist ? '✅' : '❌'}`);
    console.log(`Feature Gates:       ${checks.featureGates ? '✅' : '❌'}`);
    console.log(`Services:            ${checks.services ? '✅' : '❌'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (checks.tablesExist && checks.featureGates && checks.services) {
      console.log('🎉 All checks passed! Feature is ready for testing.');
      return 0;
    } else {
      console.log('⚠️  Some checks failed. Review the output above.');
      return 1;
    }
  } catch (error: any) {
    console.error('❌ Verification failed:', error.message);
    return 1;
  }
}

verifySetup()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

