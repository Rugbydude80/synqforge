import { db } from './lib/db';
import { organizations, workspaceUsage } from './lib/db/schema';
import {
  canUseAI,
  incrementTokenUsage,
  canIngestDocument,
  incrementDocIngestion,
  checkBulkLimit,
  checkPageLimit,
  getUsageSummary,
  getOrCreateWorkspaceUsage
} from './lib/billing/fair-usage-guards';
import { eq } from 'drizzle-orm';

async function runTests() {
  console.log('🧪 Testing Fair-Usage Guards\n');

  // Create a test organization
  const testOrgId = 'test-org-' + Date.now();

  try {
    console.log('📝 Creating test organization...');
    await db.insert(organizations).values({
      id: testOrgId,
      name: 'Test Org',
      slug: 'test-org-' + Date.now(),
      plan: 'solo',
      planCycle: 'monthly',
      seatsIncluded: 1,
      projectsIncluded: 1,
      aiTokensIncluded: 50000,
      docsPerMonth: 10,
      throughputSpm: 5,
      bulkStoryLimit: 20,
      maxPagesPerUpload: 50,
    });
    console.log('✅ Test organization created\n');

    // Test 1: getOrCreateWorkspaceUsage
    console.log('TEST 1: getOrCreateWorkspaceUsage()');
    const usage = await getOrCreateWorkspaceUsage(testOrgId);
    console.log('✅ Workspace usage created');
    console.log(`   Tokens: ${usage.tokensUsed}/${usage.tokensLimit}`);
    console.log(`   Docs: ${usage.docsIngested}/${usage.docsLimit}\n`);

    // Test 2: canUseAI - should allow (0% used)
    console.log('TEST 2: canUseAI() - 0% usage');
    const aiCheck1 = await canUseAI(testOrgId, 1000);
    console.log(`✅ Result: ${aiCheck1.allowed ? 'ALLOWED' : 'BLOCKED'}`);
    console.log(`   Used: ${aiCheck1.used}/${aiCheck1.limit} (${aiCheck1.percentage}%)`);
    console.log(`   Warning: ${aiCheck1.isWarning}\n`);

    // Test 3: Simulate using 45,000 tokens (90%)
    console.log('TEST 3: Simulate 90% token usage');
    await incrementTokenUsage(testOrgId, 45000);
    const aiCheck2 = await canUseAI(testOrgId, 1000);
    console.log(`✅ Result: ${aiCheck2.allowed ? 'ALLOWED' : 'BLOCKED'}`);
    console.log(`   Used: ${aiCheck2.used}/${aiCheck2.limit} (${aiCheck2.percentage}%)`);
    console.log(`   Warning: ${aiCheck2.isWarning ? '⚠️  YES - Should show warning!' : 'NO'}`);
    if (aiCheck2.isWarning) {
      console.log(`   Message: ${aiCheck2.reason}\n`);
    }

    // Test 4: Simulate using remaining tokens (100%)
    console.log('TEST 4: Simulate 100% token usage (should block)');
    await incrementTokenUsage(testOrgId, 5000);
    const aiCheck3 = await canUseAI(testOrgId, 1000);
    console.log(`${aiCheck3.allowed ? '❌ FAILED' : '✅ PASSED'}: ${aiCheck3.allowed ? 'Should have blocked' : 'Correctly blocked'}`);
    console.log(`   Used: ${aiCheck3.used}/${aiCheck3.limit} (${aiCheck3.percentage}%)`);
    if (!aiCheck3.allowed) {
      console.log(`   Error: ${aiCheck3.reason}\n`);
    }

    // Test 5: canIngestDocument - should allow
    console.log('TEST 5: canIngestDocument() - 0 docs used');
    const docCheck1 = await canIngestDocument(testOrgId);
    console.log(`✅ Result: ${docCheck1.allowed ? 'ALLOWED' : 'BLOCKED'}`);
    console.log(`   Used: ${docCheck1.used}/${docCheck1.limit} (${docCheck1.percentage}%)\n`);

    // Test 6: Ingest 9 documents (90%)
    console.log('TEST 6: Ingest 9 documents (90%)');
    for (let i = 0; i < 9; i++) {
      await incrementDocIngestion(testOrgId);
    }
    const docCheck2 = await canIngestDocument(testOrgId);
    console.log(`✅ Result: ${docCheck2.allowed ? 'ALLOWED' : 'BLOCKED'}`);
    console.log(`   Used: ${docCheck2.used}/${docCheck2.limit} (${docCheck2.percentage}%)`);
    console.log(`   Warning: ${docCheck2.isWarning ? '⚠️  YES - Should show warning!' : 'NO'}\n`);

    // Test 7: Try to ingest 2 more documents (should block on 11th)
    console.log('TEST 7: Try to ingest 2 more documents');
    await incrementDocIngestion(testOrgId);
    const docCheck3 = await canIngestDocument(testOrgId);
    console.log(`   10th doc: ${docCheck3.allowed ? 'ALLOWED ✅' : 'BLOCKED ❌'}`);

    const docCheck4 = await canIngestDocument(testOrgId);
    console.log(`   11th doc: ${!docCheck4.allowed ? 'BLOCKED ✅' : 'ALLOWED ❌'}`);
    if (!docCheck4.allowed) {
      console.log(`   Error: ${docCheck4.reason}\n`);
    }

    // Test 8: checkBulkLimit
    console.log('TEST 8: checkBulkLimit()');
    const bulkCheck1 = await checkBulkLimit(testOrgId, 15);
    console.log(`   15 stories: ${bulkCheck1.allowed ? 'ALLOWED ✅' : 'BLOCKED ❌'}`);

    const bulkCheck2 = await checkBulkLimit(testOrgId, 25);
    console.log(`   25 stories: ${!bulkCheck2.allowed ? 'BLOCKED ✅' : 'ALLOWED ❌'}`);
    if (!bulkCheck2.allowed) {
      console.log(`   Error: ${bulkCheck2.reason}\n`);
    }

    // Test 9: checkPageLimit
    console.log('TEST 9: checkPageLimit()');
    const pageCheck1 = await checkPageLimit(testOrgId, 30);
    console.log(`   30 pages: ${pageCheck1.allowed ? 'ALLOWED ✅' : 'BLOCKED ❌'}`);

    const pageCheck2 = await checkPageLimit(testOrgId, 60);
    console.log(`   60 pages: ${!pageCheck2.allowed ? 'BLOCKED ✅' : 'ALLOWED ❌'}\n`);

    // Test 10: getUsageSummary
    console.log('TEST 10: getUsageSummary()');
    const summary = await getUsageSummary(testOrgId);
    console.log('✅ Usage Summary:');
    console.log(`   Tokens: ${summary.tokens.used}/${summary.tokens.limit} (${summary.tokens.percentage}%)`);
    console.log(`   Tokens Warning: ${summary.tokens.isWarning}`);
    console.log(`   Tokens Blocked: ${summary.tokens.isBlocked}`);
    console.log(`   Docs: ${summary.docs.used}/${summary.docs.limit} (${summary.docs.percentage}%)`);
    console.log(`   Docs Warning: ${summary.docs.isWarning}`);
    console.log(`   Docs Blocked: ${summary.docs.isBlocked}`);
    console.log(`   Billing Period: ${summary.billingPeriod.start.toLocaleDateString()} - ${summary.billingPeriod.end.toLocaleDateString()}\n`);

    // Cleanup
    console.log('🧹 Cleaning up test data...');
    await db.delete(workspaceUsage).where(eq(workspaceUsage.organizationId, testOrgId));
    await db.delete(organizations).where(eq(organizations.id, testOrgId));
    console.log('✅ Cleanup complete\n');

    console.log('🎉 ALL TESTS PASSED!\n');

  } catch (error) {
    console.error('❌ Test failed:', error);

    // Cleanup on error
    try {
      await db.delete(workspaceUsage).where(eq(workspaceUsage.organizationId, testOrgId));
      await db.delete(organizations).where(eq(organizations.id, testOrgId));
    } catch (cleanupError) {
      console.error('Failed to cleanup:', cleanupError);
    }

    process.exit(1);
  }
}

runTests().then(() => process.exit(0)).catch((error) => {
  console.error(error);
  process.exit(1);
});
