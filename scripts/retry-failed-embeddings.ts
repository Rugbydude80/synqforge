/**
 * Retry Failed Embeddings Script
 * Retries embedding generation for stories that don't have embeddings
 * Useful for recovering from API failures or network issues
 * 
 * Usage:
 *   npx tsx scripts/retry-failed-embeddings.ts
 */

import { neon } from '@neondatabase/serverless';
import { EmbeddingsService } from '../lib/services/embeddings.service';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function retryFailedEmbeddings() {
  const sql = neon(process.env.DATABASE_URL!);
  const embeddingsService = new EmbeddingsService();

  console.log('🔄 Checking for stories without embeddings...\n');

  // Find stories without embeddings that are older than 5 minutes
  // (gives time for async embedding from API to complete)
  const storiesNeedingEmbedding = await sql`
    SELECT 
      id, 
      title, 
      description, 
      acceptance_criteria,
      created_at
    FROM stories
    WHERE embedding IS NULL
      AND created_at < NOW() - INTERVAL '5 minutes'
      AND title IS NOT NULL
      AND title != ''
    ORDER BY created_at DESC
    LIMIT 50
  `;

  console.log(`Found ${storiesNeedingEmbedding.length} stories needing embeddings\n`);

  if (storiesNeedingEmbedding.length === 0) {
    console.log('✅ All stories have embeddings!');
    return;
  }

  // Show sample of stories that will be processed
  console.log('Sample of stories to process:');
  storiesNeedingEmbedding.slice(0, 5).forEach((story: any, idx: number) => {
    console.log(`  ${idx + 1}. ${story.title} (created: ${new Date(story.created_at).toLocaleDateString()})`);
  });
  if (storiesNeedingEmbedding.length > 5) {
    console.log(`  ... and ${storiesNeedingEmbedding.length - 5} more\n`);
  } else {
    console.log('');
  }

  // Process stories
  console.log('🔄 Processing...\n');
  const startTime = Date.now();
  const result = await embeddingsService.batchEmbedStories(
    storiesNeedingEmbedding as any[], // Type assertion for script compatibility
    5, // batch size
    1000 // 1 second delay
  );

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n✨ Retry complete!');
  console.log(`   ✅ Success: ${result.success}`);
  console.log(`   ❌ Failed: ${result.failed}`);
  console.log(`   ⏱️  Duration: ${duration}s\n`);

  if (result.failed > 0) {
    console.log('⚠️  Some stories still failed. Check logs for details.');
    console.log('   You can run this script again to retry.\n');
  }

  // Show updated statistics
  const stats = await sql`
    SELECT 
      COUNT(*) as total,
      COUNT(embedding) as with_embedding,
      COUNT(*) - COUNT(embedding) as without_embedding,
      ROUND(100.0 * COUNT(embedding) / NULLIF(COUNT(*), 0), 2) as percentage
    FROM stories
  `;

  console.log('📊 Current statistics:');
  console.log(`   Total stories: ${stats[0].total}`);
  console.log(`   With embeddings: ${stats[0].with_embedding} (${stats[0].percentage}%)`);
  console.log(`   Without embeddings: ${stats[0].without_embedding}\n`);
}

// Run the script
retryFailedEmbeddings()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Retry failed:', err);
    process.exit(1);
  });

