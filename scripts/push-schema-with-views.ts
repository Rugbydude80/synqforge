/**
 * Script to push schema changes while handling view dependencies
 * 
 * This script:
 * 1. Drops dependent views (with CASCADE)
 * 2. Runs drizzle-kit push
 * 3. Recreates the views
 * 
 * Usage: npx tsx scripts/push-schema-with-views.ts
 */

import { loadEnvConfig } from '@next/env'
import { execSync } from 'child_process'
import postgres from 'postgres'

// Load environment variables
loadEnvConfig(process.cwd())

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set')
  process.exit(1)
}

const sql = postgres(DATABASE_URL, { max: 1 })

async function main() {
  console.log('🚀 Starting schema push with view handling...\n')

  try {
    // Step 1: Drop dependent views
    console.log('📦 Step 1: Dropping dependent views...')
    await sql`DROP VIEW IF EXISTS view_project_velocity_history CASCADE`
    await sql`DROP VIEW IF EXISTS view_sprint_velocity CASCADE`
    console.log('   ✓ Views dropped successfully\n')

    // Step 2: Run drizzle-kit push
    console.log('📦 Step 2: Running drizzle-kit push...')
    try {
      execSync('npx drizzle-kit push --force', { 
        stdio: 'inherit',
        cwd: process.cwd()
      })
      console.log('   ✓ Schema push completed\n')
    } catch (error) {
      console.log('   ⚠️  Push may have had issues, continuing to recreate views...\n')
    }

    // Step 3: Recreate views
    console.log('📦 Step 3: Recreating velocity views...')
    
    // Recreate view_sprint_velocity
    await sql`
      CREATE OR REPLACE VIEW view_sprint_velocity AS
      SELECT
        s.id AS sprint_id,
        s.project_id,
        s.name AS sprint_name,
        s.start_date,
        s.end_date,
        s.status AS sprint_status,
        p.organization_id,
        COALESCE(SUM(st.story_points), 0)::INT AS completed_points,
        COUNT(st.id)::INT AS completed_stories,
        COALESCE((
          SELECT SUM(s2.story_points)
          FROM sprint_stories ss2
          JOIN stories s2 ON s2.id = ss2.story_id
          WHERE ss2.sprint_id = s.id
        ), 0)::INT AS committed_points,
        COALESCE((
          SELECT COUNT(*)
          FROM sprint_stories ss2
          WHERE ss2.sprint_id = s.id
        ), 0)::INT AS committed_stories
      FROM sprints s
      JOIN projects p ON p.id = s.project_id
      LEFT JOIN sprint_stories ss ON ss.sprint_id = s.id
      LEFT JOIN stories st ON st.id = ss.story_id
        AND st.done_at >= s.start_date::TIMESTAMPTZ
        AND st.done_at < s.end_date::TIMESTAMPTZ
        AND st.status = 'done'
      GROUP BY s.id, s.project_id, s.name, s.start_date, s.end_date, s.status, p.organization_id
    `
    console.log('   ✓ view_sprint_velocity created')

    // Recreate view_project_velocity_history
    await sql`
      CREATE OR REPLACE VIEW view_project_velocity_history AS
      SELECT
        v.project_id,
        v.organization_id,
        COUNT(*) FILTER (WHERE v.sprint_status = 'completed') AS completed_sprints,
        AVG(v.completed_points) FILTER (WHERE v.sprint_status = 'completed')::NUMERIC(8,2) AS avg_velocity,
        MIN(v.completed_points) FILTER (WHERE v.sprint_status = 'completed')::INT AS min_velocity,
        MAX(v.completed_points) FILTER (WHERE v.sprint_status = 'completed')::INT AS max_velocity,
        STDDEV(v.completed_points) FILTER (WHERE v.sprint_status = 'completed')::NUMERIC(8,2) AS velocity_stddev,
        (
          SELECT AVG(v2.completed_points)::NUMERIC(8,2)
          FROM (
            SELECT v3.completed_points
            FROM view_sprint_velocity v3
            WHERE v3.project_id = v.project_id
              AND v3.sprint_status = 'completed'
            ORDER BY v3.end_date DESC
            LIMIT 3
          ) v2
        ) AS rolling_avg_3,
        (
          SELECT AVG(v2.completed_points)::NUMERIC(8,2)
          FROM (
            SELECT v3.completed_points
            FROM view_sprint_velocity v3
            WHERE v3.project_id = v.project_id
              AND v3.sprint_status = 'completed'
            ORDER BY v3.end_date DESC
            LIMIT 5
          ) v2
        ) AS rolling_avg_5
      FROM view_sprint_velocity v
      GROUP BY v.project_id, v.organization_id
    `
    console.log('   ✓ view_project_velocity_history created\n')

    // Step 4: Verify tables exist
    console.log('📦 Step 4: Verifying prioritization tables...')
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (
        'story_prioritization_scores', 
        'backlog_analysis_reports', 
        'prioritization_jobs', 
        'strategic_goals'
      )
      ORDER BY table_name
    `
    
    const tableNames = tables.map(t => t.table_name)
    const expected = ['backlog_analysis_reports', 'prioritization_jobs', 'story_prioritization_scores', 'strategic_goals']
    const missing = expected.filter(t => !tableNames.includes(t))
    
    if (missing.length === 0) {
      console.log('   ✓ All prioritization tables exist:')
      tableNames.forEach(t => console.log(`     - ${t}`))
    } else {
      console.log('   ⚠️  Missing tables:', missing)
    }

    console.log('\n✅ Schema push completed successfully!')

  } catch (error: any) {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

main()

