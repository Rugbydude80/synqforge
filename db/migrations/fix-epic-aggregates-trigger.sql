-- Fix trigger_epic_aggregates to handle empty arrays
-- This fixes a bug where the trigger would fail with "upper bound of FOR loop cannot be null"
-- when updating stories without epic changes

CREATE OR REPLACE FUNCTION public.trigger_epic_aggregates()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  affected_epic_ids VARCHAR[];
  epic_id_to_update VARCHAR;
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

  -- FIX: Only loop if there are epic IDs to process
  -- Changed from: FOR i IN 1..array_length(affected_epic_ids, 1) LOOP
  -- Which would fail when array_length returns NULL for empty arrays
  IF array_length(affected_epic_ids, 1) > 0 THEN
    FOREACH epic_id_to_update IN ARRAY affected_epic_ids LOOP
      PERFORM recalc_epic_aggregates(epic_id_to_update);
    END LOOP;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$function$;
