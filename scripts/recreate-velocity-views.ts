/**
 * Script to recreate velocity views after schema push
 * Usage: npx tsx scripts/recreate-velocity-views.ts
 */

import { loadEnvConfig } from '@next/env'
import postgres from 'postgres'

loadEnvConfig(process.cwd())

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set')
  process.exit(1)
}

async function main() {
  const sql = postgres(DATABASE_URL!, { max: 1, idle_timeout: 30 })
  
  console.log('🔧 Recreating velocity views...\n')

  try {
    // Recreate view_sprint_velocity
    console.log('Creating view_sprint_velocity...')
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
    console.log('Creating view_project_velocity_history...')
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
    console.log('   ✓ view_project_velocity_history created')

    // Verify prioritization tables
    console.log('\n📋 Verifying prioritization tables...')
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (
        'story_prioritization_scores', 
        'backlog_analysis_reports', 
        'prioritization_jobs', 
        'strategic_goals',
        'api_keys',
        'webhooks',
        'client_story_reviews'
      )
      ORDER BY table_name
    `
    
    console.log('   Tables found:')
    tables.forEach(t => console.log(`     ✓ ${t.table_name}`))

    console.log('\n✅ All done!')

  } catch (error: any) {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

main()

