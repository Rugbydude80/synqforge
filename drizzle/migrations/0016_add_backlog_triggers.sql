-- Migration: Add Backlog Engine Triggers
-- Version: 0016
-- Description: Implements automatic triggers for epic aggregates, story completion, and velocity updates

-- ============================================================================
-- FUNCTION: Recalculate Epic Aggregates
-- ============================================================================
CREATE OR REPLACE FUNCTION recalc_epic_aggregates(epic_id_param VARCHAR)
RETURNS VOID AS $$
DECLARE
  v_total_stories INT;
  v_completed_stories INT;
  v_total_points INT;
  v_completed_points INT;
  v_progress_pct NUMERIC(5,1);
BEGIN
  -- Skip if epic_id is NULL
  IF epic_id_param IS NULL THEN
    RETURN;
  END IF;

  -- Calculate aggregates
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'done'),
    COALESCE(SUM(story_points), 0),
    COALESCE(SUM(story_points) FILTER (WHERE status = 'done'), 0)
  INTO
    v_total_stories,
    v_completed_stories,
    v_total_points,
    v_completed_points
  FROM stories
  WHERE epic_id = epic_id_param;

  -- Calculate progress percentage (priority: points-based, fallback to story-based)
  IF v_total_points > 0 THEN
    v_progress_pct := ROUND((v_completed_points::NUMERIC / v_total_points) * 100, 1);
  ELSIF v_total_stories > 0 THEN
    v_progress_pct := ROUND((v_completed_stories::NUMERIC / v_total_stories) * 100, 1);
  ELSE
    v_progress_pct := 0;
  END IF;

  -- Update epic
  UPDATE epics
  SET
    total_stories = v_total_stories,
    completed_stories = v_completed_stories,
    total_points = v_total_points,
    completed_points = v_completed_points,
    progress_pct = v_progress_pct,
    updated_at = NOW()
  WHERE id = epic_id_param;

EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Error recalculating epic aggregates for epic %: %', epic_id_param, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Maintain done_at Field
-- ============================================================================
CREATE OR REPLACE FUNCTION maintain_story_done_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Moving TO a completed status (done)
  IF NEW.status = 'done'
     AND (OLD.status IS NULL OR OLD.status != 'done') THEN
    -- Set done_at to now if not already set
    IF NEW.done_at IS NULL THEN
      NEW.done_at := NOW();
    END IF;

  -- Moving FROM done status to a non-done status
  ELSIF NEW.status != 'done'
        AND (OLD.status IS NOT NULL AND OLD.status = 'done') THEN
    -- Clear done_at
    NEW.done_at := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply done_at trigger
DROP TRIGGER IF EXISTS maintain_story_done_at_trigger ON stories;
CREATE TRIGGER maintain_story_done_at_trigger
  BEFORE UPDATE OF status ON stories
  FOR EACH ROW
  EXECUTE FUNCTION maintain_story_done_at();

-- ============================================================================
-- FUNCTION: Trigger Epic Aggregate Recalculation
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_epic_aggregates()
RETURNS TRIGGER AS $$
DECLARE
  affected_epic_ids VARCHAR[];
BEGIN
  -- Collect affected epic IDs
  affected_epic_ids := ARRAY[]::VARCHAR[];

  -- For INSERT
  IF TG_OP = 'INSERT' THEN
    IF NEW.epic_id IS NOT NULL THEN
      affected_epic_ids := affected_epic_ids || NEW.epic_id;
    END IF;

  -- For UPDATE
  ELSIF TG_OP = 'UPDATE' THEN
    -- Old epic (if changed or status/points changed)
    IF OLD.epic_id IS NOT NULL AND (
      OLD.epic_id IS DISTINCT FROM NEW.epic_id OR
      OLD.status != NEW.status OR
      COALESCE(OLD.story_points, 0) != COALESCE(NEW.story_points, 0)
    ) THEN
      affected_epic_ids := affected_epic_ids || OLD.epic_id;
    END IF;

    -- New epic (if changed)
    IF NEW.epic_id IS NOT NULL AND OLD.epic_id IS DISTINCT FROM NEW.epic_id THEN
      affected_epic_ids := affected_epic_ids || NEW.epic_id;
    END IF;

    -- Same epic but status/points changed
    IF NEW.epic_id IS NOT NULL AND OLD.epic_id = NEW.epic_id AND (
      OLD.status != NEW.status OR COALESCE(OLD.story_points, 0) != COALESCE(NEW.story_points, 0)
    ) THEN
      -- Already added above, but ensure it's there
      IF NOT (NEW.epic_id = ANY(affected_epic_ids)) THEN
        affected_epic_ids := affected_epic_ids || NEW.epic_id;
      END IF;
    END IF;

  -- For DELETE
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.epic_id IS NOT NULL THEN
      affected_epic_ids := affected_epic_ids || OLD.epic_id;
    END IF;
  END IF;

  -- Recalculate each affected epic (removing duplicates)
  affected_epic_ids := ARRAY(SELECT DISTINCT unnest(affected_epic_ids));

  FOR i IN 1..array_length(affected_epic_ids, 1) LOOP
    PERFORM recalc_epic_aggregates(affected_epic_ids[i]);
  END LOOP;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply epic aggregate triggers
DROP TRIGGER IF EXISTS trigger_epic_aggregates_insert ON stories;
CREATE TRIGGER trigger_epic_aggregates_insert
  AFTER INSERT ON stories
  FOR EACH ROW
  EXECUTE FUNCTION trigger_epic_aggregates();

DROP TRIGGER IF EXISTS trigger_epic_aggregates_update ON stories;
CREATE TRIGGER trigger_epic_aggregates_update
  AFTER UPDATE OF status, story_points, epic_id ON stories
  FOR EACH ROW
  EXECUTE FUNCTION trigger_epic_aggregates();

DROP TRIGGER IF EXISTS trigger_epic_aggregates_delete ON stories;
CREATE TRIGGER trigger_epic_aggregates_delete
  AFTER DELETE ON stories
  FOR EACH ROW
  EXECUTE FUNCTION trigger_epic_aggregates();

-- ============================================================================
-- FUNCTION: Update Sprint Velocity Cache
-- ============================================================================
CREATE OR REPLACE FUNCTION update_sprint_velocity_cache(sprint_id_param VARCHAR)
RETURNS VOID AS $$
BEGIN
  -- Get the sprint's date range first
  UPDATE sprints s
  SET velocity_cached = COALESCE((
    SELECT SUM(st.story_points)
    FROM sprint_stories ss
    JOIN stories st ON st.id = ss.story_id
    WHERE ss.sprint_id = sprint_id_param
      AND st.done_at >= s.start_date::TIMESTAMPTZ
      AND st.done_at < s.end_date::TIMESTAMPTZ
      AND st.status = 'done'
  ), 0)
  WHERE s.id = sprint_id_param;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Trigger Sprint Velocity Update
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_sprint_velocity_update()
RETURNS TRIGGER AS $$
DECLARE
  affected_sprint_ids VARCHAR[];
  sprint_id_from_junction VARCHAR;
BEGIN
  affected_sprint_ids := ARRAY[]::VARCHAR[];

  -- Handle sprint_stories junction table changes
  IF TG_TABLE_NAME = 'sprint_stories' THEN
    IF TG_OP = 'INSERT' THEN
      affected_sprint_ids := affected_sprint_ids || NEW.sprint_id;
    ELSIF TG_OP = 'DELETE' THEN
      affected_sprint_ids := affected_sprint_ids || OLD.sprint_id;
    ELSIF TG_OP = 'UPDATE' THEN
      affected_sprint_ids := affected_sprint_ids || OLD.sprint_id;
      affected_sprint_ids := affected_sprint_ids || NEW.sprint_id;
    END IF;

  -- Handle stories table changes
  ELSIF TG_TABLE_NAME = 'stories' THEN
    -- For INSERT - check if story belongs to any sprint
    IF TG_OP = 'INSERT' THEN
      IF NEW.status = 'done' AND NEW.done_at IS NOT NULL THEN
        SELECT sprint_id INTO sprint_id_from_junction
        FROM sprint_stories
        WHERE story_id = NEW.id
        LIMIT 1;

        IF sprint_id_from_junction IS NOT NULL THEN
          affected_sprint_ids := affected_sprint_ids || sprint_id_from_junction;
        END IF;
      END IF;

    -- For UPDATE - check if status/points/done_at changed
    ELSIF TG_OP = 'UPDATE' THEN
      IF (OLD.status != NEW.status OR
          COALESCE(OLD.story_points, 0) != COALESCE(NEW.story_points, 0) OR
          OLD.done_at IS DISTINCT FROM NEW.done_at) THEN

        -- Get all sprints this story belongs to
        FOR sprint_id_from_junction IN
          SELECT sprint_id FROM sprint_stories WHERE story_id = NEW.id
        LOOP
          affected_sprint_ids := affected_sprint_ids || sprint_id_from_junction;
        END LOOP;
      END IF;

    -- For DELETE
    ELSIF TG_OP = 'DELETE' THEN
      IF OLD.status = 'done' AND OLD.done_at IS NOT NULL THEN
        FOR sprint_id_from_junction IN
          SELECT sprint_id FROM sprint_stories WHERE story_id = OLD.id
        LOOP
          affected_sprint_ids := affected_sprint_ids || sprint_id_from_junction;
        END LOOP;
      END IF;
    END IF;
  END IF;

  -- Update cache for affected sprints (remove duplicates)
  affected_sprint_ids := ARRAY(SELECT DISTINCT unnest(affected_sprint_ids));

  FOR i IN 1..array_length(affected_sprint_ids, 1) LOOP
    PERFORM update_sprint_velocity_cache(affected_sprint_ids[i]);
  END LOOP;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply velocity cache triggers
DROP TRIGGER IF EXISTS trigger_sprint_velocity_cache_stories ON stories;
CREATE TRIGGER trigger_sprint_velocity_cache_stories
  AFTER INSERT OR UPDATE OF status, story_points, done_at OR DELETE ON stories
  FOR EACH ROW
  EXECUTE FUNCTION trigger_sprint_velocity_update();

DROP TRIGGER IF EXISTS trigger_sprint_velocity_cache_junction ON sprint_stories;
CREATE TRIGGER trigger_sprint_velocity_cache_junction
  AFTER INSERT OR UPDATE OR DELETE ON sprint_stories
  FOR EACH ROW
  EXECUTE FUNCTION trigger_sprint_velocity_update();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION recalc_epic_aggregates IS
'Recalculates all aggregate fields (totals, completed counts/points, progress %) for a given epic.';

COMMENT ON FUNCTION maintain_story_done_at IS
'Automatically sets done_at to current timestamp when story moves to done/archived status,
and clears it when moving from completed to non-completed status.';

COMMENT ON FUNCTION trigger_epic_aggregates IS
'Trigger function that identifies affected epics when stories change and recalculates their aggregates.';

COMMENT ON FUNCTION update_sprint_velocity_cache IS
'Updates the cached velocity field for a sprint based on completed story points within sprint date range.';

COMMENT ON FUNCTION trigger_sprint_velocity_update IS
'Trigger function that identifies affected sprints when stories or sprint_stories change and updates velocity cache.';
