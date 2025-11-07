-- Migration: Add Sprint Velocity View
-- Version: 0017
-- Description: Creates view for efficient sprint velocity calculation and historical tracking

-- ============================================================================
-- VIEW: Sprint Velocity
-- ============================================================================
-- Calculates completed story points for each sprint based on done_at timestamp
-- Rules:
-- - done_at >= sprint start_date (at 00:00 UTC)
-- - done_at < sprint end_date (at 00:00 UTC)
-- - status IN ('done', 'archived')

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
  -- Total committed points (regardless of completion)
  COALESCE((
    SELECT SUM(s2.story_points)
    FROM sprint_stories ss2
    JOIN stories s2 ON s2.id = ss2.story_id
    WHERE ss2.sprint_id = s.id
  ), 0)::INT AS committed_points,
  -- Total committed stories
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
GROUP BY s.id, s.project_id, s.name, s.start_date, s.end_date, s.status, p.organization_id;

-- Grant appropriate permissions (adjust as needed for your auth setup)
-- GRANT SELECT ON view_sprint_velocity TO authenticated;

-- ============================================================================
-- VIEW: Project Velocity History
-- ============================================================================
-- Aggregates velocity data across all sprints in a project for trend analysis

CREATE OR REPLACE VIEW view_project_velocity_history AS
SELECT
  v.project_id,
  v.organization_id,
  COUNT(*) FILTER (WHERE v.sprint_status = 'completed') AS completed_sprints,
  AVG(v.completed_points) FILTER (WHERE v.sprint_status = 'completed')::NUMERIC(8,2) AS avg_velocity,
  MIN(v.completed_points) FILTER (WHERE v.sprint_status = 'completed')::INT AS min_velocity,
  MAX(v.completed_points) FILTER (WHERE v.sprint_status = 'completed')::INT AS max_velocity,
  STDDEV(v.completed_points) FILTER (WHERE v.sprint_status = 'completed')::NUMERIC(8,2) AS velocity_stddev,
  -- Last 3 completed sprints average
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
  -- Last 5 completed sprints average
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
GROUP BY v.project_id, v.organization_id;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON VIEW view_sprint_velocity IS
'Calculates sprint velocity based on story completion within sprint date boundaries.
A story counts towards velocity if its done_at timestamp falls within the sprint window
(inclusive of start, exclusive of end) and its status is done or archived.';

COMMENT ON VIEW view_project_velocity_history IS
'Aggregates velocity metrics across all sprints in a project, including rolling averages
for the last 3 and 5 completed sprints. Used for forecasting and trend analysis.';
