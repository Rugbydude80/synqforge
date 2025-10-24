#!/usr/bin/env node

/**
 * Run SQL migration directly against the database
 */

import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runMigration() {
  if (!process.env.DATABASE_URL) {
    console.error('✗ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const sql = postgres(process.env.DATABASE_URL, {
    max: 1,
    prepare: false,
  });

  try {
    console.log('Connecting to database...');
    await sql`SELECT 1`;
    console.log('✓ Connected');

    // Read migration SQL
    const migrationPath = path.join(__dirname, '../db/migrations/0005_add_ai_actions_tracking.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('\nRunning migration: 0005_add_ai_actions_tracking.sql');
    console.log('Creating tables: ai_action_usage, ai_action_rollover');
    
    // Execute migration (postgres library handles multi-statement queries)
    await sql.unsafe(migrationSql);
    
    console.log('✓ Migration completed successfully');
    
    // Verify tables were created
    const result = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('ai_action_usage', 'ai_action_rollover')
      ORDER BY table_name
    `;
    
    console.log('\n✓ Verified tables:');
    result.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    if (error.code) console.error('Error code:', error.code);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigration();

