/**
 * Backfill Embeddings Migration Script
 * Generates vector embeddings for all existing stories without embeddings
 * 
 * Usage:
 *   npx tsx scripts/backfill-embeddings.ts
 */

import { neon } from '@neondatabase/serverless';
import { EmbeddingsService } from '../lib/services/embeddings.service';
import * as dotenv from 'dotenv';
import * as readline from 'readline';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function backfillEmbeddings() {
  const sql = neon(process.env.DATABASE_URL!);
  const embeddingsService = new EmbeddingsService();

  console.log('🚀 Starting embeddings backfill migration...\n');

  // Health check
  console.log('🏥 Running health check...');
  const health = await embeddingsService.healthCheck();
  console.log('Health status:', health);

  if (!health.database || !health.openrouterApi || !health.indexExists) {
    console.error('\n❌ Health check failed. Please fix issues before proceeding:');
    if (!health.database) console.error('  - Database connection failed');
    if (!health.openrouterApi) console.error('  - OpenRouter API not accessible (check OPENROUTER_API_KEY)');
    if (!health.indexExists) console.error('  - Vector index not found (run migration first)');
    process.exit(1);
  }

  console.log('✅ All health checks passed\n');

  // Count total stories
  const countResult = await sql`
    SELECT 
      COUNT(*) as total,
      COUNT(embedding) as with_embedding,
      COUNT(*) - COUNT(embedding) as without_embedding
    FROM stories
  `;

  const stats = countResult[0];
  console.log('📊 Current statistics:');
  console.log(`   Total stories: ${stats.total}`);
  console.log(`   With embeddings: ${stats.with_embedding}`);
  console.log(`   Without embeddings: ${stats.without_embedding}\n`);

  if (stats.without_embedding === 0) {
    console.log('✨ All stories already have embeddings. Nothing to do!');
    return;
  }

  // Estimate cost and time
  const estimatedMinutes = Math.ceil(stats.without_embedding / 60); // ~1 story/second with rate limiting
  console.log(`📈 Estimated processing time: ${estimatedMinutes} minutes`);
  console.log(`💰 Estimated cost: ~$${(stats.without_embedding * 0.0001).toFixed(2)} (Qwen API)\n`);

  // Confirm before proceeding
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const shouldProceed = await new Promise<boolean>((resolve) => {
    rl.question(
      `Process ${stats.without_embedding} stories? This will make ${stats.without_embedding} API calls to Qwen. Continue? (yes/no): `,
      (answer: string) => {
        rl.close();
        resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
      }
    );
  });

  if (!shouldProceed) {
    console.log('❌ Migration cancelled by user.');
    return;
  }

  // Fetch stories without embeddings
  console.log('\n📥 Fetching stories without embeddings...');
  const stories = await sql`
    SELECT 
      id,
      title,
      description,
      acceptance_criteria,
      created_at
    FROM stories 
    WHERE embedding IS NULL
      AND title IS NOT NULL
      AND title != ''
    ORDER BY created_at DESC
  `;

  console.log(`✅ Found ${stories.length} stories to process\n`);

  if (stories.length === 0) {
    console.log('No valid stories found to process.');
    return;
  }

  // Process in batches of 5 with 1 second delay
  console.log('🔄 Processing stories...\n');
  const startTime = Date.now();
  const result = await embeddingsService.batchEmbedStories(
    stories as any[], // Type assertion for script compatibility
    5, // batch size
    1000 // 1 second delay between batches
  );

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n✨ Migration complete!');
  console.log(`   ✅ Successfully embedded: ${result.success}`);
  console.log(`   ❌ Failed: ${result.failed}`);
  console.log(`   ⏱️  Duration: ${duration}s`);
  console.log(`   📊 Average: ${(result.success / parseFloat(duration)).toFixed(1)} stories/second\n`);

  // Final statistics
  const finalStats = await sql`
    SELECT 
      COUNT(*) as total,
      COUNT(embedding) as with_embedding,
      ROUND(100.0 * COUNT(embedding) / NULLIF(COUNT(*), 0), 2) as percentage
    FROM stories
  `;

  console.log('📊 Final statistics:');
  console.log(`   Total stories: ${finalStats[0].total}`);
  console.log(`   With embeddings: ${finalStats[0].with_embedding} (${finalStats[0].percentage}%)\n`);

  if (result.failed > 0) {
    console.log('⚠️  Some stories failed to embed. You can retry them using:');
    console.log('   npx tsx scripts/retry-failed-embeddings.ts\n');
  }
}

// Run the migration
backfillEmbeddings()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

